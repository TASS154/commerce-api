"use client";

import type { CSSProperties } from "react";
import { useStore } from "@/lib/store";

export default function ArchitecturePage() {
  const { tx, docsUrl } = useStore();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 20px 72px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 400, marginBottom: 10 }}>
        {tx("archTitle")}
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 17, lineHeight: 1.55 }}>{tx("archLead")}</p>

      <section style={card}>
        <h2 style={h2}>Runtime topology</h2>
        <pre style={pre}>{`[Browser / Demo storefront]
        |  HTTPS + Bearer (local JWT, Firebase ID token, or demo token)
        v
[Vespera API]  x N  (stateless, trust proxy)
  - Helmet, strict CORS
  - DB-backed IP rate limits (no Redis required)
  - Local auth: bcrypt (12 rounds) + HS256 JWT, 7-day session, no server-side session store
  - Idempotent checkout (user + key)
  - Inventory soft-reservation
  - Payment adapter (mock PIX QR via 'qrcode' + card mock / live stub when secrets set)
  - Product detail (PDP) reads enriched catalog rows straight from Postgres
        |
        +--> Postgres (or PGlite for zero-ops local demo)
        +--> Firebase Auth (Google) when configured — optional, layered on top of local auth
        +--> Webhook receiver (HMAC SHA-256)`}</pre>
      </section>

      <section style={card}>
        <h2 style={h2}>{tx("flowTitle")}</h2>
        <ol style={{ lineHeight: 1.7, color: "var(--text-muted)", paddingLeft: 18 }}>
          <li>Client signs in — email/password (bcrypt + JWT), Demo Auth, or Firebase Google.</li>
          <li>POST /v1/checkout with idempotencyKey + line items.</li>
          <li>API validates stock with conditional decrement (race-safe path).</li>
          <li>Payment adapter returns a Pix BR Code (rendered as a QR via the <code>qrcode</code> package) or a card confirmation.</li>
          <li>Provider calls POST /v1/webhooks/payment with HMAC signature.</li>
          <li>Event id stored uniquely → order becomes paid (replay-safe).</li>
        </ol>
      </section>

      <section style={card}>
        <h2 style={h2}>Security & scale notes</h2>
        <ul style={{ lineHeight: 1.7, color: "var(--text-muted)", paddingLeft: 18 }}>
          <li>No secrets in the repository — only .env.example placeholders.</li>
          <li>Passwords hashed with bcrypt (12 rounds); sessions are stateless HS256 JWTs verified with <code>jose</code>, no server-side session table.</li>
          <li>Authorization header redacted in logs.</li>
          <li>Rate limits keyed by IP + route class (including /v1/auth), shared across API instances via DB.</li>
          <li>Webhook signatures compared with timing-safe equality.</li>
          <li>Body size capped; Helmet enabled; CORS allowlist.</li>
          <li>Horizontal scale: stateless JWT verification + DB-backed rate limits mean any number of API replicas can sit behind a load balancer with no shared in-memory state.</li>
        </ul>
      </section>

      <p>
        <a href={docsUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
          Open interactive OpenAPI docs →
        </a>
      </p>
    </div>
  );
}

const card: CSSProperties = {
  marginTop: 22,
  padding: 20,
  borderRadius: 14,
  border: "1px solid var(--stroke)",
  background: "var(--surface)",
};

const h2: CSSProperties = {
  marginTop: 0,
  fontSize: 18,
};

const pre: CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  fontSize: 12.5,
  lineHeight: 1.55,
  color: "var(--text-muted)",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};
