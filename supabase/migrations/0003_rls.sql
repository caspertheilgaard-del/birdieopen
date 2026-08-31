-- Everything published on the old site stays public to read.
-- Writing is limited to the player themself, the marker of their flight, and admins.

create or replace function bo_current_player()
returns uuid language sql stable security definer set search_path = public as $$
  select id from players where auth_user_id = auth.uid();
$$;

create or replace function bo_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from players where auth_user_id = auth.uid() and role = 'admin');
$$;

-- A score may be typed by the player, by whoever is marking for them in that
-- round, or by an admin. Only while the round is still open.
create or replace function bo_can_score(p_round_player uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select bo_is_admin() or exists (
    select 1
    from round_players rp
    join rounds r on r.id = rp.round_id
    where rp.id = p_round_player
      and r.status = 'live'
      and bo_current_player() is not null
      and (rp.player_id = bo_current_player() or rp.marker_id = bo_current_player())
  );
$$;

alter table players enable row level security;
alter table seasons enable row level security;
alter table courses enable row level security;
alter table course_holes enable row level security;
alter table rounds enable row level security;
alter table round_players enable row level security;
alter table scores enable row level security;
alter table round_results enable row level security;
alter table season_carryover enable row level security;
alter table birdies enable row level security;
alter table season_champions enable row level security;
alter table sponsors enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'players', 'seasons', 'courses', 'course_holes', 'rounds', 'round_players',
    'scores', 'round_results', 'season_carryover', 'birdies', 'season_champions', 'sponsors'
  ] loop
    execute format('create policy %I on %I for select to anon, authenticated using (true)', t || '_read', t);
    execute format('create policy %I on %I for all to authenticated using (bo_is_admin()) with check (bo_is_admin())', t || '_admin', t);
  end loop;
end;
$$;

create policy scores_write on scores
for all to authenticated
using (bo_can_score(round_player_id))
with check (bo_can_score(round_player_id));

-- A player may set their own handicap and mark themselves absent before teeing off.
create policy round_players_self on round_players
for update to authenticated
using (player_id = bo_current_player())
with check (player_id = bo_current_player());

-- Live pages subscribe to these.
alter publication supabase_realtime add table scores;
alter publication supabase_realtime add table round_results;
alter publication supabase_realtime add table rounds;
