"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

/** Magic link only. Nobody has to remember a password, and none had to be migrated. */
export function LoginForm() {
  // Where to go afterwards travels in the query, which only the browser needs.
  const returnTo =
    typeof window === "undefined"
      ? "/live"
      : (() => {
          const wanted = new URLSearchParams(window.location.search).get("retur");
          return wanted && wanted.startsWith("/") ? wanted : "/live";
        })();

  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    setError(null);

    const supabase = getSupabaseClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/log-ind/bekraeft?retur=${encodeURIComponent(returnTo)}`,
      },
    });

    if (authError) {
      setError(authError.message);
      setState("idle");
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="card rules-card">
        <p style={{ margin: 0, fontSize: 15, color: "var(--text-body)" }}>
          Vi har sendt et link til <strong>{email}</strong>. Åbn det på den telefon, du vil taste
          scores fra, så er du logget ind.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card rules-card" style={{ display: "grid", gap: 14 }}>
      <label htmlFor="email" style={{ fontSize: 15, color: "var(--text-body)" }}>
        Din e-mail. Den skal være den, turneringsledelsen har registreret.
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="navn@eksempel.dk"
        style={{
          font: "inherit",
          fontSize: 17,
          padding: "14px 16px",
          borderRadius: "var(--r-btn)",
          border: "1px solid var(--border-card)",
          background: "var(--page)",
          color: "var(--text)",
        }}
      />
      {error ? <p style={{ margin: 0, color: "#b4472e", fontSize: 14 }}>{error}</p> : null}
      <button type="submit" className="btn btn--primary" disabled={state === "sending"}>
        {state === "sending" ? "Sender…" : "Send login-link"}
      </button>
    </form>
  );
}
