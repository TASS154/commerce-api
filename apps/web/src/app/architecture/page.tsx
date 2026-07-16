"use client";

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
        |  HTTPS + Bearer (Firebase ID token or demo token)
        v
[Vespera API]  x N  (stateless, trust proxy)
  - Helmet, strict CORS
  - DB-backed IP rate limits (no Redis required)
  - Idempotent checkout (user + key)
  - Inventory soft-reservation
  - Payment adapter (mock by default / live stub when secrets set)
        |
        +--> Postgres (or PGlite for zero-ops local demo)
        +--> Firebase Auth (Google) when configured
        +--> Webhook receiver (HMAC SHA-256)`}</pre>
      </section>

      <section style={card}>
        <h2 style={h2}>{tx("flowTitle")}</h2>
        <ol style={{ lineHeight: 1.7, color: "var(--text-muted)", paddingLeft: 18 }}>
          <li>Client signs in (Demo Auth or Firebase Google).</li>
          <li>POST /v1/checkout with idempotencyKey + line items.</li>
          <li>API validates stock with conditional decrement (race-safe path).</li>
          <li>Payment adapter returns Pix QR or card confirmation.</li>
          <li>Provider calls POST /v1/webhooks/payment with HMAC signature.</li>
          <li>Event id stored uniquely → order becomes paid (replay-safe).</li>
        </ol>
      </section>

      <section style={card}>
        <h2 style={h2}>Security & scale notes</h2>
        <ul style={{ lineHeight: 1.7, color: "var(--text-muted)", paddingLeft: 18 }}>
          <li>No secrets in the repository — only .env.example placeholders.</li>
          <li>Authorization header redacted in logs.</li>
          <li>Rate limits keyed by IP + route class, shared across API instances via DB.</li>
          <li>Webhook signatures compared with timing-safe equality.</li>
          <li>Body size capped; Helmet enabled; CORS allowlist.</li>
          <li>Horizontal scale: put N API replicas behind a load balancer; keep sessionless JWT verification.</li>
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

const card: React.CSSProperties = {
  marginTop: 22,
  padding: 20,
  borderRadius: 14,
  border: "1px solid var(--stroke)",
  background: "var(--surface)",
};

const h2: React.CSSProperties = {
  marginTop: 0,
  fontSize: 18,
};

const pre: React.CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  fontSize: 12.5,
  lineHeight: 1.55,
  color: "var(--text-muted)",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};
