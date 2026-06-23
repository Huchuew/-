import type { CookType, GameSave } from '../types';
import { CHAR_MAP } from '../data/characters';
import { GROWTH_NODES } from '../data/growthTrees';
import { getKitchenCookDurationMult } from './TycoonExpansionSystem';
import { softenExpeditionDebuffsOnCook } from './partyExpeditionMods';

const COOK_DURATION_MS = 5 * 60 * 1000;

const COOK_DEF: Record<CookType, { gold: number; label: string; atk: number; spd: number; exp: number; reqNode?: string }> = {
  bbq: { gold: 850, label: '삼겹살 정식', atk: 1.15, spd: 1, exp: 1, reqNode: 'hd_cook_2' },
  spicy: { gold: 850, label: '매운 짬뽕', atk: 1, spd: 1.12, exp: 1, reqNode: 'hd_cook_3' },
  feast: { gold: 2_200, label: '만찬', atk: 1.12, spd: 1.1, exp: 1.2, reqNode: 'hd_cook_5' },
};

export function hasChef(save: GameSave): boolean {
  return save.owned.includes('hidden')
    && (save.party.includes('hidden') || save.supportSlot === 'hidden');
}

export function canCook(save: GameSave, type: CookType): boolean {
  if (!hasChef(save)) return false;
  const def = COOK_DEF[type];
  if (def.reqNode && !save.chars.hidden?.unlockedNodes.includes(def.reqNode)) return false;
  if (save.gold < def.gold) return false;
  if (save.cookBuffUntil > Date.now()) return false;
  return true;
}

export function startCook(save: GameSave, type: CookType): boolean {
  if (!canCook(save, type)) return false;
  const def = COOK_DEF[type];
  save.gold -= def.gold;
  save.cookBuffType = type;
  save.cookBuffUntil = Date.now() + Math.floor(COOK_DURATION_MS * getKitchenCookDurationMult(save));
  save.stats.cooksDone++;
  softenExpeditionDebuffsOnCook(save);
  return true;
}

export function getCookBuffMult(save: GameSave): { atk: number; spd: number; exp: number } {
  const base = { atk: 1, spd: 1, exp: 1 };
  if (save.cookBuffUntil <= Date.now() || !save.cookBuffType) return base;
  const c = COOK_DEF[save.cookBuffType];
  return { atk: c.atk, spd: c.spd, exp: c.exp };
}

export function getCookRemainingSec(save: GameSave): number {
  return Math.max(0, Math.floor((save.cookBuffUntil - Date.now()) / 1000));
}

export function getCookBuffInfo(save: GameSave): { label: string; desc: string } | null {
  if (save.cookBuffUntil <= Date.now() || !save.cookBuffType) return null;
  const c = COOK_DEF[save.cookBuffType];
  const parts: string[] = [];
  if (c.atk > 1) parts.push(`공격 +${Math.round((c.atk - 1) * 100)}%`);
  if (c.spd > 1) parts.push(`공속 +${Math.round((c.spd - 1) * 100)}%`);
  if (c.exp > 1) parts.push(`경험치 +${Math.round((c.exp - 1) * 100)}%`);
  return { label: c.label, desc: parts.join(' · ') || c.label };
}

export function getChefOfflineBonus(save: GameSave): number {
  let bonus = 1;
  if (save.party.includes('hidden') || save.supportSlot === 'hidden') bonus = 1.3;
  const st = save.chars.hidden;
  if (st) {
    for (const nid of st.unlockedNodes) {
      const n = GROWTH_NODES.find(x => x.id === nid);
      if (n?.offlineBonus) bonus += n.offlineBonus;
    }
  }
  return bonus;
}

export function getCookRecipes(save: GameSave) {
  return Object.entries(COOK_DEF).map(([type, d]) => ({
    type: type as CookType,
    ...d,
    unlocked: !d.reqNode || save.chars.hidden?.unlockedNodes.includes(d.reqNode),
  }));
}

export function getChefName() {
  return CHAR_MAP.hidden?.name ?? '요리사';
}
