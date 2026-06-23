import type { GameSave } from '../types';
import { getPartyDps } from './StatCalculator';
import { getRiftFloor, RIFT_MAX_FLOOR } from '../data/endgame/riftFloors';
import { getCharElement } from '../data/equipmentCatalog';
import { getElementDamageMult, ELEMENT_ICON } from '../data/elemental';
import type { ElementType } from '../types';
import { ensureEndgame, grantRelic, getEndgameLockHint, isEndgameUnlocked } from './EndgameSystem';
import { saveGame } from '../core/SaveManager';

export type RiftResult =
  | { ok: true; win: true; floor: number; gold: number; message: string }
  | { ok: true; win: false; message: string }
  | { ok: false; message: string };

export interface RiftCombatSetup {
  saveRef: GameSave;
  floor: number;
  floorName: string;
  zone: string;
  elementIcon: string;
  enemyHp: number;
  dpsPerSec: number;
  tapDamage: number;
  winThreshold: number;
}

const RIFT_COMBAT_SEC = 10;

function partyElementBonus(save: GameSave, element: string): number {
  if (element === 'none') return 1;
  const targetEl = element as ElementType;
  let mult = 1.02;
  for (const id of save.party) {
    const el = getCharElement(id) as ElementType;
    mult += (getElementDamageMult(el, targetEl) - 1) * 0.4;
  }
  return Math.min(1.28, mult);
}

function touchCombatBonus(save: GameSave): number {
  const touches = save.stats.touchCount ?? 0;
  return 1 + Math.min(0.14, touches / 60000);
}

export function canAttemptRift(save: GameSave): { ok: boolean; reason?: string } {
  if (!isEndgameUnlocked(save)) {
    const hint = getEndgameLockHint(save);
    return { ok: false, reason: hint ? `${hint} 후 해금` : '엔드게임 조건 미달' };
  }
  ensureEndgame(save);
  const eg = save.endgame!;
  if (eg.riftCleared >= RIFT_MAX_FLOOR) {
    return { ok: false, reason: '차원 균열을 모두 정복했습니다' };
  }
  if (eg.riftKeys <= 0) {
    return { ok: false, reason: '오늘 균열 열쇠를 모두 사용했습니다 (내일 충전)' };
  }
  return { ok: true };
}

function computeRiftDps(save: GameSave, floorNum: number, element: string): number {
  const targetDef = Math.floor(40 + floorNum * 8);
  let dps = getPartyDps(save, targetDef);
  return Math.floor(dps * partyElementBonus(save, element) * touchCombatBonus(save));
}

export function getRiftCombatSetup(save: GameSave): RiftCombatSetup | null {
  const check = canAttemptRift(save);
  if (!check.ok) return null;
  ensureEndgame(save);
  const next = save.endgame!.riftCleared + 1;
  const floor = getRiftFloor(next);
  if (!floor) return null;
  const dpsPerSec = computeRiftDps(save, next, floor.element);
  const enemyHp = Math.floor(floor.requiredDps * RIFT_COMBAT_SEC * 0.92);
  const tapDamage = Math.max(1, Math.floor(dpsPerSec * 0.18));
  return {
    saveRef: save,
    floor: next,
    floorName: `${next}층 ${floor.name}`,
    zone: floor.zone,
    elementIcon: ELEMENT_ICON[floor.element] ?? '',
    enemyHp,
    dpsPerSec,
    tapDamage,
    winThreshold: Math.floor(enemyHp * 0.88),
  };
}

export function resolveRiftCombat(save: GameSave, damageDealt: number, tapCount: number): RiftResult {
  const check = canAttemptRift(save);
  if (!check.ok) return { ok: false, message: check.reason! };
  ensureEndgame(save);
  const eg = save.endgame!;
  const next = eg.riftCleared + 1;
  const floor = getRiftFloor(next);
  if (!floor) return { ok: false, message: '층 데이터 없음' };

  const threshold = Math.floor(floor.requiredDps * RIFT_COMBAT_SEC * 0.82);
  const win = damageDealt >= threshold;

  eg.riftKeys -= 1;
  save.stats.touchCount = (save.stats.touchCount ?? 0) + tapCount;

  if (!win) {
    saveGame(save);
    const el = ELEMENT_ICON[floor.element] ?? '';
    const dps = computeRiftDps(save, next, floor.element);
    return {
      ok: true,
      win: false,
      message: `${floor.name} 격파 실패… 피해 ${damageDealt.toLocaleString()}/${threshold.toLocaleString()} ${el} · DPS ${dps.toLocaleString()} · 투닥·성장 후 재도전`,
    };
  }

  eg.riftCleared = next;
  save.gold += floor.gold;
  save.stats.totalGold += floor.gold;
  save.materials.void_shard = (save.materials.void_shard ?? 0) + floor.voidShards;
  if (floor.riftCrystals > 0) {
    save.materials.rift_crystal = (save.materials.rift_crystal ?? 0) + floor.riftCrystals;
  }
  if (floor.relicId) grantRelic(save, floor.relicId);

  saveGame(save);
  const el = ELEMENT_ICON[floor.element] ?? '';
  const touchNote = tapCount > 3 ? ` · 투닥 ${tapCount}회!` : '';
  return {
    ok: true,
    win: true,
    floor: next,
    gold: floor.gold,
    message: `🌌 ${next}층 ${floor.name} 격파! ${el} +🪙${floor.gold.toLocaleString()}${touchNote}`,
  };
}

/** 즉시 판정 (테스트·폴백) */
export function attemptRiftFloor(save: GameSave): RiftResult {
  const setup = getRiftCombatSetup(save);
  if (!setup) {
    const check = canAttemptRift(save);
    return { ok: false, message: check.reason ?? '진입 불가' };
  }
  return resolveRiftCombat(save, setup.dpsPerSec * RIFT_COMBAT_SEC, 0);
}
