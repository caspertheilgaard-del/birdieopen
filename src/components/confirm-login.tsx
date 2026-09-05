"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export function ConfirmLogin() {
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"working" | "done" | "failed">("working");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const target = params.get("retur");
    const back = target && target.startsWith("/") ? target : "/live";

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Login er ikke koblet til databasen endnu.");
      setState("failed");
      return;
    }
    if (!code) {
      setError("Linket mangler en kode. Bed om et nyt.");
      setState("failed");
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error: authError }: { error: { message: string } | null }) => {
      if (authError) {
        setError(authError.message);
        setState("failed");
        return;
      }
      setState("done");
      window.location.replace(back);
    });
  }, []);

  return (
    <div className="card rules-card" style={{ marginTop: 20 }}>
      <p style={{ margin: 0, fontSize: 15, color: "var(--text-body)" }}>
        {state === "working" ? "Et øjeblik, vi logger dig ind…" : null}
        {state === "done" ? "Du er logget ind. Vi sender dig videre." : null}
        {state === "failed" ? (
          <>
            {error} <Link href="/log-ind">Prøv igen</Link>.
          </>
        ) : null}
      </p>
    </div>
  );
}
