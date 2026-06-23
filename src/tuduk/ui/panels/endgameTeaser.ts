import type { GameSave } from '../../types';
import { getEndgameLockHint, getEndgameTeaserProgress, isEndgameUnlocked } from '../../systems/EndgameSystem';

/** 기록 카드 옆 — 차원의 문 미니 버튼 (15층+ 또는 해금 후) */
export function renderEndgameHubButton(save: GameSave): string {
  const unlocked = isEndgameUnlocked(save);
  if (unlocked) {
    return `<button type="button" class="town-hub-mini town-hub-mini--endgame town-hub-mini--ready" data-town-sub="endgame" title="균열 · 탑 · 유물 · 각성">
      <span class="town-hub-mini-icon" aria-hidden="true">🌌</span>
      <span class="town-hub-mini-body">
        <strong>차원</strong>
        <small>균열·탑·각성</small>
      </span>
    </button>`;
  }

  const teaser = getEndgameTeaserProgress(save);
  if (!teaser) return '';

  const remain = teaser.steps.filter(s => !s.done).map(s => s.label).join(' · ') || teaser.hint;
  return `<div class="town-hub-mini town-hub-mini--endgame town-hub-mini--locked" role="status" title="${remain}">
    <span class="town-hub-mini-icon" aria-hidden="true">🌌</span>
    <span class="town-hub-mini-body">
      <strong>차원의 문</strong>
      <small>${remain}</small>
    </span>
    <span class="town-hub-mini-pct">${teaser.progressPct}%</span>
  </div>`;
}
