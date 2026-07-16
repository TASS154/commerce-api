import type { FastifyPluginAsync } from "fastify";
import { asc, eq } from "drizzle-orm";
import { getDb, getDbEngine } from "../db/client.js";
import { orders, products } from "../db/schema.js";
import { authenticate, verifyWebhookSignature } from "../plugins/auth.js";
import { config, firebaseIsConfigured, paymentIsConfigured } from "../config.js";
import { createCheckout, markOrderPaid, SimulatePixSchema } from "../services/orders.js";
import { buildMockWebhook } from "../services/payment.js";

export const routes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({
    ok: true,
    service: "vespera-api",
    db: getDbEngine(),
    auth: firebaseIsConfigured() ? "firebase" : "demo",
    payments: paymentIsConfigured() && config.payment.provider === "live" ? "live" : "mock",
  }));

  app.get("/v1/meta", async () => ({
    brand: "Vespera",
    locales: ["pt", "en", "es"],
    currency: "BRL",
    docs: `${config.publicApiUrl}/docs`,
    architecture: `${config.publicWebUrl}/architecture`,
    security: {
      rateLimit: config.rateLimit,
      helmet: true,
      cors: config.corsOrigin,
      webhookHmac: true,
      idempotentCheckout: true,
    },
  }));

  app.get("/v1/products", async (request) => {
    const q = request.query as { category?: string; featured?: string };
    const db = getDb();
    let rows = await db.select().from(products).orderBy(asc(products.slug));
    if (q.category) rows = rows.filter((p) => p.category === q.category);
    if (q.featured === "true") rows = rows.filter((p) => p.featured);
    return { items: rows, count: rows.length };
  });

  app.get("/v1/products/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const db = getDb();
    const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
    if (!rows[0]) return reply.code(404).send({ error: "not_found" });
    return rows[0];
  });

  app.post("/v1/checkout", { preHandler: authenticate }, async (request, reply) => {
    try {
      const result = await createCheckout(request.user!, request.body);
      return reply.code(result.replayed ? 200 : 201).send(result);
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      return reply.code(e.statusCode ?? 400).send({ error: "checkout_failed", message: e.message });
    }
  });

  app.get("/v1/orders", { preHandler: authenticate }, async (request) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, request.user!.id));
    return { items: rows };
  });

  app.get("/v1/orders/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!rows[0] || rows[0].userId !== request.user!.id) {
      return reply.code(404).send({ error: "not_found" });
    }
    return rows[0];
  });

  app.post("/v1/webhooks/payment", async (request, reply) => {
    const raw = typeof request.body === "string" ? request.body : JSON.stringify(request.body);
    const secret = config.payment.webhookSecret || "vespera-demo-webhook-secret";
    const signature = request.headers["x-vespera-signature"] as string | undefined;

    if (!verifyWebhookSignature(raw, signature, secret)) {
      return reply.code(401).send({ error: "invalid_signature" });
    }

    const payload = typeof request.body === "object" && request.body
      ? (request.body as Record<string, unknown>)
      : (JSON.parse(raw) as Record<string, unknown>);

    const data = payload.data as { paymentRef?: string; status?: string } | undefined;
    if (!data?.paymentRef) {
      return reply.code(400).send({ error: "malformed_event" });
    }

    if (data.status === "paid") {
      const result = await markOrderPaid(
        data.paymentRef,
        String(payload.id ?? `anon_${data.paymentRef}`),
        payload,
      );
      return { ok: true, ...result };
    }

    return { ok: true, ignored: true };
  });

  /** Recruiter helper: simulate PIX settlement without exposing secrets. */
  app.post("/v1/demo/simulate-pix-paid", { preHandler: authenticate }, async (request, reply) => {
    const parsed = SimulatePixSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }

    const hook = buildMockWebhook("unknown", parsed.data.paymentRef, "paid");
    const payload = JSON.parse(hook.body) as Record<string, unknown>;
    const result = await markOrderPaid(
      parsed.data.paymentRef,
      String((payload as { id: string }).id),
      payload,
    );
    return { ok: true, ...result, note: "Mock PIX settlement for demo / recruiter walkthrough" };
  });
};
