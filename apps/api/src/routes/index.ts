import type { FastifyPluginAsync } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { ProductQuerySchema, SimulatePixSchema } from "@vespera/shared";
import { getDb, getDbEngine } from "../db/client.js";
import { orders, products } from "../db/schema.js";
import { authenticate, verifyWebhookSignature } from "../plugins/auth.js";
import { rateLimitCheckoutUser } from "../plugins/rate-limit.js";
import {
  config,
  corsAllowlist,
  firebaseIsConfigured,
  paymentIsConfigured,
} from "../config.js";
import { createCheckout, markOrderPaid } from "../services/orders.js";
import { buildMockWebhook } from "../services/payment.js";
import { authRoutes } from "./auth.js";

function webhookBody(body: unknown): { raw: string; json: Record<string, unknown> } | null {
  if (body && typeof body === "object" && "raw" in body && "json" in body) {
    const envelope = body as { raw: unknown; json: unknown };
    if (typeof envelope.raw === "string" && envelope.json && typeof envelope.json === "object") {
      return { raw: envelope.raw, json: envelope.json as Record<string, unknown> };
    }
  }
  if (typeof body === "string") {
    try {
      return { raw: body, json: JSON.parse(body) as Record<string, unknown> };
    } catch {
      return null;
    }
  }
  if (body && typeof body === "object") {
    const json = body as Record<string, unknown>;
    return { raw: JSON.stringify(json), json };
  }
  return null;
}

const JSON_CSP =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'";

function securitySnapshot() {
  return {
    helmet: true,
    csp: JSON_CSP,
    corsAllowlist: corsAllowlist(),
    rateLimit: {
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      authMax: config.rateLimit.authMax,
      checkoutKeyedBy: ["ip", "userId"],
    },
    idempotentCheckout: true,
    inventoryCas: true,
    hmacWebhooks: true,
    bodyLimit: config.bodyLimit,
    webhookBodyLimit: config.webhookBodyLimit,
    trustProxy: true,
    requestIdHeader: "x-request-id",
    authModes: [
      "local_jwt",
      "demo",
      ...(firebaseIsConfigured() ? (["firebase"] as const) : []),
    ],
    mfa: { enabled: false, reason: "skipped_no_paid_idp" as const },
    roles: ["customer", "ops"] as const,
    simulatePix: {
      production: "ops",
      nonProduction: "authenticated",
    },
  };
}

export const routes: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes);

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
    security: "/v1/security",
  }));

  app.get("/v1/security", { preHandler: authenticate }, async () => securitySnapshot());

  app.get("/v1/products", async (request, reply) => {
    const parsed = ProductQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_query", details: parsed.error.flatten() });
    }

    const db = getDb();
    const filters = [];
    if (parsed.data.category) filters.push(eq(products.category, parsed.data.category));
    if (parsed.data.featured === "true") filters.push(eq(products.featured, true));

    const rows = await db
      .select()
      .from(products)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(products.slug));

    return { items: rows, count: rows.length };
  });

  app.get("/v1/products/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!slug || slug.length > 120) {
      return reply.code(400).send({ error: "invalid_slug" });
    }
    const db = getDb();
    const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
    if (!rows[0]) return reply.code(404).send({ error: "not_found" });
    return rows[0];
  });

  app.post(
    "/v1/checkout",
    { preHandler: [authenticate, rateLimitCheckoutUser] },
    async (request, reply) => {
      try {
        const result = await createCheckout(request.user!, request.body);
        return reply.code(result.replayed ? 200 : 201).send(result);
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        return reply.code(e.statusCode ?? 400).send({ error: "checkout_failed", message: e.message });
      }
    },
  );

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

  await app.register(async (hookApp) => {
    hookApp.addContentTypeParser(
      "application/json",
      { parseAs: "string", bodyLimit: config.webhookBodyLimit },
      (req, body, done) => {
        const text = typeof body === "string" ? body : Buffer.from(body as Buffer).toString("utf8");
        if (Buffer.byteLength(text, "utf8") > config.webhookBodyLimit) {
          done(Object.assign(new Error("Payload too large"), { statusCode: 413 }), undefined);
          return;
        }
        try {
          done(null, { raw: text, json: JSON.parse(text) as Record<string, unknown> });
        } catch {
          done(Object.assign(new Error("Invalid JSON"), { statusCode: 400 }), undefined);
        }
      },
    );

    hookApp.post(
      "/v1/webhooks/payment",
      { bodyLimit: config.webhookBodyLimit },
      async (request, reply) => {
        const parsed = webhookBody(request.body);
        if (!parsed) return reply.code(400).send({ error: "malformed_event" });
        if (Buffer.byteLength(parsed.raw, "utf8") > config.webhookBodyLimit) {
          return reply.code(413).send({ error: "payload_too_large" });
        }
        const secret = config.payment.webhookSecret || "vespera-demo-webhook-secret";
        const signature = request.headers["x-vespera-signature"] as string | undefined;

        if (!verifyWebhookSignature(parsed.raw, signature, secret)) {
          return reply.code(401).send({ error: "invalid_signature" });
        }

        const payload = parsed.json;
        const data = payload.data as { paymentRef?: string; status?: string } | undefined;
        if (!data?.paymentRef || typeof data.paymentRef !== "string" || data.paymentRef.length > 128) {
          return reply.code(400).send({ error: "malformed_event" });
        }

        if (data.status === "paid") {
          const result = await markOrderPaid(
            data.paymentRef,
            String(payload.id ?? `anon_${data.paymentRef}`).slice(0, 160),
            payload,
          );
          return { ok: true, ...result };
        }

        return { ok: true, ignored: true };
      },
    );
  });

  /** Recruiter helper: simulate PIX settlement. Production: ops only. */
  app.post("/v1/demo/simulate-pix-paid", { preHandler: authenticate }, async (request, reply) => {
    if (config.isProd && request.user!.role !== "ops") {
      return reply.code(403).send({
        error: "forbidden",
        message: "Payment settlement is restricted to operations in production.",
      });
    }

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
    return { ok: true, ...result };
  });
};
