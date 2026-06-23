import type { GameSave } from '../types';
import {
  ACCESSORY_DROP_RATE, pickRandomAccessoryDrop, UNIVERSAL_ACCESSORY_RECIPES,
} from '../data/universalAccessories';
import { newItemUid } from './EquipmentSystem';

export function rollAccessoryDrop(save: GameSave, regionId: number): string | null {
  if (Math.random() > ACCESSORY_DROP_RATE) return null;
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
  return recipe.name;
}
