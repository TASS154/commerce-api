import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { getDb } from "../db/client.js";
import { users } from "../db/schema.js";
import type { AuthUser } from "../plugins/auth.js";

const BCRYPT_ROUNDS = 12;
const SESSION_TTL = "7d";
const MIN_PASSWORD_LENGTH = 8;

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(config.sessionJwtSecret);
}

export async function issueSessionToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email, typ: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secretKey());
}

/** Returns the decoded claims for a valid local session JWT, or null if it doesn't verify. */
export async function verifySessionToken(
  token: string,
): Promise<{ sub: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || payload.typ !== "session") return null;
    return { sub: payload.sub, email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}

export async function loadUserById(id: string): Promise<AuthUser | null> {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    firebaseUid: row.firebaseUid ?? "",
    email: row.email,
    displayName: row.displayName,
    demo: false,
  };
}

export async function registerUser(
  email: string,
  password: string,
  displayName?: string | null,
): Promise<{ token: string; user: AuthUser }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new AuthError("Email is required", 400);
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
  }

  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existing[0]) throw new AuthError("An account with this email already exists", 409);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = randomUUID();
  const firebaseUid = `local:${randomUUID()}`;
  const cleanDisplayName = displayName?.trim() || null;

  await db.insert(users).values({
    id,
    firebaseUid,
    email: normalizedEmail,
    displayName: cleanDisplayName,
    passwordHash,
    authProvider: "local",
  });

  const token = await issueSessionToken(id, normalizedEmail);
  return {
    token,
    user: { id, firebaseUid, email: normalizedEmail, displayName: cleanDisplayName, demo: false },
  };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  const row = rows[0];

  if (!row || !row.passwordHash) {
    throw new AuthError("Invalid email or password", 401);
  }

  const valid = await bcrypt.compare(password, row.passwordHash);
  if (!valid) throw new AuthError("Invalid email or password", 401);

  const token = await issueSessionToken(row.id, row.email);
  return {
    token,
    user: {
      id: row.id,
      firebaseUid: row.firebaseUid ?? "",
      email: row.email,
      displayName: row.displayName,
      demo: false,
    },
  };
}
