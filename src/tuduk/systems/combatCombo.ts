/** 연속 웨이브 처치 시 이동 생략 기준 */
export const CHAIN_SKIP_AFTER = 2;

export const COMBO_MILESTONES = [3, 5, 10, 15, 20, 30, 50] as const;
export const COMBO_FEVER_AT = 20;

export interface ComboBuff {
  atkMult: number;
  spdMult: number;
  gaugeBonus: number;
  critBonus: number;
  goldMult: number;
  label: string;
  color: string;
  fever: boolean;
}

const NEUTRAL: ComboBuff = {
  atkMult: 1, spdMult: 1, gaugeBonus: 0, critBonus: 0, goldMult: 1,
  label: '', color: '#ffffff', fever: false,
};

export function getComboBuff(streak: number): ComboBuff {
  if (streak >= 50) {
    return {
      atkMult: 1.55, spdMult: 1.22, gaugeBonus: 0.12, critBonus: 0.12, goldMult: 1.32,
      label: '👑50연속!', color: '#ff44aa', fever: true,
    };
  }
  if (streak >= 30) {
    return {
      atkMult: 1.42, spdMult: 1.18, gaugeBonus: 0.10, critBonus: 0.10, goldMult: 1.24,
      label: '💥30연속!', color: '#ff5588', fever: true,
    };
  }
  if (streak >= COMBO_FEVER_AT) {
    return {
      atkMult: 1.34, spdMult: 1.16, gaugeBonus: 0.08, critBonus: 0.08, goldMult: 1.18,
      label: '🔥피버!', color: '#ff6644', fever: true,
    };
  }
  if (streak >= 15) {
    return {
      atkMult: 1.24, spdMult: 1.12, gaugeBonus: 0.05, critBonus: 0.05, goldMult: 1.12,
      label: '⚡15연속', color: '#ffaa44', fever: false,
    };
  }
  if (streak >= 10) {
    return {
      atkMult: 1.18, spdMult: 1.10, gaugeBonus: 0.04, critBonus: 0.04, goldMult: 1.08,
      label: '⚡10연속', color: '#ffcc44', fever: false,
    };
  }
  if (streak >= 5) {
    return {
      atkMult: 1.12, spdMult: 1.06, gaugeBonus: 0.03, critBonus: 0.03, goldMult: 1.05,
      label: '✨5연속', color: '#88ffcc', fever: false,
    };
  }
  if (streak >= 3) {
    return {
      atkMult: 1.08, spdMult: 1.04, gaugeBonus: 0.02, critBonus: 0.02, goldMult: 1.03,
      label: '✦3연속', color: '#aaddff', fever: false,
    };
  }
  return NEUTRAL;
}

/** 이동·후퇴 시 연속 카운트 완전 초기화 대신 일부 유지 */
export function decayComboStreak(streak: number, hardReset = false): number {
  if (hardReset || streak <= 0) return 0;
  const buff = getComboBuff(streak);
  if (buff.fever) return Math.max(COMBO_FEVER_AT - 2, streak - 4);
  if (streak >= 10) return Math.max(5, streak - 3);
  if (streak >= 5) return Math.max(2, streak - 2);
  return Math.max(0, streak - 1);
}

export function formatComboHud(streak: number): string {
  if (streak < 2) return '';
  const buff = getComboBuff(streak);
  const fever = buff.fever ? ' 🔥' : '';
  return buff.label ? `${buff.label} ×${streak}${fever}` : `연속 ×${streak}`;
}

export function getComboMilestoneMessage(streak: number): string | null {
  if (!(COMBO_MILESTONES as readonly number[]).includes(streak)) return null;
  const buff = getComboBuff(streak);
  if (streak >= COMBO_FEVER_AT) return `${buff.label} 공격·공속·게이지 폭발!`;
  if (streak >= 10) return `${buff.label} 콤보 가속!`;
  return `${buff.label} 연속 처치!`;
}
