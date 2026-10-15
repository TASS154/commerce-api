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

export type SecuritySnapshot = {
  helmet: boolean;
  csp: string;
  corsAllowlist: string[];
  rateLimit: {
    windowMs: number;
    max: number;
    authMax: number;
    checkoutKeyedBy: string[];
  };
  idempotentCheckout: boolean;
  inventoryCas: boolean;
  hmacWebhooks: boolean;
  bodyLimit: number;
  webhookBodyLimit: number;
  trustProxy: boolean;
  requestIdHeader: string;
  authModes: string[];
  mfa: { enabled: boolean; reason: string };
  roles: string[];
  simulatePix: { production: string; nonProduction: string };
};
