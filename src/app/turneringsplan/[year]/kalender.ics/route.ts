import { getSchedule, getSeasons } from "@/lib/data";

/** Same idea as the old site's ics export, so the season still lands in a calendar. */

function stamp(iso: string): string {
  return `${new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

function escapeText(text: string): string {
  return text.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

/** RFC 5545 asks for lines of at most 75 octets. */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts = [line.slice(0, 74)];
  let rest = line.slice(74);
  while (rest.length > 73) {
    parts.push(` ${rest.slice(0, 73)}`);
    rest = rest.slice(73);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

export async function generateStaticParams() {
  const seasons = await getSeasons();
  return seasons.map((s) => ({ year: String(s.year) }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const rounds = await getSchedule(Number(year));

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Birdie Open//birdieopen.dk//DA", "CALSCALE:GREGORIAN", `X-WR-CALNAME:Birdie Open ${year}`];

  for (const round of rounds) {
    if (!round.startsAt) continue;
    const start = new Date(round.startsAt);
    const end = new Date(start.getTime() + 5 * 60 * 60 * 1000);
    const description = [
      round.kind === "final" ? "Finalerunde" : "Indledende runde",
      round.courseName,
      round.par ? `Par ${round.par}` : null,
      round.winner ? `Vinder: ${round.winner.name} med ${round.winner.points} point` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    lines.push(
      "BEGIN:VEVENT",
      `UID:birdieopen-${year}-${round.roundId}@birdieopen.dk`,
      `DTSTAMP:${stamp(round.startsAt)}`,
      `DTSTART:${stamp(round.startsAt)}`,
      `DTEND:${stamp(end.toISOString())}`,
      fold(`SUMMARY:${escapeText(`Birdie Open · ${round.venue}`)}`),
      fold(`DESCRIPTION:${escapeText(description)}`),
      round.address ? fold(`LOCATION:${escapeText(round.address)}`) : "",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.filter(Boolean).join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="birdie-open-${year}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export const dynamic = "force-static";
