import type { GameSave } from '../types';
import { MATERIAL_LABELS } from '../data/equipment';
import { canAddPotionStock } from './PotionInventory';
import { LODGING_SELL_MULT } from '../data/economyBalance';
import { onMaterialSold } from './OnboardingSystem';
import { getMarketMultiplier } from './TycoonExpansionSystem';

export { LODGING_SELL_MULT };

export function scaleSellGold(base: number): number {
  return Math.max(1, Math.round(base * LODGING_SELL_MULT));
}

export function getSellUnitPrice(save: GameSave, key: string): number {
  const base = JUNK_SELL_PRICES[key];
  if (!base) return 0;
  return Math.max(1, Math.floor(scaleSellGold(base) * getMarketMultiplier(save, key)));
}

/** 숙소 상인 류아에게 판매 가능한 잡템 기본 단가 */
export const JUNK_SELL_PRICES: Record<string, number> = {
  iron_ore: 12,
  wood_chip: 8,
  slime_gel: 15,
  healing_herb: 28,
  beast_fang: 22,
  shadow_wing: 28,
  magic_dust: 35,
  spirit_thread: 30,
  rare_ore: 45,
  void_shard: 55,
};

export interface SellableItem {
  key: string;
  label: string;
  qty: number;
  unitPrice: number;
}

export function getSellableItems(save: GameSave): SellableItem[] {
  const items: SellableItem[] = [];
  for (const [key, price] of Object.entries(JUNK_SELL_PRICES)) {
    const qty = save.materials[key] ?? 0;
    if (qty <= 0) continue;
    items.push({
      key,
      label: MATERIAL_LABELS[key] ?? key,
      qty,
      unitPrice: getSellUnitPrice(save, key),
    });
  }
  return items.sort((a, b) => b.unitPrice - a.unitPrice);
}

export function sellMaterial(save: GameSave, key: string, amount = 1): number {
  if (!JUNK_SELL_PRICES[key]) return 0;
  const price = getSellUnitPrice(save, key);
  const have = save.materials[key] ?? 0;
  const sell = Math.min(amount, have);
  if (sell <= 0) return 0;
  save.materials[key] = have - sell;
  if (save.materials[key] <= 0) delete save.materials[key];
  const gold = sell * price;
  save.gold += gold;
  save.stats.totalGold += gold;
  save.stats.materialsSold = (save.stats.materialsSold ?? 0) + sell;
  onMaterialSold(save, gold);
  return gold;
}

export function estimateMaterialsSellGold(
  save: GameSave,
  mats: Record<string, number>,
): { total: number; qty: number } {
  let total = 0;
  let qty = 0;
  for (const [key, n] of Object.entries(mats)) {
    if (n <= 0 || !JUNK_SELL_PRICES[key]) continue;
    total += getSellUnitPrice(save, key) * n;
    qty += n;
  }
  return { total: Math.floor(total), qty };
}

/** 상점 판매 가이드용 — 주요 재료 3개 판매 예시 */
export function formatExpeditionLootSummary(
  save: GameSave,
  matsGained: Record<string, number>,
): string | null {
  const { total, qty } = estimateMaterialsSellGold(save, matsGained);
  if (qty <= 0) return null;
  return `📦 이번 원정 재료 ${qty}개 → 상점 판매 시 약 🪙${total.toLocaleString()}`;
}

export function getSellPriceGuideLines(save: GameSave): string[] {
  const samples = ['iron_ore', 'wood_chip', 'slime_gel', 'healing_herb'] as const;
  return samples.map(key => {
    const label = MATERIAL_LABELS[key] ?? key;
    const unit = getSellUnitPrice(save, key);
    const have = save.materials[key] ?? 0;
    const demo = Math.min(3, Math.max(1, have || 3));
    return `${label} ${demo}개 ≈ 🪙${(unit * demo).toLocaleString()} (개당 🪙${unit})`;
  });
}

export function sellAllJunk(save: GameSave): number {
  let total = 0;
  for (const item of getSellableItems(save)) {
    total += sellMaterial(save, item.key, item.qty);
  }
  return total;
}

export function canReceivePotion(save: GameSave): boolean {
  return canAddPotionStock(save);
}
