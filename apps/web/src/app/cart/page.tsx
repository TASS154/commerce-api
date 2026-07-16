"use client";

import { useState, type CSSProperties } from "react";
import { api, useStore } from "@/lib/store";

export default function CartPage() {
  const { cart, clearCart, session, signInDemo, tx, apiBase } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pixRef, setPixRef] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  const total = cart.reduce((n, l) => n + l.priceCents * l.quantity, 0);

  async function checkout(method: "pix" | "card") {
    if (!session) {
      signInDemo();
    }
    const token = session?.token || "demo:recruiter@vespera.demo";
    setBusy(true);
    setMessage(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const result = await api<{
        order: { id: string; status: string; paymentRef?: string };
        charge?: { paymentRef: string; clientAction?: { payload: Record<string, unknown> } };
      }>("/v1/checkout", {
        method: "POST",
        token,
        body: JSON.stringify({
          paymentMethod: method,
          idempotencyKey,
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        }),
      });
      setLastStatus(result.order.status);
      setPixRef(result.order.paymentRef || result.charge?.paymentRef || null);
      if (result.order.status === "paid") {
        setMessage(tx("orderPaid"));
        clearCart();
      } else {
        setMessage(tx("orderPending"));
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  async function simulatePix() {
    if (!pixRef || !session) return;
    setBusy(true);
    try {
      await api("/v1/demo/simulate-pix-paid", {
        method: "POST",
        token: session.token,
        body: JSON.stringify({ paymentRef: pixRef }),
      });
      setLastStatus("paid");
      setMessage(tx("orderPaid"));
      clearCart();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 20px 64px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 400 }}>{tx("cart")}</h1>
      {cart.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>{tx("emptyCart")}</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {cart.map((l) => (
            <div
              key={l.productId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: 14,
                border: "1px solid var(--stroke)",
                borderRadius: 12,
                background: "var(--surface)",
              }}
            >
              <div>
                <strong>{l.name}</strong>
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>× {l.quantity}</div>
              </div>
              <div>R$ {((l.priceCents * l.quantity) / 100).toFixed(2)}</div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 18 }}>
            <span>Total</span>
            <strong>R$ {(total / 100).toFixed(2)}</strong>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button disabled={busy} onClick={() => checkout("pix")} style={primaryBtn}>
              {tx("checkoutPix")}
            </button>
            <button disabled={busy} onClick={() => checkout("card")} style={secondaryBtn}>
              {tx("checkoutCard")}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 12,
            border: "1px solid var(--stroke)",
            background: "var(--bg-elevated)",
          }}
        >
          <p style={{ margin: 0 }}>{message}</p>
          {lastStatus && (
            <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
              status: {lastStatus}
              {pixRef ? ` · ref: ${pixRef}` : ""}
            </p>
          )}
          {lastStatus === "pending_payment" && pixRef && (
            <button disabled={busy} onClick={simulatePix} style={{ ...primaryBtn, marginTop: 12 }}>
              {tx("simulatePix")}
            </button>
          )}
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            OpenAPI: <a href={`${apiBase}/docs`}>{apiBase}/docs</a>
          </p>
        </div>
      )}
    </div>
  );
}

const primaryBtn: CSSProperties = {
  background: "var(--accent)",
  color: "#1a1510",
  border: "none",
  borderRadius: 999,
  padding: "12px 16px",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  background: "transparent",
  color: "var(--text)",
  border: "1px solid var(--stroke)",
  borderRadius: 999,
  padding: "12px 16px",
  cursor: "pointer",
};
