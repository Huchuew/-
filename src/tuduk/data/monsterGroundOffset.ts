/**
 * 몬스터별 지면 Y 보정 (픽셀) — footY 기준, 음수=공중 부유
 * pipoya PNG / Tiny RPG 프레임 발 접지 후 추가 미세 조정
 */
const MONSTER_GROUND_OFFSET: Record<string, number> = {
  bat: -14,
  bat_rare: -18,
  ghost: -8,
};

export function getMonsterGroundOffset(monId: string): number {
  return MONSTER_GROUND_OFFSET[monId] ?? 0;
}

/** 비행·유령 등 공중형 여부 */
export function isAerialMonster(monId: string): boolean {
  return monId in MONSTER_GROUND_OFFSET;
}
