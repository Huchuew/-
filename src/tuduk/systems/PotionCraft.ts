import type { GameSave } from '../types';
import { addPotionStock, canAddPotionStock } from './PotionInventory';import { MATERIAL_LABELS } from '../data/equipment';

/** HP 포션 1개 제작 재료 — 약초원 치유 약초가 핵심 */
export const POTION_CRAFT_MATS: Record<string, number> = {
  healing_herb: 2,
  wood_chip: 2,
  iron_ore: 1,
};

export function formatPotionCraftRecipe(): string {
  return Object.entries(POTION_CRAFT_MATS)
    .map(([id, n]) => `${MATERIAL_LABELS[id] ?? id}×${n}`)
    .join(' · ');
}

export function hasPotionCraftMaterials(save: GameSave): boolean {
  return Object.entries(POTION_CRAFT_MATS).every(
    ([k, n]) => (save.materials[k] ?? 0) >= n,
  );
}

export function canCraftPotion(save: GameSave): boolean {
  return canAddPotionStock(save) && hasPotionCraftMaterials(save);
}

export function craftPotion(save: GameSave): boolean {
  if (!canCraftPotion(save)) return false;
  for (const [k, n] of Object.entries(POTION_CRAFT_MATS)) {
    save.materials[k] = Math.max(0, (save.materials[k] ?? 0) - n);
  }
  addPotionStock(save, 1);
  return true;
}
