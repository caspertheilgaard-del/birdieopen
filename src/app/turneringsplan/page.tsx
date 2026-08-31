import { redirect } from "next/navigation";
import { getCurrentSeason } from "@/lib/data";

export default async function ScheduleIndex() {
  const season = await getCurrentSeason();
  redirect(`/turneringsplan/${season.year}`);
}
