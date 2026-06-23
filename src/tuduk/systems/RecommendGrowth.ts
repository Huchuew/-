import type { GameSave, EquipSlot } from '../types';
import { RECIPE_MAP } from '../data/equipment';
import { slotToEquipCategory, type EquipCategory } from '../data/equipmentProgress';
import { getCharGrowth } from '../data/growthTrees';
import { canEnhance, enhanceItem, enhanceCost } from './EquipmentSystem';
import { goldLevelUpCost, expToLevel } from './StatCalculator';
import {
  attemptLearn, canAttemptLearn, getLearnRate, getGrowthFails,
} from './GrowthSystem';
import { getBoostedLearnRate } from './GemShop';
import { canUpgradeAgility, upgradeAgilityBundle } from './AgilitySystem';
import { onGrowthAction } from './OnboardingSystem';
import { formatShortageHint, getCostShortage } from './materialShortage';
import { isCharGrowthBlocked } from './PrestigeGateSystem';
import { isPrestigeNodeId } from '../data/prestigeBranchBuilder';

export type RecommendKind = 'skill' | 'level' | 'enhance' | 'agility';

export interface GrowthRecommendation {
  kind: RecommendKind;
  charId: string;
  nodeId?: string;
  uid?: string;
  equipCategory?: EquipCategory;
  label: string;
  detail: string;
  goldCost: number;
}

function findBestSkill(save: GameSave): GrowthRecommendation | null {
  let best: GrowthRecommendation | null = null;
  let bestScore = -1;

  for (const charId of save.owned) {
    const st = save.chars[charId];
    if (!st) continue;
    for (const node of getCharGrowth(charId)) {
      if (node.branchGroup || isPrestigeNodeId(node.id)) continue;
      if (!canAttemptLearn(save, charId, node)) continue;
      const rate = getBoostedLearnRate(save, charId, node.id);
      const score = rate * 100 - node.cost / Math.max(1, save.gold) * 20;
      if (score <= bestScore) continue;
      bestScore = score;
      best = {
        kind: 'skill',
        charId,
        nodeId: node.id,
        label: `${node.name} 습득`,
        detail: `성공률 약 ${Math.round(rate * 100)}% · 🪙${node.cost.toLocaleString()}`,
        goldCost: node.cost,
      };
    }
  }
  return best;
}

function findLevelUp(save: GameSave): GrowthRecommendation | null {
  for (const charId of save.party) {
    if (isCharGrowthBlocked(save, charId)) continue;
    const st = save.chars[charId];
    if (!st) continue;
    const cost = goldLevelUpCost(st.level);
    if (save.gold >= cost && cost <= save.gold * 0.45) {
      return {
        kind: 'level',
        charId,
        label: '빠른 레벨업',
        detail: `Lv.${st.level} → 즉시 성장 · 🪙${cost.toLocaleString()}`,
        goldCost: cost,
      };
    }
  }
  return null;
}

function findEnhance(save: GameSave): GrowthRecommendation | null {
  for (const charId of save.party) {
    if (isCharGrowthBlocked(save, charId)) continue;
    const st = save.chars[charId];
    if (!st) continue;
    for (const [slot, uid] of Object.entries(st.equipped)) {
      if (!uid || !canEnhance(save, uid)) continue;
      const item = save.bag.find(b => b.uid === uid);
      if (!item) continue;
      const recipe = RECIPE_MAP[item.id];
      return {
        kind: 'enhance',
        charId,
        uid,
        equipCategory: slotToEquipCategory((recipe?.slot ?? slot) as EquipSlot),
        label: `${recipe?.name ?? item.id} 강화`,
        detail: `+${item.level} → +${item.level + 1} · 장비 탭에서 확인`,
        goldCost: 0,
      };
    }
  }
  return null;
}

function findAgility(save: GameSave): GrowthRecommendation | null {
  for (const charId of save.party) {
    if (isCharGrowthBlocked(save, charId)) continue;
    if (canUpgradeAgility(save, charId)) {
      return {
        kind: 'agility',
        charId,
        label: '민첩성 강화',
        detail: '무료 · 공속·장비 소폭 상승',
        goldCost: 0,
      };
    }
  }
  return null;
}

export function getGrowthRecommendation(save: GameSave): GrowthRecommendation | null {
  return findBestSkill(save)
    ?? findEnhance(save)
    ?? findAgility(save);
}

export function applyGrowthRecommendation(save: GameSave): { ok: boolean; message: string; rec: GrowthRecommendation | null } {
  const rec = getGrowthRecommendation(save);
  if (!rec) return { ok: false, message: '지금은 추천할 강화가 없어요', rec: null };

  switch (rec.kind) {
    case 'skill': {
      const node = getCharGrowth(rec.charId).find(n => n.id === rec.nodeId);
      if (node?.branchGroup) {
        return { ok: false, message: '전직은 아래에서 직접 선택해 주세요', rec };
      }
      const result = attemptLearn(save, rec.charId, rec.nodeId!);
      if (result.prestigeClaim && result.learned) {
        return { ok: true, message: `⚔️ ${rec.label} — 전직 완료!`, rec };
      }
      if (result.goldSpent <= 0 && !result.learned) {
        const node = getCharGrowth(rec.charId).find(n => n.id === rec.nodeId);
        const hint = node
          ? formatShortageHint(getCostShortage(save, node.materials, node.cost))
          : '';
        return { ok: false, message: hint || '재료 또는 골드가 부족해요', rec };
      }
      if (result.learned) return { ok: true, message: `✨ ${rec.label} 성공!`, rec };
      const next = Math.round((getLearnRate(
        getCharGrowth(rec.charId).find(n => n.id === rec.nodeId)!,
        getGrowthFails(save.chars[rec.charId]!, rec.nodeId!) + 1,
      )) * 100);
      return { ok: true, message: `실패… 다음 확률 약 ${next}%`, rec };
    }
    case 'level': {
      const st = save.chars[rec.charId];
      const cost = goldLevelUpCost(st.level);
      if (save.gold < cost) return { ok: false, message: '골드가 부족해요', rec };
      save.gold -= cost;
      st.exp += expToLevel(st.level);
      while (st.exp >= expToLevel(st.level)) {
        st.exp -= expToLevel(st.level);
        st.level++;
      }
      onGrowthAction(save);
      return { ok: true, message: `⬆️ Lv.${st.level} 달성!`, rec };
    }
    case 'enhance': {
      if (!enhanceItem(save, rec.uid!)) {
        const item = save.bag.find(b => b.uid === rec.uid);
        let message = '강화 재료가 부족해요';
        if (item) {
          const cost = enhanceCost(save, item.level, item.grade);
          const hint = formatShortageHint(getCostShortage(save, cost.mats, cost.gold));
          if (hint) message = hint;
        }
        return { ok: false, message, rec };
      }
      return { ok: true, message: `⚔️ ${rec.label} 완료!`, rec };
    }
    case 'agility': {
      const before = save.chars[rec.charId]?.level ?? 0;
      const res = upgradeAgilityBundle(save, rec.charId);
      if (!res.ok) return { ok: false, message: '민첩 강화 쿨다운 중이에요', rec };
      void before;
      return { ok: true, message: '🏃 민첩성 강화 완료!', rec };
    }
    default:
      return { ok: false, message: '알 수 없는 추천', rec };
  }
}
