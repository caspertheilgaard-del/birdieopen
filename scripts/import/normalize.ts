import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  LegacyBirdieRow,
  LegacyPlayers,
  LegacyScheduleRound,
  LegacyScorecard,
  LegacySeason,
  LegacyStandings,
} from "../legacy/types";

/**
 * Turns the scraped pages into rows shaped like the database schema.
 * Nothing here talks to Supabase, so the output can be inspected and diffed
 * before anything is written.
 */

const DATA = path.join(process.cwd(), "data", "legacy");

export type Normalized = {
  players: PlayerRow[];
  seasons: SeasonRow[];
  courses: CourseRow[];
  courseHoles: CourseHoleRow[];
  rounds: RoundRow[];
  roundPlayers: RoundPlayerRow[];
  scores: ScoreRow[];
  roundResults: RoundResultRow[];
  carryover: CarryoverRow[];
  birdies: BirdieRow[];
  champions: ChampionRow[];
  titles: TitleRow[];
};

export type PlayerRow = { legacy_id: string | null; name: string; slug: string; active: boolean; golfbox: string | null };
export type SeasonRow = { legacy_id: string; year: number; name: string; status: "planned" | "active" | "complete" };
export type CourseRow = { key: string; name: string; club: string | null; address: string | null; par: number | null; length_meters: number | null; tee: string | null };
export type CourseHoleRow = { course_key: string; hole: number; par: number; stroke_index: number; length_meters: number | null };
export type RoundRow = { legacy_id: string; year: number; kind: "prelim" | "final"; sequence: number; starts_at: string | null; venue: string; sponsor: string | null; course_key: string | null; status: "scheduled" | "live" | "final" };
export type RoundPlayerRow = { round_legacy_id: string; player_slug: string; handicap: number | null; handicap_strokes: number; status: "playing" | "absent" };
export type ScoreRow = { round_legacy_id: string; player_slug: string; hole: number; gross: number | null };
export type RoundResultRow = { round_legacy_id: string; player_slug: string; points: number; source: "holes" | "total" | "average"; awarded: number | null };
export type CarryoverRow = { year: number; player_slug: string; prelim_total: number; place: number; points: number };
export type BirdieRow = { year: number; player_slug: string; course_label: string; hole: number | null; stroke_index: number | null; par: number | null; points: number; kind: "birdie" | "eagle" | "albatross" | "hole-in-one" };
export type ChampionRow = { year: number; player_slug: string; kind: "champion" | "birdie_champion" };
export type TitleRow = { year: number; winner: string; tiedWith: string[]; note: string };

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function load<T>(name: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path.resolve(DATA, name), "utf8")) as T;
  } catch {
    return null;
  }
}

