import type { GameSave } from '../types';
import { getMaxEnhanceForGrade } from '../data/equipment';
import { isTankChar } from '../data/characters';
import { isCharGrowthBlocked } from './PrestigeGateSystem';

/** 캐릭터별 민첩 강화 — 무료, 1분 쿨, 장비 무상 +1 · 탱커는 어그로도 함께 성장 */

export const AGILITY_UNLOCK_REGION = 4;
export const AGILITY_MAX = 50;
export const AGILITY_COOLDOWN_MS = 60_000;
/** 민첩 1레벨당 초당 공격 + */
export const AGILITY_SPD_PER_LEVEL = 0.015;
/** 민첩 레벨당 추가 공격력 */
export const AGILITY_ATK_PER_LEVEL = 2;

/** 탱커 어그로 강화 — 민첩과 동시에 +1 */
export const THREAT_MAX = 50;
/** 어그로 레벨당 위협 배율 +10% (탱커 딜→위협에 곱해짐) */
export const THREAT_MULT_PER_LEVEL = 0.1;

export function getAgilityLevel(state: { agility?: number }): number {
  return Math.max(0, Math.min(AGILITY_MAX, state.agility ?? 0));
}

export function getThreatLevel(state: { threat?: number }): number {
  return Math.max(0, Math.min(THREAT_MAX, state.threat ?? 0));
}

/** 탱커 위협 배율 — 기본 ×48에 추가 곱 */
export function getTankThreatMult(state: { threat?: number }): number {
  return 1 + getThreatLevel(state) * THREAT_MULT_PER_LEVEL;
}

export function getAgilitySpdBonus(agility: number): number {
  return getAgilityLevel({ agility }) * AGILITY_SPD_PER_LEVEL;
}

export function getAgilityAtkBonus(agility: number): number {
  return getAgilityLevel({ agility }) * AGILITY_ATK_PER_LEVEL;
}

export function isAgilityUnlocked(save: GameSave): boolean {
  return (save.maxRegion ?? 1) >= AGILITY_UNLOCK_REGION;
}

export function getAgilityCooldownRemainingMs(state: { lastAgilityMs?: number }): number {
  const last = state.lastAgilityMs ?? 0;
  if (!last) return 0;
  return Math.max(0, AGILITY_COOLDOWN_MS - (Date.now() - last));
}

export function canUpgradeAgility(save: GameSave, charId: string): boolean {
  if (isCharGrowthBlocked(save, charId)) return false;
  if (!isAgilityUnlocked(save)) return false;
  const st = save.chars[charId];
  if (!st) return false;
  const agiMaxed = getAgilityLevel(st) >= AGILITY_MAX;
  const threatMaxed = !isTankChar(charId) || getThreatLevel(st) >= THREAT_MAX;
  if (agiMaxed && threatMaxed) return false;
  return getAgilityCooldownRemainingMs(st) <= 0;
}

/** 무료 민첩 +1, 탱커는 어그로 +1, 민첩 2레벨마다 착용 무기·방어구 +1 강화 (최대 +10) */
export function upgradeAgilityBundle(save: GameSave, charId: string): {
  ok: boolean;
  equipsEnhanced: number;
} {
  if (!canUpgradeAgility(save, charId)) return { ok: false, equipsEnhanced: 0 };
  const st = save.chars[charId];
  if (!st) return { ok: false, equipsEnhanced: 0 };

  if (getAgilityLevel(st) < AGILITY_MAX) {
    st.agility = getAgilityLevel(st) + 1;
  }
  if (isTankChar(charId) && getThreatLevel(st) < THREAT_MAX) {
    st.threat = getThreatLevel(st) + 1;
  }
  st.lastAgilityMs = Date.now();

  let equipsEnhanced = 0;
  const newAgi = getAgilityLevel(st);
  if (newAgi > 0 && newAgi % 2 === 0) {
    for (const slot of ['weapon', 'armor'] as const) {
      const uid = st.equipped[slot];
      if (!uid) continue;
      const item = save.bag.find(b => b.uid === uid);
      if (!item || item.level >= getMaxEnhanceForGrade(item.grade)) continue;
      item.level++;
      equipsEnhanced++;
    }
  }

  return { ok: true, equipsEnhanced };
}

/** @deprecated */
export function agilityUpgradeCost(_current: number): number {
  return 0;
}

/** @deprecated */
export function upgradeAgility(state: { agility?: number }, gold: number): number {
  void state;
  return gold;
}
