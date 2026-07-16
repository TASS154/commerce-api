export type Locale = "pt" | "en" | "es";

export const LOCALES: Locale[] = ["pt", "en", "es"];

const dict = {
  pt: {
    brand: "Vespera",
    tagline: "Objetos quietos para espaços atentos.",
    shop: "Catálogo",
    architecture: "Arquitetura",
    docs: "API Docs",
    cart: "Carrinho",
    loginDemo: "Entrar (demo)",
    logout: "Sair",
    featured: "Em destaque",
    add: "Adicionar",
    checkoutPix: "Pagar com Pix (demo)",
    checkoutCard: "Pagar com cartão (demo)",
    emptyCart: "Seu carrinho está vazio.",
    orderPaid: "Pedido pago",
    orderPending: "Aguardando pagamento",
    simulatePix: "Simular Pix pago",
    heroCta: "Explorar coleção",
    heroSecondary: "Ver engenharia",
    stock: "estoque",
    secureNote: "Demo segura: sem chaves reais. Auth demo ou Firebase Google.",
    lang: "Idioma",
    flowTitle: "Fluxo de pedido",
    archTitle: "Arquitetura",
    archLead:
      "API stateless preparada para escala horizontal, com limites por IP no banco, checkout idempotente e webhooks HMAC.",
  },
  en: {
    brand: "Vespera",
    tagline: "Quiet objects for attentive rooms.",
    shop: "Catalog",
    architecture: "Architecture",
    docs: "API Docs",
    cart: "Cart",
    loginDemo: "Sign in (demo)",
    logout: "Sign out",
    featured: "Featured",
    add: "Add",
    checkoutPix: "Pay with Pix (demo)",
    checkoutCard: "Pay with card (demo)",
    emptyCart: "Your cart is empty.",
    orderPaid: "Order paid",
    orderPending: "Awaiting payment",
    simulatePix: "Simulate Pix paid",
    heroCta: "Browse collection",
    heroSecondary: "See engineering",
    stock: "in stock",
    secureNote: "Safe demo: no live secrets. Demo auth or Firebase Google.",
    lang: "Language",
    flowTitle: "Order flow",
    archTitle: "Architecture",
    archLead:
      "Stateless API built for horizontal scale — DB-backed IP rate limits, idempotent checkout, HMAC webhooks.",
  },
  es: {
    brand: "Vespera",
    tagline: "Objetos silenciosos para espacios atentos.",
    shop: "Catálogo",
    architecture: "Arquitectura",
    docs: "API Docs",
    cart: "Carrito",
    loginDemo: "Entrar (demo)",
    logout: "Salir",
    featured: "Destacados",
    add: "Añadir",
    checkoutPix: "Pagar con Pix (demo)",
    checkoutCard: "Pagar con tarjeta (demo)",
    emptyCart: "Tu carrito está vacío.",
    orderPaid: "Pedido pagado",
    orderPending: "Esperando pago",
    simulatePix: "Simular Pix pagado",
    heroCta: "Ver colección",
    heroSecondary: "Ver ingeniería",
    stock: "en stock",
    secureNote: "Demo segura: sin secretos reales. Auth demo o Firebase Google.",
    lang: "Idioma",
    flowTitle: "Flujo de pedido",
    archTitle: "Arquitectura",
    archLead:
      "API sin estado lista para escala horizontal: rate limit por IP en DB, checkout idempotente y webhooks HMAC.",
  },
} as const;

export type DictKey = keyof typeof dict.en;

export function t(locale: Locale, key: DictKey): string {
  return dict[locale][key];
}

export function pickLocalized(
  map: Record<string, string> | undefined,
  locale: Locale,
): string {
  if (!map) return "";
  return map[locale] || map.en || map.pt || Object.values(map)[0] || "";
}
