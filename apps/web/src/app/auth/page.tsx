"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
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
      <div className="page-narrow" style={{ textAlign: "center" }}>
        <p className="muted" style={{ marginBottom: 6 }}>
          {tx("loggedInAs")}
        </p>
        <p style={{ fontSize: 18, marginBottom: 24 }}>{session.email}</p>
        <a href="/cart" className="btn">
          {tx("goToCart")}
        </a>
        {success && (
          <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
            {tx("authSuccessRedirect")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="page-narrow" style={{ maxWidth: 440 }}>
      <p className="eyebrow">{tx("signIn")}</p>
      <h1 className="display" style={{ fontSize: 40, margin: "0 0 10px" }}>
        {tx("authTitle")}
      </h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: 32, fontSize: 15, lineHeight: 1.55 }}>
        {tx("authLead")}
      </p>

      <div className="filters" style={{ marginTop: 0 }}>
        <button type="button" className={`filter${tab === "login" ? " is-on" : ""}`} onClick={() => setTab("login")}>
          {tx("tabLogin")}
        </button>
        <button
          type="button"
          className={`filter${tab === "register" ? " is-on" : ""}`}
          onClick={() => setTab("register")}
        >
          {tx("tabRegister")}
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
        {tab === "register" && (
          <label className="field">
            {tx("nameLabel")}
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              maxLength={160}
            />
          </label>
        )}
        <label className="field">
          {tx("emailLabel")}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={320}
          />
        </label>
        <label className="field">
          {tx("passwordLabel")}
          <input
            type="password"
            required
            minLength={tab === "register" ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={tab === "register" ? "new-password" : "current-password"}
            maxLength={128}
          />
          {tab === "register" && <span style={{ fontSize: 12 }}>{tx("passwordHint")}</span>}
        </label>

        {error && (
          <p style={{ color: "var(--danger)", fontSize: 13, margin: 0 }}>{error}</p>
        )}

        <button type="submit" disabled={busy} className="btn">
          {tab === "register" ? tx("registerCta") : tx("loginCta")}
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
        <span className="eyebrow" style={{ margin: 0 }}>
          {tx("orDivider")}
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {googleReady ? (
          <button type="button" disabled={busy} onClick={onGoogle} className="btn-ghost">
            {tx("googleCta")}
          </button>
        ) : (
          <div>
            <button type="button" disabled className="btn-ghost">
              {tx("googleStub")}
            </button>
            <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
              {tx("googleStubHint")}
            </p>
          </div>
        )}
        <button type="button" disabled={busy} onClick={onDemo} className="btn-ghost">
          {tx("demoCta")}
        </button>
      </div>
    </div>
  );
}
