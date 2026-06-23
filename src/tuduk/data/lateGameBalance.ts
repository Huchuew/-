import type { GameSave } from '../types';
import { CHAR_MAP, isHealerChar, isTankChar } from './characters';
import { getActivePartyMembers } from '../systems/CharacterStatusSystem';
import { getStarterProfile } from './starterBalance';

import { getMinLevelForFloor, getMinPrestigeForFloor } from '../data/floorProgression';

export const LATE_GAME_FLOOR_MIN = 10;
/** 10층: 3인 권장 · 12층+: 4인 */
export const MIN_PARTY_SIZE_LATE = 4;
export const MIN_PARTY_SIZE_MID = 3;
export const MID_PARTY_FLOOR = 10;
export const FULL_PARTY_FLOOR = 12;
/** 파티원 1인당 권장 성장 노드 수 */
export const MIN_GROWTH_NODES_LATE = 5;
/** 10층+ 권장 장비 슬롯 */
export const MIN_EQUIP_SLOTS_LATE = 3;

export interface PartyReadiness {
  score: number;
  ready: boolean;
  issues: string[];
  monsterMult: number;
  playerAtkMult: number;
}

export { getMinLevelForFloor };

export function getRequiredPartySize(regionId: number): number {
  if (!isLateGameFloor(regionId)) return 1;
  if (regionId < FULL_PARTY_FLOOR) return MIN_PARTY_SIZE_MID;
  return MIN_PARTY_SIZE_LATE;
}

export function isLateGameFloor(regionId: number): boolean {
  return regionId >= LATE_GAME_FLOOR_MIN;
}

function countEquippedSlots(st: { equipped?: Partial<Record<string, string>> }): number {
  return Object.values(st.equipped ?? {}).filter(Boolean).length;
}

/**
 * 10층+ 준비도 — 미달 시에도 클리어 가능, 충족 시 보너스 (막기·극딜 패널티 완화)
 */
export function assessPartyReadiness(save: GameSave, regionId: number): PartyReadiness {
  if (!isLateGameFloor(regionId)) {
    return { score: 100, ready: true, issues: [], monsterMult: 1, playerAtkMult: 1 };
  }

  const issues: string[] = [];
  let score = 100;
  const party = getActivePartyMembers(save);
  const minLv = getMinLevelForFloor(regionId);
  const needParty = getRequiredPartySize(regionId);

  if (party.length < needParty) {
    if (regionId >= FULL_PARTY_FLOOR) {
      issues.push('12층+ 4인 편성 권장');
      score -= 24;
    } else {
      issues.push('10~11층 3인 편성 권장');
      score -= 10;
    }
  }

  const hasTank = party.some(id => isTankChar(id));
  const hasDps = party.some(id => {
    const r = CHAR_MAP[id]?.equipRole;
    return r === 'dps' || r === 'bruiser';
  });
  const hasHealer = party.some(id => isHealerChar(id));

  if (!hasTank) { score -= 14; issues.push('탱커 필요'); }
  if (!hasDps) { score -= 14; issues.push('딜러 필요'); }
  if (!hasHealer) { score -= 12; issues.push('힐러 필요'); }

    for (const id of party) {
    const st = save.chars[id];
    const name = CHAR_MAP[id]?.name ?? id;
    if (!st) continue;
    if (st.level < minLv) {
      score -= 8;
      issues.push(`${name} Lv.${minLv}+ 필요`);
    }
    if ((st.unlockedNodes?.length ?? 0) < MIN_GROWTH_NODES_LATE) {
      const growthPenalty = regionId <= 11 ? 10 : regionId <= 13 ? 14 : 18;
      score -= growthPenalty;
      issues.push(`${name} 성장 ${MIN_GROWTH_NODES_LATE}개+`);
    }
    if (countEquippedSlots(st) < MIN_EQUIP_SLOTS_LATE) {
      score -= 14;
      issues.push(`${name} 장비 ${MIN_EQUIP_SLOTS_LATE}슬롯+`);
    } else if (countEquippedSlots(st) < 2) {
      score -= 10;
      issues.push(`${name} 장비 2슬롯+`);
    }
    if (regionId >= 10 && (st.prestige ?? 0) < getMinPrestigeForFloor(regionId)) {
      const need = getMinPrestigeForFloor(regionId);
      const tierLabel = need >= 3 ? '4차 전직' : need >= 2 ? '3차 전직' : '2차 전직';
      score -= regionId >= 16 ? 14 : regionId >= 12 ? 6 : 4;
      issues.push(`${name} ${tierLabel} 권장`);
    }
  }

  if (regionId >= 17) {
    const allPrestige3 = party.length >= MIN_PARTY_SIZE_LATE
      && party.every(id => (save.chars[id]?.prestige ?? 0) >= 3);
    if (!allPrestige3) {
      score -= 28;
      issues.push('17층+: 4인 4차 전직');
    }
  }

  if (regionId === 18) {
    if (!hasTank || !hasDps || !hasHealer) {
      score -= 25;
      issues.push('18층: 탱·딜·힐 4인 조합');
    }
    const allP4 = party.length >= MIN_PARTY_SIZE_LATE
      && party.every(id => (save.chars[id]?.prestige ?? 0) >= 3);
    if (!allP4) {
      score -= 35;
      issues.push('18층: 4인 4차 전직 완료 필수');
    }
  }

  score = Math.max(0, Math.min(100, score));
  const ready = score >= 78;

  const lateTier = Math.max(0, regionId - 9);
  /** 10층 진입 완만 · 13층부터 가속 */
  let monsterMult = regionId === 10 ? 0.98 : 1.0 + lateTier * 0.028;
  if (regionId >= 13) monsterMult += (regionId - 12) * 0.028;
  if (regionId >= 14) monsterMult *= 1 + (regionId - 13) * 0.062;
  if (regionId >= 17) monsterMult *= 1.18;
  let playerAtkMult = 1;

  if (party.length < needParty) {
    const soloTier = Math.max(0, regionId - 9);
    const under = needParty - party.length;
    if (regionId >= FULL_PARTY_FLOOR) {
      monsterMult *= 1.22 + soloTier * 0.11 + under * 0.14;
      playerAtkMult *= 0.88;
    } else {
      monsterMult *= 1.04 + soloTier * 0.05 + under * 0.08;
      playerAtkMult *= 0.95;
    }
  } else if (regionId === 18) {
    const allP4 = party.every(id => (save.chars[id]?.prestige ?? 0) >= 3);
    const fullRoles = hasTank && hasDps && hasHealer;
    if (allP4 && fullRoles && ready) {
      monsterMult *= 0.86;
      playerAtkMult *= 1.1;
    } else if (!allP4 || !fullRoles) {
      monsterMult *= 2.95;
      playerAtkMult *= 0.72;
    }
  } else if (ready) {
    monsterMult *= regionId <= 11 ? 0.90 : regionId <= 14 ? 0.96 : 1.0;
    playerAtkMult *= regionId <= 11 ? 1.14 : regionId <= 14 ? 1.08 : 1.05;
    const hasHardStarter = party.some(id => getStarterProfile(id)?.difficulty === 'hard');
    if (hasHardStarter) {
      playerAtkMult *= 1.05;
    }
  } else {
    const gap = 100 - score;
    const midSoft = regionId >= 10 && regionId <= 12 ? 0.90
      : regionId >= 13 && regionId <= 15 ? 0.96
        : 1.02;
    monsterMult *= (1.04 + gap / 125) * midSoft;
    playerAtkMult *= Math.max(regionId <= 12 ? 0.94 : regionId <= 15 ? 0.88 : 0.84, 1 - gap / 480);
  }

  return { score, ready, issues, monsterMult, playerAtkMult };
}

