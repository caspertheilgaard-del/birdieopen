import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/** Supabase sends the visitor here with a one-time code to exchange for a session. */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; retur?: string }>;
}) {
  const { code, retur } = await searchParams;
  const target = retur && retur.startsWith("/") ? retur : "/live";

  if (!hasSupabase || !code) redirect("/log-ind");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) redirect("/log-ind?fejl=1");

  redirect(target);
}
