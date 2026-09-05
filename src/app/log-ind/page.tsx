import { LoginForm } from "@/components/login-form";
import { getViewer } from "@/lib/live/queries";
import { hasSupabase } from "@/lib/supabase/config";
import Link from "next/link";

export const metadata = { title: "Log ind" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ retur?: string }>;
}) {
  const { retur } = await searchParams;
  const viewer = hasSupabase ? await getViewer() : null;

  return (
    <main className="wrap wrap--regler">
      <h1 className="page-title">Log ind</h1>
      <p className="page-note" style={{ marginBottom: 24 }}>
        Login er kun nødvendigt for at taste scores. Stilling, birdieliste og historik er åben for alle.
      </p>

      {!hasSupabase ? (
        <div className="notice">Login er ikke koblet til databasen endnu.</div>
      ) : viewer ? (
        <div className="card rules-card">
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-body)" }}>
            Du er logget ind som <strong>{viewer.name}</strong>. Gå til{" "}
            <Link href="/live">live</Link> for at taste scores.
          </p>
        </div>
      ) : (
        <LoginForm returnTo={retur && retur.startsWith("/") ? retur : "/live"} />
      )}
    </main>
  );
}
