import type { GrowthNode } from '../types';

export type BranchNodeIn = {
  name: string;
  desc: string;
  cost: number;
  lv: number;
  rate: number;
  atk?: number;
  def?: number;
  hp?: number;
  atkSpd?: number;
  crit?: number;
  aoeBonus?: number;
  buffAtk?: number;
  buffSpd?: number;
  buffCrit?: number;
  buffExp?: number;
};

export interface PrestigeBranchPathDef {
  key: string;
  label: string;
  nodes: [BranchNodeIn, BranchNodeIn, BranchNodeIn];
  tagline?: string;
  sfxTheme?: string;
  tier2Names?: [string, string];
  tier3Names?: [string, string, string, string];
  tier2Desc?: [string, string];
  tier3Desc?: [string, string, string, string];
}

export interface PrestigeBranchCharDef {
  charId: string;
  treeName: string;
  prefix: string;
  paths: [PrestigeBranchPathDef, PrestigeBranchPathDef];
}

export function getPrestigeBranchGroup(charId: string, tier: 1 | 2 | 3): string {
  return `${charId}_job_t${tier}`;
}

export function isPrestigeNodeId(nodeId: string): boolean {
  return /_pr_(?:[ab][12]?[xy]?_)?\d+$/.test(nodeId);
}

export function inferBranchPathFromNodes(
  nodes: GrowthNode[],
  branchGroup: string,
): string | null {
  for (const n of nodes) {
    if (n.branchGroup === branchGroup && n.branchPath) return n.branchPath;
  }
  return null;
}
