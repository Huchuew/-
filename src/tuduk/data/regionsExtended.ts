import type { RegionDef } from '../types';

export const MAX_DUNGEON_FLOOR = 18;

/** 1~18층 기본 지역만 사용 (야탑은 별도 엔드게임) */
export function extendRegionsToMax(base: RegionDef[], maxFloor = MAX_DUNGEON_FLOOR): RegionDef[] {
  return base.slice(0, Math.min(maxFloor, base.length));
}
