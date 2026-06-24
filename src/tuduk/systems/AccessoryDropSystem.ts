import type { GameSave } from '../types';
import {
  isLegendaryGrade,
  pickRandomAccessoryDrop,
  UNIVERSAL_ACCESSORY_RECIPES,
} from '../data/universalAccessories';
import { GRADE_LABEL } from '../data/equipment';
import { newItemUid } from './EquipmentSystem';

export interface AccessoryDropResult {
  name: string;
  grade: string;
  legendary: boolean;
}

export function rollAccessoryDrop(save: GameSave, regionId: number): AccessoryDropResult | null {
  const picked = pickRandomAccessoryDrop(regionId);
  if (!picked) return null;
  const recipe = UNIVERSAL_ACCESSORY_RECIPES.find(r => r.id === picked.id);
  if (!recipe) return null;
  save.bag.push({
    uid: newItemUid(),
    id: recipe.id,
    grade: recipe.grade,
    slot: recipe.slot,
    level: 0,
  });
  const legendary = isLegendaryGrade(recipe.grade);
  if (legendary) {
    save.pendingAccessoryCelebrate = { name: recipe.name, grade: recipe.grade };
  }
  return { name: recipe.name, grade: GRADE_LABEL[recipe.grade] ?? recipe.grade, legendary };
}
