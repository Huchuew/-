import type { CombatEntity, GameSave, GaugeType } from '../types';
import { CHAR_MAP } from '../data/characters';
import { GAUGE_GAIN_MULT } from '../data/combatBalance';

export const GAUGE_MAX = 1;
const MANA_ATTACK_GAIN = 0.19 * GAUGE_GAIN_MULT;
const FURY_ATTACK_GAIN = 0.14 * GAUGE_GAIN_MULT;
const FURY_HIT_GAIN = 0.17 * GAUGE_GAIN_MULT;
const MANA_HIT_LOSS = 0.1;
const KILL_GAUGE_BURST = 0.12;

const MANA_JOBS = new Set([
  'mage', 'buffer_atk', 'buffer_spd', 'buffer_crit', 'buffer_exp', 'chef',
]);

export function getGaugeType(charId: string): GaugeType {
  const job = CHAR_MAP[charId]?.job;
  return job && MANA_JOBS.has(job) ? 'mana' : 'fury';
}

export function getGauge(save: GameSave, charId: string): number {
  return Math.max(0, Math.min(GAUGE_MAX, save.combatGauge?.[charId] ?? 0));
}

export function setGauge(save: GameSave, charId: string, value: number) {
  if (!save.combatGauge) save.combatGauge = {};
  save.combatGauge[charId] = Math.max(0, Math.min(GAUGE_MAX, value));
}

export function applyGaugeToEntity(save: GameSave, entity: CombatEntity) {
  entity.gaugeType = getGaugeType(entity.id);
  entity.gauge = getGauge(save, entity.id);
  entity.gaugeMax = GAUGE_MAX;
}

export function syncCombatGauge(save: GameSave, party: CombatEntity[]) {
  if (!save.combatGauge) save.combatGauge = {};
  for (const p of party) {
    if (p.gauge != null) save.combatGauge[p.id] = p.gauge;
  }
}

export function onPartyAttackGauge(
  save: GameSave, charId: string, bonus = 0, isCrit = false,
): boolean {
  const type = getGaugeType(charId);
  const cur = getGauge(save, charId);
  if (cur >= GAUGE_MAX) return true;
  let gain = (type === 'mana' ? MANA_ATTACK_GAIN : FURY_ATTACK_GAIN) + bonus;
  if (isCrit) gain += 0.04;
  setGauge(save, charId, cur + gain);
  return getGauge(save, charId) >= GAUGE_MAX;
}

export function onPartyKillGaugeBurst(save: GameSave, partyIds: string[], comboGaugeBonus = 0) {
  const burst = KILL_GAUGE_BURST + comboGaugeBonus;
  for (const id of partyIds) {
    setGauge(save, id, getGauge(save, id) + burst);
  }
}

export function onPartyHitGauge(save: GameSave, charId: string) {
  const type = getGaugeType(charId);
  const cur = getGauge(save, charId);
  if (type === 'fury') {
    setGauge(save, charId, cur + FURY_HIT_GAIN);
  } else {
    setGauge(save, charId, cur - MANA_HIT_LOSS);
  }
}

export function consumeGauge(save: GameSave, charId: string) {
  setGauge(save, charId, 0);
}

export function gaugeBarColor(type: GaugeType, ratio: number): string {
  if (type === 'mana') {
    return ratio >= 1 ? '#88eeff' : '#4488cc';
  }
  return ratio >= 1 ? '#ffee66' : '#ccaa22';
}

export function gaugeLabel(type: GaugeType): string {
  return type === 'mana' ? '마나' : '투지';
}
