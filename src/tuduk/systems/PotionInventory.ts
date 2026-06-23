import type { GameSave } from '../types';
import { EXPEDITION_POTION_CARRY, MAX_POTION_STOCK } from '../types';
import { isInExpedition } from './LodgingSystem';
import { getExpeditionPotionCap } from './AugmentSystem';

/** 숙소 창고 + 원정 휴대 분리 마이그레이션 */
export function ensurePotionInventory(save: GameSave): void {
  if (save.potionStock != null) {
    if (save.potionStock < 0) save.potionStock = 0;
    if (save.potionStock > MAX_POTION_STOCK) save.potionStock = MAX_POTION_STOCK;
    if (isInExpedition(save)) {
      save.potions = Math.min(getExpeditionPotionCap(save), Math.max(0, save.potions ?? 0));
    } else {
      save.potions = 0;
    }
    return;
  }
  const legacy = Math.max(0, save.potions ?? 3);
  if (isInExpedition(save)) {
    save.potionStock = 0;
    save.potions = Math.min(EXPEDITION_POTION_CARRY, legacy);
  } else {
    save.potionStock = Math.min(MAX_POTION_STOCK, legacy);
    save.potions = 0;
  }
}

export function getPotionStock(save: GameSave): number {
  ensurePotionInventory(save);
  return save.potionStock ?? 0;
}

export function getExpeditionPotions(save: GameSave): number {
  if (!isInExpedition(save)) return 0;
  return Math.min(getExpeditionPotionCap(save), Math.max(0, save.potions ?? 0));
}

export function getPotionStockSpace(save: GameSave): number {
  return Math.max(0, MAX_POTION_STOCK - getPotionStock(save));
}

export function canAddPotionStock(save: GameSave): boolean {
  return getPotionStockSpace(save) > 0;
}

export function addPotionStock(save: GameSave, amount: number): number {
  if (amount <= 0) return 0;
  ensurePotionInventory(save);
  const added = Math.min(amount, getPotionStockSpace(save));
  save.potionStock = getPotionStock(save) + added;
  return added;
}

/** 원정 출발 — 창고에서 최대 3개만 지참 */
export function packPotionsForExpedition(save: GameSave): number {
  ensurePotionInventory(save);
  const pack = Math.min(getExpeditionPotionCap(save), getPotionStock(save));
  save.potionStock = getPotionStock(save) - pack;
  save.potions = pack;
  return pack;
}

/** 숙소 귀환 — 남은 휴대 포션 창고 반납 */
export function returnExpeditionPotions(save: GameSave): number {
  const carry = Math.max(0, save.potions ?? 0);
  save.potions = 0;
  if (carry <= 0) return 0;
  return addPotionStock(save, carry);
}

export function consumeExpeditionPotion(save: GameSave): boolean {
  if (!isInExpedition(save) || (save.potions ?? 0) <= 0) return false;
  save.potions!--;
  return true;
}
