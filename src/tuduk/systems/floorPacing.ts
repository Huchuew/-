import type { GameSave } from '../types';

import { BOSS_CODEX_THRESHOLD_FLOOR1 } from '../data/economyBalance';

import { isRegionCleared } from './EncounterSystem';



function bossCodexThreshold(regionId: number): number {

  return regionId === 1 ? BOSS_CODEX_THRESHOLD_FLOOR1 : 1;

}



/** 미클리어 층 — 보스 전 잡몹 사냥 시간 (레거시 상수) */

export const BOSS_PACE_UNDER_10_SEC = 15 * 60;



/** 10층부터 보스 등장 기본 대기 */

export const BOSS_PACE_FLOOR10_SEC = 4 * 60;

export const BOSS_PACE_STEP_SEC = 90;



/** 모든 층 공통 — 보스 등장 최소 대기(초) */

export const MIN_BOSS_WAIT_SEC = 60;



/** 클리어 층 재방문 — 보스 등장 최소 대기(초) */

export const CLEARED_FLOOR_BOSS_MIN_SEC = MIN_BOSS_WAIT_SEC;



/** @deprecated 클리어 층도 MIN_BOSS_WAIT_SEC 사용 */

export const CLEARED_FLOOR_BOSS_CAP_SEC = CLEARED_FLOOR_BOSS_MIN_SEC;



/** 층별 최소 활동 시간 글로벌 배율 */

export const BOSS_PACE_GLOBAL_MULT = 1;



/** 잡몹 1마리 처치 시 보스 대기 가속(초) */

export const MOB_KILL_PACE_BONUS_SEC = 2;



export interface FloorPacingEntry {

  activeSec: number;

}



export function ensureFloorPacing(save: GameSave) {

  if (!save.floorPacing) save.floorPacing = {};

}



/** 층 입장 시 세션 타이머 리셋 */

export function resetFloorSessionPacing(save: GameSave, regionId: number) {

  ensureFloorPacing(save);

  save.floorPacing![regionId] = { activeSec: 0 };

}



/** 층별 보스 등장까지 최소 원정 활동 시간 */

export function getMinBossFloorSec(regionId: number, save?: GameSave): number {

  const r = Math.max(1, Math.min(18, regionId));

  if (save && isRegionCleared(save, regionId)) {

    return CLEARED_FLOOR_BOSS_MIN_SEC;

  }

  let sec: number;

  if (r === 1) sec = MIN_BOSS_WAIT_SEC;

  else if (r === 2) sec = 75;

  else if (r === 3) sec = 90;

  else if (r < 10) sec = 90 + (r - 4) * 22;

  else sec = BOSS_PACE_FLOOR10_SEC + (r - 10) * BOSS_PACE_STEP_SEC;

  return Math.floor(sec * BOSS_PACE_GLOBAL_MULT);

}



export function tickFloorPacing(save: GameSave, regionId: number, dt: number) {

  ensureFloorPacing(save);

  const entry = save.floorPacing![regionId] ?? { activeSec: 0 };

  entry.activeSec += dt;

  save.floorPacing![regionId] = entry;

}



/** 전투·잡몹 처치 등으로 보스 대기 가속 */

export function accelerateBossPacing(save: GameSave, regionId: number, bonusSec: number) {

  if (bonusSec <= 0) return;

  ensureFloorPacing(save);

  const entry = save.floorPacing![regionId] ?? { activeSec: 0 };

  entry.activeSec += bonusSec;

  save.floorPacing![regionId] = entry;

}



export function getFloorActiveSec(save: GameSave, regionId: number): number {

  ensureFloorPacing(save);

  return save.floorPacing![regionId]?.activeSec ?? 0;

}



export function getBossGateTimeProgress(save: GameSave, regionId: number): number {

  const need = getMinBossFloorSec(regionId, save);

  if (need <= 0) return 1;

  return Math.min(1, getFloorActiveSec(save, regionId) / need);

}



export function getBossGateRemainSec(save: GameSave, regionId: number): number {

  const need = getMinBossFloorSec(regionId, save);

  return Math.max(0, Math.ceil(need - getFloorActiveSec(save, regionId)));

}



/** 시간 게이트 단독 충족 */

export function isFloorBossTimeUnlocked(save: GameSave, regionId: number): boolean {

  return getFloorActiveSec(save, regionId) >= getMinBossFloorSec(regionId, save);

}



/**

 * 보스 게이트 — 시간·도감 OR (한쪽 100%면 다른 쪽 50~70%만)

 * 클리어 층도 최소 1분 활동 후 보스 가능.

 */

export function isBossGateReady(save: GameSave, regionId: number, codexPct: number): boolean {

  if (isRegionCleared(save, regionId)) {

    return isFloorBossTimeUnlocked(save, regionId);

  }



  const codexTh = bossCodexThreshold(regionId);

  const timeNeed = getMinBossFloorSec(regionId, save);

  const timeHave = getFloorActiveSec(save, regionId);

  const codexOk = codexPct >= codexTh;

  const timeOk = timeHave >= timeNeed;



  if (codexOk && timeOk) return true;

  if (codexOk && timeHave >= timeNeed * 0.5) return true;

  if (timeOk && codexPct >= codexTh * 0.7) return true;

  return false;

}



export function getUnclearedWalkMult(regionId: number): number {

  const r = Math.max(1, Math.min(18, regionId));

  return 0.85 + r * 0.04;

}



export function getClearedWalkMult(fastWalk: boolean, speedFarm = false): number {

  if (speedFarm) return fastWalk ? 0.04 : 0.08;

  return fastWalk ? 0.09 : 0.16;

}



export function formatFloorBossWaitHint(save: GameSave, regionId: number, codexPct = 0): string | null {

  if (isBossGateReady(save, regionId, codexPct)) return null;



  const need = getMinBossFloorSec(regionId, save);

  const have = getFloorActiveSec(save, regionId);

  const remain = Math.max(0, Math.ceil(need - have));

  const m = Math.floor(remain / 60);

  const s = remain % 60;

  const timeStr = `${m}:${s.toString().padStart(2, '0')}`;



  if (isRegionCleared(save, regionId)) {

    return `⏳ 보스까지 ${timeStr} · 잡몹 처치 시 가속`;

  }



  const codexTh = bossCodexThreshold(regionId);

  const codexPctInt = Math.floor(codexPct * 100);

  const codexNeedInt = Math.floor(codexTh * 100);



  if (codexPct >= codexTh * 0.7 && have < need * 0.5) {

    return `⏳ 도감 충분 — 활동 ${timeStr} 더 (처치 시 가속)`;

  }

  if (have >= need * 0.5 && codexPct < codexTh) {

    return `📖 도감 ${codexPctInt}%/${codexNeedInt}% — 시간은 충분해요`;

  }

  return `⏳ 보스까지 ${timeStr} · 도감 ${codexPctInt}%/${codexNeedInt}%`;

}


