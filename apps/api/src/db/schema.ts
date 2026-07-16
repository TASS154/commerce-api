import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    sku: varchar("sku", { length: 64 }).notNull(),
    name: jsonb("name").$type<Record<string, string>>().notNull(),
    description: jsonb("description").$type<Record<string, string>>().notNull(),
    priceCents: integer("price_cents").notNull(),
    stock: integer("stock").notNull().default(0),
    category: varchar("category", { length: 64 }).notNull(),
    imageGradient: text("image_gradient").notNull(),
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("products_slug_uidx").on(t.slug),
    uniqueIndex("products_sku_uidx").on(t.sku),
    index("products_category_idx").on(t.category),
  ],
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    firebaseUid: varchar("firebase_uid", { length: 128 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    displayName: varchar("display_name", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_firebase_uid_uidx").on(t.firebaseUid)],
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    status: varchar("status", { length: 32 }).notNull(),
    paymentMethod: varchar("payment_method", { length: 16 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
    totalCents: integer("total_cents").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    paymentRef: varchar("payment_ref", { length: 128 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("orders_idempotency_uidx").on(t.userId, t.idempotencyKey),
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
    index("orders_payment_ref_idx").on(t.paymentRef),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: text("id").primaryKey(),
    providerEventId: varchar("provider_event_id", { length: 160 }).notNull(),
    orderId: text("order_id").references(() => orders.id),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("payment_events_provider_uidx").on(t.providerEventId)],
);

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    id: varchar("id", { length: 190 }).primaryKey(),
    count: integer("count").notNull().default(0),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  },
  (t) => [index("rate_limit_window_idx").on(t.windowStart)],
);

export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    released: boolean("released").notNull().default(false),
  },
  (t) => [
    index("reservations_product_idx").on(t.productId),
    index("reservations_order_idx").on(t.orderId),
  ],
);
