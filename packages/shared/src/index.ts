import { z } from "zod";

export const LocaleSchema = z.enum(["pt", "en", "es"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const MoneySchema = z.object({
  amountCents: z.number().int().nonnegative(),
  currency: z.literal("BRL"),
});

export const ProductSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  sku: z.string(),
  name: z.record(LocaleSchema, z.string()),
  description: z.record(LocaleSchema, z.string()),
  priceCents: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  category: z.string(),
  imageGradient: z.string(),
  featured: z.boolean(),
});

export const CartItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});

export const CheckoutSchema = z.object({
  items: z.array(CartItemInputSchema).min(1).max(50),
  paymentMethod: z.enum(["pix", "card"]),
  idempotencyKey: z.string().min(8).max(128),
});

export const OrderStatusSchema = z.enum([
  "pending_payment",
  "paid",
  "fulfilled",
  "canceled",
  "refunded",
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const LOCALES: Locale[] = ["pt", "en", "es"];
