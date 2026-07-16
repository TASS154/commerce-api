import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { CheckoutSchema } from "@vespera/shared";
import { getDb } from "../db/client.js";
import {
  inventoryReservations,
  orderItems,
  orders,
  paymentEvents,
  products,
} from "../db/schema.js";
import { createCharge } from "./payment.js";
import type { AuthUser } from "../plugins/auth.js";
import { z } from "zod";

export async function createCheckout(user: AuthUser, raw: unknown) {
  const input = CheckoutSchema.parse(raw);
  const db = getDb();

  // Idempotent replay
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

  const productIds = input.items.map((i) => i.productId);
  const catalog = await db
    .select()
    .from(products)
    .where(inArray(products.id, productIds));

  if (catalog.length !== new Set(productIds).size) {
    const err = new Error("One or more products were not found");
    (err as Error & { statusCode: number }).statusCode = 404;
    throw err;
  }

  const byId = new Map(catalog.map((p) => [p.id, p]));
  let totalCents = 0;
  const lines: { productId: string; quantity: number; unitPriceCents: number }[] =
    [];

  for (const item of input.items) {
    const product = byId.get(item.productId)!;
    if (product.stock < item.quantity) {
      const err = new Error(`Insufficient stock for ${product.sku}`);
      (err as Error & { statusCode: number }).statusCode = 409;
      throw err;
    }
    totalCents += product.priceCents * item.quantity;
    lines.push({
      productId: product.id,
      quantity: item.quantity,
      unitPriceCents: product.priceCents,
    });
  }

  const orderId = randomUUID();

  // Soft reservation + stock decrement in a tight sequence (demo-safe).
  // Production tip: wrap in a SQL transaction / SELECT FOR UPDATE.
  for (const line of lines) {
    const updated = await db
      .update(products)
      .set({ stock: sql`${products.stock} - ${line.quantity}` })
      .where(
        and(eq(products.id, line.productId), sql`${products.stock} >= ${line.quantity}`),
      )
      .returning();

    if (!updated[0]) {
      const err = new Error("Stock race detected — retry checkout");
      (err as Error & { statusCode: number }).statusCode = 409;
      throw err;
    }
  }

  await db.insert(orders).values({
    id: orderId,
    userId: user.id,
    status: "pending_payment",
    paymentMethod: input.paymentMethod,
    currency: "BRL",
    totalCents,
    idempotencyKey: input.idempotencyKey,
    metadata: { email: user.email },
  });

  await db.insert(orderItems).values(
    lines.map((l) => ({
      id: randomUUID(),
      orderId,
      productId: l.productId,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
    })),
  );

  const expiresAt = new Date(Date.now() + 15 * 60_000);
  await db.insert(inventoryReservations).values(
    lines.map((l) => ({
      id: randomUUID(),
      orderId,
      productId: l.productId,
      quantity: l.quantity,
      expiresAt,
      released: false,
    })),
  );

  const charge = await createCharge({
    orderId,
    amountCents: totalCents,
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
    .where(eq(orders.id, orderId))
    .returning();

  if (status === "canceled") {
    await releaseReservations(orderId);
  }

  return { order, charge, replayed: false as const };
}

export async function markOrderPaid(paymentRef: string, providerEventId: string, payload: Record<string, unknown>) {
  const db = getDb();

  // Idempotent event store
  try {
    await db.insert(paymentEvents).values({
      id: randomUUID(),
      providerEventId,
      payload,
    });
  } catch {
    return { duplicate: true as const };
  }

  const found = await db
    .select()
    .from(orders)
    .where(eq(orders.paymentRef, paymentRef))
    .limit(1);

  if (!found[0]) return { duplicate: false as const, found: false as const };

  if (found[0].status === "paid") {
    await db
      .update(paymentEvents)
      .set({ orderId: found[0].id })
      .where(eq(paymentEvents.providerEventId, providerEventId));
    return { duplicate: false as const, found: true as const, order: found[0] };
  }

  const [order] = await db
    .update(orders)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(orders.id, found[0].id))
    .returning();

  await db
    .update(paymentEvents)
    .set({ orderId: order.id })
    .where(eq(paymentEvents.providerEventId, providerEventId));

  await db
    .update(inventoryReservations)
    .set({ released: true })
    .where(eq(inventoryReservations.orderId, order.id));

  return { duplicate: false as const, found: true as const, order };
}

async function releaseReservations(orderId: string) {
  const db = getDb();
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
}

export const SimulatePixSchema = z.object({
  paymentRef: z.string().min(8),
});
