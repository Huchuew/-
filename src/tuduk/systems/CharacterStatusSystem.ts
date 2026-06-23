import type { GameSave } from '../types';
import { getCharMaxHp } from './RestHealingSystem';

/** 전멸 후 행동불능 지속 시간 */
export const INCAP_DURATION_MS = 20 * 1000;
export const INCAP_DURATION_SEC = INCAP_DURATION_MS / 1000;

export function ensureCharStatus(save: GameSave): void {
  if (!save.charStatus) save.charStatus = { incapacitatedUntil: {} };
  if (!save.charStatus.incapacitatedUntil) save.charStatus.incapacitatedUntil = {};
}

export function isCharIncapacitated(save: GameSave, charId: string): boolean {
  ensureCharStatus(save);
  const until = save.charStatus!.incapacitatedUntil[charId] ?? 0;
  if (until <= Date.now()) {
    if (until > 0) delete save.charStatus!.incapacitatedUntil[charId];
    return false;
  }
  return true;
}

export function getIncapRemainingSec(save: GameSave, charId: string): number {
  ensureCharStatus(save);
  const until = save.charStatus!.incapacitatedUntil[charId] ?? 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

export function applyPartyWipeIncapacitation(save: GameSave): void {
  ensureCharStatus(save);
  const until = Date.now() + INCAP_DURATION_MS;
  for (const id of save.party) {
    save.charStatus!.incapacitatedUntil[id] = until;
  }
}

export function getPartyIncapRemainingSec(save: GameSave): number {
  if (!save.party.length) return 0;
  return Math.max(0, ...save.party.map(id => getIncapRemainingSec(save, id)));
}

export function formatIncapRemainingSec(sec: number): string {
  if (sec <= 0) return '';
  if (sec < 60) return `🩹 행동불능 ${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `🩹 행동불능 ${m}:${String(s).padStart(2, '0')}`;
}

export function formatPartyIncapBanner(save: GameSave): string {
  const sec = getPartyIncapRemainingSec(save);
  if (sec <= 0) return '';
  return `⏳ ${sec}초 후 행동 가능`;
}

export function getActivePartyMembers(save: GameSave): string[] {
  return save.party.filter(id => !isCharIncapacitated(save, id));
}

export function canStartExpedition(save: GameSave): { ok: boolean; reason?: string } {
  if (save.party.length === 0) {
    return { ok: false, reason: '파티가 비어 있습니다' };
  }
  const active = getActivePartyMembers(save);
  if (active.length > 0) return { ok: true };
  const sec = getPartyIncapRemainingSec(save);
  return { ok: false, reason: `파티 전원 행동불능 · ${sec}초 후 재출발` };
}

export function hasPartyIncapacitated(save: GameSave): boolean {
  return save.party.some(id => isCharIncapacitated(save, id));
}

/** 광고 보상 — 행동불능 해제 + HP 전원 회복 */
export function revivePartyFromAd(save: GameSave): void {
  ensureCharStatus(save);
  for (const id of save.party) {
    delete save.charStatus!.incapacitatedUntil[id];
    const max = getCharMaxHp(save, id);
    if (max > 0) save.combatHp[id] = max;
  }
}

export function formatIncapHint(save: GameSave, charId: string): string {
  return formatIncapRemainingSec(getIncapRemainingSec(save, charId));
}
