import type { EquipSlot, GameSave } from '../types';

import { RECIPE_MAP, type EquipRecipe, getMaxEnhanceForGrade } from './equipment';

import { CHAR_EQUIP_LINES_FROM_CATALOG } from './equipmentCatalog';



export type EquipCategory = 'weapon' | 'armor' | 'accessory';



export function slotToEquipCategory(slot: EquipSlot): EquipCategory {

  if (slot === 'weapon') return 'weapon';

  if (slot === 'armor') return 'armor';

  return 'accessory';

}



/** @deprecated getMaxEnhanceForGrade(grade) 사용 */
export const MAX_EQUIP_ENHANCE = 3;



export function getMaxEnhanceForRecipeId(recipeId: string): number {

  const recipe = RECIPE_MAP[recipeId];

  return recipe ? getMaxEnhanceForGrade(recipe.grade) : 3;

}



export interface ProgressionLine {

  label: string;

  slot: EquipSlot;

  recipeIds: string[];

}



export const CHAR_EQUIP_LINES = CHAR_EQUIP_LINES_FROM_CATALOG;



export interface LineProgress {

  lineLabel: string;

  slot: EquipSlot;

  step: number;

  total: number;

  next: EquipRecipe | null;

  nextRecipeId: string | null;

  completed: { name: string; recipeId: string }[];

  allDone: boolean;

}



export function getCharLines(charId: string) {

  return CHAR_EQUIP_LINES[charId] ?? { weapon: [], armor: [], accessory: [] };

}



export function getAllRecipeLines(charId: string): string[][] {

  const lines = getCharLines(charId);

  return [

    lines.weapon,

    lines.armor,

    ...lines.accessory.map(a => a.recipeIds),

  ].filter(c => c.length > 0);

}



export function findRecipeLine(charId: string, recipeId: string): string[] | null {

  return getAllRecipeLines(charId).find(chain => chain.includes(recipeId)) ?? null;

}



export function getEquippedTierIndex(save: GameSave, charId: string, recipeIds: string[]): number {

  if (!recipeIds.length) return -1;

  const slot = RECIPE_MAP[recipeIds[0]!]?.slot;

  if (!slot) return -1;

  const item = getItemForCharSlot(save, charId, slot);

  if (!item) return -1;

  return recipeIds.indexOf(item.id);

}



export function getNextCraftRecipeId(save: GameSave, charId: string, recipeIds: string[]): string | null {

  const tier = getEquippedTierIndex(save, charId, recipeIds);

  const nextIdx = tier + 1;

  if (nextIdx >= recipeIds.length) return null;

  return recipeIds[nextIdx] ?? null;

}



/** 다음 티어 제작 전 이전 장비 MAX 강화 + UR→초월 시 ★3 각성 필요 */

export function isPrevTierMaxEnhanced(

  save: GameSave, charId: string, recipeIds: string[], nextRecipeId: string,

): boolean {

  const nextIdx = recipeIds.indexOf(nextRecipeId);

  if (nextIdx <= 0) return true;

  const prevId = recipeIds[nextIdx - 1]!;

  const slot = RECIPE_MAP[prevId]?.slot;

  if (!slot) return false;

  const item = getItemForCharSlot(save, charId, slot);

  if (!item || item.id !== prevId) return false;

  if (item.level < getMaxEnhanceForRecipeId(prevId)) return false;

  const nextRecipe = RECIPE_MAP[nextRecipeId];

  if (nextRecipe && item.grade === 'ur' && nextRecipe.grade.startsWith('u')) {

    return (item.awakenLevel ?? 0) >= 3;

  }

  return true;

}



export function getCraftBlockReason(

  save: GameSave, charId: string, recipeIds: string[], nextRecipeId: string,

): string | null {

  if (isPrevTierMaxEnhanced(save, charId, recipeIds, nextRecipeId)) return null;

  const prevId = recipeIds[recipeIds.indexOf(nextRecipeId) - 1];

  const prevName = prevId ? RECIPE_MAP[prevId]?.name : '이전 장비';

  const need = prevId ? getMaxEnhanceForRecipeId(prevId) : 3;

  const slot = prevId ? RECIPE_MAP[prevId]?.slot : undefined;

  const prevItem = slot ? getItemForCharSlot(save, charId, slot) : null;

  const nextRecipe = RECIPE_MAP[nextRecipeId];

  if (

    prevItem && prevItem.id === prevId && prevItem.level >= need

    && prevItem.grade === 'ur' && nextRecipe?.grade.startsWith('u')

    && (prevItem.awakenLevel ?? 0) < 3

  ) {

    return `${prevName ?? '이전 장비'} ★3 각성 후 초월 제작 가능`;

  }

  return `${prevName ?? '이전 장비'} +${need} 강화 후 제작 가능`;

}



export function getLineProgress(

  save: GameSave, charId: string, recipeIds: string[], lineLabel: string, slot: EquipSlot,

): LineProgress {

  const tier = getEquippedTierIndex(save, charId, recipeIds);

  const completed: LineProgress['completed'] = [];



  if (tier >= 0) {

    for (let i = 0; i <= tier; i++) {

      const rid = recipeIds[i]!;

      const r = RECIPE_MAP[rid];

      if (r) completed.push({ name: r.name, recipeId: rid });

    }

  }



  const nextId = getNextCraftRecipeId(save, charId, recipeIds);

  const next = nextId ? RECIPE_MAP[nextId] ?? null : null;



  return {

    lineLabel,

    slot,

    step: next ? tier + 2 : recipeIds.length,

    total: recipeIds.length,

    next,

    nextRecipeId: nextId,

    completed,

    allDone: !nextId && recipeIds.length > 0 && tier >= recipeIds.length - 1,

  };

}



export function getCategoryCraftLines(save: GameSave, charId: string, cat: EquipCategory): LineProgress[] {

  const lines = getCharLines(charId);

  if (cat === 'weapon') {

    return lines.weapon.length

      ? [getLineProgress(save, charId, lines.weapon, '무기', 'weapon')] : [];

  }

  if (cat === 'armor') {

    return lines.armor.length

      ? [getLineProgress(save, charId, lines.armor, '방어구', 'armor')] : [];

  }

  return lines.accessory.map(a => getLineProgress(save, charId, a.recipeIds, a.label, a.slot));

}



export function getItemForCharSlot(save: GameSave, charId: string, slot: EquipSlot) {

  const uid = save.chars[charId]?.equipped[slot];

  if (uid) return save.bag.find(b => b.uid === uid) ?? null;

  return null;

}

