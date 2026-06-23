import type { CharState, GameSave } from '../types';
import { CHARACTERS } from '../data/characters';
import { createStarterSave, reconcileSave } from '../core/SaveManager';

export const REBIRTH_EXP_MULT = 1.3;
export const REBIRTH_MARK_LABEL = '환생의 마크';

/** v2.0 세이브 마이그레이션 기준 (앱 2.0.0) */
export const REBIRTH_MIGRATION_SAVE_VERSION = '7.0.0';

function hadRaisedCharacter(st: CharState): boolean {
  return st.level > 1
    || (st.unlockedNodes?.length ?? 0) > 0
    || (st.prestige ?? 0) > 0
    || (st.agility ?? 0) > 0
    || (st.threat ?? 0) > 0;
}

export function collectRebirthMarksFromSave(save: Partial<GameSave>): string[] {
  const marks = new Set<string>();
  for (const id of save.owned ?? []) {
    const st = save.chars?.[id];
    if (st && hadRaisedCharacter(st)) marks.add(id);
  }
  return [...marks];
}

/** 초기화·마이그레이션 — raised 통계 + rebirthMarks 배열 + char.rebirthMark 플래그 통합 */
export function collectAllRebirthMarks(save: Partial<GameSave>): string[] {
  const marks = new Set<string>(collectRebirthMarksFromSave(save));
  for (const id of save.rebirthMarks ?? []) marks.add(id);
  for (const [id, st] of Object.entries(save.chars ?? {})) {
    if (st?.rebirthMark) marks.add(id);
  }
  return [...marks];
}

export function applyRebirthMarkOnAcquire(save: GameSave, charId: string): void {
  if (!save.rebirthMarks?.includes(charId)) return;
  const st = save.chars[charId];
  if (st) st.rebirthMark = true;
}

export function getCharExpMultiplier(save: GameSave, charId: string): number {
  return save.chars[charId]?.rebirthMark ? REBIRTH_EXP_MULT : 1;
}

export function formatRebirthMarkHint(charId: string, save: GameSave): string | null {
  if (!save.chars[charId]?.rebirthMark) return null;
  return `♻️ ${REBIRTH_MARK_LABEL} — 경험치 +${Math.round((REBIRTH_EXP_MULT - 1) * 100)}% (영구)`;
}

/** 기존 유저 — 진행 초기화 + 키운 캐릭터에 환생의 마크 부여 */
export function applyRebirthV7Migration(parsed: Partial<GameSave>, fallbackStarter: string): GameSave {
  const rebirthMarks = collectAllRebirthMarks(parsed);
  const sid = parsed.starterCharId ?? parsed.party?.[0] ?? fallbackStarter;
  const starterId = CHARACTERS.some(c => c.id === sid) ? sid! : fallbackStarter;
  const fresh = createStarterSave(starterId);
  fresh.rebirthMarks = rebirthMarks;
  if (rebirthMarks.includes(starterId)) {
    fresh.chars[starterId]!.rebirthMark = true;
  }
  fresh.rebirthMigrationPending = rebirthMarks.length > 0;
  fresh.tutorialStep = 99;
  return reconcileSave(fresh);
}

const PENDING_REBIRTH_KEY = 'tuduk_pending_rebirth_marks';

/** 초기화 후 캐릭터 선택 전 — 환생의 마크만 임시 보관 */
export function stashRebirthMarksForFreshStart(marks: string[]): void {
  try {
    if (marks.length === 0) {
      localStorage.removeItem(PENDING_REBIRTH_KEY);
      return;
    }
    localStorage.setItem(PENDING_REBIRTH_KEY, JSON.stringify({ marks, migrationPending: true }));
  } catch { /* ignore */ }
}

/** 캐릭터 선택 직후 — 보관해 둔 환생의 마크 적용 */
export function applyPendingRebirthMarksToSave(save: GameSave): void {
  try {
    const raw = localStorage.getItem(PENDING_REBIRTH_KEY);
    if (!raw) return;
    localStorage.removeItem(PENDING_REBIRTH_KEY);
    const { marks, migrationPending } = JSON.parse(raw) as { marks: string[]; migrationPending?: boolean };
    save.rebirthMarks = marks ?? [];
    const sid = save.starterCharId ?? save.party[0];
    if (sid && save.rebirthMarks.includes(sid)) {
      save.chars[sid]!.rebirthMark = true;
    }
    if (migrationPending && save.rebirthMarks.length > 0) {
      save.rebirthMigrationPending = true;
    }
  } catch { /* ignore */ }
}
