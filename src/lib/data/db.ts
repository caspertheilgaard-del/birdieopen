import { createClient } from "@/lib/supabase/server";
import type {
  BirdieListRow,
  CourseDetail,
  HomeData,
  PlayerProfile,
  PlayerSummary,
  ScheduleRound,
  ScorecardView,
  SampleRound,
  SeasonStandings,
  SeasonSummary,
  StandingsRow,
  StandingsTable,
} from "./types";
import { strokesOnHole } from "@/lib/scoring";

/**
 * Reads the same view models out of Supabase. Used once the project is
 * connected, so closing a round updates the standings and the birdie list
 * without rebuilding anything.
 */

type RoundRow = {
  id: string;
  kind: "prelim" | "final";
  sequence: number;
  venue: string;
  starts_at: string | null;
  sponsor: string | null;
  status: "scheduled" | "live" | "final";
  courses: { name: string; par: number | null; length_meters: number | null; address: string | null } | null;
};

function placeRows(rows: Omit<StandingsRow, "place" | "behind">[]): StandingsRow[] {
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  const leader = sorted[0]?.total ?? 0;
  let place = 0;
  let previous: number | null = null;
  return sorted.map((row, index) => {
    if (previous === null || row.total !== previous) {
      place = index + 1;
      previous = row.total;
    }
    return { ...row, place, behind: index === 0 ? null : leader - row.total };
  });
}

export async function getSeasons(): Promise<SeasonSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("seasons").select("year, name, status").order("year", { ascending: false });
  return (data ?? []) as SeasonSummary[];
}

async function seasonId(year: number): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("seasons").select("id").eq("year", year).maybeSingle();
  return data?.id ?? null;
}

export async function getStandings(year: number): Promise<SeasonStandings | null> {
  const id = await seasonId(year);
  if (!id) return null;
  const supabase = await createClient();

  const [{ data: roundData }, { data: resultData }, { data: carryData }] = await Promise.all([
    supabase
      .from("rounds")
      .select("id, kind, sequence, venue, starts_at, sponsor, status, courses ( name, par, length_meters, address )")
      .eq("season_id", id)
      .order("sequence", { ascending: true }),
    supabase
      .from("round_results")
      .select("round_id, points, source, awarded, players ( name, slug ), rounds!inner ( season_id )")
      .eq("rounds.season_id", id),
    supabase.from("season_carryover").select("points, players ( slug )").eq("season_id", id),
  ]);

  const rounds = (roundData ?? []) as unknown as RoundRow[];
  const results = (resultData ?? []) as unknown as {
    round_id: string;
    points: number;
    source: "holes" | "total" | "average";
    awarded: number | null;
    players: { name: string; slug: string } | null;
  }[];
  const carry = new Map(
    ((carryData ?? []) as unknown as { points: number; players: { slug: string } | null }[]).map((row) => [
      row.players?.slug ?? "",
      row.points,
    ]),
  );

  const byRound = new Map<string, typeof results>();
  for (const row of results) {
    const list = byRound.get(row.round_id) ?? [];
    list.push(row);
    byRound.set(row.round_id, list);
  }

  const build = (kind: "prelim" | "final"): StandingsTable | null => {
    const columns = rounds.filter((r) => r.kind === kind);
    if (columns.length === 0) return null;

    const players = new Map<string, string>();
    for (const round of columns) {
      for (const row of byRound.get(round.id) ?? []) {
        if (row.players) players.set(row.players.slug, row.players.name);
      }
    }
    if (players.size === 0) return null;

    const rows = [...players.entries()].map(([slug, name]) => {
      const cells = columns.map((round) => {
        const row = (byRound.get(round.id) ?? []).find((r) => r.players?.slug === slug);
        if (!row) return { value: null, stableford: null, average: false, scorecard: false };
        return {
          value: kind === "final" ? row.awarded : row.points,
          stableford: row.points,
          average: row.source === "average",
          scorecard: row.source === "holes",
        };
      });

      const carryover = kind === "final" ? (carry.get(slug) ?? null) : null;
      return {
        playerName: name,
        playerSlug: slug,
        carryover,
        cells,
        total: (carryover ?? 0) + cells.reduce((n, c) => n + (c.value ?? 0), 0),
      };
    });

    return {
      kind,
      columns: columns.map((round) => ({
        roundId: round.id,
        venue: round.venue,
        courseName: round.courses?.name ?? null,
        startsAt: round.starts_at,
        played: (byRound.get(round.id)?.length ?? 0) > 0,
      })),
      rows: placeRows(rows),
    };
  };

  return { year, prelim: build("prelim"), final: build("final") };
}

