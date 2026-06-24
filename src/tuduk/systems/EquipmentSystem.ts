import type { EquipGrade, EquipSlot, GameSave } from '../types';
import {
  RECIPE_MAP, canCharUseRecipe, enhanceBonus, enhanceCost as baseEnhanceCost, type EquipRecipe,
} from '../data/equipment';
import { normalizeGrade } from '../data/equipGrades';
import { findRecipeLine, getItemForCharSlot, getNextCraftRecipeId, isPrevTierMaxEnhanced } from '../data/equipmentProgress';
import { getMaxEnhanceForGrade } from '../data/equipment';
import { getAwakenBonus } from './equipAwakening';
import { getSmelterEnhanceDiscount } from './TycoonSystem';
import { isCharGrowthBlocked } from './PrestigeGateSystem';
import { addMaterialCapped } from './WarehouseSystem';

export function enhanceCost(save: GameSave, level: number, grade: EquipGrade) {
  const cost = baseEnhanceCost(level, grade);
  const dust = cost.mats.magic_dust;
  if (dust != null) {
    const reduced = Math.max(0, dust - getSmelterEnhanceDiscount(save));
    if (reduced <= 0) delete cost.mats.magic_dust;
    else cost.mats.magic_dust = reduced;
  }
  return cost;
}

let uidCounter = Date.now();

export function newItemUid() {
  return `eq_${uidCounter++}`;
}

function isEquippedByChar(save: GameSave, charId: string, uid: string): boolean {
  const st = save.chars[charId];
  return !!st && Object.values(st.equipped).includes(uid);
}

function isEquippedByAny(save: GameSave, uid: string): boolean {
  return save.owned.some(cid => isEquippedByChar(save, cid, uid));
}

/** 타 캐릭터가 착용 중인 uid 집합 (excludeCharId 제외) */
export function getEquippedUidsByOthers(save: GameSave, excludeCharId?: string): Set<string> {
  const uids = new Set<string>();
  for (const cid of save.owned) {
    if (excludeCharId && cid === excludeCharId) continue;
    const st = save.chars[cid];
    if (!st) continue;
    for (const uid of Object.values(st.equipped)) {
      if (uid) uids.add(uid);
    }
  }
  return uids;
}

/** 전 캐릭터 착용 중 uid */
export function getAllEquippedUids(save: GameSave): Set<string> {
  const uids = new Set<string>();
  for (const cid of save.owned) {
    const st = save.chars[cid];
    if (!st) continue;
    for (const uid of Object.values(st.equipped)) {
      if (uid) uids.add(uid);
    }
  }
  return uids;
}

/** 가방 — 본인·타인 착용 장비 제외 (charId 없으면 착용 중 전부 제외) */
export function getVisibleBagItems(
  save: GameSave,
  opts?: { charId?: string; universalOnly?: boolean },
) {
  const charId = opts?.charId;
  const hidden = new Set<string>();
  if (charId) {
    for (const uid of Object.values(save.chars[charId]?.equipped ?? {})) {
      if (uid) hidden.add(uid);
    }
    for (const uid of getEquippedUidsByOthers(save, charId)) hidden.add(uid);
  } else {
    for (const uid of getAllEquippedUids(save)) hidden.add(uid);
  }
  return save.bag.filter(b => {
    if (hidden.has(b.uid)) return false;
    if (opts?.universalOnly && !RECIPE_MAP[b.id]?.isUniversal) return false;
    return true;
  });
}

/** 가방 아이템 슬롯을 레시피와 동기화 */
export function normalizeBagItemSlots(save: GameSave) {
  for (const item of save.bag) {
    const recipe = RECIPE_MAP[item.id];
    if (recipe) item.slot = recipe.slot;
  }
}

function clearUidFromAllEquipped(save: GameSave, uid: string) {
  for (const cid of save.owned) {
    const st = save.chars[cid];
    if (!st) continue;
    for (const slot of Object.keys(st.equipped) as EquipSlot[]) {
      if (st.equipped[slot] === uid) delete st.equipped[slot];
    }
  }
}

