import type { CharState, GameSave, GrowthNode } from '../types';
import { GROWTH_NODES, getCharGrowth } from '../data/growthTrees';
import { isPrestigeNodeId, getPrestigeBranchGroup } from '../data/prestigeBranchBuilder';
import { PRESTIGE_BRANCH_DEFS } from '../data/prestigeBranchData';
import {
  getPrestigeTierLabel, getPrestigeTierLevel, PRESTIGE_TEASER_LEVEL, PRESTIGE_TIER_LEVELS,
} from '../data/prestigeJobBalance';
import { consumeGrowthBoost, getBoostedLearnRate } from './GemShop';
import { onGrowthAction } from './OnboardingSystem';
import {
  canAttemptLearnDuringGate, claimPrestigeNode, getPrestigeGate, isCharPrestigeGated,
} from './PrestigeGateSystem';

export const PITY_STEP = 0.09;
export const MAX_LEARN_RATE = 0.92;
const EARLY_TIER_BONUS = 0.12;

export function getGrowthFails(st: CharState, nodeId: string): number {
  return st.growthFails?.[nodeId] ?? 0;
}

function nodeTier(node: GrowthNode): number {
  const m = node.id.match(/_(\d+)$/);
  return m ? parseInt(m[1]!, 10) - 1 : 0;
}

export function getLearnRate(node: GrowthNode, failCount: number): number {
  const early = nodeTier(node) <= 1 ? EARLY_TIER_BONUS : 0;
  return Math.min(MAX_LEARN_RATE, node.successRate + failCount * PITY_STEP + early);
}

export function formatPityBonus(failCount: number): string {
  if (failCount <= 0) return '';
  return `+${Math.round(failCount * PITY_STEP * 100)}%`;
}

export function isNodeOwned(st: CharState, nodeId: string): boolean {
  return st.unlockedNodes.includes(nodeId);
}

export function getChosenBranchPath(st: CharState, branchGroup: string): string | null {
  if (st.growthBranches?.[branchGroup]) return st.growthBranches[branchGroup]!;
  for (const nid of st.unlockedNodes) {
    const n = GROWTH_NODES.find(x => x.id === nid);
    if (n?.branchGroup === branchGroup && n.branchPath) return n.branchPath;
  }
  return null;
}

export function isBranchBlocked(st: CharState, node: GrowthNode): boolean {
  if (!node.branchGroup || !node.branchPath) return false;
  const chosen = getChosenBranchPath(st, node.branchGroup);
  if (chosen && chosen !== node.branchPath) return true;
  if (isPrestigeNodeId(node.id)) {
    const activePath = getActivePrestigePath(st, node.charId);
    if (activePath && !nodeMatchesActivePath(node, activePath)) return true;
  }
  return false;
}

export function isBranchTree(nodes: GrowthNode[]): boolean {
  return nodes.some(n => n.branchGroup);
}

export function getActivePrestigePath(st: CharState, charId: string): string | null {
  for (const tier of [3, 2, 1] as const) {
    const p = getChosenBranchPath(st, getPrestigeBranchGroup(charId, tier));
    if (p) return p;
  }
  return null;
}

export function nodeMatchesActivePath(node: GrowthNode, activePath: string | null): boolean {
  if (!activePath || !node.branchPath) return true;
  return node.branchPath === activePath || node.branchPath.startsWith(activePath);
}

export function isNodeLocked(st: CharState, node: GrowthNode): boolean {
  if (isNodeOwned(st, node.id)) return false;
  if (st.level < node.reqLevel) return true;
  if (node.reqNode && !st.unlockedNodes.includes(node.reqNode)) return true;
  if (isBranchBlocked(st, node)) return true;
  return false;
}

function sortGrowthNodes(nodes: GrowthNode[]): GrowthNode[] {
  return [...nodes].sort((a, b) => {
    if (a.branchTier !== b.branchTier) return (a.branchTier ?? 99) - (b.branchTier ?? 99);
    return a.reqLevel - b.reqLevel || a.id.localeCompare(b.id);
  });
}

