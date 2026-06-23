import type { GameSave } from '../types';
import { MAX_PARTY_SIZE } from '../types';
import { CHARACTERS, CHAR_MAP } from '../data/characters';
import { calcRecruitGoldCost } from '../data/economyPricing';
import { consumeMujangDiscount, getMujangRecruitBaseCost } from './OnboardingSystem';
import { applyRebirthMarkOnAcquire } from './RebirthMarkSystem';

export const BULLETIN_SLOT_COUNT = 4;
export const BULLETIN_ROTATE_MS = 30 * 60 * 1000;
export const BULLETIN_RECRUIT_RATE = 0.11;
export const BULLETIN_RECRUIT_PITY_STEP = 0.03;
export const BULLETIN_RECRUIT_MAX_RATE = 0.28;
export const BULLETIN_REROLL_BASE = 38_000;

export type BulletinRecruitResult = 'success' | 'fail' | 'no_gold' | 'owned' | 'not_listed' | 'full';

function recruitablePool(save: GameSave): string[] {
  return CHARACTERS
    .filter(c => c.cost > 0 && !save.owned.includes(c.id))
    .map(c => c.id);
}

function shufflePick<T>(pool: T[], count: number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, count);
}

function rollBulletinHeroes(save: GameSave): string[] {
  const pool = recruitablePool(save);
  if (!pool.length) return [];
  return shufflePick(pool, Math.min(BULLETIN_SLOT_COUNT, pool.length));
}

export function reconcileRecruitGuarantee(save: GameSave): void {
  const pending = save.pendingRecruitGuarantee;
  if (!pending) return;
  if (save.owned.includes(pending)) {
    save.pendingRecruitGuarantee = null;
    return;
  }
  ensureBulletin(save);
  if (!save.bulletin!.heroIds.includes(pending)) {
    save.pendingRecruitGuarantee = null;
  }
}

export function hasRecruitGuaranteeFor(save: GameSave, charId: string): boolean {
  reconcileRecruitGuarantee(save);
  return save.pendingRecruitGuarantee === charId;
}

export function consumeRecruitGuarantee(save: GameSave, charId: string): boolean {
  if (save.pendingRecruitGuarantee !== charId) return false;
  save.pendingRecruitGuarantee = null;
  return true;
}

export function rerollBulletinHeroes(save: GameSave): boolean {
  ensureBulletin(save);
  const pool = recruitablePool(save);
  if (!pool.length) return false;
  save.bulletin!.heroIds = rollBulletinHeroes(save);
  save.bulletin!.rotatedAt = Date.now();
  reconcileRecruitGuarantee(save);
  return true;
}

export function ensureBulletin(save: GameSave, now = Date.now()): void {
  if (!save.bulletin) {
    save.bulletin = { heroIds: rollBulletinHeroes(save), rotatedAt: now, rerollCount: 0 };
    return;
  }
  const elapsed = now - save.bulletin.rotatedAt;
  const valid = save.bulletin.heroIds.filter(id => {
    const def = CHAR_MAP[id];
    return def && def.cost > 0 && !save.owned.includes(id);
  });
  const needsRotate = elapsed >= BULLETIN_ROTATE_MS
    || valid.length !== save.bulletin.heroIds.length
    || save.bulletin.heroIds.length === 0;
  if (needsRotate) {
    save.bulletin.heroIds = rollBulletinHeroes(save);
    save.bulletin.rotatedAt = now;
  } else {
    save.bulletin.heroIds = valid;
  }
}

export function getBulletinRotateRemainingSec(save: GameSave, now = Date.now()): number {
  ensureBulletin(save, now);
  const left = BULLETIN_ROTATE_MS - (now - (save.bulletin?.rotatedAt ?? now));
  return Math.max(0, Math.ceil(left / 1000));
}

export function getBulletinRerollCost(save: GameSave): number {
  const n = save.bulletin?.rerollCount ?? 0;
  const region = save.maxRegion ?? 1;
  return BULLETIN_REROLL_BASE + n * 28000 + region * 4500;
}

