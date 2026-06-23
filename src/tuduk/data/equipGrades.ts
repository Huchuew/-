import type { EquipGrade } from '../types';

/** F(허접) → UR(극한) → 초월 10단 — 총 20티어 */
export const GRADE_ORDER: EquipGrade[] = [
  'f', 'e', 'd', 'c', 'b', 'a', 's', 'sr', 'ssr', 'ur',
  'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'ua',
];

export const GRADE_LABEL: Record<EquipGrade, string> = {
  f: 'F · 허접',
  e: 'E · 조악',
  d: 'D · 평범',
  c: 'C · 준수',
  b: 'B · 우수',
  a: 'A · 희귀',
  s: 'S · 영웅',
  sr: 'SR · 전설',
  ssr: 'SSR · 초전설',
  ur: 'UR · 극한',
  u1: 'UR+ · 초월',
  u2: 'SH · 성흔',
  u3: 'DH · 신화',
  u4: 'GH · 대신',
  u5: 'PH · 범귀',
  u6: 'CH · 창세',
  u7: 'VH · 공허',
  u8: 'RH · 윤회',
  u9: 'AH · 절대',
  ua: 'OM · 종언',
};

export const GRADE_COLOR: Record<EquipGrade, string> = {
  f: '#777777',
  e: '#8a8a8a',
  d: '#55aa66',
  c: '#44aadd',
  b: '#5588ff',
  a: '#9966ff',
  s: '#ff9933',
  sr: '#ff5544',
  ssr: '#ffd700',
  ur: '#ff44cc',
  u1: '#ff66ee',
  u2: '#ee88ff',
  u3: '#cc99ff',
  u4: '#aaeeff',
  u5: '#88ffdd',
  u6: '#aaff88',
  u7: '#ffee88',
  u8: '#ffcc66',
  u9: '#ff8866',
  ua: '#ffffff',
};

/** 티어당 스탯 배율 — 후반 급상승으로 체감 강화 */
export const GRADE_POWER = [
  1, 1.85, 2.85, 4.05, 5.45, 7.05, 8.85, 10.95, 13.35, 16.05,
  19.5, 23.5, 28, 33, 38.5, 44.5, 51, 58, 65.5, 74,
];

export const GRADE_CRAFT_GOLD = [
  48, 105, 210, 380, 720,
  7200, 17800, 48000, 138000, 285000,
  528000, 798000, 1175000, 1720000, 2510000,
  3630000, 5220000, 7480000, 10150000, 13900000,
];

/** 중반~ 후반 제작 성공률 (0~7: 100%) */
export function getCraftSuccessRate(tier: number): number {
  if (tier < 8) return 1;
  if (tier < 12) return 0.92;
  if (tier < 16) return 0.84;
  return 0.74;
}

export const LEGACY_GRADE_MAP: Record<string, EquipGrade> = {
  common: 'd',
  uncommon: 'c',
  rare: 'b',
  hero: 'a',
  legend: 's',
  mythic: 'ssr',
};

export function gradeIndex(grade: EquipGrade): number {
  return GRADE_ORDER.indexOf(grade);
}

export function normalizeGrade(grade: string): EquipGrade {
  if (GRADE_ORDER.includes(grade as EquipGrade)) return grade as EquipGrade;
  return LEGACY_GRADE_MAP[grade] ?? 'f';
}
