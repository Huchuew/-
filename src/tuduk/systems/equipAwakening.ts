import type { GameSave } from '../types';

import { RECIPE_MAP } from '../data/equipment';



const MAX_AWAKEN = 3;



export function isAwakenableGrade(grade: string): boolean {

  return grade === 'ur' || (grade.startsWith('u') && grade !== 'ua');

}



export function getAwakenBonus(level: number): number {

  return 1 + level * 0.08;

}



export function getAwakenSetBonusPct(totalStars: number): number {

  return totalStars * 0.05;

}



export function getTotalAwakenStars(save: GameSave, charId: string): number {

  const st = save.chars[charId];

  if (!st) return 0;

  let stars = 0;

  for (const uid of Object.values(st.equipped)) {

    if (!uid) continue;

    const item = save.bag.find(b => b.uid === uid);

    if (!item || !isAwakenableGrade(item.grade)) continue;

    stars += item.awakenLevel ?? 0;

  }

  return stars;

}



export function canAwaken(save: GameSave, uid: string): boolean {

  const item = save.bag.find(b => b.uid === uid);

  if (!item || !isAwakenableGrade(item.grade)) return false;

  const lv = item.awakenLevel ?? 0;

  if (lv >= MAX_AWAKEN) return false;

  const cost = awakenCost(lv);

  if (save.gold < cost.gold) return false;

  for (const [mat, n] of Object.entries(cost.mats)) {

    if ((save.materials[mat] ?? 0) < n) return false;

  }

  return true;

}



export function awakenCost(level: number): { gold: number; mats: Record<string, number> } {

  return {

    gold: 2500 + level * 1800,

    mats: {

      void_shard: 2 + level,

      legend_scale: 1 + level,

      rare_ore: 8 + level * 4,

    },

  };

}



export function awakenItem(save: GameSave, uid: string): boolean {

  if (!canAwaken(save, uid)) return false;

  const item = save.bag.find(b => b.uid === uid)!;

  const lv = item.awakenLevel ?? 0;

  const cost = awakenCost(lv);

  save.gold -= cost.gold;

  for (const [mat, n] of Object.entries(cost.mats)) {

    save.materials[mat] = (save.materials[mat] ?? 0) - n;

  }

  item.awakenLevel = lv + 1;

  return true;

}



export function getAwakenLabel(item: { grade: string; awakenLevel?: number; id: string }): string {

  const lv = item.awakenLevel ?? 0;

  if (lv <= 0) return '';

  const name = RECIPE_MAP[item.id]?.name ?? '';

  return `${name} ★${lv}`;

}



export function needsFullAwakenForNextTier(prevGrade: string, nextGrade: string): boolean {

  return prevGrade === 'ur' && nextGrade.startsWith('u');

}



export function isFullyAwakened(item: { grade: string; awakenLevel?: number } | null): boolean {

  if (!item || !isAwakenableGrade(item.grade)) return true;

  return (item.awakenLevel ?? 0) >= MAX_AWAKEN;

}

