import type { GameSave } from '../types';

/** 캐릭터 표준 cost 대비 영입 기본 배율 — 1명일 때 저렴, 이후 급등 */
export const RECRUIT_BASE_MULT = 0.16;

/** 보유 인원당 가격 급등 (2명째부터 지수 상승) */
export const RECRUIT_ROSTER_EXP = 2.65;

/** 숙소 상점 회복 포션 (고정가) */
export const SHOP_POTION_GOLD = 108_000;

/** @deprecated calcRecruitGoldCost 사용 */
export const RECRUIT_PRICE_MULT = RECRUIT_BASE_MULT;

/** 보유 동료 수에 따른 영입 가격 배율 (스타터 포함) */
export function getRecruitRosterPriceMult(ownedCount: number): number {
  const n = Math.max(1, ownedCount);
  if (n <= 1) return 1;
  return Math.pow(RECRUIT_ROSTER_EXP, n - 1);
}

/** 영입 시도 골드 — 기본 저렴 · 보유 인원↑일수록 대폭 상승 */
export function calcRecruitGoldCost(save: GameSave, charBaseCost: number): number {
  if (charBaseCost <= 0) return 0;
  const owned = Math.max(1, save.owned.length);
  return Math.floor(
    charBaseCost * RECRUIT_BASE_MULT * getRecruitRosterPriceMult(owned),
  );
}

/** @deprecated calcRecruitGoldCost(save, base) 사용 */
export function scaleRecruitGoldCost(base: number): number {
  return Math.floor(base * RECRUIT_BASE_MULT);
}