export async function getSchedule(year: number): Promise<ScheduleRound[]> {
  const id = await seasonId(year);
  if (!id) return [];
  const supabase = await createClient();

  const [{ data: roundData }, { data: resultData }] = await Promise.all([
    supabase
      .from("rounds")
      .select("id, kind, sequence, venue, starts_at, sponsor, status, courses ( name, par, length_meters, address )")
      .eq("season_id", id)
      .order("sequence", { ascending: true }),
    supabase
      .from("round_results")
      .select("round_id, points, source, players ( name, slug ), rounds!inner ( season_id )")
      .eq("rounds.season_id", id),
  ]);

  const rounds = (roundData ?? []) as unknown as RoundRow[];
  const results = (resultData ?? []) as unknown as {
    round_id: string;
    points: number;
    source: string;
    players: { name: string; slug: string } | null;
  }[];

  return rounds
    .sort((a, b) => (a.kind === b.kind ? a.sequence - b.sequence : a.kind === "prelim" ? -1 : 1))
    .map((round) => {
      const best = results
        .filter((r) => r.round_id === round.id && r.source !== "average")
        .sort((a, b) => b.points - a.points)[0];

      return {
        roundId: round.id,
        kind: round.kind,
        startsAt: round.starts_at,
        venue: round.venue,
        courseName: round.courses?.name ?? null,
        par: round.courses?.par ?? null,
        lengthMeters: round.courses?.length_meters ?? null,
        address: round.courses?.address ?? null,
        sponsor: round.sponsor,
        status: round.status,
        winner: best?.players
          ? { name: best.players.name, slug: best.players.slug, points: best.points }
          : null,
      };
    });
}

export async function getBirdieList(year: number): Promise<BirdieListRow[]> {
  const id = await seasonId(year);
  if (!id) return [];
  const supabase = await createClient();

  const { data } = await supabase
    .from("birdies")
    .select("hole, stroke_index, par, points, kind, course_label, players ( name, slug )")
    .eq("season_id", id);

  const rows = new Map<string, BirdieListRow>();
  for (const raw of (data ?? []) as unknown as {
    hole: number | null;
    stroke_index: number | null;
    par: number | null;
    points: number;
    kind: string;
    course_label: string | null;
    players: { name: string; slug: string } | null;
  }[]) {
    const slug = raw.players?.slug;
    if (!slug) continue;
    const row = rows.get(slug) ?? {
      place: 0,
      playerName: raw.players?.name ?? slug,
      playerSlug: slug,
      count: 0,
      keySum: 0,
      pointSum: 0,
      eagles: 0,
      details: [],
    };
    row.count += raw.kind === "birdie" ? 1 : 3;
    if (raw.kind !== "birdie") row.eagles += 1;
    row.keySum += raw.stroke_index ?? 0;
    row.pointSum += raw.points;
    row.details.push({
      hole: raw.hole,
      courseLabel: raw.course_label ?? "",
      strokeIndex: raw.stroke_index,
      par: raw.par,
      kind: raw.kind,
    });
    rows.set(slug, row);
  }

  const list = [...rows.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.keySum !== b.keySum) return a.keySum - b.keySum;
    return b.pointSum - a.pointSum;
  });

  let place = 0;
  let previous = "";
  list.forEach((row, index) => {
    const signature = `${row.count}/${row.keySum}/${row.pointSum}`;
    if (signature !== previous) {
      place = index + 1;
      previous = signature;
    }
    row.place = place;
  });

  return list;
}

export async function getPlayers(): Promise<PlayerSummary[]> {
  const supabase = await createClient();
  const [{ data: playerData }, { data: championData }] = await Promise.all([
    supabase.from("players").select("name, slug, active").order("name"),
    supabase.from("season_champions").select("kind, seasons ( year ), players ( slug )"),
  ]);

  const champions = (championData ?? []) as unknown as {
    kind: "champion" | "birdie_champion";
    seasons: { year: number } | null;
    players: { slug: string } | null;
  }[];
  const latest = Math.max(0, ...champions.map((c) => c.seasons?.year ?? 0));

  return ((playerData ?? []) as PlayerSummary[]).map((player) => ({
    ...player,
    badges: champions
      .filter((c) => c.players?.slug === player.slug && c.seasons?.year === latest)
      .map((c) => (c.kind === "champion" ? `Mester ${latest}` : `Birdiemester ${latest}`)),
  }));
}