function upgradeReplaceLowerTiers(save: GameSave, charId: string, recipeId: string) {
  const chain = findRecipeLine(charId, recipeId);
  if (!chain) return;
  const idx = chain.indexOf(recipeId);
  const st = save.chars[charId];
  if (!st) return;

  for (let i = 0; i < idx; i++) {
    const rid = chain[i]!;
    for (const [slot, uid] of Object.entries(st.equipped)) {
      if (uid && save.bag.find(b => b.uid === uid)?.id === rid) {
        delete st.equipped[slot as keyof typeof st.equipped];
      }
    }
    save.bag = save.bag.filter(b => {
      if (b.id !== rid) return true;
      if (isEquippedByAny(save, b.uid)) return true;
      return false;
    });
  }
}

function getEquipOwnerCharId(save: GameSave, uid: string): string | null {
  for (const id of save.owned) {
    const eq = save.chars[id]?.equipped;
    if (eq && Object.values(eq).some(v => v === uid)) return id;
  }
  return null;
}

export function canCraft(save: GameSave, recipeId: string, charId: string): boolean {
  if (isCharGrowthBlocked(save, charId)) return false;
  const r = RECIPE_MAP[recipeId];
  if (!r || !save.owned.includes(charId)) return false;
  if (!canCharUseRecipe(charId, r)) return false;
  const chain = findRecipeLine(charId, recipeId);
  if (chain) {
    const expected = getNextCraftRecipeId(save, charId, chain);
    if (expected !== recipeId) return false;
    if (!isPrevTierMaxEnhanced(save, charId, chain, recipeId)) return false;
  }
  if (save.gold < r.craftGold) return false;
  for (const [mat, n] of Object.entries(r.materials)) {
    if ((save.materials[mat] ?? 0) < n) return false;
  }
  return true;
}

export type CraftResult = 'success' | 'blocked' | 'failed';

export function craftItem(save: GameSave, recipeId: string, charId: string): CraftResult {
  if (!canCraft(save, recipeId, charId)) return 'blocked';
  const r = RECIPE_MAP[recipeId]!;
  const rate = r.craftRate ?? 1;
  save.gold -= r.craftGold;
  if (rate < 1 && Math.random() > rate) return 'failed';
  for (const [mat, n] of Object.entries(r.materials)) {
    save.materials[mat] = (save.materials[mat] ?? 0) - n;
  }
  const prevItem = getItemForCharSlot(save, charId, r.slot);
  const carriedAwaken = prevItem?.grade === 'ur' && (prevItem.awakenLevel ?? 0) >= 3 ? 1 : 0;
  upgradeReplaceLowerTiers(save, charId, recipeId);
  const uid = newItemUid();
  save.bag.push({
    uid, id: r.id, grade: r.grade, slot: r.slot, level: 0,
    ...(carriedAwaken > 0 ? { awakenLevel: carriedAwaken } : {}),
  });
  equipItem(save, charId, uid);
  return 'success';
}

export function canEnhance(save: GameSave, uid: string): boolean {
  const owner = getEquipOwnerCharId(save, uid);
  if (owner && isCharGrowthBlocked(save, owner)) return false;
  const item = save.bag.find(b => b.uid === uid);
  if (!item) return false;
  const maxLv = getMaxEnhanceForGrade(item.grade);
  if (item.level >= maxLv) return false;
  const cost = enhanceCost(save, item.level, item.grade);
  if (save.gold < cost.gold) return false;
  for (const [mat, n] of Object.entries(cost.mats)) {
    if ((save.materials[mat] ?? 0) < n) return false;
  }
  return true;
}

