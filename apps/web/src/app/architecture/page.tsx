"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, useStore } from "@/lib/store";
import type { SecuritySnapshot } from "@/lib/types";

export default function ArchitecturePage() {
  const { tx, docsUrl, session } = useStore();
  const [snapshot, setSnapshot] = useState<SecuritySnapshot | null>(null);
  const [snapError, setSnapError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setSnapshot(null);
      setSnapError(null);
      return;
    }
    api<SecuritySnapshot>("/v1/security", { token: session.token })
      .then(setSnapshot)
      .catch((e) => setSnapError(e instanceof Error ? e.message : "Unavailable"));
  }, [session]);

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <p className="eyebrow">{tx("architecture")}</p>
      <h1 className="display" style={{ fontSize: 48, margin: "0 0 12px" }}>
        {tx("archTitle")}
      </h1>
      <p className="muted" style={{ fontSize: 17, lineHeight: 1.6, maxWidth: "62ch" }}>
        {tx("archLead")}
      </p>

      <section className="brief">
        <h2>{tx("securityTitle")}</h2>
        <p className="muted" style={{ lineHeight: 1.6 }}>
          {tx("securityLead")}
        </p>
        {!session && (
          <p className="muted" style={{ lineHeight: 1.6 }}>
            {tx("securityNeedAuth")}{" "}
            <Link href="/auth" style={{ borderBottom: "1px solid currentColor" }}>
              {tx("goToSignIn")}
            </Link>
          </p>
        )}
        {snapError && <p style={{ color: "var(--danger)" }}>{snapError}</p>}
        {snapshot && (
          <dl>
            <dt>Helmet / CSP</dt>
            <dd>
              {snapshot.helmet ? "on" : "off"} — <code>{snapshot.csp}</code>
            </dd>
            <dt>CORS allowlist</dt>
            <dd>{snapshot.corsAllowlist.join(", ") || "empty"}</dd>
            <dt>Rate limit</dt>
            <dd>
              {snapshot.rateLimit.max} req / {snapshot.rateLimit.windowMs}ms (auth/checkout cap{" "}
              {snapshot.rateLimit.authMax}). Checkout keyed by {snapshot.rateLimit.checkoutKeyedBy.join(" + ")}.
            </dd>
            <dt>Checkout</dt>
            <dd>
              idempotent: {String(snapshot.idempotentCheckout)}; inventory CAS: {String(snapshot.inventoryCas)}
            </dd>
            <dt>Webhooks</dt>
            <dd>HMAC: {String(snapshot.hmacWebhooks)}; body limit {snapshot.webhookBodyLimit} bytes</dd>
            <dt>Request body</dt>
            <dd>{snapshot.bodyLimit} bytes; trustProxy: {String(snapshot.trustProxy)}</dd>
            <dt>Request id</dt>
            <dd>{snapshot.requestIdHeader}</dd>
            <dt>Auth modes</dt>
            <dd>{snapshot.authModes.join(", ")}</dd>
            <dt>MFA</dt>
            <dd>
              {String(snapshot.mfa.enabled)} — {snapshot.mfa.reason}
            </dd>
            <dt>Roles</dt>
            <dd>
              {snapshot.roles.join(", ")}. Simulate Pix in production: {snapshot.simulatePix.production}.
            </dd>
          </dl>
        )}
      </section>

      <section className="brief">
        <h2>{tx("topologyTitle")}</h2>
        <pre>{`[Browser / storefront]
        |  HTTPS + Bearer (local JWT, Firebase ID token, or demo token)
        v
[Vespera API]  x N  (stateless, trust proxy)
  - Helmet, CSP default-src none, CORS allowlist
  - DB-backed rate limits (IP; checkout also by user id)
  - Local auth: bcrypt (12 rounds) + HS256 JWT
  - Roles: customer | ops (ADMIN_EMAILS)
  - Idempotent checkout inside a DB transaction
  - Inventory CAS (conditional UPDATE) as the race guard
  - Payment adapter (mock PIX QR / card mock, or live stub)
        |
        +--> Postgres (or PGlite locally)
        +--> Firebase Auth (Google) when configured
        +--> Webhook receiver (HMAC SHA-256, 16 KiB cap)`}</pre>
      </section>

      <section className="brief">
        <h2>{tx("flowTitle")}</h2>
        <ol className="muted" style={{ lineHeight: 1.75, paddingLeft: 18 }}>
          <li>Client signs in — email/password (bcrypt + JWT), Demo Auth, or Firebase Google.</li>
          <li>POST /v1/checkout with idempotencyKey + line items.</li>
          <li>API opens a transaction, decrements stock only if stock &gt;= qty, writes the order.</li>
          <li>Payment adapter returns a Pix BR Code or a card confirmation.</li>
          <li>Provider calls POST /v1/webhooks/payment with HMAC signature (body capped).</li>
          <li>Event id stored uniquely; order status updates only if it is not already paid.</li>
        </ol>
      </section>

      <p style={{ marginTop: 36 }}>
        <a href={docsUrl} target="_blank" rel="noreferrer" style={{ borderBottom: "1px solid currentColor" }}>
          OpenAPI →
        </a>
      </p>
    </div>
  );
}
