"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from "./config";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Null when the project is not configured, so previews render without a database. */
export function getSupabaseClient() {
  if (!hasSupabase) return null;
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
