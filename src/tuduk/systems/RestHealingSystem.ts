import { CHAR_MAP } from '../data/characters';

import type { GameSave } from '../types';

import { computeCharStats } from './StatCalculator';

import { getClinicLevel } from './TycoonSystem';



/** 전멸 패널티 중 — RestHealingSystem ↔ CharacterStatusSystem 순환 import 방지 */
function isIncapHealBlocked(save: GameSave, charId: string): boolean {
  const until = save.charStatus?.incapacitatedUntil?.[charId] ?? 0;
  return until > Date.now();
}



/** 숙소 자발 귀환 — 전투 중 쓰러진 동료 소생·생존자 일부 회복 */
export const VOLUNTARY_RETURN_DEAD_HP_RATIO = 0.42;
export const VOLUNTARY_RETURN_ALIVE_BONUS_RATIO = 0.28;

export function applyVoluntaryReturnRecovery(save: GameSave): void {
  if (!save.combatHp) save.combatHp = {};
  for (const id of save.party) {
    if (isIncapHealBlocked(save, id)) continue;
    const max = getCharMaxHp(save, id);
    if (max <= 0) continue;
    const cur = getCharCurrentHp(save, id);
    if (cur <= 0) {
      save.combatHp[id] = Math.max(1, Math.floor(max * VOLUNTARY_RETURN_DEAD_HP_RATIO));
    } else if (cur < max) {
      save.combatHp[id] = Math.min(max, Math.floor(cur + max * VOLUNTARY_RETURN_ALIVE_BONUS_RATIO));
    }
  }
}


export const BASE_LODGING_HEAL_FLAT = 14;

export const CLINIC_HEAL_FLAT_PER_LEVEL = 6;



/** 최대 HP 비율 회복 (초당) — 고레벨 스케일 */

export const BASE_LODGING_HEAL_PCT = 0.028;

export const CLINIC_HEAL_PCT_PER_LEVEL = 0.004;



/** UI·이벤트용 레거시 호환 (대표 파티원 기준) */

export const BASE_LODGING_HEAL_PER_SEC = BASE_LODGING_HEAL_FLAT;

export const CLINIC_HEAL_BONUS_PER_LEVEL = CLINIC_HEAL_FLAT_PER_LEVEL;



export function getLodgingHealPctPerSec(save: GameSave): number {

  const clinic = getClinicLevel(save);

  return BASE_LODGING_HEAL_PCT + clinic * CLINIC_HEAL_PCT_PER_LEVEL;

}



export function getLodgingHealFlatPerSec(save: GameSave): number {

  const clinic = getClinicLevel(save);

  return BASE_LODGING_HEAL_FLAT + clinic * CLINIC_HEAL_FLAT_PER_LEVEL;

}



/** 대표 표시용 — 첫 파티원 max HP 기준 환산 */

export function getLodgingHealPerSec(save: GameSave): number {

  const flat = getLodgingHealFlatPerSec(save);

  const pct = getLodgingHealPctPerSec(save);

  const sampleId = save.party[0];

  if (!sampleId) return Math.round(flat);

  const max = getCharMaxHp(save, sampleId);

  return Math.round(flat + max * pct);

}



export function formatLodgingHealLabel(save: GameSave): string {

  const pct = Math.round(getLodgingHealPctPerSec(save) * 1000) / 10;

  const flat = Math.round(getLodgingHealFlatPerSec(save));

  return `${pct}%+${flat} HP/초`;

}



export function getCharMaxHp(save: GameSave, charId: string): number {

  const ch = CHAR_MAP[charId];

  const st = save.chars[charId];

  if (!ch || !st) return 0;

  return computeCharStats(ch, st, save).hp;

}



export function getCharCurrentHp(save: GameSave, charId: string): number {

  const max = getCharMaxHp(save, charId);

  if (max <= 0) return 0;

  const raw = save.combatHp[charId];

  if (raw == null) return max;

  if (raw > max) {
    save.combatHp[charId] = max;
    return max;
  }

  return raw;

}



/** 만피 판정 — 표시(반올림)와 동일하게 99.5% 이상이면 회복 완료 */
export const PARTY_HEAL_FULL_RATIO = 0.995;



export function getCharHealRatio(save: GameSave, charId: string): number {

  const max = getCharMaxHp(save, charId);

  if (max <= 0) return 1;

  return getCharCurrentHp(save, charId) / max;

}



function snapCharHpIfNearFull(save: GameSave, charId: string): void {

  const max = getCharMaxHp(save, charId);

  if (max <= 0) return;

  const cur = getCharCurrentHp(save, charId);

  if (cur >= max * PARTY_HEAL_FULL_RATIO && cur < max) {
    save.combatHp[charId] = max;
  }

}



export function isPartyFullyHealed(save: GameSave): boolean {

  for (const id of save.party) {
    snapCharHpIfNearFull(save, id);
    if (getCharHealRatio(save, id) < PARTY_HEAL_FULL_RATIO) return false;
  }

  return true;

}



function healGainForChar(save: GameSave, charId: string, dt: number): number {

  if (isIncapHealBlocked(save, charId)) return 0;

  const max = getCharMaxHp(save, charId);

  if (max <= 0) return 0;

  const cur = getCharCurrentHp(save, charId);

  if (cur >= max) return 0;

  const rate = getLodgingHealFlatPerSec(save) + max * getLodgingHealPctPerSec(save);

  return Math.min(max - cur, Math.max(1, rate * dt));

}



/** 숙소 휴식 — 초당 회복량만큼 HP 상승. 회복이 있었으면 true */

export function tickLodgingHeal(save: GameSave, dt: number): boolean {

  let healed = false;

  for (const id of save.party) {

    const max = getCharMaxHp(save, id);

    if (max <= 0) continue;

    const gain = healGainForChar(save, id, dt);

    if (gain <= 0) continue;

    const cur = getCharCurrentHp(save, id);

    save.combatHp[id] = Math.min(max, cur + gain);

    if (max - save.combatHp[id]! < 1) save.combatHp[id] = max;

    healed = true;

  }

  return healed;

}

