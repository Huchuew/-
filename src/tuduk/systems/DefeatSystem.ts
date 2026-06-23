import type { GameSave } from '../types';

const REST_FIRST_MS = 60 * 1000;
const REST_EARLY_MS = 90 * 1000;
const REST_MID_MS = 2 * 60 * 1000;
const REST_LATE_MS = 3 * 60 * 1000;

/** @deprecated 전멸 시 즉시 숙소 귀환 — 미사용 */
export function getDefeatRestMs(_save: GameSave): number {
  return 0;
}

export function getDefeatPenaltyRate(save: GameSave): number {
  const defeats = save.stats.defeatCount ?? 0;
  if (defeats === 0) return 0;
  if (save.currentRegion <= 4) return 0.03;
  if (save.currentRegion <= 9) return 0.06;
  return 0.08;
}

/** @deprecated 전멸 시 즉시 숙소 귀환 — 미사용 */
export function getDefeatRecoveryHpRatio(_save: GameSave): number {
  return 1;
}
