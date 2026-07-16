"use client";

import { useEffect, useState } from "react";
import { pickLocalized } from "@/lib/i18n";
import { api, useStore } from "@/lib/store";

type Product = {
  id: string;
  slug: string;
  name: Record<string, string>;
  description: Record<string, string>;
  priceCents: number;
  stock: number;
  featured: boolean;
  imageGradient: string;
  category: string;
};

export default function CatalogPage() {
  const { locale, tx, addToCart } = useStore();
  const [items, setItems] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: Product[] }>("/v1/products")
      .then((r) => setItems(r.items))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 20px 64px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 400, marginBottom: 8 }}>
        {tx("shop")}
      </h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0, marginBottom: 28 }}>{tx("featured")}</p>
      {error && (
        <p style={{ color: "var(--danger)", maxWidth: 560, lineHeight: 1.5 }}>
          {error}
          {error.includes("localhost") || error.includes("dev:api")
            ? ""
            : " Locally: npm run dev:api. Production: point NEXT_PUBLIC_API_URL at the hosted API."}
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 18,
        }}
      >
        {items.map((p, idx) => (
          <article
            key={p.id}
            className={`rise rise-delay-${Math.min(idx % 3, 3)}`}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--stroke)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ height: 160, background: p.imageGradient }} />
            <div style={{ padding: 16, justifyContent: "space-between", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>{pickLocalized(p.name, locale)}</h2>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.45 }}>
                  {pickLocalized(p.description, locale)}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <strong>R$ {(p.priceCents / 100).toFixed(2)}</strong>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {p.stock} {tx("stock")}
                  </div>
                </div>
                <button
                  onClick={() =>
                    addToCart({
                      productId: p.id,
                      slug: p.slug,
                      name: pickLocalized(p.name, locale),
                      priceCents: p.priceCents,
                    })
                  }
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    border: "1px solid rgba(196,165,116,0.35)",
                    borderRadius: 999,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {tx("add")}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
