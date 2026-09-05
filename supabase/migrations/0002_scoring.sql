-- Scoring in the database, so a score typed on the course updates the round,
-- the season standings and the birdie list without an application round trip.

-- Handicap strokes for one hole, spread by stroke index (hardest holes first).
create or replace function bo_strokes_on_hole(strokes int, idx int)
returns int language sql immutable as $$
  select case
    when strokes is null or strokes <= 0 or idx is null or idx < 1 then 0
    else (strokes / 18) + case when idx <= (strokes % 18) then 1 else 0 end
  end;
$$;

-- Stableford points for one hole. No gross score means no points.
create or replace function bo_hole_points(gross int, par int, strokes int)
returns int language sql immutable as $$
  select case
    when gross is null or gross <= 0 then 0
    else greatest(0, 2 + par - (gross - coalesce(strokes, 0)))
  end;
$$;

-- Penalty on the round average for a player's n'th absence of the season.
create or replace function bo_absence_penalty(absence_number int)
returns int language sql immutable as $$
  select case
    when absence_number <= 1 then 0
    when absence_number = 2 then 2
    when absence_number = 3 then 3
    when absence_number = 4 then 4
    else 5
  end;
$$;

/*
  Points by place. The carry into the finals has always run on the doubled scale:
  the leader takes twice the number of finalists and every place drops two.
  Inside a final round the tournament used a single scale through 2022 and
  doubled it from 2023, so the scale is passed in.
*/
create or replace function bo_place_points(place int, finalists int, scale int default 2)
returns int language sql immutable as $$
  select greatest(0, finalists * scale - scale * (place - 1));
$$;

create or replace function bo_final_scale(year int)
returns int language sql immutable as $$
  select case when year >= 2023 then 2 else 1 end;
$$;

-- ---------------------------------------------------------------- triggers

create or replace function bo_score_points() returns trigger language plpgsql as $$
declare
  v_par int;
  v_index int;
  v_strokes int;
begin
  select rp.handicap_strokes, ch.par, ch.stroke_index
    into v_strokes, v_par, v_index
  from round_players rp
  join rounds r on r.id = rp.round_id
  left join course_holes ch on ch.course_id = r.course_id and ch.hole = new.hole
  where rp.id = new.round_player_id;

  new.points := bo_hole_points(new.gross, coalesce(v_par, 0), bo_strokes_on_hole(v_strokes, v_index));
  new.updated_at := now();
  return new;
end;
$$;

create trigger scores_points
before insert or update on scores
for each row execute function bo_score_points();

create or replace function bo_refresh_round_result() returns trigger language plpgsql as $$
declare
  v_round_player uuid := coalesce(new.round_player_id, old.round_player_id);
  v_round uuid;
  v_player uuid;
begin
  select rp.round_id, rp.player_id into v_round, v_player
  from round_players rp where rp.id = v_round_player;

  if v_round is null then
    return null;
  end if;

  insert into round_results (round_id, player_id, points, front, back, holes_played, source, updated_at)
  select
    v_round,
    v_player,
    coalesce(sum(s.points), 0),
    coalesce(sum(s.points) filter (where s.hole <= 9), 0),
    coalesce(sum(s.points) filter (where s.hole > 9), 0),
    count(*) filter (where s.gross is not null and s.gross > 0),
    'holes',
    now()
  from scores s
  where s.round_player_id = v_round_player
  on conflict (round_id, player_id) do update set
    points = excluded.points,
    front = excluded.front,
    back = excluded.back,
    holes_played = excluded.holes_played,
    source = 'holes',
    updated_at = now();

  return null;
end;
$$;

create trigger scores_refresh_result
after insert or update or delete on scores
for each row execute function bo_refresh_round_result();

-- ---------------------------------------------------------------- season maths

/*
  Recomputes a whole season: absence scores, round places, the points carried
  into the finals and the points awarded in each final round. Cheap enough to run
  on every score change for the live season.
*/
create or replace function bo_recalculate_season(p_season uuid)
returns void language plpgsql as $$
declare
  v_finalists int;
  v_year int;
  v_scale int;
