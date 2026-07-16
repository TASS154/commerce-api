import fs from "node:fs";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { config } from "../config.js";
import * as schema from "./schema.js";

export type Db = ReturnType<typeof createPg> | ReturnType<typeof createPglite>;

let db: Db;
let engine: "postgres" | "pglite" = "pglite";

function createPg(url: string) {
  const client = postgres(url, {
    max: 10,
    idle_timeout: 20,
    prepare: false,
  });
  return drizzlePg(client, { schema });
}

function createPglite(dataDir: string) {
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  return drizzlePglite(client, { schema });
}

export async function initDb(): Promise<Db> {
  if (config.databaseUrl) {
    engine = "postgres";
    db = createPg(config.databaseUrl);
  } else {
    engine = "pglite";
    db = createPglite(config.pglitePath);
  }
  await migrate(db);
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export function getDbEngine(): "postgres" | "pglite" {
  return engine;
}

async function migrate(database: Db) {
  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS products (
      id text PRIMARY KEY,
      slug varchar(120) NOT NULL UNIQUE,
      sku varchar(64) NOT NULL UNIQUE,
      name jsonb NOT NULL,
      description jsonb NOT NULL,
      price_cents integer NOT NULL,
      stock integer NOT NULL DEFAULT 0,
      category varchar(64) NOT NULL,
      image_gradient text NOT NULL,
      featured boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      firebase_uid varchar(128) NOT NULL UNIQUE,
      email varchar(320) NOT NULL,
      display_name varchar(160),
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS orders (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id),
      status varchar(32) NOT NULL,
      payment_method varchar(16) NOT NULL,
      currency varchar(3) NOT NULL DEFAULT 'BRL',
      total_cents integer NOT NULL,
      idempotency_key varchar(128) NOT NULL,
      payment_ref varchar(128),
      metadata jsonb DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id, idempotency_key)
    );
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id text PRIMARY KEY,
      order_id text NOT NULL REFERENCES orders(id),
      product_id text NOT NULL REFERENCES products(id),
      quantity integer NOT NULL,
      unit_price_cents integer NOT NULL
    );
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS payment_events (
      id text PRIMARY KEY,
      provider_event_id varchar(160) NOT NULL UNIQUE,
      order_id text REFERENCES orders(id),
      payload jsonb NOT NULL,
      processed_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      id varchar(190) PRIMARY KEY,
      count integer NOT NULL DEFAULT 0,
      window_start timestamptz NOT NULL
    );
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory_reservations (
      id text PRIMARY KEY,
      order_id text NOT NULL REFERENCES orders(id),
      product_id text NOT NULL REFERENCES products(id),
      quantity integer NOT NULL,
      expires_at timestamptz NOT NULL,
      released boolean NOT NULL DEFAULT false
    );
  `);

  await database.execute(sql`CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);`);
  await database.execute(sql`CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);`);
  await database.execute(sql`CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);`);
  await database.execute(sql`CREATE INDEX IF NOT EXISTS orders_payment_ref_idx ON orders(payment_ref);`);
  await database.execute(sql`CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);`);
  await database.execute(sql`CREATE INDEX IF NOT EXISTS rate_limit_window_idx ON rate_limit_buckets(window_start);`);
}
