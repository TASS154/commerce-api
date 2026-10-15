"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const pixExpired = Boolean(pix && new Date(pix.expiresAt).getTime() <= now);
  const visualStatus = pixExpired && lastStatus === "pending_payment" ? "expired" : lastStatus;

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
      } else if (result.order.status === "canceled") {
        setMessage(tx("orderCanceled"));
      } else {
        setMessage(tx("orderPending"));
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : tx("checkoutError"));
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
      setMessage(e instanceof Error ? e.message : tx("checkoutError"));
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

  function statusLabel(status: string | null) {
    if (status === "paid") return tx("statusPaid");
    if (status === "pending_payment") return tx("statusPending");
    if (status === "expired") return tx("statusExpired");
    if (status === "canceled") return tx("statusCanceled");
    return status;
  }

  return (
    <div className="page-narrow">
      <p className="eyebrow">{tx("cart")}</p>
      <h1 className="display" style={{ fontSize: 44, margin: "0 0 28px" }}>
        {tx("cart")}
      </h1>

      {cart.length === 0 ? (
        <p className="muted">{tx("emptyCart")}</p>
      ) : (
        <div>
          {cart.map((l) => (
            <div key={l.productId} className="line">
              <div>
                <strong>{l.name}</strong>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  × {l.quantity}
                </div>
              </div>
              <div>R$ {((l.priceCents * l.quantity) / 100).toFixed(2)}</div>
            </div>
          ))}
          <div className="line" style={{ fontSize: 18, borderBottom: 0 }}>
            <span>Total</span>
            <strong>R$ {(total / 100).toFixed(2)}</strong>
          </div>

          {!session ? (
            <div style={{ marginTop: 24 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{tx("signInRequiredTitle")}</p>
              <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
                {tx("signInRequiredBody")}
              </p>
              <Link href="/auth" className="btn">
                {tx("goToSignIn")}
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
              <button type="button" disabled={busy} onClick={() => checkout("pix")} className="btn">
                {tx("checkoutPix")}
              </button>
              <button type="button" disabled={busy} onClick={() => checkout("card")} className="btn-ghost">
                {tx("checkoutCard")}
              </button>
            </div>
          )}
        </div>
      )}

      {message && (
        <div style={{ marginTop: 36, paddingTop: 28, borderTop: "1px solid var(--rule)" }}>
          {visualStatus && (
            <p className={`status status-${visualStatus === "pending_payment" ? "pending" : visualStatus}`}>
              {statusLabel(visualStatus)}
            </p>
          )}
          <p style={{ margin: "12px 0 0" }}>{pixExpired && lastStatus === "pending_payment" ? tx("orderExpired") : message}</p>
          {pixRef && (
            <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
              ref {pixRef}
            </p>
          )}

          {pix && !pixExpired && (
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <h3 className="eyebrow">{tx("pixTitle")}</h3>
              <p className="muted" style={{ fontSize: 13, margin: "0 0 16px" }}>
                {tx("pixHint")}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pix.qrCodeDataUrl}
                alt="Pix QR code"
                style={{ width: 200, height: 200, background: "#fff", padding: 8 }}
              />
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                <code
                  className="muted"
                  style={{
                    fontSize: 11,
                    wordBreak: "break-all",
                    maxWidth: 420,
                    padding: 10,
                    border: "1px solid var(--rule)",
                  }}
                >
                  {pix.copyPaste}
                </code>
                <button type="button" onClick={copyPixCode} className="btn-ghost">
                  {copied ? tx("copied") : tx("copyPixCode")}
                </button>
                <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
                  {tx("txidLabel")}: <code>{pix.txid}</code>
                </p>
                <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                  {tx("expiresIn")}: <strong>{countdown}</strong>
                </p>
              </div>
            </div>
          )}

          {card && (
            <div style={{ marginTop: 20 }}>
              <h3 className="eyebrow">{tx("cardApprovedTitle")}</h3>
              <div className="muted" style={{ display: "grid", gap: 4, fontSize: 14 }}>
                <span>
                  {tx("brandLabel")}: <strong style={{ color: "var(--ink)" }}>{card.brand.toUpperCase()}</strong>
                </span>
                <span>
                  {tx("last4Label")}: <strong style={{ color: "var(--ink)" }}>•••• {card.last4}</strong>
                </span>
                <span>
                  {tx("authCodeLabel")}: <code>{card.authorizationCode}</code>
                </span>
                <span>
                  {tx("receiptLabel")}: <code>{card.receiptId}</code>
                </span>
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                {tx("simulatedNote")}
              </p>
            </div>
          )}

          {lastStatus === "pending_payment" && pixRef && !pixExpired && (
            <button type="button" disabled={busy} onClick={simulatePix} className="btn" style={{ marginTop: 20 }}>
              {tx("simulatePix")}
            </button>
          )}
          <p className="muted" style={{ margin: "16px 0 0", fontSize: 12 }}>
            OpenAPI: <a href={`${apiBase}/docs`}>{apiBase}/docs</a>
          </p>
        </div>
      )}
    </div>
  );
}
