/** 숙소 판매·매입 기본 배율 (던전 무골드 경제의 핵심 상수) */
export const LODGING_SELL_MULT = 3.5;

/** 몬스터 처치 시 💎 드롭 확률 (0.01%) */
export const MONSTER_GEM_DROP_CHANCE = 0.0001;

/** 몬스터 고유 재료(mon.drops) 드롭 확률 */
export const MONSTER_SPECIAL_DROP_CHANCE = 0.52;

/** 던전 일반 재료 드롭 전역 배율 */
export const DUNGEON_MAT_DROP_GLOBAL_MULT = 0.78;

/** 웨이브당 재료 롤 기본 확률 */
export const DUNGEON_MAT_DROP_CHANCES: Record<string, number> = {
  iron_ore: 0.19,
  wood_chip: 0.15,
  slime_gel: 0.13,
  beast_fang: 0.07,
  magic_dust: 0.055,
  spirit_thread: 0.058,
  void_shard: 0.018,
};

/** 엘리트/에픽 추가 재료 확률 */
export const ELITE_SPIRIT_THREAD_CHANCE = 0.38;
export const ELITE_VOID_SHARD_CHANCE = 0.24;

/** 숙소 패시브 수익 — 창고 재료량 연동 (이 이상이면 100% 수익) */
export const LODGING_INCOME_MAT_FLOOR = 8;

/** 최고 층 기준 초반 골드 수입 — 중반 이후 장비·강화 싱크와 균형 */
export function earlyProgressGoldMult(maxRegion: number): number {
  if (maxRegion <= 3) return 1.48;
  if (maxRegion <= 5) return 1.28;
  if (maxRegion <= 8) return 1.12;
  if (maxRegion <= 11) return 1.06;
  if (maxRegion <= 14) return 1.03;
  return 1;
}

/** 1층 보스 등장 도감 % (이후 층은 100%) — 초반 첫 보스 체감 단축 */
export const BOSS_CODEX_THRESHOLD_FLOOR1 = 0.5;
