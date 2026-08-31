const DAYS = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
const SHORT_DAYS = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAJ", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEC"];

/** Dates come out of the database in UTC; the tournament is always played in Danish time. */
function local(iso: string): Date {
  return new Date(iso);
}

export function dayAndMonth(iso: string | null): { day: string; month: string } {
  if (!iso) return { day: "–", month: "" };
  const d = local(iso);
  return { day: String(d.getDate()), month: MONTHS[d.getMonth()] };
}

export function longDate(iso: string | null): string {
  if (!iso) return "Dato mangler";
  const d = local(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1} - ${d.getFullYear()}`;
}

export function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = local(iso);
  return `${SHORT_DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1} - ${d.getFullYear()}`;
}

export function timeOfDay(iso: string | null): string {
  if (!iso) return "";
  const d = local(iso);
  return `kl. ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function isSameDay(iso: string | null, other: Date): boolean {
  if (!iso) return false;
  const d = local(iso);
  return (
    d.getFullYear() === other.getFullYear() &&
    d.getMonth() === other.getMonth() &&
    d.getDate() === other.getDate()
  );
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function meters(value: number | null): string {
  return value === null ? "" : `${value.toLocaleString("da-DK")} m`;
}