const DANISH_MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** "Søndag 26/4 - 2026 kl. 9:30" and "Søn 26/4 - 2026 kl. 9:30" both appear. */
export function parseDanishDate(text: string): string | null {
  const m = text.match(/(\d{1,2})\/(\d{1,2})\s*-\s*(\d{4})(?:\s*kl\.?\s*(\d{1,2})[:.](\d{2}))?/);
  if (!m) return null;
  const [, day, month, year, hour = "9", minute = "00"] = m;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00`;
  return `${iso}+02:00`;
}

export function formatDay(iso: string | null): { day: string; month: string } {
  if (!iso) return { day: "--", month: "" };
  const d = new Date(iso);
  return { day: String(d.getUTCDate()), month: DANISH_MONTHS[d.getUTCMonth()].toUpperCase() };
}

function courseKey(name: string, tee: string | null): string {
  return `${name}|${tee ?? ""}`;
}

export async function normalize(): Promise<Normalized> {
  const seasons = (await load<LegacySeason[]>("seasons.json")) ?? [];
  const legacyPlayers = (await load<LegacyPlayers>("players.json")) ?? { active: [], former: [] };

  const out: Normalized = {
    players: [],
    seasons: [],
    courses: [],
    courseHoles: [],
    rounds: [],
    roundPlayers: [],
    scores: [],
    roundResults: [],
    carryover: [],
    birdies: [],
    champions: [],
    titles: (await load<{ titles?: TitleRow[] }>("../manual.json"))?.titles ?? [],
  };

  const playerBySlug = new Map<string, PlayerRow>();
  const upsertPlayer = (name: string, opts: { legacyId?: string | null; active?: boolean; golfbox?: string | null } = {}): string => {
    const slug = slugify(name);
    const existing = playerBySlug.get(slug);
    if (existing) {
      if (opts.legacyId && !existing.legacy_id) existing.legacy_id = opts.legacyId;
      if (opts.golfbox && !existing.golfbox) existing.golfbox = opts.golfbox;
      if (opts.active) existing.active = true;
      return slug;
    }
    const row: PlayerRow = {
      legacy_id: opts.legacyId ?? null,
      name,
      slug,
      active: opts.active ?? false,
      golfbox: opts.golfbox ?? null,
    };
    playerBySlug.set(slug, row);
    out.players.push(row);
    return slug;
  };

  for (const name of legacyPlayers.active) upsertPlayer(name, { active: true });
  for (const name of legacyPlayers.former) upsertPlayer(name, { active: false });

  const courseByKey = new Map<string, CourseRow>();
  const holesByKey = new Map<string, Map<number, CourseHoleRow>>();

  for (const season of seasons) {
    const standings = await load<LegacyStandings>(`standings-${season.year}.json`);
    if (!standings) continue;

    const isCurrent = season.year === Math.max(...seasons.map((s) => s.year));
    out.seasons.push({
      legacy_id: season.legacyId,
      year: season.year,
      name: season.label,
      status: isCurrent ? "active" : "complete",
    });

    const schedule = (await load<LegacyScheduleRound[]>(`schedule-${season.year}.json`)) ?? [];
    const cards = (await load<LegacyScorecard[]>(`scorecards-${season.year}.json`)) ?? [];
    const birdies = (await load<LegacyBirdieRow[]>(`birdies-${season.year}.json`)) ?? [];

    // Course and hole details only exist inside the scorecards.
    for (const card of cards) {
      const key = courseKey(card.courseName, card.tee || null);
      if (!courseByKey.has(key)) {
        const row: CourseRow = {
          key,
          name: card.courseName,
          club: null,
          address: null,
          par: card.holes.reduce((n, h) => n + (h.par ?? 0), 0) || null,
          length_meters: null,
          tee: card.tee || null,
        };
        courseByKey.set(key, row);
        out.courses.push(row);
        holesByKey.set(key, new Map());
      }
      const holes = holesByKey.get(key)!;
      for (const hole of card.holes) {
        if (hole.par === null || hole.key === null) continue;
        if (!holes.has(hole.hole)) {
          holes.set(hole.hole, {
            course_key: key,
            hole: hole.hole,
            par: hole.par,
            stroke_index: hole.key,
            length_meters: null,
          });
        }
      }
    }

    // The schedule carries the club, address, par and length for each round.
    const scheduleByGroup = { prelim: [] as LegacyScheduleRound[], final: [] as LegacyScheduleRound[] };
    for (const item of schedule) scheduleByGroup[item.group].push(item);

    for (const section of standings.sections) {
      const plan = scheduleByGroup[section.kind];

      section.columns.forEach((column, index) => {
        const planned = plan[index];
        const legacyRoundId = column.legacyRoundId ?? `${season.year}-${section.kind}-${index + 1}`;
        const startsAt = parseDanishDate(planned?.when ?? column.when ?? "");

        let key: string | null = null;
        if (planned?.courseName) {
          const cardForRound = cards.find((c) => c.legacyRoundId === column.legacyRoundId);
          key = courseKey(planned.courseName, cardForRound?.tee ?? null);
          const course = courseByKey.get(key);
          if (course) {
            course.club = course.club ?? planned.club;
            course.address = course.address ?? planned.address;
            course.length_meters = course.length_meters ?? planned.lengthMeters;
            if (planned.par) course.par = planned.par;
          } else {
            const row: CourseRow = {
              key,
              name: planned.courseName,
              club: planned.club,
              address: planned.address,
              par: planned.par,
              length_meters: planned.lengthMeters,
              tee: cardForRound?.tee ?? null,
            };
            courseByKey.set(key, row);
            holesByKey.set(key, new Map());
            out.courses.push(row);
          }
        }

        out.rounds.push({
          legacy_id: legacyRoundId,
          year: season.year,
          kind: section.kind,
          sequence: index + 1,
          starts_at: startsAt,
          venue: planned?.club ?? column.venue,
          sponsor: planned?.sponsor && !/ingen sponsor/i.test(planned.sponsor) ? planned.sponsor : null,
          course_key: key,
          status: "final",
        });
      });

      for (const row of section.rows) {
        const slug = upsertPlayer(row.playerName, { legacyId: row.legacyPlayerId });

        section.columns.forEach((column, index) => {
          const cell = row.cells[index];
          if (!cell) return;
          const legacyRoundId = column.legacyRoundId ?? `${season.year}-${section.kind}-${index + 1}`;
          const stableford = section.kind === "final" ? cell.stableford : cell.value;
          if (stableford === null && cell.value === null) return;

          out.roundPlayers.push({
            round_legacy_id: legacyRoundId,
            player_slug: slug,
            handicap: null,
            handicap_strokes: 0,
            status: cell.average ? "absent" : "playing",
          });

          out.roundResults.push({
            round_legacy_id: legacyRoundId,
            player_slug: slug,
            points: stableford ?? 0,
            source: cell.average ? "average" : "total",
            awarded: section.kind === "final" ? cell.value : null,
          });
        });

        if (section.kind === "final" && row.carryover !== null) {
          const prelimTotal =
            standings.sections
              .find((s) => s.kind === "prelim")
              ?.rows.find((r) => slugify(r.playerName) === slug)?.total ?? 0;
          out.carryover.push({
            year: season.year,
            player_slug: slug,
            prelim_total: prelimTotal,
            place: 0,
            points: row.carryover,
          });
        }
      }
    }

    // Hole-by-hole scores, plus the handicap the round was actually played off.
    const roundPlayerIndex = new Map(out.roundPlayers.map((rp) => [`${rp.round_legacy_id}/${rp.player_slug}`, rp]));
    for (const card of cards) {
      const slug = upsertPlayer(card.playerName, { legacyId: card.legacyPlayerId, golfbox: card.golfbox || null });
      const rp = roundPlayerIndex.get(`${card.legacyRoundId}/${slug}`);
      if (rp) {
        rp.handicap = card.handicap;
        rp.handicap_strokes = card.strokesReceived ?? 0;
      }
      for (const hole of card.holes) {
        out.scores.push({
          round_legacy_id: card.legacyRoundId,
          player_slug: slug,
          hole: hole.hole,
          gross: hole.gross,
        });
      }
    }

    // Birdie details name a course but not a round, so they stay as their own
    // record. The par comes from the scorecard for that course when we have one;
    // the points are printed on the birdie list itself.
    const holePar = new Map<string, number>();
    for (const card of cards) {
      for (const hole of card.holes) {
        if (hole.par !== null) holePar.set(`${card.courseName}|${hole.hole}`, hole.par);
      }
    }

    for (const row of birdies) {
      const slug = upsertPlayer(row.playerName);
      for (const detail of row.details) {
        const kind = /eagle/i.test(detail.type)
          ? "eagle"
          : /hole.?in.?one/i.test(detail.type)
            ? "hole-in-one"
            : /albatross/i.test(detail.type)
              ? "albatross"
              : "birdie";
        out.birdies.push({
          year: season.year,
          player_slug: slug,
          course_label: detail.courseLabel,
          hole: detail.hole,
          stroke_index: detail.key,
          par: holePar.get(`${detail.courseLabel}|${detail.hole}`) ?? null,
          points: detail.points ?? (kind === "birdie" ? 3 : 4),
          kind,
        });
      }
    }

    // Champions: the winner of the final table, and the top of the birdie list.
    // A tie for first is left undecided unless data/manual.json records how it
    // was settled, because the tables cannot say who took it.
    const finalSection = standings.sections.find((s) => s.kind === "final") ?? standings.sections[0];
    const atTop = finalSection?.rows.filter((r) => r.place === 1) ?? [];
    const title = out.titles.find((t) => t.year === season.year);
    if (title) {
      out.champions.push({ year: season.year, player_slug: title.winner, kind: "champion" });
    } else if (atTop.length === 1) {
      out.champions.push({ year: season.year, player_slug: slugify(atTop[0].playerName), kind: "champion" });
    }

    const birdieLeaders = birdies.filter((b) => b.place === 1);
    if (birdieLeaders.length === 1) {
      out.champions.push({
        year: season.year,
        player_slug: slugify(birdieLeaders[0].playerName),
        kind: "birdie_champion",
      });
    }
  }

  for (const [, holes] of holesByKey) out.courseHoles.push(...holes.values());

  return out;
}