export function enhanceItem(save: GameSave, uid: string): boolean {
  if (!canEnhance(save, uid)) return false;
  const item = save.bag.find(b => b.uid === uid)!;
  const cost = enhanceCost(save, item.level, item.grade);
  save.gold -= cost.gold;
  for (const [mat, n] of Object.entries(cost.mats)) {
    save.materials[mat] = (save.materials[mat] ?? 0) - n;
  }
  item.level++;
  return true;
}

export function equipItem(save: GameSave, charId: string, uid: string): boolean {
  const item = save.bag.find(b => b.uid === uid);
  const st = save.chars[charId];
  if (!item || !st || !save.owned.includes(charId)) return false;
  const recipe = RECIPE_MAP[item.id];
  if (!recipe || !canCharUseRecipe(charId, recipe)) return false;

  const targetSlot = recipe.slot;
  item.slot = targetSlot;

  clearUidFromAllEquipped(save, uid);

  const prevUid = st.equipped[targetSlot];
  if (prevUid && prevUid !== uid) {
    delete st.equipped[targetSlot];
  }

  st.equipped[targetSlot] = uid;
  return true;
}

export function unequipItem(save: GameSave, charId: string, slot: string): void {
  const st = save.chars[charId];
  if (st?.equipped[slot as keyof typeof st.equipped]) {
    delete st.equipped[slot as keyof typeof st.equipped];
  }
}

export function sanitizeEquipment(save: GameSave) {
  normalizeBagItemSlots(save);
  for (const item of save.bag) {
    const maxLv = getMaxEnhanceForGrade(item.grade);
    if (item.level > maxLv) item.level = maxLv;
  }
  for (const charId of save.owned) {
    const st = save.chars[charId];
    if (!st) continue;
    for (const [slot, uid] of Object.entries(st.equipped)) {
      if (!uid) continue;
      const item = save.bag.find(b => b.uid === uid);
      const recipe = item ? RECIPE_MAP[item.id] : undefined;
      if (!recipe || !canCharUseRecipe(charId, recipe) || recipe.slot !== slot) {
        delete st.equipped[slot as keyof typeof st.equipped];
      }
    }
  }
}

export function getEquipStats(save: GameSave, charId: string) {
  const st = save.chars[charId];
  if (!st) return { atk: 0, def: 0, hp: 0, atkSpd: 0, crit: 0 };
  let atk = 0, def = 0, hp = 0, atkSpd = 0, crit = 0;
  for (const uid of Object.values(st.equipped)) {
    if (!uid) continue;
    const item = save.bag.find(b => b.uid === uid);
    if (!item) continue;
    const r = RECIPE_MAP[item.id];
    if (!r) continue;
    const mult = enhanceBonus(item.level, item.grade) * getAwakenBonus(item.awakenLevel ?? 0);
    atk += Math.floor(r.atk * mult);
    def += Math.floor(r.def * mult);
    hp += Math.floor(r.hp * mult);
    atkSpd += r.atkSpd * mult * 0.32;
    crit += r.crit * mult;
  }
  return { atk, def, hp, atkSpd, crit };
}

export function getRecipeForItem(itemId: string): EquipRecipe | undefined {
  return RECIPE_MAP[itemId];
}

export function addMaterial(save: GameSave, mat: string, amount: number) {
  addMaterialCapped(save, mat, amount);
}

export function dismantleItem(save: GameSave, uid: string): boolean {
  const idx = save.bag.findIndex(b => b.uid === uid);
  if (idx < 0) return false;
  const item = save.bag[idx]!;
  const r = RECIPE_MAP[item.id];
  if (!r) return false;

  clearUidFromAllEquipped(save, uid);

  save.bag.splice(idx, 1);
  addMaterial(save, 'iron_ore', 2 + Math.floor(item.level / 2));
  addMaterial(save, 'wood_chip', 1 + Math.floor(item.level / 4));
  if (item.level >= 3) {
    addMaterial(save, 'magic_dust', 1);
    addMaterial(save, 'beast_fang', 1);
  }
  return true;
}