export async function getScorecard(
  year: number,
  roundId: string,
  slug: string,
): Promise<ScorecardView | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("round_players")
    .select(
      `id, handicap, handicap_strokes,
       players!inner ( name, slug ),
       scores ( hole, gross, points ),
       rounds!inner ( id, kind, venue, starts_at, seasons ( year ), courses ( name, tee, course_holes ( hole, par, stroke_index ) ) )`,
    )
    .eq("round_id", roundId)
    .eq("players.slug", slug)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as {
    handicap: number | null;
    handicap_strokes: number;
    players: { name: string; slug: string };
    scores: { hole: number; gross: number | null; points: number }[];
    rounds: {
      id: string;
      kind: "prelim" | "final";
      venue: string;
      starts_at: string | null;
      seasons: { year: number } | null;
      courses: { name: string; tee: string | null; course_holes: { hole: number; par: number; stroke_index: number }[] } | null;
    };
  };

  const specs = (row.rounds.courses?.course_holes ?? []).sort((a, b) => a.hole - b.hole);
  const grossByHole = new Map(row.scores.map((s) => [s.hole, s.gross]));

  let running = 0;
  const summary = { eagles: 0, birdies: 0, pars: 0, bogeys: 0, worse: 0, blank: 0 };
  const holes = specs.map((spec) => {
    const strokes = strokesOnHole(row.handicap_strokes, spec.stroke_index, specs.length);
    const gross = grossByHole.get(spec.hole) ?? null;
    const points = gross === null || gross <= 0 ? 0 : Math.max(0, 2 + spec.par - (gross - strokes));
    running += points;

    if (gross === null || gross <= 0) summary.blank += 1;
    else if (gross <= spec.par - 2) summary.eagles += 1;
    else if (gross === spec.par - 1) summary.birdies += 1;
    else if (gross === spec.par) summary.pars += 1;
    else if (gross === spec.par + 1) summary.bogeys += 1;
    else summary.worse += 1;

    return { hole: spec.hole, par: spec.par, strokeIndex: spec.stroke_index, strokes, gross, points, running };
  });

  return {
    year: row.rounds.seasons?.year ?? year,
    roundId: row.rounds.id,
    kind: row.rounds.kind,
    playerName: row.players.name,
    playerSlug: row.players.slug,
    venue: row.rounds.venue,
    courseName: row.rounds.courses?.name ?? null,
    startsAt: row.rounds.starts_at,
    tee: row.rounds.courses?.tee ?? null,
    handicap: row.handicap,
    handicapStrokes: row.handicap_strokes,
    total: holes.reduce((n, h) => n + h.points, 0),
    front: holes.filter((h) => h.hole <= 9).reduce((n, h) => n + h.points, 0),
    back: holes.filter((h) => h.hole > 9).reduce((n, h) => n + h.points, 0),
    holes,
    summary,
  };
}