export function getNextNodeInTree(st: CharState, treeNodes: GrowthNode[]): GrowthNode | null {
  if (!isBranchTree(treeNodes)) {
    const sorted = sortGrowthNodes(treeNodes);
    for (const n of sorted) {
      if (!isNodeOwned(st, n.id)) return n;
    }
    return null;
  }

  const charId = treeNodes[0]?.charId ?? '';
  for (const tier of [1, 2, 3] as const) {
    const group = getPrestigeBranchGroup(charId, tier);
    const tierNodes = treeNodes.filter(n => n.branchGroup === group);
    if (!tierNodes.length) continue;
    if (tierNodes.some(n => isNodeOwned(st, n.id))) continue;

    const pending = tierNodes.filter(n => !isNodeOwned(st, n.id) && !isNodeLocked(st, n));
    if (pending.length >= 2 && !getChosenBranchPath(st, group)) return pending[0]!;
    if (pending.length === 1) return pending[0]!;
    if (pending.length >= 2) return pending[0]!;
  }
  return null;
}

export interface BranchChoiceOption {
  pathKey: string;
  pathLabel: string;
  node: GrowthNode;
}

export function getBranchChoiceOptions(st: CharState, treeNodes: GrowthNode[]): BranchChoiceOption[] {
  if (!treeNodes.length) return [];
  const branchGroup = treeNodes[0]?.branchGroup;
  if (!branchGroup || getChosenBranchPath(st, branchGroup)) return [];

  const charDef = PRESTIGE_BRANCH_DEFS.find(d => d.charId === treeNodes[0]?.charId);
  return treeNodes
    .filter(n => !isNodeOwned(st, n.id) && !isNodeLocked(st, n))
    .map(n => {
      const rootKey = n.branchPath?.charAt(0);
      const pathDef = charDef?.paths.find(p => p.key === rootKey);
      const label = n.name;
      return { pathKey: n.branchPath!, pathLabel: label, node: n };
    });
}

export interface GrowthLineProgress {
  tree: string;
  step: number;
  total: number;
  completed: { id: string; name: string }[];
  next: GrowthNode | null;
  allDone: boolean;
  isBranch?: boolean;
  chosenPath?: string | null;
  branchChoices?: BranchChoiceOption[];
}

export function getGrowthLineProgress(st: CharState, tree: string, nodes: GrowthNode[]): GrowthLineProgress {
  const treeNodes = nodes.filter(n => n.tree === tree);
  const charId = treeNodes[0]?.charId ?? '';
  const activePath = getActivePrestigePath(st, charId);
  const relevant = isBranchTree(treeNodes) && activePath
    ? treeNodes.filter(n => nodeMatchesActivePath(n, activePath))
    : treeNodes;
  const completed = relevant
    .filter(n => isNodeOwned(st, n.id))
    .map(n => ({ id: n.id, name: n.name }));

  let branchChoices: BranchChoiceOption[] | undefined;
  for (const tier of [1, 2, 3] as const) {
    const group = getPrestigeBranchGroup(charId, tier);
    const tierNodes = treeNodes.filter(n => n.branchGroup === group);
    if (!tierNodes.length || tierNodes.some(n => isNodeOwned(st, n.id))) continue;
    if (getChosenBranchPath(st, group)) continue;
    const opts = getBranchChoiceOptions(st, tierNodes.filter(n => !isNodeLocked(st, n)));
    if (opts.length >= 2) {
      branchChoices = opts;
      break;
    }
  }

  const next = getNextNodeInTree(st, treeNodes);
  const branchTotal = isBranchTree(treeNodes) ? 3 : treeNodes.length;
  const chosen = activePath;
  return {
    tree,
    step: completed.length + (next && !isNodeOwned(st, next.id) ? 1 : 0),
    total: branchTotal,
    completed,
    next,
    allDone: isBranchTree(treeNodes)
      ? completed.length >= 3
      : completed.length >= treeNodes.length,
    isBranch: isBranchTree(treeNodes),
    chosenPath: chosen,
    branchChoices,
  };
}

export function hasMaterials(save: GameSave, mats: Record<string, number> | undefined): boolean {
  if (!mats) return true;
  return Object.entries(mats).every(([k, n]) => (save.materials[k] ?? 0) >= n);
}

function consumeMaterials(save: GameSave, mats: Record<string, number> | undefined) {
  if (!mats) return;
  for (const [k, n] of Object.entries(mats)) {
    save.materials[k] = Math.max(0, (save.materials[k] ?? 0) - n);
  }
}

export function canAttemptLearn(save: GameSave, charId: string, node: GrowthNode): boolean {
  const st = save.chars[charId];
  if (!st || !save.owned.includes(charId)) return false;
  if (isNodeOwned(st, node.id)) return false;
  if (isNodeLocked(st, node)) return false;
  const gate = getPrestigeGate(st, charId);
  if (gate) {
    return canAttemptLearnDuringGate(st, charId, node);
  }
  return save.gold >= node.cost && hasMaterials(save, node.materials);
}

