import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import admin from "firebase-admin";
import { config, firebaseIsConfigured } from "../config.js";
import { getDb } from "../db/client.js";
import { users } from "../db/schema.js";

export type AuthUser = {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  demo: boolean;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

let firebaseReady = false;

function initFirebase() {
  if (firebaseReady || !firebaseIsConfigured()) return;
  if (admin.apps.length) {
    firebaseReady = true;
    return;
  }

  if (config.firebase.serviceAccount) {
    const raw = config.firebase.serviceAccount;
    const json = raw.trim().startsWith("{")
      ? JSON.parse(raw)
      : JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    admin.initializeApp({ credential: admin.credential.cert(json) });
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
  }
  firebaseReady = true;
}

async function upsertUser(input: {
  firebaseUid: string;
  email: string;
  displayName?: string | null;
}): Promise<AuthUser> {
  const db = getDb();
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, input.firebaseUid))
    .limit(1);

  if (existing[0]) {
    return {
      id: existing[0].id,
      firebaseUid: existing[0].firebaseUid,
      email: existing[0].email,
      displayName: existing[0].displayName,
      demo: input.firebaseUid.startsWith("demo:"),
    };
  }

  const id = randomUUID();
  await db.insert(users).values({
    id,
    firebaseUid: input.firebaseUid,
    email: input.email,
    displayName: input.displayName ?? null,
  });

  return {
    id,
    firebaseUid: input.firebaseUid,
    email: input.email,
    displayName: input.displayName ?? null,
    demo: input.firebaseUid.startsWith("demo:"),
  };
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "unauthorized", message: "Missing Bearer token" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    reply.code(401).send({ error: "unauthorized", message: "Empty token" });
    return;
  }

  // Demo tokens: "demo:<email>" base64url or plain prefix for recruiters
  if (token.startsWith("demo.") || token.startsWith("demo:")) {
    const email =
      token.startsWith("demo:")
        ? token.slice(5) || "recruiter@vespera.demo"
        : safeDecode(token.slice(5)) || "recruiter@vespera.demo";
    request.user = await upsertUser({
      firebaseUid: `demo:${email.toLowerCase()}`,
      email: email.toLowerCase(),
      displayName: "Demo Recruiter",
    });
    return;
  }

  if (!firebaseIsConfigured()) {
    reply.code(401).send({
      error: "auth_not_configured",
      message:
        "Firebase Admin is not configured. Use Demo Auth (Bearer demo:you@email.com) or set FIREBASE_* env vars.",
    });
    return;
  }

  try {
    initFirebase();
    const decoded = await admin.auth().verifyIdToken(token, true);
    request.user = await upsertUser({
      firebaseUid: decoded.uid,
      email: (decoded.email || `${decoded.uid}@users.firebase`).toLowerCase(),
      displayName: decoded.name ?? null,
    });
  } catch {
    reply.code(401).send({ error: "unauthorized", message: "Invalid Firebase token" });
  }
}

function safeDecode(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function signWebhookPayload(body: string, secret: string): string {
  return createHash("sha256").update(`${secret}.${body}`).digest("hex");
}

export function verifyWebhookSignature(
  body: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = signWebhookPayload(body, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
