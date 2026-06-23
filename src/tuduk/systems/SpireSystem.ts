import type { GameSave, ElementType } from '../types';
import { getPartyDps } from './StatCalculator';
import {
  getSpireFloorDps, getSpireRewards, getSpireWeekId, getWeeklySpireModifier,
  SPIRE_RELIC_MILESTONES,
} from '../data/endgame/spire';
import { ensureEndgame, grantRelic, getEndgameLockHint, isEndgameUnlocked } from './EndgameSystem';
import { saveGame } from '../core/SaveManager';
import { getCharElement } from '../data/equipmentCatalog';
import { getElementDamageMult } from '../data/elemental';

export type SpireResult =
  | { ok: true; win: true; floor: number; message: string }
  | { ok: true; win: false; message: string }
  | { ok: false; message: string };

export interface SpireCombatSetup {
  saveRef: GameSave;
  floor: number;
  floorName: string;
  modName: string;
  modIcon: string;
  enemyHp: number;
  dpsPerSec: number;
  tapDamage: number;
  winThreshold: number;
}

const SPIRE_COMBAT_SEC = 10;

const SPIRE_MOD_ICONS: Record<string, string> = {
  normal: '🗼', burn: '🔥', flood: '💧', storm: '⚡', void: '🕳', mirror: '🪞',
};

function spireModElement(modId: string): ElementType {
  const map: Record<string, ElementType> = {
    burn: 'fire', flood: 'water', storm: 'thunder',
  };
  return map[modId] ?? 'none';
}

function touchCombatBonus(save: GameSave): number {
  const touches = save.stats.touchCount ?? 0;
  return 1 + Math.min(0.12, touches / 70000);
}

function spireElementBonus(save: GameSave, modId: string): number {
  const modEl = spireModElement(modId);
  if (modEl === 'none') return 1.04;
  let mult = 1.02;
  for (const id of save.party) {
    const el = getCharElement(id) as ElementType;
    mult += (getElementDamageMult(el, modEl) - 1) * 0.35;
  }
  return Math.min(1.22, mult);
}

export function canAttemptSpire(save: GameSave): { ok: boolean; reason?: string } {
  if (!isEndgameUnlocked(save)) {
    const hint = getEndgameLockHint(save);
    return { ok: false, reason: hint ? `${hint} 후 해금` : '차원 콘텐츠 조건 미달' };
  }
  ensureEndgame(save);
  if (save.endgame!.spireAttempts <= 0) {
    return { ok: false, reason: '오늘 탑 도전 횟수를 모두 사용했습니다' };
  }
  return { ok: true };
}

function computeSpireDps(save: GameSave, floorNum: number, modId: string): number {
  const dps = getPartyDps(save, Math.floor(30 + floorNum * 5));
  return Math.floor(dps * spireElementBonus(save, modId) * touchCombatBonus(save));
}

export function getSpireCombatSetup(save: GameSave): SpireCombatSetup | null {
  const check = canAttemptSpire(save);
  if (!check.ok) return null;
  ensureEndgame(save);
  const week = getSpireWeekId();
  const mod = getWeeklySpireModifier(week);
  const next = save.endgame!.spireBest + 1;
  const required = getSpireFloorDps(next, week);
  const dpsPerSec = computeSpireDps(save, next, mod.id);
  const enemyHp = Math.floor(required * SPIRE_COMBAT_SEC * 0.9);
  const tapDamage = Math.max(1, Math.floor(dpsPerSec * 0.16));
  return {
    saveRef: save,
    floor: next,
    floorName: `${next}층`,
    modName: mod.name,
    modIcon: SPIRE_MOD_ICONS[mod.id] ?? '🗼',
    enemyHp,
    dpsPerSec,
    tapDamage,
    winThreshold: Math.floor(enemyHp * 0.86),
  };
}

export function resolveSpireCombat(save: GameSave, damageDealt: number, tapCount: number): SpireResult {
  const check = canAttemptSpire(save);
  if (!check.ok) return { ok: false, message: check.reason! };
  ensureEndgame(save);
  const eg = save.endgame!;
  eg.spireAttempts -= 1;

  const week = getSpireWeekId();
  const mod = getWeeklySpireModifier(week);
  const next = eg.spireBest + 1;
  const required = getSpireFloorDps(next, week);
  const threshold = Math.floor(required * SPIRE_COMBAT_SEC * 0.82);
  const win = damageDealt >= threshold;

  save.stats.touchCount = (save.stats.touchCount ?? 0) + tapCount;

  if (!win) {
    saveGame(save);
    return {
      ok: true,
      win: false,
      message: `${next}층 등반 실패… 화력 ${damageDealt.toLocaleString()}/${threshold.toLocaleString()} [${mod.name}]`,
    };
  }

  eg.spireBest = next;
  if (next > eg.spireWeekBest) eg.spireWeekBest = next;

  const rewards = getSpireRewards(next, week);
  save.gold += rewards.gold;
  save.stats.totalGold += rewards.gold;
  save.materials.void_shard = (save.materials.void_shard ?? 0) + rewards.voidShards;

  for (const milestone of SPIRE_RELIC_MILESTONES) {
    if (next === milestone) grantRelic(save, `relic_spire_${milestone}`);
  }

  saveGame(save);
  const touchNote = tapCount > 3 ? ` · 투닥 ${tapCount}회!` : '';
  return {
    ok: true,
    win: true,
    floor: next,
    message: `🗼 무한의 탑 ${next}층 돌파! [${mod.name}] +🪙${rewards.gold.toLocaleString()}${touchNote}`,
  };
}

/** 즉시 판정 (폴백) */
export function attemptSpireFloor(save: GameSave): SpireResult {
  const setup = getSpireCombatSetup(save);
  if (!setup) {
    const check = canAttemptSpire(save);
    return { ok: false, message: check.reason ?? '진입 불가' };
  }
  return resolveSpireCombat(save, setup.dpsPerSec * SPIRE_COMBAT_SEC, 0);
}
