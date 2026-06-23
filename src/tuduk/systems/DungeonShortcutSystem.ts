import type { GameSave } from '../types';
import { earlyProgressGoldMult } from '../data/economyBalance';

export interface DungeonShortcutFloor {
  ready?: boolean;
  developingUntil?: number;
}

export interface DungeonShortcutsState {
  floors: Record<string, DungeonShortcutFloor>;
  clearCounts?: Record<string, number>;
}

export function ensureDungeonShortcuts(save: GameSave): DungeonShortcutsState {
  if (!save.dungeonShortcuts) {
    save.dungeonShortcuts = { floors: {}, clearCounts: {} };
  }
  if (!save.dungeonShortcuts.floors) save.dungeonShortcuts.floors = {};
  if (!save.dungeonShortcuts.clearCounts) save.dungeonShortcuts.clearCounts = {};
  return save.dungeonShortcuts;
}

export function reconcileShortcutDevelopment(save: GameSave, now = Date.now()): void {
  const st = ensureDungeonShortcuts(save);
  for (const [key, floor] of Object.entries(st.floors)) {
    if (!floor.developingUntil || floor.ready) continue;
    if (floor.developingUntil <= now) {
      floor.ready = true;
      floor.developingUntil = undefined;
      st.floors[key] = floor;
    }
  }
}

export function getFloorClearCount(save: GameSave, floorId: number): number {
  return ensureDungeonShortcuts(save).clearCounts?.[String(floorId)] ?? 0;
}

export function recordFloorBossClear(save: GameSave, floorId: number): void {
  const st = ensureDungeonShortcuts(save);
  const key = String(floorId);
  st.clearCounts![key] = (st.clearCounts![key] ?? 0) + 1;
  save.stats.bossClears = (save.stats.bossClears ?? 0) + 1;
}

/** 숏컷 개발에 필요한 해당 층 클리어(보스 격파) 횟수 */
export function getShortcutClearRequired(floorId: number): number {
  if (floorId <= 1) return 0;
  return Math.max(6, Math.ceil(floorId * 3));
}

/** 개발 소요 시간(초) — 2층 1분, 3층 3분, 4층 5분 … */
export function getShortcutDevDurationSec(floorId: number): number {
  if (floorId <= 1) return 0;
  const minutes = 1 + (floorId - 2) * 2;
  return minutes * 60;
}

export function formatShortcutDevDuration(floorId: number): string {
  const sec = getShortcutDevDurationSec(floorId);
  const m = Math.floor(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`;
}

export function getShortcutDevGoldCost(save: GameSave, floorId: number): number {
  if (floorId <= 1) return 0;
  const maxR = save.maxRegion ?? 1;
  const base = 18_000 + floorId * floorId * 4_200;
  return Math.floor(base * earlyProgressGoldMult(maxR));
}

function floorState(save: GameSave, floorId: number): DungeonShortcutFloor {
  return ensureDungeonShortcuts(save).floors[String(floorId)] ?? {};
}

export function isShortcutReady(save: GameSave, floorId: number): boolean {
  if (floorId <= 1) return true;
  reconcileShortcutDevelopment(save);
  return !!floorState(save, floorId).ready;
}

export function isShortcutDeveloping(save: GameSave, floorId: number, now = Date.now()): boolean {
  reconcileShortcutDevelopment(save, now);
  const until = floorState(save, floorId).developingUntil;
  return until != null && until > now;
}

export function getShortcutDevRemainSec(save: GameSave, floorId: number, now = Date.now()): number {
  reconcileShortcutDevelopment(save, now);
  const until = floorState(save, floorId).developingUntil;
  if (!until || until <= now) return 0;
  return Math.ceil((until - now) / 1000);
}

export function hasActiveShortcutDevelopment(save: GameSave, now = Date.now()): boolean {
  reconcileShortcutDevelopment(save, now);
  return Object.values(ensureDungeonShortcuts(save).floors).some(
    f => f.developingUntil != null && f.developingUntil > now,
  );
}

function anyDeveloping(save: GameSave, now = Date.now()): boolean {
  return Object.entries(ensureDungeonShortcuts(save).floors).some(([, f]) => {
    return f.developingUntil != null && f.developingUntil > now;
  });
}

export function canStartShortcutDev(save: GameSave, floorId: number, now = Date.now()): {
  ok: boolean;
  reason?: string;
} {
  reconcileShortcutDevelopment(save, now);
  if (floorId <= 1) return { ok: false, reason: '1층은 숏컷이 필요 없어요' };
  const maxR = save.maxRegion ?? 1;
  if (floorId > maxR) return { ok: false, reason: `${floorId}층 미해금` };
  if (isShortcutReady(save, floorId)) return { ok: false, reason: '이미 숏컷 개통됨' };
  if (isShortcutDeveloping(save, floorId, now)) return { ok: false, reason: '개발 진행 중' };
  if (anyDeveloping(save, now)) return { ok: false, reason: '다른 층 숏컷 개발 중' };
  const need = getShortcutClearRequired(floorId);
  const have = getFloorClearCount(save, floorId);
  if (have < need) {
    return { ok: false, reason: `클리어 ${have}/${need}회 — 보스 격파 필요` };
  }
  const cost = getShortcutDevGoldCost(save, floorId);
  if (save.gold < cost) return { ok: false, reason: `골드 부족 (🪙${cost.toLocaleString()})` };
  return { ok: true };
}

export function startShortcutDevelopment(save: GameSave, floorId: number, now = Date.now()): boolean {
  const check = canStartShortcutDev(save, floorId, now);
  if (!check.ok) return false;
  const cost = getShortcutDevGoldCost(save, floorId);
  save.gold -= cost;
  const st = ensureDungeonShortcuts(save);
  const key = String(floorId);
  st.floors[key] = {
    ready: false,
    developingUntil: now + getShortcutDevDurationSec(floorId) * 1000,
  };
  return true;
}

export function canDepartAtFloor(save: GameSave, floorId: number, now = Date.now()): {
  ok: boolean;
  reason?: string;
  useShortcut?: boolean;
} {
  const maxR = save.maxRegion ?? 1;
  if (floorId < 1 || floorId > maxR) return { ok: false, reason: '선택한 층에 출발할 수 없어요' };
  if (floorId === 1) return { ok: true, useShortcut: false };
  if (!isShortcutReady(save, floorId)) {
    if (isShortcutDeveloping(save, floorId, now)) {
      const sec = getShortcutDevRemainSec(save, floorId, now);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return { ok: false, reason: `숏컷 개발 중 · ${m}:${String(s).padStart(2, '0')} 남음` };
    }
    return { ok: false, reason: '숏컷을 먼저 뚫어야 해요' };
  }
  return { ok: true, useShortcut: true };
}
