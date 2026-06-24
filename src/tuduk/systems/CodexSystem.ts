import type { GameSave } from '../types';
import { getRegionMonsters } from '../data/monsters';
import {
  ACCESSORY_DROP_RATE, getAccessoriesForRegion, UNIVERSAL_ACCESSORIES,
} from '../data/universalAccessories';
import { GRADE_LABEL } from '../data/equipGrades';

export function getRegionCodexPercent(save: GameSave, regionId: number): number {
  const mons = getRegionMonsters(regionId);
  if (!mons.length) return 1;
  const found = mons.filter(m => save.codex[m.id]?.discovered).length;
  return found / mons.length;
}

export function getCodexAtkBonus(save: GameSave): number {
  return (save.codexRewards?.length ?? 0) * 0.03;
}

export function tryClaimCodexReward(save: GameSave, regionId: number): boolean {
  if (save.codexRewards?.includes(regionId)) return false;
  if (getRegionCodexPercent(save, regionId) < 1) return false;
  if (!save.codexRewards) save.codexRewards = [];
  save.codexRewards.push(regionId);
  return true;
}

export function checkAllCodexRewards(save: GameSave): number[] {
  const claimed: number[] = [];
  for (let r = 1; r <= 50; r++) {
    if (tryClaimCodexReward(save, r)) claimed.push(r);
  }
  return claimed;
}

/** 층별 드랍 힌트 — 도감 100% 시 장신구 이름 공개 */
export function getRegionDropHint(save: GameSave, regionId: number): string {
  const pct = getRegionCodexPercent(save, regionId);
  const pool = getAccessoriesForRegion(regionId);
  const accPct = Math.round(ACCESSORY_DROP_RATE * 1000) / 10;
  const matParts = ['철광석', '목재', '슬라임젤', '송곳니', '마력가루'];
  if (regionId >= 9) matParts.push('정령실');
  if (regionId >= 12) matParts.push('공허파편');
  const matHint = matParts.join('·');
  const rareHint = regionId === 1 ? ' · 희귀: 희귀광석'
    : regionId === 2 ? ' · 희귀: 그림자날개'
      : regionId === 10 ? ' · 희귀: 전설비늘'
        : '';
  if (!pool.length) return `📦 재료: ${matHint}${rareHint}`;
  if (pct >= 1) {
    const names = pool.map(a => `${a.name}(${GRADE_LABEL[a.grade].split('·')[0]?.trim()})`).join(', ');
    return `💍 장신구 ~${accPct}% · ${names} · 📦 ${matHint}${rareHint}`;
  }
  const grades = [...new Set(pool.map(a => a.grade.toUpperCase()))].join('·');
  return `📦 ${matHint}${rareHint} · 💍 장신구 ~${accPct}% (${grades})`;
}

export function getTotalAccessoryCount(): number {
  return UNIVERSAL_ACCESSORIES.length;
}