begin
  select year into v_year from seasons where id = p_season;
  v_scale := bo_final_scale(coalesce(v_year, 2026));

  -- Absent players take the round average, less a penalty that grows with each
  -- absence they have had this season (rule 12).
  with absences as (
    select
      rp.round_id,
      rp.player_id,
      row_number() over (partition by rp.player_id order by r.kind, r.sequence) as absence_number
    from round_players rp
    join rounds r on r.id = rp.round_id
    where r.season_id = p_season and rp.status = 'absent'
  ),
  averages as (
    select
      rr.round_id,
      round(avg(rr.points))::int as average
    from round_results rr
    join rounds r on r.id = rr.round_id
    where r.season_id = p_season and rr.source <> 'average'
    group by rr.round_id
  )
  insert into round_results (round_id, player_id, points, source, updated_at)
  select
    a.round_id,
    a.player_id,
    greatest(0, coalesce(av.average, 0) - bo_absence_penalty(a.absence_number::int)),
    'average',
    now()
  from absences a
  left join averages av on av.round_id = a.round_id
  on conflict (round_id, player_id) do update set
    points = excluded.points,
    source = 'average',
    updated_at = now();

  -- Place within each round, ties sharing a place.
  with placed as (
    select
      rr.round_id,
      rr.player_id,
      rank() over (partition by rr.round_id order by rr.points desc) as place
    from round_results rr
    join rounds r on r.id = rr.round_id
    where r.season_id = p_season
  )
  update round_results rr
  set place = p.place
  from placed p
  where rr.round_id = p.round_id and rr.player_id = p.player_id;

  -- Who plays the finals decides the whole points scale.
  select count(distinct rp.player_id) into v_finalists
  from round_players rp
  join rounds r on r.id = rp.round_id
  where r.season_id = p_season and r.kind = 'final';

  if v_finalists > 0 then
    -- Points carried in from the preliminary rounds, floored at max minus a win.
    with prelim as (
      select rr.player_id, sum(rr.points)::int as total
      from round_results rr
      join rounds r on r.id = rr.round_id
      where r.season_id = p_season and r.kind = 'prelim'
      group by rr.player_id
    ),
    finalists as (
      select distinct rp.player_id
      from round_players rp
      join rounds r on r.id = rp.round_id
      where r.season_id = p_season and r.kind = 'final'
    ),
    ranked as (
      select
        p.player_id,
        p.total,
        rank() over (order by p.total desc)::int as place
      from prelim p
      join finalists f on f.player_id = p.player_id
    )
    insert into season_carryover (season_id, player_id, prelim_total, place, points)
    select
      p_season,
      ranked.player_id,
      ranked.total,
      ranked.place,
      greatest(v_finalists, bo_place_points(ranked.place, v_finalists, 2))
    from ranked
    on conflict (season_id, player_id) do update set
      prelim_total = excluded.prelim_total,
      place = excluded.place,
      points = excluded.points;

    -- Points won inside each final round.
    with final_places as (
      select
        rr.round_id,
        rr.player_id,
        rank() over (partition by rr.round_id order by rr.points desc)::int as place
      from round_results rr
      join rounds r on r.id = rr.round_id
      where r.season_id = p_season and r.kind = 'final'
    )
    update round_results rr
    set awarded = bo_place_points(fp.place, v_finalists, v_scale)
    from final_places fp
    where rr.round_id = fp.round_id and rr.player_id = fp.player_id;
  end if;

  -- Birdies come out of the same scores, so the list keeps step with the
  -- standings. Defined in a later migration; skipped until it exists.
  if to_regprocedure('bo_refresh_season_birdies(uuid)') is not null then
    execute 'select bo_refresh_season_birdies($1)' using p_season;
  end if;
end;
$$;

-- ---------------------------------------------------------------- read models

create or replace view v_standings as
select
  r.season_id,
  s.year,
  r.kind,
  r.id as round_id,
  r.sequence,
  r.starts_at,
  r.venue,
  rr.player_id,
  p.name as player_name,
  p.slug as player_slug,
  rr.points,
  rr.source,
  rr.place,
  rr.awarded
from round_results rr
join rounds r on r.id = rr.round_id
join seasons s on s.id = r.season_id
join players p on p.id = rr.player_id;

create or replace view v_season_totals as
select
  season_id,
  year,
  kind,
  player_id,
  player_name,
  player_slug,
  sum(case when kind = 'final' then coalesce(awarded, 0) else points end)::int as total
from v_standings
group by season_id, year, kind, player_id, player_name, player_slug;

-- An eagle or better counts as three birdies; ties break on the hardest holes.
create or replace view v_birdie_list as
select
  b.season_id,
  s.year,
  b.player_id,
  p.name as player_name,
  p.slug as player_slug,
  sum(case when b.kind = 'birdie' then 1 else 3 end)::int as count,
  sum(coalesce(b.stroke_index, 0))::int as key_sum,
  sum(b.points)::int as point_sum
from birdies b
join seasons s on s.id = b.season_id
join players p on p.id = b.player_id
group by b.season_id, s.year, b.player_id, p.name, p.slug;
