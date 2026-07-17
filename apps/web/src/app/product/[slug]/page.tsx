"use client";

import Link from "next/link";
import { use, useEffect, useState, type CSSProperties } from "react";
import { pickLocalized } from "@/lib/i18n";
import { api, useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { locale, tx, addToCart } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setProduct(null);
    setError(null);
    api<Product>(`/v1/products/${slug}`)
      .then(setProduct)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load product"));
  }, [slug]);

  if (error) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }}>
        <p style={{ color: "var(--danger)" }}>{error}</p>
        <Link href="/catalog" style={{ color: "var(--accent)" }}>
          ← {tx("backToCatalog")}
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ height: 360, borderRadius: 16, background: "var(--surface)" }} />
      </div>
    );
  }

  const name = pickLocalized(product.name, locale);
  const deepDescription = pickLocalized(product.descriptionDeep, locale) || pickLocalized(product.description, locale);
  const specs = product.specs ?? null;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 20px 72px" }}>
      <Link href="/catalog" style={{ color: "var(--text-muted)", fontSize: 13 }}>
        ← {tx("backToCatalog")}
      </Link>

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1fr) minmax(280px, 1fr)",
          gap: 32,
        }}
      >
        <div
          style={{
            borderRadius: 18,
            overflow: "hidden",
            aspectRatio: "4 / 3",
            background: product.imageUrl ? undefined : product.imageGradient,
            border: "1px solid var(--stroke)",
          }}
        >
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          )}
        </div>

        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 400, margin: "0 0 8px" }}>
            {name}
          </h1>
          <p style={{ fontSize: 24, margin: "0 0 6px", color: "var(--accent)" }}>
            R$ {(product.priceCents / 100).toFixed(2)}
          </p>
          <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--text-muted)" }}>
            {product.stock > 0 ? `${product.stock} ${tx("inStock")}` : tx("outOfStock")}
          </p>

          <p style={{ lineHeight: 1.7, color: "var(--text-muted)", marginBottom: 24 }}>{deepDescription}</p>

          <button
            disabled={product.stock === 0}
            onClick={() => {
              addToCart({
                productId: product.id,
                slug: product.slug,
                name,
                priceCents: product.priceCents,
              });
              setAdded(true);
              setTimeout(() => setAdded(false), 1400);
            }}
            style={{ ...primaryBtn, opacity: product.stock === 0 ? 0.5 : 1 }}
          >
            {added ? "✓" : tx("add")}
          </button>

          {specs && Object.keys(specs).length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 16, marginBottom: 10 }}>{tx("specsTitle")}</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <tbody>
                  {Object.entries(specs).map(([key, value]) => (
                    <tr key={key} style={{ borderTop: "1px solid var(--stroke)" }}>
                      <td style={{ padding: "8px 0", color: "var(--text-muted)", width: "40%" }}>{key}</td>
                      <td style={{ padding: "8px 0" }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const primaryBtn: CSSProperties = {
  background: "var(--accent)",
  color: "#1a1510",
  border: "none",
  borderRadius: 999,
  padding: "12px 22px",
  fontWeight: 600,
  cursor: "pointer",
  minWidth: 120,
};