export function canRerollBulletin(save: GameSave): boolean {
  ensureBulletin(save);
  return recruitablePool(save).length > 0 && save.gold >= getBulletinRerollCost(save);
}

export function rerollBulletin(save: GameSave): boolean {
  ensureBulletin(save);
  const cost = getBulletinRerollCost(save);
  if (save.gold < cost) return false;
  const pool = recruitablePool(save);
  if (!pool.length) return false;
  save.gold -= cost;
  if (!rerollBulletinHeroes(save)) return false;
  save.bulletin!.rerollCount = (save.bulletin!.rerollCount ?? 0) + 1;
  return true;
}

export function isOnBulletin(save: GameSave, charId: string): boolean {
  ensureBulletin(save);
  return save.bulletin!.heroIds.includes(charId);
}

export function onBulletinHeroRecruited(save: GameSave, charId: string): void {
  ensureBulletin(save);
  save.bulletin!.heroIds = save.bulletin!.heroIds.filter(id => id !== charId);
  const extra = rollBulletinHeroes(save).filter(id => !save.bulletin!.heroIds.includes(id));
  for (const id of extra) {
    if (save.bulletin!.heroIds.length >= BULLETIN_SLOT_COUNT) break;
    save.bulletin!.heroIds.push(id);
  }
}

export function getBulletinRecruitCost(save: GameSave, charId: string): number {
  const raw = charId === 'mujang' ? getMujangRecruitBaseCost(save) : (CHAR_MAP[charId]?.cost ?? 0);
  const region = save.maxRegion ?? 1;
  const regionMult = 1 + Math.max(0, region - 1) * 0.05;
  return Math.floor(calcRecruitGoldCost(save, raw) * regionMult);
}

function getBulletinRecruitRate(save: GameSave, charId: string): number {
  const fails = save.recruitFails[charId] ?? 0;
  return Math.min(BULLETIN_RECRUIT_MAX_RATE, BULLETIN_RECRUIT_RATE + fails * BULLETIN_RECRUIT_PITY_STEP);
}

export function getBulletinRecruitPityInfo(save: GameSave, charId: string): {
  fails: number;
  ratePct: number;
  failsToMax: number;
  atMax: boolean;
} {
  const fails = save.recruitFails[charId] ?? 0;
  const rate = getBulletinRecruitRate(save, charId);
  const maxFails = Math.ceil((BULLETIN_RECRUIT_MAX_RATE - BULLETIN_RECRUIT_RATE) / BULLETIN_RECRUIT_PITY_STEP);
  return {
    fails,
    ratePct: Math.round(rate * 100),
    failsToMax: Math.max(0, maxFails - fails),
    atMax: rate >= BULLETIN_RECRUIT_MAX_RATE - 0.001,
  };
}

export function tryBulletinRecruit(save: GameSave, charId: string): BulletinRecruitResult {
  if (save.owned.includes(charId)) return 'owned';
  if (!isOnBulletin(save, charId)) return 'not_listed';
  const def = CHAR_MAP[charId];
  const cost = getBulletinRecruitCost(save, charId);
  if (!def || cost <= 0) return 'no_gold';
  if (save.gold < cost) return 'no_gold';

  save.gold -= cost;
  save.stats.recruitAttempts++;

  const guaranteed = save.pendingRecruitGuarantee === charId;
  const rate = getBulletinRecruitRate(save, charId);
  if (guaranteed || Math.random() < rate) {
    if (guaranteed) consumeRecruitGuarantee(save, charId);
    if (charId === 'mujang' && save.onboarding?.mujangDiscountAvailable) {
      consumeMujangDiscount(save);
    }
    save.owned.push(charId);
    applyRebirthMarkOnAcquire(save, charId);
    save.recruitFails[charId] = 0;
    if (save.party.length < MAX_PARTY_SIZE) save.party.push(charId);
    onBulletinHeroRecruited(save, charId);
    return 'success';
  }

  save.recruitFails[charId] = (save.recruitFails[charId] ?? 0) + 1;
  return 'fail';
}
