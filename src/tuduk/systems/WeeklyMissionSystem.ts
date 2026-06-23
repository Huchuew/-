import type { GameSave } from '../types';
import { getSpireWeekId } from '../data/endgame/spire';
import { saveGame } from '../core/SaveManager';

export interface WeeklyMissionDef {
  id: string;
  label: string;
  target: number;
  rewardGold: number;
  rewardGems?: number;
  progress: (save: GameSave) => number;
  /** true면 baseline 없이 절대값 비교 */
  absolute?: boolean;
}

export const WEEKLY_MISSIONS: WeeklyMissionDef[] = [
  {
    id: 'sell_mat20',
    label: '재료 20개 판매',
    target: 20,
    rewardGold: 3200,
    rewardGems: 2,
    progress: s => s.stats.materialsSold ?? 0,
  },
  {
    id: 'boss_clear1',
    label: '보스 1회 격파',
    target: 1,
    rewardGold: 4500,
    rewardGems: 3,
    progress: s => s.stats.bossClears ?? 0,
  },
  {
    id: 'rival_daily1',
    label: '일일 대결 클리어',
    target: 1,
    rewardGold: 2800,
    rewardGems: 2,
    progress: s => s.stats.rivalDailyClears ?? 0,
  },
];

function ensureWeekly(save: GameSave) {
  const week = getSpireWeekId();
  if (!save.weeklyMissions || save.weeklyMissions.weekId !== week) {
    save.weeklyMissions = {
      weekId: week,
      baseline: Object.fromEntries(WEEKLY_MISSIONS.map(m => [m.id, m.progress(save)])),
      claimed: [],
    };
  }
}

export function getWeeklyMissionRows(save: GameSave) {
  ensureWeekly(save);
  const wm = save.weeklyMissions!;
  return WEEKLY_MISSIONS.map(def => {
    const base = def.absolute ? 0 : (wm.baseline[def.id] ?? 0);
    const raw = def.progress(save);
    const cur = def.absolute ? raw : Math.max(0, raw - base);
    const done = cur >= def.target;
    const claimed = wm.claimed.includes(def.id);
    return { def, cur: Math.min(def.target, cur), done, claimed };
  });
}

export function hasClaimableWeeklyMission(save: GameSave): boolean {
  return getWeeklyMissionRows(save).some(r => r.done && !r.claimed);
}

export function claimWeeklyMission(save: GameSave, id: string): { ok: boolean; message: string } {
  ensureWeekly(save);
  const row = getWeeklyMissionRows(save).find(r => r.def.id === id);
  if (!row) return { ok: false, message: '알 수 없는 미션' };
  if (row.claimed) return { ok: false, message: '이미 수령함' };
  if (!row.done) return { ok: false, message: '조건 미달성' };
  save.weeklyMissions!.claimed.push(id);
  save.gold += row.def.rewardGold;
  save.stats.totalGold += row.def.rewardGold;
  const gems = row.def.rewardGems ?? 0;
  if (gems > 0) save.gems += gems;
  saveGame(save);
  const gemPart = gems > 0 ? ` 💎${gems}` : '';
  return { ok: true, message: `📅 ${row.def.label} — 🪙${row.def.rewardGold.toLocaleString()}${gemPart}` };
}
