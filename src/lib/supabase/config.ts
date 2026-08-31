/** The site renders from the local snapshot until these are set. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabase = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
