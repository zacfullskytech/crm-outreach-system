"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "recovery">("signin");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function initializeAuthState() {
      const invited = searchParams.get("invited");
      const recovery = searchParams.get("recovery");
      const nextError = searchParams.get("error");
      const nextEmail = searchParams.get("email");

      if (nextEmail) {
        setEmail(nextEmail);
      }

      if (nextError) {
        setError(nextError);
      }

      const supabase = await createClient();
      const currentUrl = new URL(window.location.href);
      const authCode = currentUrl.searchParams.get("code");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashType = hashParams.get("type");

      if (authCode) {
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(authCode);
        if (codeError && !cancelled) {
          setError(codeError.message);
        }
        currentUrl.searchParams.delete("code");
        window.history.replaceState({}, "", currentUrl.toString());
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError && !cancelled) {
          setError(sessionError.message);
        }
        const cleanUrl = new URL(window.location.href);
        cleanUrl.hash = "";
        if (hashType === "recovery") {
          cleanUrl.searchParams.set("recovery", "1");
          cleanUrl.searchParams.delete("invited");
        } else if (hashType === "invite") {
          cleanUrl.searchParams.set("invited", "1");
          cleanUrl.searchParams.delete("recovery");
        }
        window.history.replaceState({}, "", cleanUrl.toString());
      }

      const { data } = await supabase.auth.getSession();
      const hasSession = Boolean(data.session);

      if (cancelled) {
        return;
      }

      if (invited === "1") {
        setMode("signup");
        setNotice(hasSession
          ? "Your invite was accepted. Set your password to finish joining the platform."
          : "We could not start your invite session from this link. Open the latest invite email again, or ask for a fresh invite if this one has expired.");
        setError(null);
      } else if (recovery === "1") {
        setMode("recovery");
        setNotice(hasSession
          ? "Your recovery link is active. Enter a new password to continue."
          : "We could not start your recovery session from this link. Open the latest recovery email again, or request a new reset link.");
        setError(null);
      }

      setAuthReady(true);
    }

    void initializeAuthState();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = await createClient();

    if (mode === "signup") {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Auth Session missing");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setNotice("Password set. Redirecting…");
        router.push("/");
        router.refresh();
      }
      return;
    }

    if (mode === "recovery") {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Auth Session missing");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setNotice("Password updated. Redirecting…");
      router.push("/");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="#3b82f6" />
              <path d="M8 24L16 8L24 24H8Z" fill="white" fillOpacity="0.9" />
              <circle cx="16" cy="17" r="3" fill="#3b82f6" />
            </svg>
          </div>
          <h1>Full Sky Technologies</h1>
          <p>Sign in to your CRM</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {mode !== "recovery" ? (
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                readOnly={mode === "signup" && Boolean(searchParams.get("email"))}
              />
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {notice && <div className="notice-msg">{notice}</div>}
          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="button primary" disabled={loading || ((mode === "signup" || mode === "recovery") && !authReady)}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : mode === "signup" ? "Set Password" : "Update Password"}
          </button>
        </form>

        <div className="login-toggle">
          {mode === "signin" ? (
            <p>
              Need to finish an invite? Open the email link, then set your password here.
            </p>
          ) : (
            <p>
              Already have a password?{" "}
              <button onClick={() => { setMode("signin"); setNotice(null); setError(null); }} className="link-btn">
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--white-soft);
          background-image: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.08), transparent),
            linear-gradient(180deg, var(--white) 0%, var(--white-soft) 100%);
          padding: 20px;
        }

        .login-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 40px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
        }

        .login-brand {
          text-align: center;
          margin-bottom: 32px;
        }

        .brand-mark {
          width: 56px;
          height: 56px;
          margin: 0 auto 16px;
        }

        .brand-mark svg {
          width: 100%;
          height: 100%;
        }

        .login-brand h1 {
          margin: 0 0 6px;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--blue-deep);
          letter-spacing: -0.02em;
        }

        .login-brand p {
          margin: 0;
          color: var(--gray-500);
          font-size: 0.9rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .field {
          display: grid;
          gap: 6px;
        }

        .field label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--gray-500);
        }

        .field input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--white);
          color: var(--blue-deep);
          font: inherit;
          font-size: 0.95rem;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .field input:focus {
          outline: none;
          border-color: var(--blue-bright);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .notice-msg {
          padding: 10px 14px;
          background: #dbeafe;
          color: #1d4ed8;
          border-radius: 8px;
          font-size: 0.85rem;
        }

        .error-msg {
          padding: 10px 14px;
          background: #fee2e2;
          color: #dc2626;
          border-radius: 8px;
          font-size: 0.85rem;
        }

        .button.primary {
          width: 100%;
          padding: 12px;
          background: var(--blue-bright);
          color: #fff;
          border: none;
          border-radius: 8px;
          font: inherit;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
          margin-top: 4px;
        }

        .button.primary:hover {
          background: #2563eb;
        }

        .button.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-toggle {
          margin-top: 20px;
          text-align: center;
        }

        .login-toggle p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--gray-500);
        }

        .link-btn {
          background: none;
          border: none;
          color: var(--blue-bright);
          font: inherit;
          font-size: inherit;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
        }

        .link-btn:hover {
          color: #2563eb;
        }
      `}</style>
    </main>
  );
}
