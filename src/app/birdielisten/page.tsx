import { redirect } from "next/navigation";
import { getCurrentSeason } from "@/lib/data";

export default async function BirdieIndex() {
  const season = await getCurrentSeason();
  redirect(`/birdielisten/${season.year}`);
}
