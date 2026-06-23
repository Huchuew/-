/** 전직(2·3·4차) 공통 레벨 게이트 */



export const PRESTIGE_TIER_LEVELS = [50, 100, 150] as const;

export const PRESTIGE_TIER_LABELS = ['2차 전직', '3차 전직', '4차 전직'] as const;



/** 단계별 습득 비용 배율 */

export const PRESTIGE_TIER_COST_MULT = [1, 1.35, 1.75] as const;



/** 단계별 성장 노드 스탯 보상 배율 — 4차만 대폭 상향 */

export const PRESTIGE_TIER_STAT_MULT = [1, 1.38, 2.42] as const;



export const PRESTIGE_TIER_RATE_BONUS = [0.02, 0, -0.01] as const;



/** Lv.40+ 전직 예고 UI */

export const PRESTIGE_TEASER_LEVEL = 40;



export function getPrestigeTierLevel(tier: 1 | 2 | 3): number {

  return PRESTIGE_TIER_LEVELS[tier - 1] ?? PRESTIGE_TIER_LEVELS[0];

}



export function getPrestigeTierLabel(tier: 1 | 2 | 3): string {

  return PRESTIGE_TIER_LABELS[tier - 1] ?? `전직 ${tier}단계`;

}



/** prestige 노드 수(0~3)에 따른 캐릭터 스탯 보너스 */

export function getPrestigeStatMult(prestigeCount: number): {

  atk: number; hp: number; def: number; atkSpd: number;

} {

  if (prestigeCount <= 0) return { atk: 1, hp: 1, def: 1, atkSpd: 1 };

  if (prestigeCount === 1) return { atk: 1.28, hp: 1.15, def: 1.08, atkSpd: 1.04 };

  if (prestigeCount === 2) return { atk: 1.58, hp: 1.32, def: 1.14, atkSpd: 1.08 };

  return { atk: 2.38, hp: 1.82, def: 1.26, atkSpd: 1.16 };

}



/** 4차 완료 시 스킬·궁극기 추가 배율 */

export function getPrestigeSkillCombatMult(prestige: number): number {

  if (prestige >= 3) return 1.32;

  if (prestige === 2) return 1.08;

  if (prestige === 1) return 1.03;

  return 1;

}


