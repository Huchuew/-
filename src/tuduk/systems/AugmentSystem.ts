import type { GameSave } from '../types';
import { EXPEDITION_POTION_CARRY } from '../types';
import {
  AUGMENTS, AUGMENT_MAP, type AugmentDef, type AugmentTier, TIER_LABEL,
} from '../data/augments';
import {
  defaultAugmentMods, mergeAugmentMods, type AugmentMods,
} from '../data/augmentMods';
import { buildAugmentPreviewCompat } from './augmentImpact';
import { getFloorClearCount } from './DungeonShortcutSystem';

export interface AugmentPickState {
  floorId: number;
  choiceIds: string[];
  /** 기존 유저 소급 선택 */
  retroactive?: boolean;
  /** 소급 큐에 남은 층 수 */
  queueRemaining?: number;
  /** 잼 리롤로 재선택 중 */
  reroll?: boolean;
}

export interface AugmentCharPreview {
  charId: string;
  name: string;
  lines: string[];
  active: boolean;
}

export interface AugmentPreview {
  globalLines: string[];
  chars: AugmentCharPreview[];
  conditionMet: boolean;
  conditionHint?: string;
}

function hashPick(seed: string, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % max;
}

function tierWeight(floorId: number, tier: AugmentTier): number {
  if (tier === 'silver') {
    if (floorId <= 4) return 62;
    if (floorId <= 9) return 45;
    if (floorId <= 14) return 32;
    return 24;
  }
  if (tier === 'gold') {
    if (floorId <= 4) return 36;
    if (floorId <= 9) return 52;
    if (floorId <= 14) return 58;
    return 52;
  }
  if (floorId <= 4) return 0;
  if (floorId <= 9) return 10;
  if (floorId <= 14) return 22;
  return 40;
}

function isEligible(
  save: GameSave,
  def: AugmentDef,
  floorId: number,
  opts?: { relaxCondition?: boolean },
): boolean {
  if (floorId < def.minFloor) return false;
  if (save.augments?.picked?.includes(def.id)) return false;
  if (def.exclusiveGroup) {
    const picked = save.augments?.picked ?? [];
    if (picked.some(id => AUGMENT_MAP[id]?.exclusiveGroup === def.exclusiveGroup)) return false;
  }
  if (!opts?.relaxCondition && def.condition && !def.condition(save)) return false;
  return true;
}

export function hasAugmentForFloor(save: GameSave, floorId: number): boolean {
  return save.augments?.claimedFloors?.includes(floorId) ?? false;
}

export function getPickedAugments(save: GameSave): AugmentDef[] {
  return (save.augments?.picked ?? []).map(id => AUGMENT_MAP[id]).filter(Boolean);
}

export function getAugmentMods(save: GameSave): AugmentMods {
  let mods = defaultAugmentMods();
  for (const def of getPickedAugments(save)) {
    mods = mergeAugmentMods(mods, def.effects);
  }
  return mods;
}

export function getExpeditionPotionCap(save: GameSave): number {
  const mods = getAugmentMods(save);
  const base = EXPEDITION_POTION_CARRY + mods.expeditionCarryAdd;
  if (mods.expeditionCarryCap != null) return mods.expeditionCarryCap;
  return Math.min(10, base);
}

export function rollAugmentChoices(
  save: GameSave,
  floorId: number,
  opts?: { relaxCondition?: boolean },
): string[] {
  const pool = AUGMENTS.filter(d => isEligible(save, d, floorId, opts));
  if (!pool.length) return [];

  const picked: AugmentDef[] = [];
  const used = new Set<string>();
  const seed = `${floorId}-${save.augments?.picked?.join(',') ?? ''}-${Date.now()}`;

  while (picked.length < 3 && picked.length < pool.length) {
    const weights = pool
      .filter(d => !used.has(d.id))
      .map(d => ({ d, w: tierWeight(floorId, d.tier) }));
    const total = weights.reduce((s, x) => s + x.w, 0);
    if (total <= 0) break;
    let roll = hashPick(`${seed}-${picked.length}`, total);
    for (const { d, w } of weights) {
      roll -= w;
      if (roll < 0) {
        picked.push(d);
        used.add(d.id);
        break;
      }
    }
  }
  return picked.map(d => d.id);
}

/** 보스를 격파한 층인지 (소급 증강 대상 판별) */
export function isFloorBossCleared(save: GameSave, floorId: number): boolean {
  if (floorId < 1 || floorId > 18) return false;
  if (getFloorClearCount(save, floorId) > 0) return true;
  if (save.badges?.includes(floorId)) return true;
  const maxR = save.maxRegion ?? 1;
  if (floorId < maxR) return true;
  return false;
}

/** 아직 증강을 고르지 않은, 보스 클리어한 층 목록 (낮은 층부터) */
export function getPendingAugmentFloors(save: GameSave): number[] {
  const maxR = Math.min(18, save.maxRegion ?? 1);
  const pending: number[] = [];
  for (let f = 1; f <= maxR; f++) {
    if (hasAugmentForFloor(save, f)) continue;
    if (!isFloorBossCleared(save, f)) continue;
    pending.push(f);
  }
  return pending;
}

export function buildAugmentPickForFloor(save: GameSave, floorId: number): AugmentPickState | null {
  if (hasAugmentForFloor(save, floorId)) return null;
  let choiceIds = rollAugmentChoices(save, floorId);
  if (!choiceIds.length) choiceIds = rollAugmentChoices(save, floorId, { relaxCondition: true });
  if (!choiceIds.length) return null;
  return { floorId, choiceIds };
}

/** 선택지가 없을 때 층만 소비 (무한 재시도 방지) */
export function markAugmentFloorSkipped(save: GameSave, floorId: number): void {
  if (hasAugmentForFloor(save, floorId)) return;
  if (!save.augments) save.augments = { picked: [], claimedFloors: [] };
  if (!save.augments.claimedFloors.includes(floorId)) {
    save.augments.claimedFloors.push(floorId);
  }
}

export function pickAugment(
  save: GameSave,
  augmentId: string,
  floorId: number,
  validChoices?: string[],
): boolean {
  const def = AUGMENT_MAP[augmentId];
  if (!def || hasAugmentForFloor(save, floorId)) return false;
  if (validChoices && !validChoices.includes(augmentId)) return false;
  if (save.augments?.picked?.includes(augmentId)) return false;
  if (!save.augments) save.augments = { picked: [], claimedFloors: [] };
  if (!save.augments.pickedAtFloor) save.augments.pickedAtFloor = {};
  save.augments.picked.push(augmentId);
  save.augments.claimedFloors.push(floorId);
  save.augments.pickedAtFloor[augmentId] = floorId;
  return true;
}

export function buildAugmentPreview(save: GameSave, augmentId: string): AugmentPreview {
  return buildAugmentPreviewCompat(save, augmentId);
}

export function formatAugmentTier(tier: AugmentTier): string {
  return TIER_LABEL[tier];
}

export function canRerollAllAugments(save: GameSave): boolean {
  return (save.augments?.picked?.length ?? 0) > 0;
}

/** 증강 초기화 — 재선택할 층 목록 반환 (젬 차감은 호출측) */
export function rerollAllAugments(save: GameSave): number[] {
  if (!canRerollAllAugments(save)) return [];
  const aug = save.augments!;
  const fromClaimed = [...new Set(aug.claimedFloors ?? [])];
  const fromPicked = Object.values(aug.pickedAtFloor ?? {});
  const floors = [...new Set([...fromClaimed, ...fromPicked])].sort((a, b) => a - b);
  save.augments = { picked: [], claimedFloors: [], pickedAtFloor: {} };
  return floors;
}
