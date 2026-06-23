-- Supabase SQL Editor에서 실행하세요 (무료 프로젝트 생성 후)

create table if not exists player_profiles (
  id text primary key,
  nickname text not null,
  nickname_key text not null unique,
  max_region int not null default 1,
  total_kills int not null default 0,
  rank_score bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_player_profiles_rank
  on player_profiles (rank_score desc);

alter table player_profiles enable row level security;

create policy "Anyone can read leaderboard"
  on player_profiles for select using (true);

create policy "Anyone can register"
  on player_profiles for insert with check (true);

create policy "Anyone can update rank"
  on player_profiles for update using (true);
