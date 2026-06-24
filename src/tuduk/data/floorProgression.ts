import type { GameSave } from '../types';
import { getActivePartyMembers } from '../systems/CharacterStatusSystem';
import { formatReadinessHint } from './lateGameBalance';

/** 층별 권장 레벨 (UI·준비도 힌트용 — 입장 차단 없음) */
export function getMinLevelForFloor(regionId: number): number {
  const r = Math.max(1, Math.min(18, regionId));
  if (r === 1) return 1;
  if (r <= 4) return 6 + (r - 1) * 10;
  if (r <= 8) return 42 + (r - 4) * 20;
  if (r <= 12) return 122 + (r - 8) * 24;
  if (r <= 16) return 218 + (r - 12) * 32;
  return 346 + (r - 16) * 42;
}

/** 층별 권장 전직 (힌트용) — 15층+ 4차(3) */
export function getMinPrestigeForFloor(regionId: number): number {
  if (regionId <= 6) return 0;
  if (regionId <= 10) return 1;
  if (regionId <= 14) return 2;
  return 3;
}

export interface FloorGateResult {
  ok: boolean;
  reason?: string;
  minLv?: number;
}

/** 층 이동·입장 — 파티만 있으면 OK (난이도는 몬스터 스탯·준비도로 자연스럽게 막힘) */
export function canPartyEnterFloor(save: GameSave, _regionId: number): FloorGateResult {
  const party = getActivePartyMembers(save);
  if (!party.length) return { ok: false, reason: '파티가 비어 있습니다' };
  return { ok: true };
}

export function formatFloorLevelWallHint(save: GameSave, regionId: number): string | null {
  return formatReadinessHint(save, regionId);
}
