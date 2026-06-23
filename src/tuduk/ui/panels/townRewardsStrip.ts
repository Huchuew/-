import type { GameSave } from '../../types';
import {
  getTodayDailyBonus, isDailyBonusActive,
} from '../../systems/dailyBonus';

export function isDailyBonusClaimable(save: GameSave): boolean {
  return !isDailyBonusActive(save);
}

function renderDailyPill(active: boolean, bonus: ReturnType<typeof getTodayDailyBonus>): string {
  const copy = `<strong>오늘의 지하철</strong><span class="town-reward-detail"> · ${bonus.detail}</span>`;
  if (active) {
    return `<div class="town-reward-pill town-reward-pill--active">
      <span class="town-reward-icon" aria-hidden="true">${bonus.icon}</span>
      <div class="town-reward-copy">${copy}</div>
    </div>`;
  }
  return `<div class="town-reward-pill town-reward-pill--claim">
    <span class="town-reward-icon" aria-hidden="true">${bonus.icon}</span>
    <div class="town-reward-copy">${copy}</div>
    <button type="button" class="btn-sm gold town-reward-btn" id="claim-daily-bonus">수령</button>
  </div>`;
}

/** 마을 허브 — 오늘의 지하철 */
export function renderTownRewardsStrip(save: GameSave): string {
  const bonus = getTodayDailyBonus();
  const dailyActive = isDailyBonusActive(save);

  return `<section class="town-rewards-strip" aria-label="일일 보상">
    <header class="town-rewards-head">
      <strong>🎁 오늘의 보상</strong>
    </header>
    ${renderDailyPill(dailyActive, bonus)}
  </section>`;
}
