import { randomUUID } from "node:crypto";
import { and, count, eq, isNull } from "drizzle-orm";
import { getDb } from "./client.js";
import { products } from "./schema.js";

function picsum(slug: string): string {
  return `https://picsum.photos/seed/vespera-${slug}/900/700`;
}

const CATALOG = [
  {
    slug: "obsidian-desk-lamp",
    sku: "VES-LAMP-01",
    category: "lighting",
    priceCents: 48900,
    stock: 42,
    featured: true,
    imageGradient: "linear-gradient(145deg,#1c1917 0%,#44403c 45%,#a8a29e 100%)",
    imageUrl: picsum("obsidian-desk-lamp"),
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
    descriptionDeep: {
      pt: "A Luminária Obsidian nasceu para mesas de trabalho que exigem luz precisa sem ruído visual. O corpo em alumínio escovado é usinado em uma única peça, com um braço articulado que mantém o ângulo escolhido sem vibrar. O dimmer tátil embutido na base permite ajustar a intensidade com o toque de um dedo, enquanto o LED de espectro contínuo alterna entre 2700K e 4000K para acompanhar o ritmo do dia — mais quente à noite, mais neutro durante o trabalho focado. Consumo de 9W, vida útil estimada de 30.000 horas.",
      en: "The Obsidian Desk Lamp was built for workspaces that demand precise light without visual noise. Its brushed-aluminum body is machined from a single piece, with an articulated arm that holds its angle without drifting. A tactile dimmer built into the base lets you adjust intensity with a single touch, while the continuous-spectrum LED shifts between 2700K and 4000K to match the rhythm of your day — warmer at night, more neutral during focused work. Draws 9W, rated for roughly 30,000 hours.",
      es: "La Lámpara Obsidian nació para escritorios que exigen luz precisa sin ruido visual. Su cuerpo de aluminio cepillado se mecaniza en una sola pieza, con un brazo articulado que mantiene el ángulo elegido sin vibrar. El atenuador táctil integrado en la base permite ajustar la intensidad con un toque, mientras que el LED de espectro continuo alterna entre 2700K y 4000K para acompañar el ritmo del día. Consumo de 9W, vida útil estimada de 30.000 horas.",
    },
    specs: {
      Material: "Aluminum / anodized steel",
      Dimensions: "18 × 40 × 52 cm",
      Origin: "Made in Brazil",
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
    imageUrl: picsum("linen-throw-sand"),
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
    descriptionDeep: {
      pt: "Tecida com linho europeu de fibra longa e lavada em pedra para suavizar a mão desde a primeira lavagem, a Manta Linen Sand pega o tom quente da areia ao pôr do sol. A bainha invisível é costurada manualmente, sem pontos visíveis nas bordas, e o peso de 260g/m² garante caimento fluido sem perder estrutura sobre um sofá ou a ponta da cama. Encolhimento controlado abaixo de 3% após lavagem.",
      en: "Woven from long-staple European linen and stone-washed to soften on first touch, the Linen Throw in Sand carries the warm tone of dunes at dusk. The hem is hand-finished with no visible stitching at the edges, and its 260g/m² weight drapes fluidly over a sofa or bed foot without losing structure. Shrinkage stays under 3% after washing.",
      es: "Tejida con lino europeo de fibra larga y lavada a piedra para suavizarse desde el primer contacto, la Manta Linen en tono Arena lleva el color cálido de las dunas al atardecer. El dobladillo se termina a mano sin costuras visibles en los bordes, y su peso de 260g/m² cae con fluidez sobre un sofá o el pie de la cama sin perder estructura. Encogimiento controlado por debajo del 3% tras el lavado.",
    },
    specs: {
      Material: "100% European linen",
      Dimensions: "140 × 200 cm",
      Origin: "Woven in Portugal",
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
    imageUrl: picsum("ceramic-pourer"),
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
    descriptionDeep: {
      pt: "Torneada em grés cerâmico de alta densidade, a Jarra Stone recebe um esmalte mate aplicado em três camadas que resiste a manchas de café e chá sem perder a textura acetinada ao toque. O bico foi desenhado com um leve estrangulamento para verter sem gotejar, e a alça alargada distribui o peso mesmo quando os 800 ml estão cheios. Vai ao lava-louças e ao micro-ondas sem restrições.",
      en: "Thrown in high-density stoneware, the Stone Pourer is finished with a triple-layer matte glaze that resists coffee and tea staining without losing its satin touch. The spout has a subtle taper for a drip-free pour, and the wide handle balances the weight even when the full 800 ml is loaded. Dishwasher and microwave safe.",
      es: "Torneada en gres cerámico de alta densidad, la Jarra Stone lleva un esmalte mate en tres capas que resiste manchas de café y té sin perder su textura satinada. El pico tiene un ligero estrechamiento para verter sin goteo, y el asa ancha reparte el peso incluso con los 800 ml llenos. Apta para lavavajillas y microondas.",
    },
    specs: {
      Material: "High-density stoneware",
      Dimensions: "Ø 11 × 18 cm — 800 ml",
      Origin: "Handmade in Minas Gerais",
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
    imageUrl: picsum("walnut-tray"),
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
    descriptionDeep: {
      pt: "Cada Bandeja Nogueira é serrada de uma única tábua de nogueira americana, escolhida pelo veio contínuo que atravessa a peça sem interrupções. O acabamento em óleo natural realça o tom escuro da madeira e é reaplicável ao longo dos anos, mantendo a superfície protegida contra umidade leve. Um canal discreto na borda organiza o cabo do carregador, e os quatro pés de feltro protegem a mesa.",
      en: "Every Walnut Tray is cut from a single American walnut board, chosen for a continuous grain that runs uninterrupted across the piece. The natural oil finish deepens the wood's dark tone and can be reapplied over the years, keeping the surface protected against light moisture. A discreet edge channel keeps a charging cable tidy, and four felt feet protect your desk.",
      es: "Cada Bandeja de Nogal se corta de una sola tabla de nogal americano, elegida por su veta continua que recorre la pieza sin interrupciones. El acabado en aceite natural resalta el tono oscuro de la madera y puede reaplicarse con los años, protegiendo la superficie de la humedad leve. Un canal discreto en el borde organiza el cable del cargador, y cuatro pies de fieltro protegen la mesa.",
    },
    specs: {
      Material: "American walnut, natural oil finish",
      Dimensions: "28 × 18 × 2.5 cm",
      Origin: "Made in Brazil",
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
    imageUrl: picsum("quiet-candle"),
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
    descriptionDeep: {
      pt: "A Vela Quiet Cedar combina cera de soja com um toque de cera de coco para uma queima mais limpa e uniforme, sem os picos de fuligem comuns em parafina. A fragrância central de cedro e vetiver é discreta o suficiente para não competir com outros aromas do ambiente. O pavio de algodão trançado é testado para 45 horas de queima estável, e o vidro reaproveitável fica bonito como porta-objetos depois.",
      en: "The Quiet Cedar Candle blends soy wax with a touch of coconut wax for a cleaner, more even burn without the soot spikes common in paraffin. Its core fragrance of cedar and vetiver is subtle enough to stay out of the way of other scents in the room. The braided cotton wick is tested for a stable 45-hour burn, and the reusable glass makes a nice catch-all afterward.",
      es: "La Vela Quiet Cedar combina cera de soja con un toque de cera de coco para una combustión más limpia y uniforme, sin los picos de hollín comunes en la parafina. Su fragancia central de cedro y vetiver es lo bastante discreta para no competir con otros aromas del ambiente. La mecha de algodón trenzado está probada para 45 horas de combustión estable, y el vidrio reutilizable queda bien como recipiente después.",
    },
    specs: {
      Material: "Soy + coconut wax blend",
      Dimensions: "Ø 8 × 9 cm — 220 g",
      Origin: "Poured in São Paulo",
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
    imageUrl: picsum("steel-carafe"),
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
    descriptionDeep: {
      pt: "Feita em aço inoxidável 18/10, a Garrafa Brushed usa isolamento de parede dupla a vácuo para manter líquidos gelados por até 24 horas ou quentes por 12. A tampa com trava de um giro sela sem vazar dentro da bolsa, e a base emborrachada evita deslizes em mesas de vidro. O acabamento escovado resiste a marcas de dedo melhor que o polido.",
      en: "Made from 18/10 stainless steel, the Brushed Carafe uses vacuum double-wall insulation to keep liquids cold for up to 24 hours or hot for 12. The one-twist locking lid seals leak-free inside a bag, and the rubberized base resists sliding on glass tables. The brushed finish hides fingerprints far better than a polished one.",
      es: "Fabricada en acero inoxidable 18/10, la Garrafa Brushed usa aislamiento de doble pared al vacío para mantener líquidos fríos hasta 24 horas o calientes durante 12. La tapa con cierre de un giro sella sin fugas dentro de una bolsa, y la base engomada evita deslizamientos en mesas de vidrio. El acabado cepillado disimula las huellas mucho mejor que uno pulido.",
    },
    specs: {
      Material: "18/10 stainless steel",
      Dimensions: "Ø 9 × 27 cm — 1 L",
      Origin: "Made in Brazil",
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
    imageUrl: picsum("wool-runner"),
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
    descriptionDeep: {
      pt: "Tufada à mão com lã merino de fibra fina, a Passadeira Merino tem uma densidade de nó alta o suficiente para resistir à passagem diária sem amassar. O padrão geométrico discreto é tingido com pigmentos de baixo impacto, e a base em látex natural antiderrapante elimina a necessidade de manta extra. Recomenda-se aspirar semanalmente e rodar a peça a cada seis meses para desgaste uniforme.",
      en: "Hand-tufted from fine-fiber merino wool, the Merino Runner carries a knot density high enough to withstand daily foot traffic without matting down. Its understated geometric pattern is dyed with low-impact pigments, and the natural latex non-slip backing removes the need for an extra pad. Weekly vacuuming and rotating the piece every six months keeps wear even.",
      es: "Tufada a mano con lana merino de fibra fina, la Pasillo Merino tiene una densidad de nudo suficiente para resistir el tránsito diario sin apelmazarse. Su patrón geométrico discreto se tiñe con pigmentos de bajo impacto, y la base de látex natural antideslizante elimina la necesidad de una alfombra adicional. Se recomienda aspirar semanalmente y rotar la pieza cada seis meses para un desgaste uniforme.",
    },
    specs: {
      Material: "100% merino wool, natural latex backing",
      Dimensions: "70 × 200 cm",
      Origin: "Hand-tufted in India",
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
    imageUrl: picsum("glass-tumbler-set"),
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
    descriptionDeep: {
      pt: "Soprados individualmente, os copos do conjunto Smoke têm variações sutis de espessura que comprovam a fabricação artesanal. O tom fumê é obtido durante a fusão do vidro, não por pintura, então não desbota com o tempo ou lavagens. A borda fina é lapidada à mão para eliminar arestas, e os 320 ml comportam tanto água quanto coquetéis com gelo.",
      en: "Individually mouth-blown, the tumblers in the Smoke set carry subtle thickness variations that prove the handcraft. The smoked tone is achieved during glass fusion, not painted on, so it never fades with time or washing. The thin rim is hand-ground to remove sharp edges, and the 320 ml capacity suits both water and iced cocktails.",
      es: "Soplados individualmente, los vasos del set Smoke presentan variaciones sutiles de grosor que confirman su fabricación artesanal. El tono ahumado se logra durante la fusión del vidrio, no mediante pintura, por lo que no se desvanece con el tiempo ni los lavados. El borde fino se pule a mano para eliminar aristas, y sus 320 ml sirven tanto para agua como para cócteles con hielo.",
    },
    specs: {
      Material: "Mouth-blown smoked glass",
      Dimensions: "Ø 8 × 10 cm — 320 ml (set of 4)",
      Origin: "Handblown in Blumenau",
    },
  },
];

export async function seedIfEmpty() {
  const db = getDb();
  const [{ value }] = await db.select({ value: count() }).from(products);

  if (value === 0) {
    await db.insert(products).values(
      CATALOG.map((p) => ({ id: randomUUID(), ...p })),
    );
  }

  await ensureCatalogEnrichment();
  return { seeded: value === 0, count: value === 0 ? CATALOG.length : value };
}

/**
 * Backfills descriptionDeep / imageUrl / specs on products that predate this
 * enrichment (e.g. a live Railway database seeded before this release).
 * Only touches rows that are still missing imagery, so it never clobbers
 * hand-edited catalog data and is safe to call on every boot.
 */
export async function ensureCatalogEnrichment() {
  const db = getDb();
  for (const item of CATALOG) {
    await db
      .update(products)
      .set({
        descriptionDeep: item.descriptionDeep,
        imageUrl: item.imageUrl,
        specs: item.specs,
      })
      .where(and(eq(products.slug, item.slug), isNull(products.imageUrl)));
  }
}
