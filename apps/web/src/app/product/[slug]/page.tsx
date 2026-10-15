"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ProductPhoto } from "@/components/ProductPhoto";
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
      .catch((e) => setError(e instanceof Error ? e.message : tx("productNotFound")));
  }, [slug, tx]);

  if (error) {
    return (
      <div className="page-narrow">
        <p style={{ color: "var(--danger)" }}>{error}</p>
        <Link href="/catalog" className="muted" style={{ fontSize: 13 }}>
          ← {tx("backToCatalog")}
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page">
        <div className="photo-frame" style={{ height: 420 }} />
      </div>
    );
  }

  const name = pickLocalized(product.name, locale);
  const deepDescription =
    pickLocalized(product.descriptionDeep, locale) || pickLocalized(product.description, locale);
  const specs = product.specs ?? null;

  return (
    <div className="page">
      <Link href="/catalog" className="muted" style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        ← {tx("backToCatalog")}
      </Link>

      <div className="pdp">
        <div className="photo-frame">
          <ProductPhoto
            src={product.imageUrl}
            alt={name}
            gradient={product.imageGradient}
            sizes="(max-width: 860px) 100vw, 50vw"
            priority
          />
        </div>

        <div>
          <p className="eyebrow">{product.category}</p>
          <h1 className="display" style={{ fontSize: 42, margin: "0 0 12px" }}>
            {name}
          </h1>
          <p style={{ fontSize: 22, margin: "0 0 8px" }}>R$ {(product.priceCents / 100).toFixed(2)}</p>
          <p className="muted" style={{ margin: "0 0 24px", fontSize: 13 }}>
            {product.stock === 0
              ? tx("outOfStock")
              : product.stock < 8
                ? `${product.stock} ${tx("lowStock")}`
                : `${product.stock} ${tx("inStock")}`}
          </p>

          <p className="muted" style={{ lineHeight: 1.7, marginBottom: 28 }}>
            {deepDescription}
          </p>

          <button
            type="button"
            className="btn"
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
          >
            {added ? tx("added") : tx("add")}
          </button>

          {specs && Object.keys(specs).length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h2 className="eyebrow">{tx("specsTitle")}</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <tbody>
                  {Object.entries(specs).map(([key, value]) => (
                    <tr key={key} style={{ borderTop: "1px solid var(--rule)" }}>
                      <td className="muted" style={{ padding: "10px 0", width: "42%" }}>
                        {key}
                      </td>
                      <td style={{ padding: "10px 0" }}>{value}</td>
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
