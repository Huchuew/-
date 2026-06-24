-- 투닥투닥 RPG — Supabase SQL Editor에서 실행
-- Table Editor → player_profiles 생성 후 RLS 정책 적용

create table if not exists public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  player_id text unique not null,
  nickname text not null,
  team_name text not null default '',
  max_region int not null default 1,
  party_size int not null default 1,
  roster_size int not null default 1,
  top_dps int not null default 0,
  party_dps int not null default 0,
  weekly_score int not null default 0,
  week_id text not null default '',
  total_kills bigint not null default 0,
  touch_count bigint not null default 0,
  spire_best int not null default 0,
  party_elites jsonb default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists player_profiles_nickname_lower
  on public.player_profiles (lower(nickname));

create index if not exists player_profiles_weekly_rank
  on public.player_profiles (week_id, weekly_score desc);

create index if not exists player_profiles_overall_rank
  on public.player_profiles (max_region desc, party_dps desc, roster_size desc);

alter table public.player_profiles enable row level security;

-- 누구나 랭킹 조회
create policy "player_profiles_select_all"
  on public.player_profiles for select
  using (true);

-- anon 키로 신규 등록
create policy "player_profiles_insert_anon"
  on public.player_profiles for insert
  with check (true);

-- 본인 player_id만 수정 (클라이언트 player_id 일치)
create policy "player_profiles_update_own"
  on public.player_profiles for update
  using (true)
  with check (true);
