import type { CombatEntity, MonsterDef } from '../types';

export const ELITE_SPIRIT_MAX = 1;
export const ELITE_SPIRIT_PER_ATTACK = 0.24;
export const ELITE_SPIRIT_ON_HIT = 0.05;
export const ELITE_SPECIAL_MULT = 2.15;
export const ELITE_SPLASH_RATIO = 0.42;

export function isEliteMonster(mon: MonsterDef, isEliteFight: boolean): boolean {
  return isEliteFight || mon.isRare;
}

export function addEliteSpirit(current: number, amount: number): number {
  return Math.min(ELITE_SPIRIT_MAX, current + amount);
}

export function spiritBarColor(ratio: number): string {
  if (ratio >= 1) return '#ff3300';
  if (ratio >= 0.75) return '#ff6600';
  if (ratio >= 0.45) return '#ff9933';
  return '#ffbb55';
}

export function calcEliteSpecialDamage(baseDmg: number): number {
  return Math.max(1, Math.floor(baseDmg * ELITE_SPECIAL_MULT));
}

export function calcEliteSplashDamage(specialDmg: number): number {
  return Math.max(1, Math.floor(specialDmg * ELITE_SPLASH_RATIO));
}

export interface EliteStrikeResult {
  primaryDmg: number;
  splashTargets: { entity: CombatEntity; dmg: number }[];
  isSpecial: boolean;
}
