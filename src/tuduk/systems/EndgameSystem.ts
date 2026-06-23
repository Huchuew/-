import type { GameSave } from '../types';
import { MONSTERS } from '../data/monsters';
import { REGIONS } from '../data/regions';
import { RELIC_MAP, RELICS } from '../data/endgame/relics';
import { RIFT_DAILY_KEYS } from '../data/endgame/riftFloors';
import { getSpireWeekId, SPIRE_DAILY_ATTEMPTS } from '../data/endgame/spire';
import { CHARACTERS } from '../data/characters';

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ensureEndgame(save: GameSave) {
  if (!save.endgame) {
    save.endgame = {
      riftCleared: 0,
      riftKeys: RIFT_DAILY_KEYS,
      riftKeysDay: todayKey(),
      spireBest: 0,
      spireWeek: getSpireWeekId(),
      spireWeekBest: 0,
      spireAttempts: SPIRE_DAILY_ATTEMPTS,
      spireAttemptsDay: todayKey(),
      relics: [],
      ascended: [],
    };
  }
  refreshDailyKeys(save);
  refreshSpireWeek(save);
  checkBonusRelics(save);
}

export function isEndgameUnlocked(save: GameSave): boolean {
  return (save.maxRegion ?? 1) >= 18
    && save.badges.includes(18)
    && (save.codex.boss_final?.kills ?? 0) > 0;
}

/** 엔드게임 잠금 시 미충족 조건 (짧은 문구) */
export function getEndgameLockHint(save: GameSave): string {
  if (isEndgameUnlocked(save)) return '';
  const parts: string[] = [];
  if ((save.maxRegion ?? 1) < 18) parts.push('18층 클리어');
  if (!save.badges.includes(18)) parts.push('18층 배지');
  if ((save.codex.boss_final?.kills ?? 0) <= 0) parts.push('10층 경기광주 최종보스 처치');
  return parts.join(' · ');
}

export interface EndgameTeaserProgress {
  progressPct: number;
  steps: { label: string; done: boolean }[];
  hint: string;
}

/** 15층+ — 차원 허브 잠금 티저 (해금 전만) */
export function getEndgameTeaserProgress(save: GameSave): EndgameTeaserProgress | null {
  if (isEndgameUnlocked(save)) return null;
  const maxR = save.maxRegion ?? 1;
  if (maxR < 15) return null;
  const steps = [
    { label: '18층 도달', done: maxR >= 18 },
    { label: '18층 배지', done: save.badges.includes(18) },
    { label: '경기광주 최종보스', done: (save.codex.boss_final?.kills ?? 0) > 0 },
  ];
  const doneN = steps.filter(s => s.done).length;
  return {
    progressPct: Math.round((doneN / steps.length) * 100),
    steps,
    hint: getEndgameLockHint(save),
  };
}

function refreshDailyKeys(save: GameSave) {
  const eg = save.endgame!;
  const today = todayKey();
  if (eg.riftKeysDay !== today) {
    eg.riftKeysDay = today;
    eg.riftKeys = RIFT_DAILY_KEYS;
  }
  if (eg.spireAttemptsDay !== today) {
    eg.spireAttemptsDay = today;
    eg.spireAttempts = SPIRE_DAILY_ATTEMPTS;
  }
}

function refreshSpireWeek(save: GameSave) {
  const eg = save.endgame!;
  const week = getSpireWeekId();
  if (eg.spireWeek !== week) {
    eg.spireWeek = week;
    eg.spireWeekBest = 0;
  }
}

export function grantRelic(save: GameSave, relicId: string): boolean {
  ensureEndgame(save);
  if (!RELIC_MAP[relicId]) return false;
  if (save.endgame!.relics.includes(relicId)) return false;
  save.endgame!.relics.push(relicId);
  return true;
}

function checkBonusRelics(save: GameSave) {
  const eg = save.endgame!;
  const allCodex = REGIONS.every(r => {
    const mons = MONSTERS.filter(m => m.regionId === r.id && !m.isRare);
    return mons.length > 0 && mons.every(m => (save.codex[m.id]?.kills ?? 0) > 0);
  });
  if (allCodex) grantRelic(save, 'relic_codex');
  const ascCount = eg.ascended.length;
  if (ascCount >= 3) grantRelic(save, 'relic_ascend3');
  const combatChars = CHARACTERS.filter(c => c.id !== 'hidden');
  if (combatChars.every(c => eg.ascended.includes(c.id))) {
    grantRelic(save, 'relic_ascend_all');
  }
}

export function getRelicBonuses(save: GameSave) {
  ensureEndgame(save);
  const b = { atk: 0, hp: 0, def: 0, crit: 0, spd: 0, exp: 0, gold: 0 };
  for (const id of save.endgame!.relics) {
    const r = RELIC_MAP[id];
    if (!r) continue;
    b.atk += r.atkPct ?? 0;
    b.hp += r.hpPct ?? 0;
    b.def += r.defPct ?? 0;
    b.crit += r.critPct ?? 0;
    b.spd += r.spdPct ?? 0;
    b.exp += r.expPct ?? 0;
    b.gold += r.goldPct ?? 0;
  }
  return b;
}

export function isAscended(save: GameSave, charId: string): boolean {
  return save.endgame?.ascended.includes(charId) ?? false;
}

export function getAscensionMult(save: GameSave, charId: string): number {
  return isAscended(save, charId) ? 1.28 : 1;
}

export function getEndgameProgressSummary(save: GameSave): string {
  ensureEndgame(save);
  const eg = save.endgame!;
  return `균열 ${eg.riftCleared}/50 · 탑 ${eg.spireBest}층 · 유물 ${eg.relics.length}/${RELICS.length} · 각성 ${eg.ascended.length}`;
}

export function getEndgameGoldMult(save: GameSave): number {
  return 1 + getRelicBonuses(save).gold;
}

export function getEndgameExpMult(save: GameSave): number {
  return 1 + getRelicBonuses(save).exp;
}
