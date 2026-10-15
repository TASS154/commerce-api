"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LOCALES, type Locale } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export function Shell({ children }: { children: ReactNode }) {
  const { tx, locale, setLocale, session, signOut, cart, cartPulse, docsUrl } = useStore();
  const cartCount = cart.reduce((n, l) => n + l.quantity, 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="wordmark">
            {tx("brand")}
          </Link>
          <nav className="nav-links">
            <Link href="/catalog">{tx("shop")}</Link>
            <Link href="/cart" className={cartPulse ? "cart-badge-pulse" : undefined}>
              {tx("cart")}
              {cartCount > 0 ? ` (${cartCount})` : ""}
            </Link>
            <Link href="/architecture">{tx("architecture")}</Link>
            <a href={docsUrl} target="_blank" rel="noreferrer">
              {tx("docs")}
            </a>
          </nav>
          <div className="header-tools">
            <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <span className="eyebrow" style={{ margin: 0 }}>
                {tx("lang")}
              </span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                aria-label={tx("lang")}
              >
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            {session ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  className="muted"
                  style={{ fontSize: 13, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}
                  title={session.email}
                >
                  {session.email}
                </span>
                <button type="button" onClick={signOut} className="btn-ghost" style={{ padding: "8px 14px" }}>
                  {tx("logout")}
                </button>
              </div>
            ) : (
              <Link href="/auth" className="btn" style={{ padding: "8px 16px" }}>
                {tx("signIn")}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
      <footer className="site-footer">{tx("secureNote")}</footer>
    </div>
  );
}
