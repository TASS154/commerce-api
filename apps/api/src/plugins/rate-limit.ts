import { and, eq, sql } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { getDb } from "../db/client.js";
import { rateLimitBuckets } from "../db/schema.js";

export async function consumeBucket(
  parts: string[],
  max: number,
): Promise<{ current: number; limited: boolean; reset: number; windowStartMs: number }> {
  const windowMs = config.rateLimit.windowMs;
  const windowStartMs = Math.floor(Date.now() / windowMs) * windowMs;
  const key = `${parts.join(":")}:${windowStartMs}`.slice(0, 190);
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

  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - windowMs * 3);
    await db.delete(rateLimitBuckets).where(and(sql`${rateLimitBuckets.windowStart} < ${cutoff}`));
  }

  return {
    current,
    limited: current > max,
    reset: windowStartMs + windowMs,
    windowStartMs,
  };
}

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

    const { current, limited, reset } = await consumeBucket(
      [opts.keyPrefix ?? "rl", routeBucket, ip],
      max,
    );

    reply.header("X-RateLimit-Limit", String(max));
    reply.header("X-RateLimit-Remaining", String(Math.max(0, max - current)));
    reply.header("X-RateLimit-Reset", String(reset));

    if (limited) {
      return reply.code(429).send({
        error: "rate_limited",
        message: "Too many requests from this IP. Try again shortly.",
      });
    }
  });
};

/** Extra checkout bucket keyed by authenticated user id (in addition to IP). */
export async function rateLimitCheckoutUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.user?.id;
  if (!userId) return;

  const max = Math.min(config.rateLimit.max, config.rateLimit.authMax);
  const { current, limited, reset } = await consumeBucket(["rl", "checkout", "user", userId], max);

  reply.header("X-RateLimit-User-Limit", String(max));
  reply.header("X-RateLimit-User-Remaining", String(Math.max(0, max - current)));
  reply.header("X-RateLimit-User-Reset", String(reset));

  if (limited) {
    return reply.code(429).send({
      error: "rate_limited",
      message: "Too many checkout requests for this account. Try again shortly.",
    });
  }
}
