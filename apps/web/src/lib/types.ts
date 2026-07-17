export type Product = {
  id: string;
  slug: string;
  sku: string;
  name: Record<string, string>;
  description: Record<string, string>;
  descriptionDeep?: Record<string, string>;
  priceCents: number;
  stock: number;
  featured: boolean;
  imageGradient: string;
  imageUrl?: string | null;
  specs?: Record<string, string> | null;
  category: string;
};
