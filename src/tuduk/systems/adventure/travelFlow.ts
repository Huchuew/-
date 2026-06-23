/** 던전 간 이동 기본·구간당 추가 시간(초) */
export const TRAVEL_BASE_SEC = 0.55;
export const TRAVEL_PER_REGION_SEC = 0.18;
export const TRAVEL_MAX_SEC = 3.2;

/** 다음 층(상향) 이동 시간 배율 */
export const FLOOR_ADVANCE_TRAVEL_MULT = 3;

/** 숙소 복귀 이동·도보 시간 배율 (1/3 = 3배 빠름) */
export const RETURN_DURATION_MULT = 1 / 3;

export function calcTravelDurationSec(fromId: number, toId: number): number {
  if (fromId === toId) return 0;
  const linear = Math.abs(toId - fromId);
  const cyclic = Math.max(1, 18) - linear;
  const dist = Math.min(linear, cyclic);
  return Math.min(TRAVEL_MAX_SEC, TRAVEL_BASE_SEC + dist * TRAVEL_PER_REGION_SEC);
}

/** 상향(다음 층) 이동 여부 */
export function isFloorAdvance(fromId: number, toId: number): boolean {
  return toId > fromId;
}

export function calcAdvanceTravelDurationSec(fromId: number, toId: number): number {
  const base = calcTravelDurationSec(fromId, toId);
  if (!isFloorAdvance(fromId, toId)) return base;
  return base * FLOOR_ADVANCE_TRAVEL_MULT;
}

export function applyReturnTravelMult(travelSec: number, mult: number, isReturning: boolean): number {
  return isReturning ? travelSec * mult : travelSec;
}
