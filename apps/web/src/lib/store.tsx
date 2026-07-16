"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LOCALES, t, type DictKey, type Locale } from "./i18n";

type CartLine = { productId: string; slug: string; name: string; priceCents: number; quantity: number };

type Session = {
  token: string;
  email: string;
};

type Store = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  tx: (key: DictKey) => string;
  cart: CartLine[];
  addToCart: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  clearCart: () => void;
  session: Session | null;
  signInDemo: () => void;
  signOut: () => void;
  apiBase: string;
  docsUrl: string;
};

const Ctx = createContext<Store | null>(null);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function Providers({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vespera.locale") as Locale | null;
    if (saved && LOCALES.includes(saved)) setLocaleState(saved);
    const raw = localStorage.getItem("vespera.session");
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("vespera.locale", l);
  }, []);

  const addToCart = useCallback((line: Omit<CartLine, "quantity">, qty = 1) => {
    setCart((prev) => {
      const i = prev.findIndex((p) => p.productId === line.productId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: Math.min(20, next[i].quantity + qty) };
        return next;
      }
      return [...prev, { ...line, quantity: qty }];
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const signInDemo = useCallback(() => {
    const next = { token: "demo:recruiter@vespera.demo", email: "recruiter@vespera.demo" };
    setSession(next);
    localStorage.setItem("vespera.session", JSON.stringify(next));
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    localStorage.removeItem("vespera.session");
  }, []);

  const value = useMemo<Store>(
    () => ({
      locale,
      setLocale,
      tx: (key) => t(locale, key),
      cart,
      addToCart,
      clearCart,
      session,
      signInDemo,
      signOut,
      apiBase: API_BASE,
      docsUrl: `${API_BASE}/docs`,
    }),
    [locale, setLocale, cart, addToCart, clearCart, session, signInDemo, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Providers missing");
  return ctx;
}

export async function api<T>(
  path: string,
  opts: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set("Content-Type", "application/json");
  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data as T;
}
