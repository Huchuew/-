import type { CharState, GameSave, GrowthNode } from '../types';
import { getCharGrowth } from '../data/growthTrees';
import {
  getBranchChoiceOptions as getForkBranchOptions,
  getNextNodeInTree, getPrestigeMilestoneInfo,
  isNodeOwned,
  type BranchChoiceOption,
  type PrestigeMilestoneInfo,
} from './GrowthSystem';
import { isPrestigeNodeId, getPrestigeBranchGroup } from '../data/prestigeBranchBuilder';
import { PRESTIGE_TIER_LEVELS } from '../data/prestigeJobBalance';

export interface PrestigeGateState {
  charId: string;
  milestone: PrestigeMilestoneInfo;
  kind: 'branch' | 'node';
  options?: BranchChoiceOption[];
  node?: GrowthNode;
  tier: 1 | 2 | 3;
}

function getPrestigeTreeNodes(charId: string): GrowthNode[] {
  return getCharGrowth(charId).filter(n => n.branchGroup);
}

function countOwnedPrestigeTiers(st: CharState, charId: string): number {
  const nodes = getPrestigeTreeNodes(charId);
  const tiers = new Set<number>();
  for (const n of nodes) {
    if (isNodeOwned(st, n.id) && n.branchTier) tiers.add(n.branchTier);
  }
  return tiers.size;
}

function findPendingPrestigeFork(st: CharState, charId: string): PrestigeGateState | null {
  const nodes = getPrestigeTreeNodes(charId);
  if (!nodes.length) return null;
  const milestone = getPrestigeMilestoneInfo(st, charId);
  if (!milestone || milestone.allDone || !milestone.ready) return null;

  for (const tier of [1, 2, 3] as const) {
    const group = getPrestigeBranchGroup(charId, tier);
    const tierNodes = nodes.filter(n => n.branchGroup === group);
    if (!tierNodes.length) continue;
    if (tierNodes.some(n => isNodeOwned(st, n.id))) continue;

    const reqLevel = PRESTIGE_TIER_LEVELS[tier - 1] ?? 100;
    if (st.level < reqLevel) return null;

    if (tier > 1) {
      const prevOwned = nodes.some(n => n.branchGroup === getPrestigeBranchGroup(charId, (tier - 1) as 1 | 2 | 3)
        && isNodeOwned(st, n.id));
      if (!prevOwned) return null;
    }

    const options = getForkBranchOptions(st, tierNodes);
    if (options.length >= 2) {
      return {
        charId,
        milestone,
        kind: 'branch',
        options,
        tier,
      };
    }
    const next = tierNodes.find(n => !isNodeOwned(st, n.id));
    if (next) {
      return { charId, milestone, kind: 'node', node: next, tier };
    }
  }
  return null;
}

export function getPrestigeGate(st: CharState | undefined, charId: string): PrestigeGateState | null {
  if (!st) return null;
  return findPendingPrestigeFork(st, charId);
}

export function isCharPrestigeGated(st: CharState | undefined, charId: string): boolean {
  return getPrestigeGate(st, charId) != null;
}

export function findFirstPrestigeGateChar(save: GameSave): string | null {
  for (const id of save.owned) {
    if (getPrestigeGate(save.chars[id], id)) return id;
  }
  return null;
}

export function isPrestigeGateNode(st: CharState, charId: string, node: GrowthNode): boolean {
  const gate = getPrestigeGate(st, charId);
  if (!gate || !node.branchGroup) return false;
  if (gate.kind === 'branch') {
    return gate.options?.some(o => o.node.id === node.id) ?? false;
  }
  return gate.node?.id === node.id;
}

export function canAttemptLearnDuringGate(st: CharState, charId: string, node: GrowthNode): boolean {
  if (!isCharPrestigeGated(st, charId)) return true;
  return isPrestigeGateNode(st, charId, node);
}

export function isCharGrowthBlocked(save: GameSave, charId: string): boolean {
  return isCharPrestigeGated(save.chars[charId], charId);
}

export function claimPrestigeNode(
  save: GameSave,
  charId: string,
  nodeId: string,
): { learned: boolean; tier: number } {
  const node = getCharGrowth(charId).find(n => n.id === nodeId);
  const st = save.chars[charId];
  if (!node || !st || !node.branchGroup) return { learned: false, tier: 0 };
  if (!isPrestigeGateNode(st, charId, node)) return { learned: false, tier: 0 };
  if (isNodeOwned(st, nodeId)) return { learned: false, tier: node.branchTier ?? 0 };

  st.unlockedNodes.push(nodeId);
  if (node.branchGroup && node.branchPath) {
    if (!st.growthBranches) st.growthBranches = {};
    st.growthBranches[node.branchGroup] = node.branchPath;
  }
  if (isPrestigeNodeId(node.id)) {
    st.prestige = countOwnedPrestigeTiers(st, charId);
  }
  if (st.growthFails?.[nodeId]) delete st.growthFails[nodeId];
  return { learned: true, tier: node.branchTier ?? 1 };
}

export function formatPrestigeGateBanner(gate: PrestigeGateState): string {
  const tierLabel = gate.tier === 1 ? '2차' : gate.tier === 2 ? '3차' : '4차';
  if (gate.kind === 'branch') {
    return `Lv.${gate.milestone.reqLevel} — ${tierLabel} 전직 경로를 선택해야 다른 성장을 진행할 수 있습니다.`;
  }
  return `${gate.milestone.label} — 「${gate.node?.name ?? '전직'}」 습득 후 장비·스킬·레벨업이 다시 가능합니다.`;
}
