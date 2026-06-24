-- 야탑 최고층 (18층 클리어 유저 랭킹 표시용)
alter table public.player_profiles
  add column if not exists spire_best int not null default 0;
