import { z } from "zod";
import { stripControlAndHtml } from "./sanitize.js";

export { stripControlAndHtml } from "./sanitize.js";

export const LocaleSchema = z.enum(["pt", "en", "es"]);
export type Locale = z.infer<typeof LocaleSchema>;

const sanitized = (max: number, min = 1) =>
  z
    .string()
    .min(min)
    .max(max)
    .transform(stripControlAndHtml)
    .refine((s) => s.length >= min && s.length <= max);

export const MoneySchema = z.object({
  amountCents: z.number().int().nonnegative(),
  currency: z.literal("BRL"),
});

export const ProductSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().max(120),
  sku: z.string().max(64),
  name: z.record(LocaleSchema, z.string().max(160)),
  description: z.record(LocaleSchema, z.string().max(400)),
  descriptionDeep: z.record(LocaleSchema, z.string().max(2000)).optional(),
  priceCents: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  category: z.string().max(64),
  imageGradient: z.string().max(240),
  imageUrl: z.string().url().max(500).nullable().optional(),
  specs: z.record(z.string().max(64), z.string().max(160)).nullable().optional(),
  featured: z.boolean(),
});

export const CartItemInputSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(20),
  })
  .strict();

export const CheckoutSchema = z
  .object({
    items: z.array(CartItemInputSchema).min(1).max(50),
    paymentMethod: z.enum(["pix", "card"]),
    idempotencyKey: sanitized(128, 8),
  })
  .strict();

export const ProductQuerySchema = z
  .object({
    category: z.string().max(64).transform(stripControlAndHtml).optional(),
    featured: z.enum(["true", "false"]).optional(),
  })
  .strip();

export const SimulatePixSchema = z
  .object({
    paymentRef: sanitized(128, 8),
  })
  .strict();

export const OrderStatusSchema = z.enum([
  "pending_payment",
  "paid",
  "fulfilled",
  "canceled",
  "refunded",
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const LOCALES: Locale[] = ["pt", "en", "es"];

export const WEBHOOK_BODY_LIMIT = 16 * 1024;
export const API_BODY_LIMIT = 64 * 1024;