export function getReadinessGradeInfo(save: GameSave, regionId: number): {
  grade: 'critical' | 'low' | 'ok' | 'ready';
  label: string;
  cssClass: string;
  score: number;
  issues: string[];
  partyRequired: boolean;
} {
  if (!isLateGameFloor(regionId)) {
    return { grade: 'ready', label: '양호', cssClass: 'grade-ready', score: 100, issues: [], partyRequired: false };
  }
  const r = assessPartyReadiness(save, regionId);
  const partyRequired = save.party.length < getRequiredPartySize(regionId);
  if (partyRequired) {
    const need = getRequiredPartySize(regionId);
    return {
      grade: 'critical',
      label: need >= MIN_PARTY_SIZE_LATE ? '4인 필수' : '3인 권장',
      cssClass: 'grade-critical',
      score: r.score,
      issues: [`${save.party.length}인 편성 — ${regionId}층 권장 ${need}인`],
      partyRequired: true,
    };
  }
  if (r.score >= 78) {
    return { grade: 'ready', label: '충분', cssClass: 'grade-ready', score: r.score, issues: r.issues, partyRequired: false };
  }
  if (r.score >= 50) {
    return { grade: 'ok', label: '보통', cssClass: 'grade-ok', score: r.score, issues: r.issues, partyRequired: false };
  }
  return { grade: 'low', label: '부족', cssClass: 'grade-low', score: r.score, issues: r.issues, partyRequired: false };
}

export function formatReadinessHint(save: GameSave, regionId: number): string | null {
  const g = getReadinessGradeInfo(save, regionId);
  if (!isLateGameFloor(regionId)) return null;
  if (g.partyRequired) {
    const need = getRequiredPartySize(regionId);
    return `🚫 ${save.party.length}인 — ${regionId}층 ${need}인 권장 (미달 시 적 강화)`;
  }
  if (g.grade === 'ready') {
    return `✅ 준비도 ${g.score}% · 충분 — 공격 보너스 적용`;
  }
  if (g.grade === 'ok') {
    return `📋 준비도 ${g.score}% · 보통 — ${g.issues.slice(0, 2).join(', ')}`;
  }
  return `⚠️ 준비도 ${g.score}% · 부족 — ${g.issues.slice(0, 2).join(', ')}`;
}
