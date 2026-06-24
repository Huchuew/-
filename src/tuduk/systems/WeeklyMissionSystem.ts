import type { GameSave } from '../types';
import { getSpireWeekId } from '../data/endgame/spire';
import { ensureEndgame } from './EndgameSystem';
import { addMaterial } from './EquipmentSystem';
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
    id: 'lb_daily1',
    label: '일일 랭킹 미션 클리어',
    target: 1,
    rewardGold: 2800,
    rewardGems: 2,
    progress: s => s.stats.rivalDailyClears ?? 0,
  },
];

function scaleWeeklyGold(base: number, save: GameSave): number {
  const maxR = save.maxRegion ?? 1;
  const spire = save.endgame?.spireBest ?? 0;
  const mult = 1 + Math.max(0, maxR - 10) * 0.1 + spire * 0.025;
  return Math.floor(base * mult);
}

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
    const scaledGold = scaleWeeklyGold(def.rewardGold, save);
    return { def, cur: Math.min(def.target, cur), done, claimed, scaledGold };
  });
}

export function hasClaimableWeeklyMission(save: GameSave): boolean {
  return getWeeklyMissionRows(save).some(r => r.done && !r.claimed);
}

function tryGrantWeeklyEssenceBonus(save: GameSave): string | null {
  ensureEndgame(save);
  const eg = save.endgame!;
  const week = getSpireWeekId();
  if (eg.weeklyEssenceWeek === week) return null;
  const rows = getWeeklyMissionRows(save);
  if (!rows.every(r => r.done)) return null;
  eg.weeklyEssenceWeek = week;
  addMaterial(save, 'spire_essence', 1);
  return '💠 주간 미션 전부 완료 — 탑의 심핵 +1';
}

export function claimWeeklyMission(save: GameSave, id: string): { ok: boolean; message: string } {
  ensureWeekly(save);
  const row = getWeeklyMissionRows(save).find(r => r.def.id === id);
  if (!row) return { ok: false, message: '알 수 없는 미션' };
  if (row.claimed) return { ok: false, message: '이미 수령함' };
  if (!row.done) return { ok: false, message: '조건 미달성' };
  save.weeklyMissions!.claimed.push(id);
  save.gold += row.scaledGold;
  save.stats.totalGold += row.scaledGold;
  const gems = row.def.rewardGems ?? 0;
  if (gems > 0) save.gems += gems;
  const essenceMsg = tryGrantWeeklyEssenceBonus(save);
  saveGame(save);
  const gemPart = gems > 0 ? ` 💎${gems}` : '';
  const extra = essenceMsg ? ` · ${essenceMsg}` : '';
  return {
    ok: true,
    message: `📅 ${row.def.label} — 🪙${row.scaledGold.toLocaleString()}${gemPart}${extra}`,
  };
}

export function getWeeklyMissionSummary(save: GameSave): string {
  const rows = getWeeklyMissionRows(save);
  const done = rows.filter(r => r.done).length;
  const claimable = rows.filter(r => r.done && !r.claimed).length;
  return `주간 ${done}/${rows.length}${claimable ? ` · 수령 ${claimable}` : ''}`;
}
