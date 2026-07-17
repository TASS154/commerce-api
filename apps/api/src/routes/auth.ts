import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate } from "../plugins/auth.js";
import { AuthError, loginUser, registerUser } from "../services/auth-local.js";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(160).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/v1/auth/register", async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }

    try {
      const result = await registerUser(
        parsed.data.email,
        parsed.data.password,
        parsed.data.displayName,
      );
      return reply.code(201).send(result);
    } catch (err) {
      const e = err as AuthError;
      return reply.code(e.statusCode ?? 400).send({ error: "register_failed", message: e.message });
    }
  });

  app.post("/v1/auth/login", async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }

    try {
      const result = await loginUser(parsed.data.email, parsed.data.password);
      return reply.send(result);
    } catch (err) {
      const e = err as AuthError;
      return reply.code(e.statusCode ?? 401).send({ error: "login_failed", message: e.message });
    }
  });

  app.get("/v1/auth/me", { preHandler: authenticate }, async (request) => {
    return { user: request.user };
  });
};
