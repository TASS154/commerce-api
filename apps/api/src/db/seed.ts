import { randomUUID } from "node:crypto";
import { count } from "drizzle-orm";
import { getDb } from "./client.js";
import { products } from "./schema.js";

const CATALOG = [
  {
    slug: "obsidian-desk-lamp",
    sku: "VES-LAMP-01",
    category: "lighting",
    priceCents: 48900,
    stock: 42,
    featured: true,
    imageGradient: "linear-gradient(145deg,#1c1917 0%,#44403c 45%,#a8a29e 100%)",
    name: {
      pt: "Luminária Obsidian",
      en: "Obsidian Desk Lamp",
      es: "Lámpara Obsidian",
    },
    description: {
      pt: "Alumínio escovado, dimmer tátil e temperatura de cor ajustável.",
      en: "Brushed aluminum, tactile dimmer, tunable color temperature.",
      es: "Aluminio cepillado, atenuador táctil y temperatura de color ajustable.",
    },
  },
  {
    slug: "linen-throw-sand",
    sku: "VES-THRW-02",
    category: "textiles",
    priceCents: 21900,
    stock: 80,
    featured: true,
    imageGradient: "linear-gradient(145deg,#78716c 0%,#d6d3d1 55%,#fafaf9 100%)",
    name: {
      pt: "Manta Linen Sand",
      en: "Linen Throw — Sand",
      es: "Manta Linen Arena",
    },
    description: {
      pt: "Linho europeu lavado, bainha invisível, 140×200 cm.",
      en: "Washed European linen, invisible hem, 140×200 cm.",
      es: "Lino europeo lavado, dobladillo invisible, 140×200 cm.",
    },
  },
  {
    slug: "ceramic-pourer",
    sku: "VES-CER-03",
    category: "tableware",
    priceCents: 12900,
    stock: 120,
    featured: false,
    imageGradient: "linear-gradient(145deg,#292524 0%,#57534e 40%,#e7e5e4 100%)",
    name: {
      pt: "Jarra Cerâmica Stone",
      en: "Stone Ceramic Pourer",
      es: "Jarra Cerámica Stone",
    },
    description: {
      pt: "Esmalte mate, capacidade 800 ml, apta a lava-louças.",
      en: "Matte glaze, 800 ml capacity, dishwasher safe.",
      es: "Esmalte mate, 800 ml, apta para lavavajillas.",
    },
  },
  {
    slug: "walnut-tray",
    sku: "VES-WOOD-04",
    category: "workspace",
    priceCents: 34900,
    stock: 35,
    featured: true,
    imageGradient: "linear-gradient(145deg,#1c1917 0%,#78350f 50%,#d6d3d1 100%)",
    name: {
      pt: "Bandeja Nogueira",
      en: "Walnut Catchall Tray",
      es: "Bandeja de Nogal",
    },
    description: {
      pt: "Nogueira americana, óleo natural, compartimento para cabo.",
      en: "American walnut, natural oil finish, cable channel.",
      es: "Nogal americano, aceite natural, canal para cable.",
    },
  },
  {
    slug: "quiet-candle",
    sku: "VES-CNDL-05",
    category: "ambiance",
    priceCents: 8900,
    stock: 200,
    featured: false,
    imageGradient: "linear-gradient(145deg,#44403c 0%,#a8a29e 50%,#f5f5f4 100%)",
    name: {
      pt: "Vela Quiet Cedar",
      en: "Quiet Cedar Candle",
      es: "Vela Quiet Cedar",
    },
    description: {
      pt: "Cera de soja, pavio de algodão, 45 h de queima.",
      en: "Soy wax, cotton wick, 45-hour burn time.",
      es: "Cera de soja, mecha de algodón, 45 h de combustión.",
    },
  },
  {
    slug: "steel-carafe",
    sku: "VES-STL-06",
    category: "tableware",
    priceCents: 27900,
    stock: 55,
    featured: false,
    imageGradient: "linear-gradient(145deg,#0c0a09 0%,#57534e 55%,#fafaf9 100%)",
    name: {
      pt: "Garrafa Inox Brushed",
      en: "Brushed Steel Carafe",
      es: "Garrafa Acero Cepillado",
    },
    description: {
      pt: "Inox 18/10, 1 L, isolamento de parede dupla.",
      en: "18/10 stainless, 1 L, double-wall insulation.",
      es: "Acero 18/10, 1 L, aislamiento de doble pared.",
    },
  },
  {
    slug: "wool-runner",
    sku: "VES-RUG-07",
    category: "textiles",
    priceCents: 59900,
    stock: 18,
    featured: true,
    imageGradient: "linear-gradient(145deg,#1c1917 0%,#3f3f46 40%,#a1a1aa 100%)",
    name: {
      pt: "Passadeira Merino",
      en: "Merino Hall Runner",
      es: "Pasillo Merino",
    },
    description: {
      pt: "Lã merino, base antiderrapante, 70×200 cm.",
      en: "Merino wool, non-slip backing, 70×200 cm.",
      es: "Lana merino, base antideslizante, 70×200 cm.",
    },
  },
  {
    slug: "glass-tumbler-set",
    sku: "VES-GLS-08",
    category: "tableware",
    priceCents: 15900,
    stock: 90,
    featured: false,
    imageGradient: "linear-gradient(145deg,#292524 0%,#78716c 45%,#e7e5e4 100%)",
    name: {
      pt: "Conjunto Copos Smoke",
      en: "Smoke Tumbler Set (4)",
      es: "Set Vasos Smoke (4)",
    },
    description: {
      pt: "Vidro fumê soprado, 320 ml, borda fina.",
      en: "Blown smoke glass, 320 ml, thin rim.",
      es: "Vidrio ahumado soplado, 320 ml, borde fino.",
    },
  },
];

export async function seedIfEmpty() {
  const db = getDb();
  const [{ value }] = await db.select({ value: count() }).from(products);
  if (value > 0) return { seeded: false, count: value };

  await db.insert(products).values(
    CATALOG.map((p) => ({ id: randomUUID(), ...p })),
  );
  return { seeded: true, count: CATALOG.length };
}
