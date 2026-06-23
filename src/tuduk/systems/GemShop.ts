import type { GameSave } from '../types';
import { MATERIAL_LABELS } from '../data/equipment';
import { CHAR_MAP } from '../data/characters';
import {
  hasRecruitGuaranteeFor, isOnBulletin, reconcileRecruitGuarantee, rerollBulletinHeroes,
} from './BulletinBoardSystem';
import { getLearnRate, getGrowthFails } from './GrowthSystem';
import { GROWTH_NODES } from '../data/growthTrees';
import { addMaterial } from './EquipmentSystem';
import { canRerollAllAugments, rerollAllAugments } from './AugmentSystem';

export const GEM_COST = {
  recruitGuarantee: 28,
  growthBoost: 8,
  freePotion: 7,
  bulletinReroll: 6,
  speedBoost: 5,
  dispatchRush: 8,
  materialCrate: 10,
  augmentRerollAll: 100,
} as const;

const SPEED_BOOST_GEM_MS = 30 * 60 * 1000;

const GEM_CRATE_POOL = [
  { mat: 'iron_ore', qty: [2, 5] },
  { mat: 'wood_chip', qty: [3, 6] },
  { mat: 'slime_gel', qty: [2, 4] },
  { mat: 'healing_herb', qty: [1, 3] },
  { mat: 'beast_fang', qty: [1, 2] },
  { mat: 'magic_dust', qty: [1, 2] },
  { mat: 'spirit_thread', qty: [1, 2] },
] as const;

export function canPurchaseRecruitGuarantee(save: GameSave, charId: string): boolean {
  reconcileRecruitGuarantee(save);
  const def = CHAR_MAP[charId];
  if (!def || save.owned.includes(charId)) return false;
  if (!isOnBulletin(save, charId)) return false;
  if (save.gems < GEM_COST.recruitGuarantee) return false;
  if (save.pendingRecruitGuarantee && save.pendingRecruitGuarantee !== charId) return false;
  if (hasRecruitGuaranteeFor(save, charId)) return false;
  return true;
}

/** 젬 소모 — 다음 🪙 영입 시도를 100% 성공으로 예약 */
export function purchaseRecruitGuarantee(save: GameSave, charId: string): boolean {
  if (!canPurchaseRecruitGuarantee(save, charId)) return false;
  save.gems -= GEM_COST.recruitGuarantee;
  save.pendingRecruitGuarantee = charId;
  return true;
}

/** @deprecated purchaseRecruitGuarantee 사용 */
export function canGemRecruit(save: GameSave, charId: string): boolean {
  return canPurchaseRecruitGuarantee(save, charId);
}

/** @deprecated purchaseRecruitGuarantee 사용 */
export function tryGemRecruit(save: GameSave, charId: string): boolean {
  return purchaseRecruitGuarantee(save, charId);
}

export function canGemGrowthBoost(save: GameSave, charId: string, nodeId: string): boolean {
  if (save.gems < GEM_COST.growthBoost) return false;
  const node = GROWTH_NODES.find(n => n.id === nodeId);
  const st = save.chars[charId];
  if (!node || !st || st.unlockedNodes.includes(nodeId)) return false;
  return save.gold >= node.cost;
}

export function getBoostedLearnRate(save: GameSave, charId: string, nodeId: string): number {
  const node = GROWTH_NODES.find(n => n.id === nodeId);
  const st = save.chars[charId];
  if (!node || !st) return 0;
  const fails = getGrowthFails(st, nodeId);
  const boosted = save.pendingGrowthBoost === nodeId;
  const base = getLearnRate(node, fails);
  return boosted ? Math.min(0.95, base + 0.3) : base;
}

export function tryGemGrowthBoost(save: GameSave, charId: string, nodeId: string): boolean {
  if (!canGemGrowthBoost(save, charId, nodeId)) return false;
  save.gems -= GEM_COST.growthBoost;
  save.pendingGrowthBoost = nodeId;
  return true;
}

export function consumeGrowthBoost(save: GameSave, nodeId: string): boolean {
  if (save.pendingGrowthBoost !== nodeId) return false;
  save.pendingGrowthBoost = null;
  return true;
}

export function canGemPotion(save: GameSave): boolean {
  return save.gems >= GEM_COST.freePotion;
}

export function spendGemPotion(save: GameSave): boolean {
  if (!canGemPotion(save)) return false;
  save.gems -= GEM_COST.freePotion;
  return true;
}

export function canGemBulletinReroll(save: GameSave): boolean {
  return save.gems >= GEM_COST.bulletinReroll;
}

export function tryGemBulletinReroll(save: GameSave): boolean {
  if (!canGemBulletinReroll(save)) return false;
  if (!rerollBulletinHeroes(save)) return false;
  save.gems -= GEM_COST.bulletinReroll;
  reconcileRecruitGuarantee(save);
  return true;
}

export function canGemSpeedBoost(save: GameSave): boolean {
  return save.gems >= GEM_COST.speedBoost;
}

export function tryGemSpeedBoost(save: GameSave): boolean {
  if (!canGemSpeedBoost(save)) return false;
  save.gems -= GEM_COST.speedBoost;
  const now = Date.now();
  const base = Math.max(now, save.speedBoostUntil ?? 0);
  save.speedBoostUntil = base + SPEED_BOOST_GEM_MS;
  return true;
}

export function canGemDispatchRush(save: GameSave): boolean {
  return save.gems >= GEM_COST.dispatchRush && !!save.tycoon?.dispatch;
}

export function tryGemDispatchRush(save: GameSave): boolean {
  if (!canGemDispatchRush(save)) return false;
  save.gems -= GEM_COST.dispatchRush;
  save.tycoon!.dispatch!.endsAt = Date.now();
  return true;
}

export function canGemMaterialCrate(save: GameSave): boolean {
  return save.gems >= GEM_COST.materialCrate;
}

export function tryGemMaterialCrate(save: GameSave): { ok: boolean; message: string } {
  if (!canGemMaterialCrate(save)) return { ok: false, message: '젬 부족' };
  save.gems -= GEM_COST.materialCrate;
  const picks = 3 + Math.floor(Math.random() * 3);
  const lines: string[] = [];
  for (let i = 0; i < picks; i++) {
    const entry = GEM_CRATE_POOL[Math.floor(Math.random() * GEM_CRATE_POOL.length)]!;
    const qty = entry.qty[0] + Math.floor(Math.random() * (entry.qty[1] - entry.qty[0] + 1));
    addMaterial(save, entry.mat, qty);
    lines.push(`${MATERIAL_LABELS[entry.mat] ?? entry.mat}×${qty}`);
  }
  return { ok: true, message: `📦 ${lines.join(', ')}` };
}

export function canGemAugmentRerollAll(save: GameSave): boolean {
  return canRerollAllAugments(save) && save.gems >= GEM_COST.augmentRerollAll;
}

/** 젬 100 — 보유 증강 전체 초기화 후 층별 재선택 큐 반환 */
export function tryGemAugmentRerollAll(save: GameSave): number[] | null {
  if (!canGemAugmentRerollAll(save)) return null;
  const floors = rerollAllAugments(save);
  if (!floors.length) return null;
  save.gems -= GEM_COST.augmentRerollAll;
  return floors;
}
