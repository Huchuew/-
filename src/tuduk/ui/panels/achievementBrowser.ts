import type { GameSave } from '../../types';
import { ACHIEVEMENTS } from '../../data/achievements';
import {
  canClaimAchievement, countClaimableAchievements,
  isAchievementClaimed, isAchievementMet,
} from '../../systems/AchievementSystem';

/** 기록 탭 — 전체 업적 목록 (??? 미달성 포함) */
export function renderFullAchievementBrowser(save: GameSave): string {
  const claimable = countClaimableAchievements(save);
  const claimedN = save.achievements.length;
  const rows = ACHIEVEMENTS.map(a => {
    const met = isAchievementMet(save, a.id);
    const claimed = isAchievementClaimed(save, a.id);
    const ready = canClaimAchievement(save, a.id);
    if (!met && !claimed) {
      return `<div class="achieve-row achieve-hidden compact">
        <strong>???</strong><p>미달성 · 조건은 달성 후 공개</p>
        <span class="achieve-reward hint">???</span>
      </div>`;
    }
    const rewardTxt = `🪙${a.reward.toLocaleString()}${a.gemReward ? ` 💎${a.gemReward}` : ''}`;
    const claimBtn = ready
      ? `<button type="button" class="btn-sm gold achieve-claim-btn" data-claim-achieve="${a.id}">수령</button>`
      : claimed ? '<span class="hint">✓</span>' : '';
    return `<div class="achieve-row compact ${claimed ? 'done' : ready ? 'ready' : ''}">
      <div class="achieve-row-main">
        <strong>${a.name}</strong>
        <p>${a.desc}</p>
      </div>
      <span class="achieve-reward">${rewardTxt}</span>
      ${claimBtn}
    </div>`;
  }).join('');

  return `<details class="records-details achievement-browser">
    <summary>🏆 전체 업적 (${claimedN}/${ACHIEVEMENTS.length})${claimable ? ` · 수령 가능 ${claimable}` : ''}</summary>
    <p class="hint">마일스톤 외 업적도 여기서 확인·수령할 수 있어요. 미달성 항목은 ??? 로 표시됩니다.</p>
    <div class="achieve-list compact-list">${rows}</div>
  </details>`;
}
