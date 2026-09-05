import { createClient } from "@supabase/supabase-js";
import { normalize, type Normalized } from "./normalize";

/**
 * Pushes the imported history into Supabase. Idempotent: everything upserts on
 * a natural key, so a rerun corrects rather than duplicates.
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY skal være sat. Se .env.example.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const CHUNK = 500;

async function insert(table: string, rows: object[]): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`  ${table}: ${rows.length}`);
}

async function upsert(table: string, rows: object[], onConflict: string): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).upsert(slice, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`  ${table}: ${rows.length}`);
}

async function idMap(table: string, keyColumn: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(`id, ${keyColumn}`)
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    for (const row of (data ?? []) as unknown as Record<string, string>[]) {
      map.set(String(row[keyColumn]), row.id);
    }
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return map;
}

async function main(): Promise<void> {
  console.log("Normaliserer…");
  const data: Normalized = await normalize();

  console.log("Skriver til Supabase…");
  await upsert(
    "players",
    data.players.map((p) => ({
      legacy_id: p.legacy_id,
      name: p.name,
      slug: p.slug,
      active: p.active,
      golfbox: p.golfbox,
    })),
    "slug",
  );

  await upsert(
    "seasons",
    data.seasons.map((s) => ({ legacy_id: s.legacy_id, year: s.year, name: s.name, status: s.status })),
    "year",
  );

  await upsert(
    "courses",
    data.courses.map((c) => ({
      name: c.name,
      club: c.club,
      address: c.address,
      par: c.par,
      length_meters: c.length_meters,
      tee: c.tee,
    })),
    "name,tee",
  );

  const players = await idMap("players", "slug");
  const seasons = await idMap("seasons", "year");

  // Courses key on name plus tee, and tee may be null, so the map is built by hand.
  const courseIds = new Map<string, string>();
  {
    const { data: rows, error } = await supabase.from("courses").select("id, name, tee");
    if (error) throw new Error(`courses: ${error.message}`);
    for (const row of (rows ?? []) as { id: string; name: string; tee: string | null }[]) {
      courseIds.set(`${row.name}|${row.tee ?? ""}`, row.id);
    }
  }

  await upsert(
    "course_holes",
    data.courseHoles
      .filter((h) => courseIds.has(h.course_key))
      .map((h) => ({
        course_id: courseIds.get(h.course_key),
        hole: h.hole,
        par: h.par,
        stroke_index: h.stroke_index,
        length_meters: h.length_meters,
      })),
    "course_id,hole",
  );

  await upsert(
    "rounds",
    data.rounds.map((r) => ({
      legacy_id: r.legacy_id,
      season_id: seasons.get(String(r.year)),
      course_id: r.course_key ? (courseIds.get(r.course_key) ?? null) : null,
      kind: r.kind,
      sequence: r.sequence,
      starts_at: r.starts_at,
      venue: r.venue,
      sponsor: r.sponsor,
      status: r.status,
    })),
    "legacy_id",
  );

  const rounds = await idMap("rounds", "legacy_id");

  // One row per player per round, deduplicated: the standings list a player once
  // per round, but a scorecard can add the same pair again.
  const roundPlayerRows = new Map<string, object>();
  for (const rp of data.roundPlayers) {
    const roundId = rounds.get(rp.round_legacy_id);
    const playerId = players.get(rp.player_slug);
    if (!roundId || !playerId) continue;
    roundPlayerRows.set(`${roundId}/${playerId}`, {
      round_id: roundId,
      player_id: playerId,
      handicap: rp.handicap,
      handicap_strokes: rp.handicap_strokes,
      status: rp.status,
    });
  }
  await upsert("round_players", [...roundPlayerRows.values()], "round_id,player_id");

  const roundPlayerIds = new Map<string, string>();
  {
    let from = 0;
    for (;;) {
      const { data: rows, error } = await supabase
        .from("round_players")
        .select("id, round_id, player_id")
        .range(from, from + 999);
      if (error) throw new Error(`round_players: ${error.message}`);
      for (const row of (rows ?? []) as { id: string; round_id: string; player_id: string }[]) {
        roundPlayerIds.set(`${row.round_id}/${row.player_id}`, row.id);
      }
      if (!rows || rows.length < 1000) break;
      from += 1000;
    }
  }

  await upsert(
    "scores",
    data.scores
      .map((s) => {
        const roundId = rounds.get(s.round_legacy_id);
        const playerId = players.get(s.player_slug);
        const id = roundId && playerId ? roundPlayerIds.get(`${roundId}/${playerId}`) : null;
        return id ? { round_player_id: id, hole: s.hole, gross: s.gross } : null;
      })
      .filter((row): row is { round_player_id: string; hole: number; gross: number | null } => row !== null),
    "round_player_id,hole",
  );

  // Written after the scores so the imported totals win over what the score
  // trigger recomputed, which matters for the seasons that only ever published
  // round totals.
  await upsert(
    "round_results",
    data.roundResults
      .map((r) => {
        const roundId = rounds.get(r.round_legacy_id);
        const playerId = players.get(r.player_slug);
        return roundId && playerId
          ? {
              round_id: roundId,
              player_id: playerId,
              points: r.points,
              source: r.source,
              awarded: r.awarded,
            }
          : null;
      })
      .filter(Boolean) as object[],
    "round_id,player_id",
  );

  await upsert(
    "season_carryover",
    data.carryover
      .map((c) => {
        const seasonId = seasons.get(String(c.year));
        const playerId = players.get(c.player_slug);
        return seasonId && playerId
          ? { season_id: seasonId, player_id: playerId, prelim_total: c.prelim_total, place: c.place, points: c.points }
          : null;
      })
      .filter(Boolean) as object[],
    "season_id,player_id",
  );

  // Birdies carry no natural key any more, because the same hole on the same
  // course can be birdied in two different rounds. So the imported ones are
  // replaced wholesale; the ones a live round generates are keyed on the round.
  {
    const { error } = await supabase.from("birdies").delete().is("round_id", null);
    if (error) throw new Error(`birdies: ${error.message}`);
  }

  await insert(
    "birdies",
    data.birdies
      .map((b) => {
        const seasonId = seasons.get(String(b.year));
        const playerId = players.get(b.player_slug);
        return seasonId && playerId
          ? {
              season_id: seasonId,
              player_id: playerId,
              course_label: b.course_label,
              hole: b.hole,
              stroke_index: b.stroke_index,
              par: b.par,
              points: b.points,
              kind: b.kind,
            }
          : null;
      })
      .filter(Boolean) as object[],
  );

  await upsert(
    "season_champions",
    data.champions
      .map((c) => {
        const seasonId = seasons.get(String(c.year));
        const playerId = players.get(c.player_slug);
        return seasonId && playerId ? { season_id: seasonId, player_id: playerId, kind: c.kind } : null;
      })
      .filter(Boolean) as object[],
    "season_id,kind",
  );

  console.log("Import færdig.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
