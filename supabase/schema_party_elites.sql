-- party_elites 컬럼 추가 (랭킹 TOP4 캐릭터 초상화)
alter table public.player_profiles
  add column if not exists party_elites jsonb default '[]'::jsonb;
