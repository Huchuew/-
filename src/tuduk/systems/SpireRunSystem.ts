import type { GameSave } from '../types';
import { getSpireWeekId, getSpireRewards, SPIRE_RELIC_MILESTONES, SPIRE_DAILY_ATTEMPTS } from '../data/endgame/spire';
import {
  isSpireBossFloor,
  planSpireWave,
  spireEffectiveRegion,
  SPIRE_WAVES_PER_FLOOR,
  spireWavesRequired,
} from '../data/endgame/spireEncounters';
import { isSpireTestBypass } from '../data/endgame/spireTest';
import {
  ENDGAME_UNLOCK_FLOOR,
  ensureEndgame, getEndgameLockHint, grantRelic, isEndgameUnlocked,
} from './EndgameSystem';
import { addMaterial } from './EquipmentSystem';
import type { EncounterPlan } from './EncounterSystem';

/** 5층 도달 or 기록 갱신 시 시도권 1회 차감 */
export const SPIRE_ATTEMPT_CHARGE_FLOOR = 5;

/** 층 클리어 시 심핵 지급 구간 */
const SPIRE_ESSENCE_FLOORS = [25, 30, 35, 40] as const;

export function isInSpireRun(save: GameSave): boolean {
  return save.spireRun?.active === true
    && save.location === 'dungeon'
    && save.inExpedition === true;
}

export function canAccessSpire(save: GameSave): boolean {
  return isEndgameUnlocked(save) || isSpireTestBypass();
}

/** 해금 전 남아 있는 야탑 런·원정 상태 정리 */
export function reconcileSpireAccess(save: GameSave): void {
  if (canAccessSpire(save)) return;
  if (save.spireRun) {
    delete save.spireRun;
  }
  if (save.inExpedition && save.location === 'dungeon' && (save.endgame?.spireBest ?? 0) <= 0) {
    const maxR = save.maxRegion ?? 1;
    if (maxR <= ENDGAME_UNLOCK_FLOOR) {
      save.location = 'lodging';
      save.inExpedition = false;
      save.currentRegion = 1;
    }
  }
}

export function canStartSpireRun(save: GameSave): { ok: boolean; reason?: string } {
  if (!canAccessSpire(save)) {
    return { ok: false, reason: '야탑 해금 조건 미달' };
  }
  if (isInSpireRun(save)) {
    return { ok: false, reason: '이미 야탑 등반 중입니다' };
  }
  ensureEndgame(save);
  if (save.endgame!.spireAttempts <= 0) {
    return { ok: false, reason: '오늘 탑 도전 횟수를 모두 사용했습니다' };
  }
  return { ok: true };
}

export function canAttemptSpire(save: GameSave): { ok: boolean; reason?: string } {
  if (!canAccessSpire(save)) {
    const hint = getEndgameLockHint(save);
    return { ok: false, reason: hint ? `${hint} 후 해금` : '야탑 잠김' };
  }
  return canStartSpireRun(save);
}

export function beginSpireRun(save: GameSave): boolean {
  const check = canStartSpireRun(save);
  if (!check.ok) return false;
  ensureEndgame(save);
  const floor = 1;
  save.spireRun = {
    active: true,
    floor,
    wavesThisFloor: 0,
    weekId: getSpireWeekId(),
    startBest: save.endgame!.spireBest,
    attemptCharged: false,
    essenceFloors: [],
  };
  save.currentRegion = spireEffectiveRegion(floor);
  return true;
}

function chargeSpireAttemptIfNeeded(save: GameSave, clearedFloor: number): void {
  const run = save.spireRun;
  const eg = save.endgame;
  if (!run || !eg || run.attemptCharged) return;
  const startBest = run.startBest ?? 0;
  const newRecord = clearedFloor > startBest;
  if (clearedFloor >= SPIRE_ATTEMPT_CHARGE_FLOOR || newRecord) {
    eg.spireAttempts = Math.max(0, eg.spireAttempts - 1);
    run.attemptCharged = true;
  }
}

function grantSpireEssenceForFloor(save: GameSave, floor: number): boolean {
  const run = save.spireRun;
  if (!run) return false;
  if (!SPIRE_ESSENCE_FLOORS.includes(floor as typeof SPIRE_ESSENCE_FLOORS[number])) return false;
  if (!run.essenceFloors) run.essenceFloors = [];
  if (run.essenceFloors.includes(floor)) return false;
  run.essenceFloors.push(floor);
  addMaterial(save, 'spire_essence', 1);
  return true;
}

export function endSpireRun(save: GameSave): void {
  if (save.spireRun) {
    save.spireRun.active = false;
  }
  delete save.spireRun;
}

export function planSpireEncounter(save: GameSave): EncounterPlan | null {
  return planSpireWave(save);
}

export function getSpireLocationLabel(save: GameSave): string {
  const run = save.spireRun;
  if (!run?.active) return '🗼 야탑';
  const req = spireWavesRequired(run.floor);
  const wave = Math.min(run.wavesThisFloor + 1, req);
  return `🗼 야탑 ${run.floor}층 · ${wave}/${req}웨이브`;
}

export type SpireWaveResult = 'continue' | 'floor_cleared';

export function handleSpireWaveCleared(save: GameSave): SpireWaveResult {
  const run = save.spireRun;
  if (!run?.active) return 'continue';

  run.wavesThisFloor += 1;
  if (run.wavesThisFloor < spireWavesRequired(run.floor)) {
    return 'continue';
  }

  completeSpireFloor(save);
  return 'floor_cleared';
}

function completeSpireFloor(save: GameSave): void {
  const run = save.spireRun!;
  const floor = run.floor;
  const eg = save.endgame!;
  const prevBest = eg.spireBest;
  eg.spireBest = Math.max(eg.spireBest, floor);
  if (floor > eg.spireWeekBest) eg.spireWeekBest = floor;

  chargeSpireAttemptIfNeeded(save, floor);

  const rewards = getSpireRewards(floor, run.weekId);
  save.gold += rewards.gold;
  save.stats.totalGold += rewards.gold;
  save.materials.void_shard = (save.materials.void_shard ?? 0) + rewards.voidShards;

  for (const milestone of SPIRE_RELIC_MILESTONES) {
    if (floor === milestone) grantRelic(save, `relic_spire_${milestone}`);
  }

  grantSpireEssenceForFloor(save, floor);

  run.floor = floor + 1;
  run.wavesThisFloor = 0;
  save.currentRegion = spireEffectiveRegion(run.floor);

  if (eg.spireBest > prevBest && floor === prevBest + 1) {
    // 기록 갱신 — attempt charge may have already fired
  }
}

export { SPIRE_WAVES_PER_FLOOR, spireWavesRequired, isSpireBossFloor, SPIRE_DAILY_ATTEMPTS };
