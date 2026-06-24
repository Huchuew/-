import type { GameSave } from '../../types';
import {
  getTodayDailyBonus, isDailyBonusActive,
} from '../../systems/dailyBonus';
import { getWeeklyMissionSummary, hasClaimableWeeklyMission } from '../../systems/WeeklyMissionSystem';
import { isEndgameTeaserVisible, isEndgameUnlocked } from '../../systems/EndgameSystem';
import { SPIRE_DAILY_ATTEMPTS } from '../../data/endgame/spire';
import { getPendingTycoonSummary } from '../../systems/TycoonExpansionSystem';

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

function renderTodayTasksRow(save: GameSave): string {
  const parts: string[] = [];
  if (isDailyBonusClaimable(save)) parts.push('일일보너스');
  if (hasClaimableWeeklyMission(save)) parts.push('주간미션');
  const eg = save.endgame;
  if (isEndgameUnlocked(save) && eg && eg.spireAttempts > 0) {
    parts.push(`야탑 ${eg.spireAttempts}/${SPIRE_DAILY_ATTEMPTS}`);
  } else if (isEndgameTeaserVisible(save) && !isEndgameUnlocked(save)) {
    parts.push(`야탑 ${save.maxRegion ?? 1}/18`);
  }
  const pending = getPendingTycoonSummary(save);
  if (pending.gold > 0 || pending.matQty > 0) parts.push('캠프 수확');
  if (!parts.length) return '';
  return `<p class="town-today-tasks">📌 오늘: ${parts.join(' · ')}</p>`;
}

/** 마을 허브 — 오늘의 지하철 + 통합 할 일 */
export function renderTownRewardsStrip(save: GameSave): string {
  const bonus = getTodayDailyBonus();
  const dailyActive = isDailyBonusActive(save);
  const weekly = getWeeklyMissionSummary(save);

  return `<section class="town-rewards-strip" aria-label="일일 보상">
    <header class="town-rewards-head">
      <strong>🎁 오늘의 보상</strong>
      <span class="town-rewards-weekly">${weekly}</span>
    </header>
    ${renderTodayTasksRow(save)}
    ${renderDailyPill(dailyActive, bonus)}
  </section>`;
}
