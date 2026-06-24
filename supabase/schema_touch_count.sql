-- touch_count 컬럼 추가 (랭킹 투닥 횟수)
alter table public.player_profiles
  add column if not exists touch_count bigint not null default 0;
