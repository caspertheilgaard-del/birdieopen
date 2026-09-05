import { ConfirmLogin } from "@/components/confirm-login";

export const metadata = { title: "Logger ind" };

/**
 * Supabase sends the visitor here with a one-time code. The exchange happens in
 * the browser, so this page needs nothing from the server and can be part of a
 * static build.
 */
export default function ConfirmPage() {
  return (
    <main className="wrap wrap--regler">
      <h1 className="page-title">Logger ind</h1>
      <ConfirmLogin />
    </main>
  );
}
