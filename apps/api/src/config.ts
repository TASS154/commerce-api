import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function env(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  nodeEnv: env("NODE_ENV", "development"),
  isProd: env("NODE_ENV", "development") === "production",
  port: envInt("PORT", 4000),
  host: env("HOST", "0.0.0.0"),
  corsOrigin: env("CORS_ORIGIN", "http://localhost:3000"),
  publicApiUrl: env("PUBLIC_API_URL", "http://localhost:4000"),
  publicWebUrl: env("PUBLIC_WEB_URL", "http://localhost:3000"),
  databaseUrl: env("DATABASE_URL"),
  pglitePath: env("PGLITE_PATH", path.join(__dirname, "..", "data", "pglite")),
  sessionJwtSecret: env("SESSION_JWT_SECRET", "vespera-dev-jwt-change-me"),
  rateLimit: {
    windowMs: envInt("RATE_LIMIT_WINDOW_MS", 60_000),
    max: envInt("RATE_LIMIT_MAX", 60),
    authMax: envInt("RATE_LIMIT_AUTH_MAX", 20),
  },
  firebase: {
    projectId: env("FIREBASE_PROJECT_ID"),
    clientEmail: env("FIREBASE_CLIENT_EMAIL"),
    privateKey: env("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    serviceAccount: env("FIREBASE_SERVICE_ACCOUNT"),
  },
  payment: {
    provider: env("PAYMENT_PROVIDER", "mock") as "mock" | "live",
    secretKey: env("PAYMENT_SECRET_KEY"),
    publicKey: env("PAYMENT_PUBLIC_KEY"),
    webhookSecret: env("PAYMENT_WEBHOOK_SECRET"),
  },
};

export function paymentIsConfigured(): boolean {
  return Boolean(config.payment.secretKey && config.payment.webhookSecret);
}

export function firebaseIsConfigured(): boolean {
  if (config.firebase.serviceAccount) return true;
  return Boolean(
    config.firebase.projectId &&
      config.firebase.clientEmail &&
      config.firebase.privateKey,
  );
}
