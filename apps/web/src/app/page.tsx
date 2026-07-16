"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

export default function HomePage() {
  const { tx } = useStore();

  return (
    <section
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "grid",
        placeItems: "center",
        padding: "48px 20px 72px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 70% 40%, rgba(196,165,116,0.18), transparent 42%), linear-gradient(120deg,#1a1713 0%,#0f0e0c 55%,#14110e 100%)",
          zIndex: 0,
        }}
      />
      <div style={{ maxWidth: 780, textAlign: "center", position: "relative", zIndex: 1 }}>
        <p className="rise" style={{ color: "var(--accent)", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, marginBottom: 18 }}>
          Commerce platform
        </p>
        <h1
          className="rise rise-delay-1"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(42px, 8vw, 72px)",
            fontWeight: 400,
            lineHeight: 1.05,
            margin: "0 0 18px",
          }}
        >
          {tx("brand")}
        </h1>
        <p className="rise rise-delay-2" style={{ color: "var(--text-muted)", fontSize: 18, margin: "0 0 32px" }}>
          {tx("tagline")}
        </p>
        <div className="rise rise-delay-3" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/catalog"
            style={{
              background: "var(--accent)",
              color: "#1a1510",
              padding: "12px 20px",
              borderRadius: 999,
              fontWeight: 600,
            }}
          >
            {tx("heroCta")}
          </Link>
          <Link
            href="/architecture"
            style={{
              border: "1px solid var(--stroke)",
              padding: "12px 20px",
              borderRadius: 999,
              color: "var(--text)",
            }}
          >
            {tx("heroSecondary")}
          </Link>
        </div>
      </div>
    </section>
  );
}
