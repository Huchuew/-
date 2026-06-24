import type { GameSave } from '../../types';
import {
  getEndgameLockHint, getEndgameTeaserProgress, isEndgameUnlocked,
} from '../../systems/EndgameSystem';
import { isSpireTestBypass } from '../../data/endgame/spireTest';

function endgameMiniBody(title: string, subtitle: string): string {
  return `<span class="town-hub-mini-row">
    <span class="town-hub-mini-icon" aria-hidden="true">🗼</span>
    <span class="town-hub-mini-body">
      <strong>${title}</strong>
      <small>${subtitle}</small>
    </span>
  </span>`;
}

/** 기록 카드 옆 — 야탑 미니 버튼 (15층+ 또는 해금 후) */
export function renderEndgameHubButton(save: GameSave): string {
  const unlocked = isEndgameUnlocked(save);
  const spireTest = isSpireTestBypass();
  if (unlocked || spireTest) {
    return `<button type="button" class="town-hub-mini town-hub-mini--endgame town-hub-mini--ready" data-town-sub="endgame" title="야탑 · 유물 · 각성">
      ${endgameMiniBody('야탑', spireTest && !unlocked ? '테스트 등반' : '무한의 탑·각성')}
    </button>`;
  }

  const teaser = getEndgameTeaserProgress(save);
  if (!teaser) return '';

  const subtitle = teaser.hint;
  return `<button type="button" class="town-hub-mini town-hub-mini--endgame town-hub-mini--locked" data-town-sub="endgame" title="${teaser.hint}">
    ${endgameMiniBody('야탑의 문', subtitle)}
    <span class="town-hub-mini-pct">${teaser.progressPct}%</span>
  </button>`;
}
