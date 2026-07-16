import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "./config.js";
import { dbRateLimitPlugin } from "./plugins/rate-limit.js";
import { routes } from "./routes/index.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.isProd ? "info" : "debug",
      redact: ["req.headers.authorization", "PAYMENT_SECRET_KEY", "FIREBASE_PRIVATE_KEY"],
    },
    trustProxy: true,
    bodyLimit: 64 * 1024,
  });

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: config.corsOrigin.split(",").map((s) => s.trim()),
    credentials: true,
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
          "Stateless commerce API designed for horizontal scale: idempotent checkout, HMAC webhooks, DB-backed rate limits, Firebase Auth (with demo mode).",
        version: "1.0.0",
      },
      servers: [{ url: config.publicApiUrl }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            description:
              "Firebase ID token, or demo token: `demo:recruiter@vespera.demo`",
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
    const error = err as Error & { statusCode?: number };
    const status = error.statusCode ?? 500;
    if (status >= 500) app.log.error(error);
    reply.code(status).send({
      error: status >= 500 ? "internal_error" : "request_error",
      message: status >= 500 ? "Unexpected error" : error.message,
    });
  });

  return app;
}
