import { and, eq, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { config } from "../config.js";
import { getDb } from "../db/client.js";
import { rateLimitBuckets } from "../db/schema.js";

/**
 * DB-backed sliding window limiter.
 * Survives horizontal scale without Redis (slightly higher latency, lower ops cost).
 */
export const dbRateLimitPlugin: FastifyPluginAsync<{
  max: number;
  windowMs: number;
  keyPrefix?: string;
}> = async (app, opts) => {
  app.addHook("onRequest", async (request, reply) => {
    if (request.method === "OPTIONS") return;
    if (request.url.startsWith("/docs") || request.url === "/health") return;

    const ip =
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      request.ip ||
      "unknown";

    const routeBucket = request.url.startsWith("/v1/checkout")
      ? "checkout"
      : request.url.startsWith("/v1/auth")
        ? "auth"
        : "api";

    const max =
      routeBucket === "checkout" || routeBucket === "auth"
        ? Math.min(opts.max, config.rateLimit.authMax)
        : opts.max;

    const windowStartMs =
      Math.floor(Date.now() / opts.windowMs) * opts.windowMs;
    const key = `${opts.keyPrefix ?? "rl"}:${routeBucket}:${ip}:${windowStartMs}`;
    const db = getDb();
    const windowStart = new Date(windowStartMs);

    await db
      .insert(rateLimitBuckets)
      .values({ id: key, count: 1, windowStart })
      .onConflictDoUpdate({
        target: rateLimitBuckets.id,
        set: { count: sql`${rateLimitBuckets.count} + 1` },
      });

    const rows = await db
      .select()
      .from(rateLimitBuckets)
      .where(eq(rateLimitBuckets.id, key))
      .limit(1);

    const current = rows[0]?.count ?? 1;
    reply.header("X-RateLimit-Limit", String(max));
    reply.header("X-RateLimit-Remaining", String(Math.max(0, max - current)));
    reply.header("X-RateLimit-Reset", String(windowStartMs + opts.windowMs));

    if (current > max) {
      return reply.code(429).send({
        error: "rate_limited",
        message: "Too many requests from this IP. Try again shortly.",
      });
    }

    // Opportunistic cleanup of old windows (cheap, probabilistic)
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - opts.windowMs * 3);
      await db
        .delete(rateLimitBuckets)
        .where(and(sql`${rateLimitBuckets.windowStart} < ${cutoff}`));
    }
  });
};
