"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { LOCALES, type Locale } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export function Shell({ children }: { children: ReactNode }) {
  const { tx, locale, setLocale, session, signInDemo, signOut, cart, docsUrl } = useStore();
  const cartCount = cart.reduce((n, l) => n + l.quantity, 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(12px)",
          background: "rgba(15,14,12,0.82)",
          borderBottom: "1px solid var(--stroke)",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <Link href="/" style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: "-0.02em" }}>
            {tx("brand")}
          </Link>
          <nav style={{ display: "flex", gap: 14, marginLeft: 12 }}>
            <Link href="/catalog" style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {tx("shop")}
            </Link>
            <Link href="/cart" style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {tx("cart")}
              {cartCount > 0 ? ` (${cartCount})` : ""}
            </Link>
            <Link href="/architecture" style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {tx("architecture")}
            </Link>
            <a href={docsUrl} target="_blank" rel="noreferrer" style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {tx("docs")}
            </a>
          </nav>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {tx("lang")}{" "}
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                style={{
                  marginLeft: 6,
                  background: "var(--surface)",
                  color: "var(--text)",
                  border: "1px solid var(--stroke)",
                  borderRadius: 8,
                  padding: "6px 8px",
                }}
              >
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            {session ? (
              <button
                onClick={signOut}
                style={btnGhost}
                title={session.email}
              >
                {tx("logout")}
              </button>
            ) : (
              <button onClick={signInDemo} style={btnPrimary}>
                {tx("loginDemo")}
              </button>
            )}
          </div>
        </div>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
      <footer
        style={{
          borderTop: "1px solid var(--stroke)",
          padding: "28px 20px",
          color: "var(--text-muted)",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        {tx("secureNote")}
      </footer>
    </div>
  );
}

const btnPrimary: CSSProperties = {
  background: "var(--accent)",
  color: "#1a1510",
  border: "none",
  borderRadius: 999,
  padding: "8px 14px",
  fontWeight: 600,
  cursor: "pointer",
};

const btnGhost: CSSProperties = {
  background: "transparent",
  color: "var(--text-muted)",
  border: "1px solid var(--stroke)",
  borderRadius: 999,
  padding: "8px 14px",
  cursor: "pointer",
};
