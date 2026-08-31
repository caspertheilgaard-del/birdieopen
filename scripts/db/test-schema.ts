import { readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * Runs the migrations against an in-process Postgres and exercises the scoring
 * functions on real numbers. Catches a broken migration before it reaches the
 * live project, where a failed run is a lot less convenient.
 */

const MIGRATIONS = ["0001_schema.sql", "0002_scoring.sql", "0003_rls.sql"];

async function main(): Promise<void> {
  const db = new PGlite();

  // Supabase supplies these; a bare Postgres does not.
  await db.exec(`
    create schema if not exists auth;
    create table if not exists auth.users (id uuid primary key);
    create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create publication supabase_realtime;
    create role anon;
    create role authenticated;
  `);

  for (const file of MIGRATIONS) {
    const sql = await readFile(path.join(process.cwd(), "supabase", "migrations", file), "utf8");
    await db.exec(sql);
    console.log(`✓ ${file}`);
  }

  // --- the scoring functions on known numbers -------------------------
  const checks: [string, string, unknown][] = [
    ["11 slag rammer nøgle 1", "select bo_strokes_on_hole(11, 1)", 1],
    ["11 slag rammer ikke nøgle 12", "select bo_strokes_on_hole(11, 12)", 0],
    ["22 slag giver to på nøgle 4", "select bo_strokes_on_hole(22, 4)", 2],
    ["par 5 med et slag giver 3 point", "select bo_hole_points(5, 5, 1)", 3],
    ["ingen score giver nul point", "select bo_hole_points(null, 4, 1)", 0],
    ["2. afbud koster 2 point", "select bo_absence_penalty(2)", 2],
    ["7. afbud koster 5 point", "select bo_absence_penalty(7)", 5],
    ["finalen 2026: sejr giver 26", "select bo_place_points(1, 13, 2)", 26],
    ["finalen 2022: sejr giver 14", "select bo_place_points(1, 14, 1)", 14],
    ["skalaen skifter i 2023", "select bo_final_scale(2023)", 2],
    ["skalaen var enkelt i 2022", "select bo_final_scale(2022)", 1],
  ];

  let failed = 0;
  for (const [name, sql, expected] of checks) {
    const result = await db.query<Record<string, unknown>>(sql);
    const actual = Object.values(result.rows[0])[0];
    if (Number(actual) !== Number(expected)) {
      console.error(`✗ ${name}: fik ${actual}, ventede ${expected}`);
      failed += 1;
    }
  }

  // --- a round end to end ---------------------------------------------
  await db.exec(`
    insert into seasons (id, year, name, status)
      values ('11111111-1111-1111-1111-111111111111', 2027, 'Birdie Open 2027', 'active');
    insert into courses (id, name, par, tee)
      values ('22222222-2222-2222-2222-222222222222', 'Testbanen', 72, 'gul');
    insert into course_holes (course_id, hole, par, stroke_index)
      select '22222222-2222-2222-2222-222222222222', g, 4, g from generate_series(1, 18) g;
    insert into players (id, name, slug) values
      ('33333333-3333-3333-3333-333333333333', 'Spiller A', 'spiller-a'),
      ('44444444-4444-4444-4444-444444444444', 'Spiller B', 'spiller-b');
    insert into rounds (id, season_id, course_id, kind, sequence, venue, status)
      values ('55555555-5555-5555-5555-555555555555',
              '11111111-1111-1111-1111-111111111111',
              '22222222-2222-2222-2222-222222222222', 'prelim', 1, 'Testklubben', 'live');
    insert into round_players (id, round_id, player_id, handicap_strokes, status) values
      ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555',
       '33333333-3333-3333-3333-333333333333', 18, 'playing'),
      ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555',
       '44444444-4444-4444-4444-444444444444', 0, 'absent');
    -- Spiller A goes round in par on every hole, with a stroke on each one.
    insert into scores (round_player_id, hole, gross)
      select '66666666-6666-6666-6666-666666666666', g, 4 from generate_series(1, 18) g;
  `);

  const total = await db.query<{ points: number; source: string; holes_played: number }>(
    "select points, source, holes_played from round_results where player_id = '33333333-3333-3333-3333-333333333333'",
  );

  // 18 holes at par with a stroke on each: 3 points a hole.
  if (Number(total.rows[0]?.points) !== 54) {
    console.error(`✗ trigger: fik ${total.rows[0]?.points} point, ventede 54`);
    failed += 1;
  }
  if (Number(total.rows[0]?.holes_played) !== 18) {
    console.error(`✗ trigger: fik ${total.rows[0]?.holes_played} huller, ventede 18`);
    failed += 1;
  }

  await db.query("select bo_recalculate_season('11111111-1111-1111-1111-111111111111')");

  const absent = await db.query<{ points: number; source: string }>(
    "select points, source from round_results where player_id = '44444444-4444-4444-4444-444444444444'",
  );
  // The only player who did play scored 54, so the absent player takes that as
  // their first absence of the season.
  if (Number(absent.rows[0]?.points) !== 54 || absent.rows[0]?.source !== "average") {
    console.error(`✗ afbud: fik ${absent.rows[0]?.points} (${absent.rows[0]?.source}), ventede 54 (average)`);
    failed += 1;
  }

  const places = await db.query<{ place: number }>(
    "select place from round_results where player_id = '33333333-3333-3333-3333-333333333333'",
  );
  if (Number(places.rows[0]?.place) !== 1) {
    console.error(`✗ placering: fik ${places.rows[0]?.place}, ventede 1`);
    failed += 1;
  }

  await db.close();

  if (failed > 0) {
    console.error(`\n${failed} fejl i skemaet.`);
    process.exit(1);
  }
  console.log(`\n${checks.length + 4} kontroller bestået. Skemaet kører.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
