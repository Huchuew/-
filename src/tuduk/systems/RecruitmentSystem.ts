import type { GameSave } from '../types';
import { MAX_PARTY_SIZE } from '../types';
import { CHAR_MAP } from '../data/characters';
import { calcRecruitGoldCost } from '../data/economyPricing';
import { applyRebirthMarkOnAcquire } from './RebirthMarkSystem';

const PITY_PER_FAIL = 0.035;
const PITY_CAP = 0.32;

export function getRecruitChance(save: GameSave, charId: string): number {
  const def = CHAR_MAP[charId];
  if (!def) return 0;
  const fails = save.recruitFails[charId] ?? 0;
  const pity = Math.min(PITY_CAP, fails * PITY_PER_FAIL);
  return Math.min(0.95, def.recruitRate + pity);
}

export type RecruitResult = 'success' | 'fail' | 'no_gold' | 'owned' | 'starter';

export function tryRecruit(save: GameSave, charId: string): RecruitResult {
  if (save.owned.includes(charId)) return 'owned';
  const def = CHAR_MAP[charId];
  if (!def || def.cost <= 0) return 'no_gold';
  const cost = calcRecruitGoldCost(save, def.cost);
  if (save.gold < cost) return 'no_gold';

  save.gold -= cost;
  save.stats.recruitAttempts++;
  const chance = getRecruitChance(save, charId);

  if (Math.random() < chance) {
    save.owned.push(charId);
    applyRebirthMarkOnAcquire(save, charId);
    save.recruitFails[charId] = 0;
    if (save.party.length < MAX_PARTY_SIZE) save.party.push(charId);
    return 'success';
  }

  save.recruitFails[charId] = (save.recruitFails[charId] ?? 0) + 1;
  return 'fail';
}
