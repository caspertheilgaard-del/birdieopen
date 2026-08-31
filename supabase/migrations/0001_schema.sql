-- Birdie Open: core schema.
-- Holds 15 seasons of imported history alongside live scoring for the current round.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- players

create table players (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  golfbox text,
  role text not null default 'player' check (role in ('player', 'admin')),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index players_active_idx on players (active);

-- ---------------------------------------------------------------- seasons

create table seasons (
  id uuid primary key default gen_random_uuid(),
  year int not null unique,
  name text not null,
  legacy_id text unique,
  status text not null default 'complete' check (status in ('planned', 'active', 'complete'))
);

-- ---------------------------------------------------------------- courses

-- A course row is one layout played off one tee, the way the old site recorded
-- it: "Skanderborg 2024", "AB / Rød/Gul". Hole pars and stroke indexes hang off it.
create table courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  club text,
  address text,
  par int,
  length_meters int,
  tee text,
  created_at timestamptz not null default now(),
  unique (name, tee)
);

create table course_holes (
  course_id uuid not null references courses (id) on delete cascade,
  hole int not null check (hole between 1 and 18),
  par int not null check (par between 3 and 6),
  stroke_index int not null check (stroke_index between 1 and 18),
  length_meters int,
  primary key (course_id, hole)
);

-- ---------------------------------------------------------------- rounds

create table rounds (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons (id) on delete cascade,
  course_id uuid references courses (id),
  legacy_id text unique,
  kind text not null check (kind in ('prelim', 'final')),
  sequence int not null,
  starts_at timestamptz,
  venue text,
  sponsor text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'final')),
  created_at timestamptz not null default now(),
  unique (season_id, kind, sequence)
);

create index rounds_season_idx on rounds (season_id, kind, sequence);
create index rounds_status_idx on rounds (status);

create table round_players (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  handicap numeric(4, 1),
  handicap_strokes int not null default 0 check (handicap_strokes >= 0),
  flight int,
  tee_time timestamptz,
  marker_id uuid references players (id) on delete set null,
  status text not null default 'playing' check (status in ('playing', 'absent')),
  unique (round_id, player_id)
);

create index round_players_round_idx on round_players (round_id);
create index round_players_player_idx on round_players (player_id);

-- ---------------------------------------------------------------- scores

create table scores (
  round_player_id uuid not null references round_players (id) on delete cascade,
  hole int not null check (hole between 1 and 18),
  gross int check (gross between 1 and 20),
  points int not null default 0,
  entered_by uuid references players (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (round_player_id, hole)
);

-- One row per player per round. Seasons imported without hole-by-hole data land
-- here with source 'total'; an absent player gets the round average, source 'average'.
create table round_results (
  round_id uuid not null references rounds (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  points int not null default 0,
  front int not null default 0,
  back int not null default 0,
  holes_played int not null default 0,
  source text not null default 'holes' check (source in ('holes', 'total', 'average')),
  place int,
  awarded int,
  updated_at timestamptz not null default now(),
  primary key (round_id, player_id)
);

create index round_results_player_idx on round_results (player_id);

-- ---------------------------------------------------------------- season tables

create table season_carryover (
  season_id uuid not null references seasons (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  prelim_total int not null default 0,
  place int,
  points int not null default 0,
  primary key (season_id, player_id)
);

-- Birdies are their own record: several seasons published a birdie list without
-- ever publishing the scorecards behind it, so they cannot always be derived.
create table birdies (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  round_id uuid references rounds (id) on delete set null,
  course_label text,
  hole int check (hole between 1 and 18),
  stroke_index int,
  par int,
  points int not null default 0,
  kind text not null default 'birdie' check (kind in ('birdie', 'eagle', 'albatross', 'hole-in-one')),
  unique (season_id, player_id, course_label, hole, stroke_index, par, kind)
);

create index birdies_season_idx on birdies (season_id);

create table season_champions (
  season_id uuid not null references seasons (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  kind text not null check (kind in ('champion', 'birdie_champion')),
  primary key (season_id, kind)
);

create table sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text,
  logo_url text,
  sort_order int not null default 0
);
