import type { GameSave } from '../types';
import { addMaterial } from './EquipmentSystem';
import { saveGame } from '../core/SaveManager';

const FLOOR_MILESTONES = [
  { floor: 25, label: '25층 돌파', gold: 80_000, mats: { spire_essence: 1, legend_scale: 1 } as Record<string, number> },
  { floor: 35, label: '35층 돌파', gold: 150_000, mats: { spire_essence: 1, legend_scale: 2, void_shard: 3 } },
  { floor: 45, label: '45층 돌파', gold: 280_000, mats: { spire_essence: 2, legend_scale: 3, void_shard: 5 } },
] as const;

function ensureMilestones(save: GameSave) {
  if (!save.floorMilestones) save.floorMilestones = [];
}

/** maxRegion 상승 시 1회성 마일스톤 보상 */
export function grantFloorMilestones(save: GameSave, prevMax: number, newMax: number): string[] {
  ensureMilestones(save);
  const msgs: string[] = [];
  for (const m of FLOOR_MILESTONES) {
    if (prevMax >= m.floor || newMax < m.floor) continue;
    if (save.floorMilestones!.includes(m.floor)) continue;
    save.floorMilestones!.push(m.floor);
    save.gold += m.gold;
    save.stats.totalGold += m.gold;
    for (const [k, v] of Object.entries(m.mats)) {
      addMaterial(save, k, v);
    }
    msgs.push(`🏆 ${m.label} — 🪙${m.gold.toLocaleString()} + 특수 재료`);
  }
  if (msgs.length) saveGame(save);
  return msgs;
}

export function getNextFloorMilestone(save: GameSave): { floor: number; label: string } | null {
  ensureMilestones(save);
  const maxR = save.maxRegion ?? 1;
  const next = FLOOR_MILESTONES.find(m => m.floor > maxR && !save.floorMilestones!.includes(m.floor));
  return next ? { floor: next.floor, label: next.label } : null;
}
