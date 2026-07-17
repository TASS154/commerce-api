"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LOCALES, t, type DictKey, type Locale } from "./i18n";

type CartLine = { productId: string; slug: string; name: string; priceCents: number; quantity: number };

type Session = {
  token: string;
  email: string;
  demo: boolean;
};

type Store = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  tx: (key: DictKey) => string;
  cart: CartLine[];
  cartPulse: boolean;
  addToCart: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  clearCart: () => void;
  session: Session | null;
  signInDemo: () => void;
  signOut: () => void;
  registerLocal: (email: string, password: string, displayName?: string) => Promise<void>;
  loginLocal: (email: string, password: string) => Promise<void>;
  setSessionToken: (token: string, email: string) => void;
  apiBase: string;
  docsUrl: string;
};

const Ctx = createContext<Store | null>(null);

function resolveApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "http://localhost:4000";
  }
  // Never default to localhost on deployed hosts — that triggers Chrome's
  // "access other apps on this device" / local-network permission prompt.
  return "";
}

const API_BASE = resolveApiBase();

export function Providers({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartPulse, setCartPulse] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const pulseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => () => {
    if (pulseTimeout.current) clearTimeout(pulseTimeout.current);
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
    setCartPulse(true);
    if (pulseTimeout.current) clearTimeout(pulseTimeout.current);
    pulseTimeout.current = setTimeout(() => setCartPulse(false), 650);
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const persistSession = useCallback((next: Session) => {
    setSession(next);
    localStorage.setItem("vespera.session", JSON.stringify(next));
  }, []);

  const signInDemo = useCallback(() => {
    persistSession({ token: "demo:recruiter@vespera.demo", email: "recruiter@vespera.demo", demo: true });
  }, [persistSession]);

  const signOut = useCallback(() => {
    setSession(null);
    localStorage.removeItem("vespera.session");
  }, []);

  const registerLocal = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const result = await api<{ token: string; user: { email: string } }>("/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      });
      persistSession({ token: result.token, email: result.user.email, demo: false });
    },
    [persistSession],
  );

  const loginLocal = useCallback(
    async (email: string, password: string) => {
      const result = await api<{ token: string; user: { email: string } }>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      persistSession({ token: result.token, email: result.user.email, demo: false });
    },
    [persistSession],
  );

  const setSessionToken = useCallback(
    (token: string, email: string) => {
      persistSession({ token, email, demo: false });
    },
    [persistSession],
  );

  const value = useMemo<Store>(
    () => ({
      locale,
      setLocale,
      tx: (key) => t(locale, key),
      cart,
      cartPulse,
      addToCart,
      clearCart,
      session,
      signInDemo,
      signOut,
      registerLocal,
      loginLocal,
      setSessionToken,
      apiBase: API_BASE,
      docsUrl: API_BASE ? `${API_BASE}/docs` : "#",
    }),
    [
      locale,
      setLocale,
      cart,
      cartPulse,
      addToCart,
      clearCart,
      session,
      signInDemo,
      signOut,
      registerLocal,
      loginLocal,
      setSessionToken,
    ],
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
  const base = resolveApiBase();
  if (!base) {
    throw new Error(
      "API offline — set NEXT_PUBLIC_API_URL to the hosted Vespera API",
    );
  }
  const headers = new Headers(opts.headers);
  headers.set("Content-Type", "application/json");
  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);
  const res = await fetch(`${base}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data as T;
}