/** Career pages are built from the season tables the site already computes. */
export async function getPlayerProfile(slug: string): Promise<PlayerProfile | null> {
  const supabase = await createClient();
  const { data: player } = await supabase
    .from("players")
    .select("name, slug, active")
    .eq("slug", slug)
    .maybeSingle();
  if (!player) return null;

  const seasons = await getSeasons();
  const lines = [];
  let titles = 0;

  for (const season of seasons) {
    const [standings, birdies] = await Promise.all([getStandings(season.year), getBirdieList(season.year)]);
    const prelim = standings?.prelim?.rows.find((r) => r.playerSlug === slug) ?? null;
    const final = standings?.final?.rows.find((r) => r.playerSlug === slug) ?? null;
    if (!prelim && !final) continue;
    if (final?.place === 1) titles += 1;

    // Final rounds count too; their stableford sits in `stableford`, because
    // `value` holds the placement points those rounds paid.
    const roundScores = [
      ...(prelim?.cells ?? []).filter((c) => c.value !== null && !c.average).map((c) => c.value as number),
      ...(final?.cells ?? []).filter((c) => c.stableford !== null && !c.average).map((c) => c.stableford as number),
    ];
    lines.push({
      year: season.year,
      prelimTotal: prelim?.total ?? null,
      prelimPlace: prelim?.place ?? null,
      finalTotal: final?.total ?? null,
      finalPlace: final?.place ?? null,
      roundsPlayed: roundScores.length,
      bestRound: roundScores.length > 0 ? Math.max(...roundScores) : null,
      birdies: birdies.find((b) => b.playerSlug === slug)?.count ?? 0,
      playedPoints: roundScores.reduce((n, p) => n + p, 0),
    });
  }

  const roundsPlayed = lines.reduce((n, l) => n + l.roundsPlayed, 0);
  const playedPoints = lines.reduce((n, l) => n + l.playedPoints, 0);
  const bestRounds = lines.map((l) => l.bestRound).filter((v): v is number => v !== null);

  return {
    name: player.name,
    slug: player.slug,
    active: player.active,
    badges: [],
    seasons: lines.map(({ playedPoints: _p, ...line }) => line),
    totals: {
      seasons: lines.length,
      roundsPlayed,
      points: playedPoints,
      birdies: lines.reduce((n, l) => n + l.birdies, 0),
      titles,
      bestRound: bestRounds.length > 0 ? Math.max(...bestRounds) : null,
      averageRound: roundsPlayed > 0 ? Math.round((playedPoints / roundsPlayed) * 10) / 10 : null,
    },
  };
}

export async function getPlayerSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("players").select("slug");
  return (data ?? []).map((row) => row.slug as string);
}

export async function getHome(): Promise<HomeData> {
  const seasons = await getSeasons();
  const current = seasons.find((s) => s.status === "active") ?? seasons[0];
  const previous = seasons.find((s) => s.year === current.year - 1) ?? seasons[1] ?? current;

  const [standings, schedule, birdies, players, champions] = await Promise.all([
    getStandings(current.year),
    getSchedule(current.year),
    getBirdieList(current.year),
    getPlayers(),
    (async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("season_champions")
        .select("kind, seasons!inner ( year ), players ( name, slug )")
        .eq("seasons.year", previous.year);
      return (data ?? []) as unknown as {
        kind: "champion" | "birdie_champion";
        players: { name: string; slug: string } | null;
      }[];
    })(),
  ]);

  const table = standings?.final ?? standings?.prelim ?? null;
  const finalRounds = schedule.filter((r) => r.kind === "final");
  const championOf = (kind: "champion" | "birdie_champion") => {
    const row = champions.find((c) => c.kind === kind);
    return row?.players ? { name: row.players.name, slug: row.players.slug, year: previous.year } : null;
  };

  return {
    season: current,
    seasons,
    top: (table?.rows ?? []).slice(0, 5).map((row) => ({
      place: row.place,
      playerName: row.playerName,
      playerSlug: row.playerSlug,
      points: row.total,
      behind: row.behind ?? 0,
    })),
    finalRoundsPlayed: finalRounds.filter((r) => r.winner !== null).length,
    finalRoundsTotal: finalRounds.length,
    nextRound: schedule.find((r) => r.status !== "final") ?? schedule.find((r) => r.winner === null) ?? null,
    liveRound: schedule.find((r) => r.status === "live") ?? null,
    // How a tied title was settled is curated rather than scraped, so the
    // database has no record of it. The snapshot import carries it.
    title: null,
    champion: championOf("champion"),
    birdieChampion: championOf("birdie_champion"),
    stats: {
      seasonNumber: seasons.length,
      activePlayers: players.filter((p) => p.active).length,
      rounds: schedule.length,
      birdies: birdies.reduce((n, b) => n + b.count, 0),
    },
  };
}

/** Server-rendered on demand when a database is connected, so nothing to list. */
export async function getScorecardKeys(): Promise<{ year: string; round: string; slug: string }[]> {
  return [];
}

/** Courses live in the database once it is connected; nothing to look up here yet. */
export async function getCourse(_key: string): Promise<CourseDetail | null> {
  return null;
}

/** Only used by the preview screens, which read the snapshot. */
export async function getSampleRound(): Promise<SampleRound | null> {
  return null;
}
