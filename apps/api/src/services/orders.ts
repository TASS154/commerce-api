import { randomUUID } from "node:crypto";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { CheckoutSchema } from "@vespera/shared";
import { getDb, withTransaction, type Db } from "../db/client.js";
import {
  inventoryReservations,
  orderItems,
  orders,
  paymentEvents,
  products,
} from "../db/schema.js";
import { createCharge } from "./payment.js";
import type { AuthUser } from "../plugins/auth.js";

function httpError(message: string, statusCode: number): Error {
  const err = new Error(message);
  (err as Error & { statusCode: number }).statusCode = statusCode;
  return err;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return e.code === "23505" || /unique|duplicate key/i.test(e.message ?? "");
}

export async function createCheckout(user: AuthUser, raw: unknown) {
  const parsed = CheckoutSchema.safeParse(raw);
  if (!parsed.success) {
    throw httpError("Invalid checkout payload", 400);
  }
  const input = parsed.data;
  const db = getDb();

  const existing = await db
    .select()
    .from(orders)
    .where(
      and(eq(orders.userId, user.id), eq(orders.idempotencyKey, input.idempotencyKey)),
    )
    .limit(1);
  if (existing[0]) {
    return { order: existing[0], replayed: true as const };
  }

  let prepared: { orderId: string; totalCents: number };
  try {
    prepared = await withTransaction(async (tx) => {
      const productIds = input.items.map((i) => i.productId);
      const catalog = await tx
        .select()
        .from(products)
        .where(inArray(products.id, productIds));

      if (catalog.length !== new Set(productIds).size) {
        throw httpError("One or more products were not found", 404);
      }

      const byId = new Map(catalog.map((p) => [p.id, p]));
      let totalCents = 0;
      const lines: { productId: string; quantity: number; unitPriceCents: number }[] = [];

      for (const item of input.items) {
        const product = byId.get(item.productId)!;
        if (product.stock < item.quantity) {
          throw httpError(`Insufficient stock for ${product.sku}`, 409);
        }
        totalCents += product.priceCents * item.quantity;
        lines.push({
          productId: product.id,
          quantity: item.quantity,
          unitPriceCents: product.priceCents,
        });
      }

      const orderId = randomUUID();

      for (const line of lines) {
        const updated = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${line.quantity}` })
          .where(
            and(eq(products.id, line.productId), sql`${products.stock} >= ${line.quantity}`),
          )
          .returning();

        if (!updated[0]) {
          throw httpError("Stock race detected — retry checkout", 409);
        }
      }

      await tx.insert(orders).values({
        id: orderId,
        userId: user.id,
        status: "pending_payment",
        paymentMethod: input.paymentMethod,
        currency: "BRL",
        totalCents,
        idempotencyKey: input.idempotencyKey,
        metadata: { email: user.email },
      });

      await tx.insert(orderItems).values(
        lines.map((l) => ({
          id: randomUUID(),
          orderId,
          productId: l.productId,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
        })),
      );

      const expiresAt = new Date(Date.now() + 15 * 60_000);
      await tx.insert(inventoryReservations).values(
        lines.map((l) => ({
          id: randomUUID(),
          orderId,
          productId: l.productId,
          quantity: l.quantity,
          expiresAt,
          released: false,
        })),
      );

      return { orderId, totalCents };
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      const replay = await db
        .select()
        .from(orders)
        .where(
          and(eq(orders.userId, user.id), eq(orders.idempotencyKey, input.idempotencyKey)),
        )
        .limit(1);
      if (replay[0]) return { order: replay[0], replayed: true as const };
    }
    throw err;
  }

  const charge = await createCharge({
    orderId: prepared.orderId,
    amountCents: prepared.totalCents,
    method: input.paymentMethod,
    customerEmail: user.email,
  });

  let status: string = "pending_payment";
  if (charge.status === "approved") status = "paid";
  if (charge.status === "rejected") status = "canceled";

  const [order] = await db
    .update(orders)
    .set({
      paymentRef: charge.paymentRef,
      status,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, prepared.orderId))
    .returning();

  if (status === "canceled") {
    await releaseReservations(prepared.orderId);
  }

  return { order, charge, replayed: false as const };
}

export async function markOrderPaid(
  paymentRef: string,
  providerEventId: string,
  payload: Record<string, unknown>,
) {
  const db = getDb();

  const already = await db
    .select()
    .from(paymentEvents)
    .where(eq(paymentEvents.providerEventId, providerEventId))
    .limit(1);
  if (already[0]) return { duplicate: true as const };

  try {
    return await withTransaction(async (tx) => {
      await tx.insert(paymentEvents).values({
        id: randomUUID(),
        providerEventId,
        payload,
      });

      const [cas] = await tx
        .update(orders)
        .set({ status: "paid", updatedAt: new Date() })
        .where(and(eq(orders.paymentRef, paymentRef), ne(orders.status, "paid")))
        .returning();

      if (!cas) {
        const found = await tx
          .select()
          .from(orders)
          .where(eq(orders.paymentRef, paymentRef))
          .limit(1);
        if (!found[0]) return { duplicate: false as const, found: false as const };
        await tx
          .update(paymentEvents)
          .set({ orderId: found[0].id })
          .where(eq(paymentEvents.providerEventId, providerEventId));
        return { duplicate: false as const, found: true as const, order: found[0] };
      }

      await tx
        .update(paymentEvents)
        .set({ orderId: cas.id })
        .where(eq(paymentEvents.providerEventId, providerEventId));

      await tx
        .update(inventoryReservations)
        .set({ released: true })
        .where(eq(inventoryReservations.orderId, cas.id));

      return { duplicate: false as const, found: true as const, order: cas };
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { duplicate: true as const };
    throw err;
  }
}

export async function releaseReservations(orderId: string, tx?: Db) {
  const run = async (db: Db) => {
    const reservations = await db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.released, false),
        ),
      );

    for (const r of reservations) {
      await db
        .update(products)
        .set({ stock: sql`${products.stock} + ${r.quantity}` })
        .where(eq(products.id, r.productId));
    }

    await db
      .update(inventoryReservations)
      .set({ released: true })
      .where(eq(inventoryReservations.orderId, orderId));
  };

  if (tx) return run(tx);
  return withTransaction(run);
}
