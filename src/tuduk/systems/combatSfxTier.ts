import type { EquipGrade, GameSave } from '../types';
import { getAgilityLevel } from './AgilitySystem';

const GRADE_TIER: Record<EquipGrade, number> = {
  f: 0, e: 0, d: 1, c: 1, b: 2, a: 2, s: 3, sr: 3, ssr: 3, ur: 3,
  u1: 3, u2: 4, u3: 4, u4: 4, u5: 5, u6: 5, u7: 5, u8: 6, u9: 6, ua: 6,
};

function scoreEquip(
  save: GameSave,
  uid: string | undefined,
): number {
  if (!uid) return 0;
  const item = save.bag.find(b => b.uid === uid);
  if (!item) return 0;
  let s = GRADE_TIER[item.grade] ?? 0;
  s += Math.floor(item.level / 4);
  s += item.awakenLevel ?? 0;
  return s;
}

/** 0=약함 ~ 6=강함 — 장비·스킬·전직·민첩 성장에 따른 SFX/VFX 티어 */
export function getCharCombatPowerTier(save: GameSave, charId: string): number {
  const st = save.chars[charId];
  if (!st) return 0;

  let score = 0;
  score += scoreEquip(save, st.equipped.weapon);
  score += Math.floor(scoreEquip(save, st.equipped.armor) * 0.6);
  score += Math.floor(scoreEquip(save, st.equipped.ring) * 0.25);
  score += Math.floor(scoreEquip(save, st.equipped.necklace) * 0.2);
  score += Math.floor(scoreEquip(save, st.equipped.relic) * 0.2);
  score += Math.min(2, Math.floor(st.unlockedNodes.length / 3));
  score += Math.min(2, st.prestige * 2);
  score += Math.min(1, Math.floor(getAgilityLevel(st) / 15));
  return Math.min(6, score);
}

export function getTouchSfxTier(save: GameSave): number {
  let sum = 0;
  for (const id of save.party) {
    sum += getCharCombatPowerTier(save, id);
  }
  return Math.min(6, Math.floor(sum / Math.max(1, save.party.length)));
}

/** 성장·제작 UI용 — 노드 난이도·캐릭터 티어 혼합 */
export function getGrowthSfxTier(save: GameSave, charId: string, nodeTier = 1): number {
  const base = getCharCombatPowerTier(save, charId);
  const nodeBoost = Math.min(2, Math.floor(nodeTier / 2));
  return Math.min(6, base + nodeBoost);
}
