import type { EquipRole, GameSave } from '../types';
import { MAX_PARTY_SIZE } from '../types';
import { CHAR_MAP } from './characters';

/** 레벨당 성장 — 역할 정체성 */
export const ROLE_LEVEL_GROWTH: Record<EquipRole, { atk: number; def: number; hp: number }> = {
  tank: { atk: 1.25, def: 3.4, hp: 16 },
  dps: { atk: 5.9, def: 1.18, hp: 7.6 },
  healer: { atk: 1.85, def: 2.5, hp: 16 },
  bruiser: { atk: 5.4, def: 2.35, hp: 11.8 },
  support: { atk: 0.95, def: 1.35, hp: 9 },
};

/** 기본 스탯에 역할 배율 */
export const ROLE_STAT_SHAPE: Record<EquipRole, { atk: number; def: number; hp: number }> = {
  tank: { atk: 0.72, def: 1.32, hp: 1.02 },
  dps: { atk: 1.16, def: 0.90, hp: 0.90 },
  healer: { atk: 0.88, def: 1.1, hp: 1.08 },
  bruiser: { atk: 1.12, def: 1.04, hp: 0.98 },
  support: { atk: 0.65, def: 0.94, hp: 0.92 },
};

export interface RoleCombatMods {
  atkMult: number;
  defMult: number;
  hpMult: number;
  lines: string[];
}

/** 1인 원정 초반 완화 — 8층 해금 전까지 서서히 소멸 */
export function getSoloExpeditionCushion(save: GameSave, role: EquipRole): RoleCombatMods {
  if (save.party.length !== 1) {
    return { atkMult: 1, defMult: 1, hpMult: 1, lines: [] };
  }
  const maxR = save.maxRegion ?? 1;
  const curR = save.currentRegion ?? maxR;
  if (curR >= 10 || maxR >= 10) {
    return {
      atkMult: 0.66,
      defMult: 0.92,
      hpMult: 0.88,
      lines: [],
    };
  }
  if (maxR >= 8) {
    return { atkMult: 1, defMult: 1, hpMult: 1, lines: [] };
  }
  const fade = Math.max(0, 1 - (maxR - 1) / 9);

  if (role === 'tank') {
    return {
      atkMult: 1 + 0.62 * fade,
      defMult: 1 + 0.08 * fade,
      hpMult: 1 + 0.08 * fade,
      lines: [],
    };
  }
  if (role === 'dps' || role === 'bruiser') {
    return {
      atkMult: 0.94 + 0.08 * fade,
      defMult: 1 + 0.12 * fade,
      hpMult: 1 + 0.28 * fade,
      lines: [],
    };
  }
  if (role === 'healer') {
    return {
      atkMult: 1 + 0.38 * fade,
      defMult: 1 + 0.16 * fade,
      hpMult: 1 + 0.32 * fade,
      lines: [],
    };
  }
  return { atkMult: 1, defMult: 1, hpMult: 1, lines: [] };
}

/** 탱·딜·힐 편성 보너스 — 솔플 체감 */
export function getRoleCompositionBonus(save: GameSave): RoleCombatMods {
  const party = save.party;
  if (party.length === 0) {
    return { atkMult: 1, defMult: 1, hpMult: 1, lines: [] };
  }

  const roles = party.map(id => CHAR_MAP[id]?.equipRole).filter(Boolean) as EquipRole[];
  const hasTank = roles.includes('tank');
  const hasDps = roles.some(r => r === 'dps' || r === 'bruiser');
  const hasHealer = roles.includes('healer');

  if (party.length === 1) {
    return getSoloExpeditionCushion(save, roles[0] ?? 'dps');
  }

  const lines: string[] = [];
  let atkMult = 1;
  let defMult = 1;
  let hpMult = 1;

  if (hasTank && hasDps && hasHealer && party.length >= 4) {
    atkMult = 1.12;
    defMult = 1.11;
    hpMult = 1.02;
    lines.push('✨ 4인 철삼각 — 탱·딜·힐+');
  } else if (hasTank && hasDps && hasHealer && party.length >= 3) {
    atkMult = 1.09;
    defMult = 1.11;
    hpMult = 1.06;
    lines.push('✨ 철삼각 편성 (탱·딜·힐)');
  } else if (hasTank && hasDps) {
    atkMult = 1.08;
    defMult = 1.12;
    hpMult = 1.05;
    lines.push('🛡️ 탱-딜 콤보');
  } else if (hasTank && hasHealer) {
    atkMult = 0.94;
    defMult = 1.08;
    hpMult = 1.02;
    lines.push('💚 탱-힐 생존형 (화력 부족)');
  } else if (!hasTank && hasDps) {
    atkMult = 1.04;
    defMult = 0.92;
    hpMult = 0.94;
  } else if (hasTank && !hasDps) {
    atkMult = 0.8;
    defMult = 1.06;
    hpMult = 1.0;
  }

  return { atkMult, defMult, hpMult, lines };
}

/** 딜러·브루저 중층 생존 완화 — 10층 체감 난이도 조정 */
export function getDpsSurvivalCushion(regionId: number, role: EquipRole): { def: number; hp: number } {
  if (role !== 'dps' && role !== 'bruiser') return { def: 1, hp: 1 };
  if (regionId <= 9) return { def: 1.04, hp: 1.06 };
  if (regionId <= 11) return { def: 1.14, hp: 1.18 };
  if (regionId <= 14) return { def: 1.08, hp: 1.10 };
  return { def: 1.04, hp: 1.06 };
}
