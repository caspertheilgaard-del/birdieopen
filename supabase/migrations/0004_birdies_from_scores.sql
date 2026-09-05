/*
  Birdies from live scores.

  The standings updated themselves when a round was closed, but the birdie list
  did not: nothing turned a hole-by-hole score into a birdie record. Rounds
  played in the app would therefore never reach the birdie list, which is half
  of what the app is for.

  The old unique constraint also had to go. It keyed a birdie on player, course,
  hole, index, par and kind, so a player who birdied the same hole on the same
  course in two different rounds only counted once. Gut Apeldör is played twice
  in a finals weekend, and the archive has exactly that case.
*/

-- Postgres truncates long constraint names, so look it up rather than guess it.
do $$
declare
  v_name text;
begin
  for v_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'birdies' and con.contype = 'u'
  loop
    execute format('alter table birdies drop constraint %I', v_name);
  end loop;
end;
$$;

create index if not exists birdies_round_idx on birdies (round_id);

/** Rebuilds the birdie records for one round from its scores. */
create or replace function bo_refresh_birdies(p_round uuid)
returns void language plpgsql as $$
begin
  -- Only this round's records. Birdies imported from the old site carry no
  -- round and must be left alone.
  delete from birdies where round_id = p_round;

  insert into birdies (season_id, player_id, round_id, course_label, hole, stroke_index, par, points, kind)
  select
    r.season_id,
    rp.player_id,
    r.id,
    coalesce(c.name, r.venue),
    s.hole,
    ch.stroke_index,
    ch.par,
    s.points,
    case
      when s.gross = 1 and ch.par > 2 then 'hole-in-one'
      when s.gross - ch.par <= -3 then 'albatross'
      when s.gross - ch.par = -2 then 'eagle'
      else 'birdie'
    end
  from scores s
  join round_players rp on rp.id = s.round_player_id
  join rounds r on r.id = rp.round_id
  left join courses c on c.id = r.course_id
  join course_holes ch on ch.course_id = r.course_id and ch.hole = s.hole
  where r.id = p_round
    and rp.status = 'playing'
    and s.gross is not null
    and s.gross > 0
    and s.gross < ch.par;
end;
$$;

/** Every round in a season that has hole-by-hole scores behind it. */
create or replace function bo_refresh_season_birdies(p_season uuid)
returns void language plpgsql as $$
declare
  v_round uuid;
begin
  for v_round in
    select distinct r.id
    from rounds r
    join round_players rp on rp.round_id = r.id
    join scores s on s.round_player_id = rp.id
    where r.season_id = p_season
  loop
    perform bo_refresh_birdies(v_round);
  end loop;
end;
$$;
