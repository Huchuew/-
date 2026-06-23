import type { GameSave } from '../types';
import { getCharGrowth } from './growthTrees';
import { isNodeOwned } from '../systems/GrowthSystem';
import { PRESTIGE_FORK_META, type PrestigeSfxTheme } from './prestigeBranchForks';

export type { PrestigeSfxTheme };

export interface PrestigeJobProfile {
  tier: number;
  rootKey: string | null;
  branchPath: string | null;
  jobName: string | null;
  sfxTheme: PrestigeSfxTheme;
}

const THEME_CLAIM_SE: Record<PrestigeSfxTheme, string[]> = {
  guardian: ['Saint3.ogg', 'Magic11.ogg', 'Flash1.ogg', 'Skill1.ogg'],
  berserker: ['Blow4.ogg', 'Slash8.ogg', 'Skill3.ogg', 'Flash1.ogg'],
  arcane: ['Magic11.ogg', 'Magic10.ogg', 'Flash1.ogg', 'Saint3.ogg'],
  frost: ['Water1.ogg', 'Magic11.ogg', 'Saint2.ogg', 'Flash1.ogg'],
  blade: ['Slash7.ogg', 'Slash5.ogg', 'Skill3.ogg', 'Wind1.ogg'],
  holy: ['Saint3.ogg', 'Saint2.ogg', 'Magic1.ogg', 'Flash1.ogg'],
  shadow: ['Magic5.ogg', 'Slash3.ogg', 'Skill3.ogg', 'Blow2.ogg'],
  ranger: ['Wind1.ogg', 'Slash2.ogg', 'Skill1.ogg', 'Flash1.ogg'],
  beast: ['Blow4.ogg', 'Slash8.ogg', 'Blow2.ogg', 'Skill3.ogg'],
  support: ['Water1.ogg', 'Saint2.ogg', 'Magic1.ogg', 'Saint1.ogg'],
  lancer: ['Slash5.ogg', 'Blow4.ogg', 'Skill3.ogg', 'Flash1.ogg'],
  royal: ['Saint3.ogg', 'Magic11.ogg', 'Skill3.ogg', 'Saint2.ogg'],
};

const THEME_ATTACK_SE: Record<PrestigeSfxTheme, string[]> = {
  guardian: ['Blow2.ogg', 'Slash3.ogg', 'Blow4.ogg'],
  berserker: ['Blow4.ogg', 'Slash8.ogg', 'Blow2.ogg'],
  arcane: ['Magic5.ogg', 'Magic11.ogg', 'Magic10.ogg'],
  frost: ['Water1.ogg', 'Magic5.ogg', 'Wind1.ogg'],
  blade: ['Slash7.ogg', 'Slash5.ogg', 'Slash2.ogg'],
  holy: ['Saint1.ogg', 'Slash3.ogg', 'Magic1.ogg'],
  shadow: ['Slash3.ogg', 'Magic5.ogg', 'Blow2.ogg'],
  ranger: ['Wind1.ogg', 'Slash2.ogg', 'Slash5.ogg'],
  beast: ['Blow4.ogg', 'Slash8.ogg', 'Blow2.ogg'],
  support: ['Water1.ogg', 'Saint1.ogg', 'Magic1.ogg'],
  lancer: ['Slash5.ogg', 'Blow4.ogg', 'Slash7.ogg'],
  royal: ['Saint1.ogg', 'Slash5.ogg', 'Magic11.ogg'],
};

function getOwnedPrestigeNodes(save: GameSave, charId: string) {
  const st = save.chars[charId];
  if (!st) return [];
  return getCharGrowth(charId).filter(n => n.branchGroup && isNodeOwned(st, n.id));
}

export function getPrestigeSfxTheme(charId: string, rootKey: string | null): PrestigeSfxTheme {
  if (!rootKey) return 'blade';
  const meta = PRESTIGE_FORK_META[charId]?.[rootKey as 'a' | 'b'];
  return meta?.sfxTheme ?? 'blade';
}

export function getPrestigeJobProfile(save: GameSave, charId: string): PrestigeJobProfile {
  const owned = getOwnedPrestigeNodes(save, charId);
  const latest = [...owned].sort((a, b) => (b.branchTier ?? 0) - (a.branchTier ?? 0))[0];
  const rootKey = latest?.branchPath?.charAt(0) ?? null;
  return {
    tier: owned.length,
    rootKey,
    branchPath: latest?.branchPath ?? null,
    jobName: latest?.name ?? null,
    sfxTheme: getPrestigeSfxTheme(charId, rootKey),
  };
}

export function getPrestigeClaimSequencing(
  theme: PrestigeSfxTheme,
  tier: 1 | 2 | 3,
): { file: string; vol: number; pitch: number; delay: number }[] {
  const files = THEME_CLAIM_SE[theme];
  const basePitch = 0.92 + tier * 0.12;
  return files.map((file, i) => ({
    file,
    vol: 0.22 + tier * 0.05 + (i === 0 ? 0.08 : 0),
    pitch: basePitch + i * 0.05,
    delay: i * 88,
  }));
}

export function getPrestigeAttackSe(
  theme: PrestigeSfxTheme,
  tier: number,
  crit: boolean,
): { file: string; vol: number; pitch: number } {
  const files = THEME_ATTACK_SE[theme];
  const idx = Math.min(files.length - 1, Math.max(0, tier - 1));
  return {
    file: files[idx]!,
    vol: crit ? 0.28 + tier * 0.025 : 0.18 + tier * 0.03,
    pitch: 0.95 + tier * 0.055 + (crit ? 0.1 : 0),
  };
}
