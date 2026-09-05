import Link from "next/link";
import { redirect } from "next/navigation";

/** Score entry only makes sense on a round, so this hands over to the setup. */
export default function ScoreEntryDesignPage() {
  redirect("/design/runde");
  return (
    <main className="wrap">
      <Link href="/design/runde">Sæt en runde op</Link>
    </main>
  );
}
