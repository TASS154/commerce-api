"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { api, useStore } from "@/lib/store";

type PixPayload = {
  txid: string;
  emvPayload: string;
  copyPaste: string;
  qrCodeDataUrl: string;
  expiresAt: string;
  amountCents: number;
};

type CardPayload = {
  authorizationCode: string;
  brand: string;
  last4: string;
  receiptId: string;
  status: string;
};

type ChargeResult = {
  clientAction?: {
    type: "pix_qr" | "card_confirm";
    payload: Record<string, unknown>;
  };
};

type CheckoutResponse = {
  order: { id: string; status: string; paymentRef?: string };
  charge?: ChargeResult;
};

export default function CartPage() {
  const { cart, clearCart, session, tx, apiBase } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pixRef, setPixRef] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [pix, setPix] = useState<PixPayload | null>(null);
  const [card, setCard] = useState<CardPayload | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const total = cart.reduce((n, l) => n + l.priceCents * l.quantity, 0);

  useEffect(() => {
    if (!pix) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pix]);

  const countdown = useMemo(() => {
    if (!pix) return null;
    const remainingMs = new Date(pix.expiresAt).getTime() - now;
    if (remainingMs <= 0) return tx("expired");
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [pix, now, tx]);

  async function checkout(method: "pix" | "card") {
    if (!session) return;
    setBusy(true);
    setMessage(null);
    setPix(null);
    setCard(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const result = await api<CheckoutResponse>("/v1/checkout", {
        method: "POST",
        token: session.token,
        body: JSON.stringify({
          paymentMethod: method,
          idempotencyKey,
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        }),
      });
      setLastStatus(result.order.status);
      const clientAction = result.charge?.clientAction;
      setPixRef(result.order.paymentRef ?? null);

      if (clientAction?.type === "pix_qr") {
        setPix(clientAction.payload as unknown as PixPayload);
      } else if (clientAction?.type === "card_confirm") {
        setCard(clientAction.payload as unknown as CardPayload);
      }

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
      setPix(null);
      clearCart();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyPixCode() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be unavailable — ignore */
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

          {!session ? (
            <div
              style={{
                marginTop: 12,
                padding: 18,
                borderRadius: 12,
                border: "1px solid var(--stroke)",
                background: "var(--bg-elevated)",
              }}
            >
              <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{tx("signInRequiredTitle")}</p>
              <p style={{ margin: "0 0 14px", color: "var(--text-muted)", fontSize: 14 }}>
                {tx("signInRequiredBody")}
              </p>
              <Link href="/auth" style={primaryBtn}>
                {tx("goToSignIn")}
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <button disabled={busy} onClick={() => checkout("pix")} style={primaryBtn}>
                {tx("checkoutPix")}
              </button>
              <button disabled={busy} onClick={() => checkout("card")} style={secondaryBtn}>
                {tx("checkoutCard")}
              </button>
            </div>
          )}
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

          {pix && (
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <h3 style={{ fontSize: 15, margin: "0 0 4px" }}>{tx("pixTitle")}</h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px" }}>{tx("pixHint")}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pix.qrCodeDataUrl}
                alt="Pix QR code"
                style={{ width: 200, height: 200, borderRadius: 12, background: "#fff", padding: 8 }}
              />
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                <code
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    wordBreak: "break-all",
                    maxWidth: 420,
                    padding: 10,
                    borderRadius: 8,
                    background: "var(--surface)",
                    border: "1px solid var(--stroke)",
                  }}
                >
                  {pix.copyPaste}
                </code>
                <button onClick={copyPixCode} style={secondaryBtn}>
                  {copied ? tx("copied") : tx("copyPixCode")}
                </button>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0 0" }}>
                  {tx("txidLabel")}: <code>{pix.txid}</code>
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                  {tx("expiresIn")}: <strong>{countdown}</strong>
                </p>
              </div>
            </div>
          )}

          {card && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 15, margin: "0 0 10px" }}>{tx("cardApprovedTitle")}</h3>
              <div style={{ display: "grid", gap: 4, fontSize: 13, color: "var(--text-muted)" }}>
                <span>{tx("brandLabel")}: <strong style={{ color: "var(--text)" }}>{card.brand.toUpperCase()}</strong></span>
                <span>{tx("last4Label")}: <strong style={{ color: "var(--text)" }}>•••• {card.last4}</strong></span>
                <span>{tx("authCodeLabel")}: <code>{card.authorizationCode}</code></span>
                <span>{tx("receiptLabel")}: <code>{card.receiptId}</code></span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>{tx("simulatedNote")}</p>
            </div>
          )}

          {lastStatus === "pending_payment" && pixRef && (
            <button disabled={busy} onClick={simulatePix} style={{ ...primaryBtn, marginTop: 16 }}>
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
  display: "inline-block",
  textAlign: "center",
};

const secondaryBtn: CSSProperties = {
  background: "transparent",
  color: "var(--text)",
  border: "1px solid var(--stroke)",
  borderRadius: 999,
  padding: "12px 16px",
  cursor: "pointer",
};