export function attemptLearn(
  save: GameSave, charId: string, nodeId: string,
): { learned: boolean; rate: number; goldSpent: number; prestigeClaim?: boolean } {
  const node = GROWTH_NODES.find(n => n.id === nodeId);
  const st = save.chars[charId];
  if (!node || !st || !canAttemptLearn(save, charId, node)) {
    return { learned: false, rate: 0, goldSpent: 0 };
  }

  const gate = getPrestigeGate(st, charId);
  if (gate && node.branchGroup) {
    const claim = claimPrestigeNode(save, charId, nodeId);
    if (claim.learned) {
      onGrowthAction(save);
      return { learned: true, rate: 1, goldSpent: 0, prestigeClaim: true };
    }
    return { learned: false, rate: 0, goldSpent: 0 };
  }

  if (isCharPrestigeGated(st, charId) && !node.branchGroup) {
    return { learned: false, rate: 0, goldSpent: 0 };
  }

  const rate = getBoostedLearnRate(save, charId, nodeId);
  const hadBoost = save.pendingGrowthBoost === nodeId;
  save.gold -= node.cost;
  consumeMaterials(save, node.materials);

  if (hadBoost) consumeGrowthBoost(save, nodeId);
  st.unlockedNodes.push(nodeId);
  if (node.branchGroup && node.branchPath) {
    if (!st.growthBranches) st.growthBranches = {};
    st.growthBranches[node.branchGroup] = node.branchPath;
  }
  if (isPrestigeNodeId(node.id)) {
    const tiers = new Set<number>();
    for (const nid of st.unlockedNodes) {
      const gn = GROWTH_NODES.find(x => x.id === nid);
      if (gn?.branchTier) tiers.add(gn.branchTier);
    }
    st.prestige = tiers.size;
  }
  if (st.growthFails?.[nodeId]) delete st.growthFails[nodeId];
  onGrowthAction(save);
  return { learned: true, rate: 1, goldSpent: node.cost };
}

export function getCharGrowthTrees(charId: string): string[] {
  return [...new Set(getCharGrowth(charId).map(n => n.tree))];
}

export function getPrestigePathLabels(charId: string): string[][] {
  const def = PRESTIGE_BRANCH_DEFS.find(d => d.charId === charId);
  if (!def) return [];
  return def.paths.map(p => [p.label, ...p.nodes.map(n => n.name)]);
}

export interface PrestigeMilestoneInfo {
  tier: 1 | 2 | 3;
  label: string;
  reqLevel: number;
  levelsAway: number;
  ready: boolean;
  progressPct: number;
  allDone: boolean;
}

export function getPrestigeMilestoneInfo(st: CharState, charId: string): PrestigeMilestoneInfo | null {
  const nodes = getCharGrowth(charId).filter(n => n.branchGroup);
  if (!nodes.length) return null;

  const ownedTiers = new Set<number>();
  for (const n of nodes) {
    if (isNodeOwned(st, n.id) && n.branchTier) ownedTiers.add(n.branchTier);
  }
  const maxOwned = ownedTiers.size;
  if (maxOwned >= 3) {
    return {
      tier: 3, label: '4차 전직', reqLevel: PRESTIGE_TIER_LEVELS[2],
      levelsAway: 0, ready: true, progressPct: 100, allDone: true,
    };
  }

  const nextTier = (maxOwned + 1) as 1 | 2 | 3;
  const reqLevel = getPrestigeTierLevel(nextTier);
  const levelsAway = Math.max(0, reqLevel - st.level);
  const span = Math.max(1, reqLevel - PRESTIGE_TEASER_LEVEL);
  const progressPct = Math.min(100, Math.max(0, Math.floor((st.level - PRESTIGE_TEASER_LEVEL) / span * 100)));

  return {
    tier: nextTier,
    label: getPrestigeTierLabel(nextTier),
    reqLevel,
    levelsAway,
    ready: st.level >= reqLevel,
    progressPct,
    allDone: false,
  };
}

export function formatPrestigeLevelReq(node: GrowthNode, st: CharState): string {
  if (st.level >= node.reqLevel) return `필요 Lv.${node.reqLevel}`;
  const away = node.reqLevel - st.level;
  return `필요 Lv.${node.reqLevel} (${away}레벨 남음)`;
}
