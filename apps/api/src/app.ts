import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config, corsAllowlist } from "./config.js";
import { dbRateLimitPlugin } from "./plugins/rate-limit.js";
import { routes } from "./routes/index.js";

const JSON_CSP =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'";
const DOCS_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://validator.swagger.io; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'";

function incomingRequestId(header: string | string[] | undefined): string | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return null;
  const cleaned = raw.replace(/[^\w\-./]/g, "").slice(0, 128);
  return cleaned.length > 0 ? cleaned : null;
}

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.isProd ? "info" : "debug",
      redact: [
        "req.headers.authorization",
        "PAYMENT_SECRET_KEY",
        "PAYMENT_WEBHOOK_SECRET",
        "FIREBASE_PRIVATE_KEY",
        "SESSION_JWT_SECRET",
      ],
    },
    trustProxy: true,
    bodyLimit: config.bodyLimit,
    requestIdHeader: "x-request-id",
    genReqId: (req) => incomingRequestId(req.headers["x-request-id"]) ?? randomUUID(),
  });

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    xFrameOptions: { action: "deny" },
  });

  await app.register(cors, {
    origin: corsAllowlist(),
    credentials: true,
  });

  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("x-request-id", request.id);
    if (request.url.startsWith("/docs")) {
      reply.header("content-security-policy", DOCS_CSP);
    } else {
      reply.header("content-security-policy", JSON_CSP);
    }
    return payload;
  });

  await app.register(dbRateLimitPlugin, {
    max: config.rateLimit.max,
    windowMs: config.rateLimit.windowMs,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Vespera Commerce API",
        description:
          "Stateless commerce API: idempotent checkout, HMAC webhooks, DB-backed rate limits, Firebase Auth (with demo mode).",
        version: "1.0.0",
      },
      servers: [{ url: config.publicApiUrl }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            description:
              "Firebase ID token, local session JWT, or demo token: `demo:recruiter@vespera.demo`",
          },
        },
      },
      tags: [
        { name: "catalog" },
        { name: "checkout" },
        { name: "orders" },
        { name: "webhooks" },
        { name: "meta" },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

  await app.register(routes);

  app.setErrorHandler((err, _req, reply) => {
    const error = err as Error & { statusCode?: number; code?: string };
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      app.log.error(
        { err: { name: error.name, message: error.message, code: error.code } },
        "request_failed",
      );
      return reply.code(500).send({
        error: "internal_error",
        message: "Unexpected error",
      });
    }
    const tooLarge = error.code === "FST_ERR_CTP_BODY_TOO_LARGE" || status === 413;
    return reply.code(tooLarge ? 413 : status).send({
      error: tooLarge ? "payload_too_large" : "request_error",
      message: tooLarge ? "Payload too large" : error.message,
    });
  });

  return app;
}
