import type { BagItem, EquipGrade, GameSave } from '../types';
import { RECIPE_MAP, type EquipRecipe } from '../data/equipment';
import { gradeIndex } from '../data/equipGrades';
import { isLegendaryGrade } from '../data/universalAccessories';
import { getAllEquippedUids, getVisibleBagItems } from './EquipmentSystem';
import { getPawnGold, pawnEquipment } from './LodgingEconomySystem';

const ACCESSORY_SLOTS = ['ring', 'necklace', 'relic'] as const;
type AccessorySlot = typeof ACCESSORY_SLOTS[number];
const JUNK_MAX_GRADE: EquipGrade = 'c';
const HIGHLIGHT_MIN_GRADE: EquipGrade = 'b';
const TOP_PER_SLOT = 2;

export function accessoryPowerScore(item: BagItem, recipe: EquipRecipe): number {
  const lv = item.level ?? 0;
  const mult = 1 + lv * 0.08;
  return (recipe.atk * 3 + recipe.def * 2.5 + recipe.hp * 0.35
    + recipe.atkSpd * 120 + recipe.crit * 200) * mult
    + gradeIndex(item.grade) * 12;
}

export function getEquippedAccessoryScore(save: GameSave, charId: string, slot: AccessorySlot): number {
  const uid = save.chars[charId]?.equipped[slot];
  if (!uid) return 0;
  const item = save.bag.find(b => b.uid === uid);
  const recipe = item ? RECIPE_MAP[item.id] : undefined;
  if (!item || !recipe) return 0;
  return accessoryPowerScore(item, recipe);
}

function isAlwaysVisibleGrade(grade: EquipGrade): boolean {
  return isLegendaryGrade(grade) || gradeIndex(grade) >= gradeIndex(HIGHLIGHT_MIN_GRADE);
}

export function getProtectedAccessoryUids(save: GameSave, charId: string): Set<string> {
  const protectedUids = getAllEquippedUids(save);
  const bag = getVisibleBagItems(save, { charId, universalOnly: true });

  for (const item of bag) {
    if (isAlwaysVisibleGrade(item.grade)) protectedUids.add(item.uid);
  }

  for (const slot of ACCESSORY_SLOTS) {
    const candidates = bag
      .map(item => {
        const recipe = RECIPE_MAP[item.id];
        if (!recipe || recipe.slot !== slot) return null;
        return { item, score: accessoryPowerScore(item, recipe) };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => b.score - a.score);
  if (candidates[0]) protectedUids.add(candidates[0].item.uid);
  }

  return protectedUids;
}

export interface AccessoryBagView {
  items: BagItem[];
  total: number;
  hidden: number;
  junkCount: number;
  junkGoldEst: number;
}

export function getAccessoryBagView(
  save: GameSave,
  charId: string,
  showAll: boolean,
): AccessoryBagView {
  const all = getVisibleBagItems(save, { charId, universalOnly: true });
  const protectedUids = getProtectedAccessoryUids(save, charId);

  let junkCount = 0;
  let junkGoldEst = 0;
  for (const item of all) {
    if (protectedUids.has(item.uid)) continue;
    if (gradeIndex(item.grade) > gradeIndex(JUNK_MAX_GRADE)) continue;
    junkCount++;
    junkGoldEst += getPawnGold(item);
  }

  if (showAll) {
    return { items: all, total: all.length, hidden: 0, junkCount, junkGoldEst };
  }

  const visibleUids = new Set<string>(protectedUids);
  const bySlot: Record<AccessorySlot, { item: BagItem; recipe: EquipRecipe; score: number }[]> = {
    ring: [], necklace: [], relic: [],
  };

  for (const item of all) {
    const recipe = RECIPE_MAP[item.id];
    if (!recipe || !ACCESSORY_SLOTS.includes(recipe.slot as AccessorySlot)) continue;
    bySlot[recipe.slot as AccessorySlot].push({ item, recipe, score: accessoryPowerScore(item, recipe) });
  }

  for (const slot of ACCESSORY_SLOTS) {
    const eqScore = getEquippedAccessoryScore(save, charId, slot);
    const sorted = bySlot[slot].sort((a, b) => b.score - a.score);
    sorted.slice(0, TOP_PER_SLOT).forEach(x => visibleUids.add(x.item.uid));
    sorted.filter(x => x.score > eqScore).forEach(x => visibleUids.add(x.item.uid));
  }

  const items = all.filter(i => visibleUids.has(i.uid));
  return {
    items,
    total: all.length,
    hidden: Math.max(0, all.length - items.length),
    junkCount,
    junkGoldEst,
  };
}

export function groupAccessoriesBySlot(items: BagItem[]): Record<AccessorySlot, BagItem[]> {
  const groups: Record<AccessorySlot, BagItem[]> = { ring: [], necklace: [], relic: [] };
  for (const item of items) {
    const slot = RECIPE_MAP[item.id]?.slot;
    if (slot && ACCESSORY_SLOTS.includes(slot as AccessorySlot)) {
      groups[slot as AccessorySlot].push(item);
    }
  }
  for (const slot of ACCESSORY_SLOTS) {
    groups[slot].sort((a, b) => {
      const ra = RECIPE_MAP[a.id]!;
      const rb = RECIPE_MAP[b.id]!;
      return accessoryPowerScore(b, rb) - accessoryPowerScore(a, ra);
    });
  }
  return groups;
}

export function salvageJunkAccessories(save: GameSave, charId: string): { count: number; gold: number } {
  const bag = getVisibleBagItems(save, { charId, universalOnly: true });
  const protectedUids = getProtectedAccessoryUids(save, charId);
  let gold = 0;
  let count = 0;

  for (const item of [...bag]) {
    if (protectedUids.has(item.uid)) continue;
    if (gradeIndex(item.grade) > gradeIndex(JUNK_MAX_GRADE)) continue;
    const g = pawnEquipment(save, item.uid);
    if (g > 0) {
      gold += g;
      count++;
    }
  }
  return { count, gold };
}

export function formatAccessoryCompareTag(
  item: BagItem,
  recipe: EquipRecipe,
  equippedScore: number,
): string {
  const score = accessoryPowerScore(item, recipe);
  if (score > equippedScore * 1.02) return 'up';
  if (score < equippedScore * 0.98) return 'down';
  return 'same';
}
