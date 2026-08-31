import { redirect } from "next/navigation";
import { getCurrentSeason } from "@/lib/data";

export default async function StandingsIndex() {
  const season = await getCurrentSeason();
  redirect(`/stilling/${season.year}`);
}
