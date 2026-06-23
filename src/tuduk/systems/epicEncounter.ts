import type { CombatEntity, EncounterSlot } from '../types';

import type { EpicVariant } from '../data/epicVariants';

import { getWeeklyEpicVariant } from '../data/epicVariants';



/** 보스 직전 에픽 — 엘리트보다 강력, 보스보다 약함 */

export const EPIC_POWER_MULT = 2.55;

export const EPIC_REWARD_MULT = 2.45;



export function decorateEpicEntity(entity: CombatEntity, variant = getWeeklyEpicVariant()): void {

  entity.name = `★ ${variant.tag} ${entity.name.replace(/^★\s*/, '')}`;

  entity.bossShield = Math.floor(entity.maxHp * 0.08);

  entity.color = variant.color;

  entity.atk = Math.floor(entity.atk * variant.powerMult);

}



export function checkEpicPhase(

  slot: EncounterSlot,

  prevHpRatio: number,

  variant: EpicVariant = getWeeklyEpicVariant(),

): { message: string; color: string } | null {

  if (!slot.isEpic) return null;

  const ratio = slot.entity.hp / slot.entity.maxHp;



  if (ratio <= 0.55 && prevHpRatio > 0.55) {

    slot.entity.atk = Math.floor(slot.entity.atk * variant.enrageAtk);

    slot.entity.atkSpd *= variant.enrageAspd;

    slot.entity.enraged = true;

    return { message: variant.enrageMsg, color: variant.color };

  }

  if (ratio <= 0.25 && prevHpRatio > 0.25) {

    const shield = Math.floor(slot.entity.maxHp * variant.shieldRatio);

    slot.entity.bossShield = (slot.entity.bossShield ?? 0) + shield;

    slot.entity.atkSpd *= 1.12;

    return { message: variant.shieldMsg, color: '#cc88ff' };

  }

  return null;

}



export function epicSpiritGainPerHit(): number {

  return 0.34;

}



export function epicSpiritGainPerAttack(): number {

  return 0.28;

}



export function epicRewardMult(variant = getWeeklyEpicVariant()): number {

  return EPIC_REWARD_MULT * (0.92 + variant.powerMult * 0.08);

}

