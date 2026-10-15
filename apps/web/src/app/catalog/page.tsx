"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductPhoto } from "@/components/ProductPhoto";
import { pickLocalized } from "@/lib/i18n";
import { api, useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

const FILTERS = [
  { id: "all", query: "" },
  { id: "featured", query: "?featured=true" },
  { id: "lighting", query: "?category=lighting" },
  { id: "textiles", query: "?category=textiles" },
  { id: "tableware", query: "?category=tableware" },
  { id: "workspace", query: "?category=workspace" },
  { id: "ambiance", query: "?category=ambiance" },
] as const;

function filterLabel(id: (typeof FILTERS)[number]["id"]) {
  if (id === "all") return "filterAll" as const;
  if (id === "featured") return "featured" as const;
  return `cat_${id}` as "cat_lighting" | "cat_textiles" | "cat_tableware" | "cat_workspace" | "cat_ambiance";
}

export default function CatalogPage() {
  const { locale, tx, addToCart } = useStore();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [items, setItems] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = FILTERS.find((f) => f.id === filter)?.query ?? "";
    setError(null);
    api<{ items: Product[] }>(`/v1/products${q}`)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load catalog"));
  }, [filter]);

  return (
    <div className="page">
      <p className="eyebrow">{tx("collection")}</p>
      <h1 className="display" style={{ fontSize: 48, margin: "0 0 8px" }}>
        {tx("shop")}
      </h1>
      <p className="muted" style={{ marginTop: 0, maxWidth: 520, lineHeight: 1.55 }}>
        {tx("catalogLead")}
      </p>

      <div className="filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`filter${filter === f.id ? " is-on" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {tx(filterLabel(f.id))}
          </button>
        ))}
      </div>

      {error && (
        <p style={{ color: "var(--danger)", maxWidth: 560, lineHeight: 1.5 }}>
          {error} {tx("apiHint")}
        </p>
      )}

      <div className="catalog-grid">
        {items.map((p) => {
          const name = pickLocalized(p.name, locale);
          return (
            <article key={p.id} className="catalog-card">
              <Link href={`/product/${p.slug}`} className="photo-frame" style={{ display: "block" }}>
                <ProductPhoto
                  src={p.imageUrl}
                  alt={name}
                  gradient={p.imageGradient}
                  sizes="(max-width: 700px) 100vw, 33vw"
                />
              </Link>
              <div className="meta">
                <div>
                  <Link href={`/product/${p.slug}`}>
                    <h2 className="display" style={{ margin: "0 0 6px", fontSize: 24 }}>
                      {name}
                    </h2>
                  </Link>
                  <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                    {pickLocalized(p.description, locale)}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <strong>R$ {(p.priceCents / 100).toFixed(2)}</strong>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {p.stock === 0
                        ? tx("outOfStock")
                        : p.stock < 8
                          ? `${p.stock} ${tx("lowStock")}`
                          : `${p.stock} ${tx("inStock")}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "8px 12px" }}
                    disabled={p.stock === 0}
                    onClick={() =>
                      addToCart({
                        productId: p.id,
                        slug: p.slug,
                        name,
                        priceCents: p.priceCents,
                      })
                    }
                  >
                    {tx("add")}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
