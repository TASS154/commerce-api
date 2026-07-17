"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { firebaseGoogleIsConfigured, signInWithGoogle } from "@/lib/firebase-google";
import { useStore } from "@/lib/store";

type Tab = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const { tx, session, signInDemo, registerLocal, loginLocal, setSessionToken } = useStore();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const googleReady = firebaseGoogleIsConfigured();

  useEffect(() => {
    if (session && success) {
      const id = setTimeout(() => router.push("/cart"), 900);
      return () => clearTimeout(id);
    }
  }, [session, success, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (tab === "register") {
        await registerLocal(email, password, displayName || undefined);
      } else {
        await loginLocal(email, password);
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    setError(null);
    try {
      const { token, email: googleEmail } = await signInWithGoogle();
      setSessionToken(token, googleEmail);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  function onDemo() {
    signInDemo();
    setSuccess(true);
  }

  if (session) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "64px 20px", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", marginBottom: 6 }}>{tx("loggedInAs")}</p>
        <p style={{ fontSize: 18, marginBottom: 24 }}>{session.email}</p>
        <a href="/cart" style={primaryBtn}>
          {tx("goToCart")}
        </a>
        {success && (
          <p style={{ marginTop: 16, fontSize: 13, color: "var(--success)" }}>{tx("authSuccessRedirect")}</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "48px 20px 72px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 400, marginBottom: 8 }}>
        {tx("authTitle")}
      </h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0, marginBottom: 26, fontSize: 14, lineHeight: 1.5 }}>
        {tx("authLead")}
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "var(--surface)", borderRadius: 999, padding: 4 }}>
        <button
          type="button"
          onClick={() => setTab("login")}
          style={{ ...tabBtn, ...(tab === "login" ? tabBtnActive : {}) }}
        >
          {tx("tabLogin")}
        </button>
        <button
          type="button"
          onClick={() => setTab("register")}
          style={{ ...tabBtn, ...(tab === "register" ? tabBtnActive : {}) }}
        >
          {tx("tabRegister")}
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        {tab === "register" && (
          <label style={label}>
            {tx("nameLabel")}
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={input}
              autoComplete="name"
            />
          </label>
        )}
        <label style={label}>
          {tx("emailLabel")}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={input}
            autoComplete="email"
          />
        </label>
        <label style={label}>
          {tx("passwordLabel")}
          <input
            type="password"
            required
            minLength={tab === "register" ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
            autoComplete={tab === "register" ? "new-password" : "current-password"}
          />
          {tab === "register" && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{tx("passwordHint")}</span>
          )}
        </label>

        {error && <p style={{ color: "var(--danger)", fontSize: 13, margin: 0 }}>{error}</p>}

        <button type="submit" disabled={busy} style={{ ...primaryBtn, width: "100%" }}>
          {tab === "register" ? tx("registerCta") : tx("loginCta")}
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--stroke)" }} />
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{tx("orDivider")}</span>
        <div style={{ flex: 1, height: 1, background: "var(--stroke)" }} />
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {googleReady ? (
          <button type="button" disabled={busy} onClick={onGoogle} style={{ ...secondaryBtn, width: "100%" }}>
            {tx("googleCta")}
          </button>
        ) : (
          <div>
            <button type="button" disabled style={{ ...secondaryBtn, width: "100%", opacity: 0.6, cursor: "not-allowed" }}>
              {tx("googleStub")}
            </button>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0" }}>{tx("googleStubHint")}</p>
          </div>
        )}
        <button type="button" disabled={busy} onClick={onDemo} style={{ ...secondaryBtn, width: "100%" }}>
          {tx("demoCta")}
        </button>
      </div>
    </div>
  );
}

const label: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "var(--text-muted)",
};

const input: CSSProperties = {
  background: "var(--surface)",
  color: "var(--text)",
  border: "1px solid var(--stroke)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
};

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

const tabBtn: CSSProperties = {
  flex: 1,
  background: "transparent",
  color: "var(--text-muted)",
  border: "none",
  borderRadius: 999,
  padding: "8px 0",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};

const tabBtnActive: CSSProperties = {
  background: "var(--bg-elevated)",
  color: "var(--text)",
};
