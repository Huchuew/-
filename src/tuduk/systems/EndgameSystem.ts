import type { GameSave } from '../types';
import { MONSTERS } from '../data/monsters';
import { REGIONS } from '../data/regions';
import { RELIC_MAP, RELICS } from '../data/endgame/relics';
import { getSpireWeekId, SPIRE_DAILY_ATTEMPTS } from '../data/endgame/spire';
import { CHARACTERS } from '../data/characters';
import { getFloorClearCount } from './DungeonShortcutSystem';

export const ENDGAME_TEASER_MIN_FLOOR = 15;
/** 야탑 해금 — 18층 보스 격파 (클리어 후 maxRegion 19) */
export const ENDGAME_UNLOCK_FLOOR = 18;

/** 18층 보스 격파 여부 (17층만 깬 상태 maxRegion=18 은 미해금) */
export function hasClearedEndgameDungeonBoss(save: GameSave): boolean {
  if (save.floor18ClearCelebrated) return true;
  if ((save.badges ?? []).includes(ENDGAME_UNLOCK_FLOOR)) return true;
  if (getFloorClearCount(save, ENDGAME_UNLOCK_FLOOR) > 0) return true;
  return (save.maxRegion ?? 1) > ENDGAME_UNLOCK_FLOOR;
}

export function isEndgameUnlocked(save: GameSave): boolean {
  return hasClearedEndgameDungeonBoss(save);
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ensureEndgame(save: GameSave) {
  if (!save.endgame) {
    save.endgame = {
      spireBest: 0,
      spireWeek: getSpireWeekId(),
      spireWeekBest: 0,
      spireAttempts: SPIRE_DAILY_ATTEMPTS,
      spireAttemptsDay: todayKey(),
      relics: [],
      ascended: [],
    };
  }
  refreshSpireDaily(save);
  refreshSpireWeek(save);
  checkBonusRelics(save);
}

export function isEndgameTeaserVisible(save: GameSave): boolean {
  return (save.maxRegion ?? 1) >= ENDGAME_TEASER_MIN_FLOOR;
}

/** 엔드게임 잠금 시 미충족 조건 (짧은 문구) */
export function getEndgameLockHint(save: GameSave): string {
  if (isEndgameUnlocked(save)) return '';
  const maxR = save.maxRegion ?? 1;
  if (maxR < ENDGAME_UNLOCK_FLOOR) {
    return `${ENDGAME_UNLOCK_FLOOR}층 도달 (${maxR}/${ENDGAME_UNLOCK_FLOOR})`;
  }
  return `${ENDGAME_UNLOCK_FLOOR}층 보스 격파 필요`;
}

/** 15층+ 티저 — 층별 짧은 설정 문구 */
export function getEndgameTeaserLore(save: GameSave): string {
  const maxR = save.maxRegion ?? 1;
  if (maxR >= 17) {
    return '모란 너머, 하늘을 찢고 솟은 「무한의 야탑」. 18층을 정복하면 문이 열립니다.';
  }
  if (maxR >= 16) {
    return '옥정 정상에서 보이는 검은 탑. 「야탑」이라 불리는 무한 던전의 실루엣.';
  }
  return '평내호평 복도 끝, 중력이 거꾸로 느껴지는 구간. 누군가 「위로 올라가야 한다」고 속삭입니다.';
}

export interface EndgameTeaserProgress {
  progressPct: number;
  steps: { label: string; done: boolean }[];
  hint: string;
}

/** 15층+ — 야탑 허브 잠금 티저 (해금 전만) */
export function getEndgameTeaserProgress(save: GameSave): EndgameTeaserProgress | null {
  if (isEndgameUnlocked(save)) return null;
  const maxR = save.maxRegion ?? 1;
  if (maxR < ENDGAME_TEASER_MIN_FLOOR) return null;
  const reached = maxR >= ENDGAME_UNLOCK_FLOOR;
  const progressPct = reached
    ? 88
    : Math.min(82, Math.round((maxR / ENDGAME_UNLOCK_FLOOR) * 82));
  return {
    progressPct,
    steps: [
      { label: `${ENDGAME_UNLOCK_FLOOR}층 도달`, done: reached },
      { label: `${ENDGAME_UNLOCK_FLOOR}층 보스 격파`, done: false },
    ],
    hint: getEndgameLockHint(save),
  };
}

function refreshSpireDaily(save: GameSave) {
  const eg = save.endgame!;
  const today = todayKey();
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
  return `야탑 ${eg.spireBest}층 · 유물 ${eg.relics.length}/${RELICS.filter(r => !r.id.includes('rift')).length} · 각성 ${eg.ascended.length}`;
}

export function getEndgameGoldMult(save: GameSave): number {
  return 1 + getRelicBonuses(save).gold;
}

export function getEndgameExpMult(save: GameSave): number {
  return 1 + getRelicBonuses(save).exp;
}
