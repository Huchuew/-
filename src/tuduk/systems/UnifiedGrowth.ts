import type { GameSave } from '../types';
import { CHAR_MAP } from '../data/characters';
import { getCharGrowth } from '../data/growthTrees';
import { getPrestigeGate, isCharGrowthBlocked } from './PrestigeGateSystem';
import {
  attemptLearn, canAttemptLearn, formatPityBonus, getCharGrowthTrees, getGrowthFails,
  getGrowthLineProgress, getLearnRate, isNodeLocked,
} from './GrowthSystem';
import { goldLevelUpCost, expToLevel } from './StatCalculator';
import { onGrowthAction } from './OnboardingSystem';
import { canUpgradeAgility, upgradeAgilityBundle } from './AgilitySystem';

export type UnifiedGrowthKind = 'prestige' | 'skill' | 'level' | 'agility' | 'none';

export interface UnifiedGrowthAction {
  kind: UnifiedGrowthKind;
  charId: string;
  nodeId?: string;
  title: string;
  detail: string;
  costGold: number;
  canDo: boolean;
  successPct?: number;
}

function findNextSkill(save: GameSave, charId: string): UnifiedGrowthAction | null {
  if (isCharGrowthBlocked(save, charId)) return null;
  const st = save.chars[charId];
  if (!st) return null;
  const nodes = getCharGrowth(charId);
  for (const tree of getCharGrowthTrees(charId)) {
    const lp = getGrowthLineProgress(st, tree, nodes);
    if (lp.branchChoices?.length || lp.allDone) continue;
    const n = lp.next;
    if (!n || n.branchGroup || isNodeLocked(st, n)) continue;
    const rate = getLearnRate(n, getGrowthFails(st, n.id));
    const fails = getGrowthFails(st, n.id);
    const pityLine = fails > 0 ? ` · 실패${fails}회 ${formatPityBonus(fails)}` : '';
    return {
      kind: 'skill',
      charId,
      nodeId: n.id,
      title: n.name,
      detail: `${tree} · 성공률 ${Math.round(rate * 100)}%${pityLine}`,
      costGold: n.cost,
      canDo: canAttemptLearn(save, charId, n),
      successPct: Math.round(rate * 100),
    };
  }
  return null;
}

function findLevelAction(save: GameSave, charId: string): UnifiedGrowthAction | null {
  if (isCharGrowthBlocked(save, charId)) return null;
  const st = save.chars[charId];
  if (!st) return null;
  const cost = goldLevelUpCost(st.level);
  return {
    kind: 'level',
    charId,
    title: `레벨 업`,
    detail: `Lv.${st.level} → Lv.${st.level + 1}`,
    costGold: cost,
    canDo: save.gold >= cost,
    successPct: 100,
  };
}

function findAgilityAction(save: GameSave, charId: string): UnifiedGrowthAction | null {
  if (isCharGrowthBlocked(save, charId)) return null;
  if (!canUpgradeAgility(save, charId)) return null;
  return {
    kind: 'agility',
    charId,
    title: '민첩 강화',
    detail: '무료 · 공속·장비 소폭 상승',
    costGold: 0,
    canDo: true,
    successPct: 100,
  };
}

function prestigeBlockedAction(save: GameSave, charId: string): UnifiedGrowthAction {
  const gate = getPrestigeGate(save.chars[charId], charId);
  return {
    kind: 'none',
    charId,
    title: '전직 선택',
    detail: gate
      ? '아래 경로에서 직접 선택해 주세요 (자동 추천 없음)'
      : '전직 완료 후 스킬·레벨 성장 가능',
    costGold: 0,
    canDo: false,
  };
}

/** 현재 캐릭터에 대한 다음 성장 액션 (스킬 → 민첩 · 전직·레벨업은 수동) */
export function getUnifiedGrowthAction(save: GameSave, charId: string): UnifiedGrowthAction {
  if (isCharGrowthBlocked(save, charId)) {
    return prestigeBlockedAction(save, charId);
  }
  const skill = findNextSkill(save, charId);
  if (skill?.canDo) return skill;
  const agi = findAgilityAction(save, charId);
  if (agi) return agi;
  if (skill) return skill;
  const level = findLevelAction(save, charId);
  if (level) return level;
  return {
    kind: 'none',
    charId,
    title: '성장 대기',
    detail: '골드·재료·레벨 조건을 확인하세요',
    costGold: 0,
    canDo: false,
  };
}

export function applyUnifiedGrowth(save: GameSave, charId: string): {
  ok: boolean;
  message: string;
  kind: UnifiedGrowthKind;
  learned?: boolean;
} {
  const action = getUnifiedGrowthAction(save, charId);
  if (!action.canDo) {
    return { ok: false, message: action.detail, kind: action.kind };
  }

  if (action.kind === 'skill') {
    const result = attemptLearn(save, charId, action.nodeId!);
    if (result.prestigeClaim && result.learned) {
      return {
        ok: false,
        kind: 'none',
        message: '전직은 아래 경로에서 직접 선택해 주세요',
      };
    }
    if (result.learned) {
      const node = getCharGrowth(charId).find(n => n.id === action.nodeId);
      return {
        ok: true,
        learned: true,
        kind: 'skill',
        message: `✨ ${node?.name ?? '스킬'} 습득!`,
      };
    }
    if (result.goldSpent > 0 && !result.learned) {
      return { ok: false, kind: 'skill', message: '골드·재료를 확인하세요' };
    }
    return { ok: false, message: '습득 불가', kind: action.kind };
  }

  if (action.kind === 'level') {
    const st = save.chars[charId]!;
    const cost = goldLevelUpCost(st.level);
    if (save.gold < cost) return { ok: false, message: '골드 부족', kind: 'level' };
    save.gold -= cost;
    st.exp += expToLevel(st.level);
    while (st.exp >= expToLevel(st.level)) {
      st.exp -= expToLevel(st.level);
      st.level++;
    }
    onGrowthAction(save);
    return { ok: true, kind: 'level', message: `⬆️ ${CHAR_MAP[charId]?.name} Lv.${st.level}` };
  }

  if (action.kind === 'agility') {
    const res = upgradeAgilityBundle(save, charId);
    return {
      ok: res.ok,
      kind: 'agility',
      message: res.ok ? '민첩 강화 완료' : '민첩 강화 불가',
    };
  }

  return { ok: false, message: '할 수 있는 성장이 없습니다', kind: 'none' };
}
