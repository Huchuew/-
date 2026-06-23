import type { EquipGrade, EquipSlot } from '../types';
import type { EquipRecipe } from './equipment';
import { GRADE_ORDER } from './equipGrades';

/** 던전 드랍 전용 통합 장신구 */
export const ACCESSORY_DROP_RATE = 0.009;

interface AccessoryDef {
  id: string;
  name: string;
  slot: EquipSlot;
  grade: EquipGrade;
  regionMin: number;
  regionMax: number;
  atk: number;
  def: number;
  hp: number;
  atkSpd: number;
  crit: number;
}

const RAW: Omit<AccessoryDef, 'id'>[] = [
  { name: '이끼의 반지', slot: 'ring', grade: 'f', regionMin: 1, regionMax: 2, atk: 1, def: 1, hp: 8, atkSpd: 0, crit: 0.004 },
  { name: '가시의 목걸이', slot: 'necklace', grade: 'f', regionMin: 1, regionMax: 3, atk: 2, def: 0, hp: 5, atkSpd: 0.01, crit: 0.006 },
  { name: '바람의 유물', slot: 'relic', grade: 'e', regionMin: 2, regionMax: 4, atk: 2, def: 1, hp: 10, atkSpd: 0.012, crit: 0.005 },
  { name: '자연의 반지', slot: 'ring', grade: 'e', regionMin: 3, regionMax: 5, atk: 3, def: 2, hp: 14, atkSpd: 0, crit: 0.006 },
  { name: '화염의 목걸이', slot: 'necklace', grade: 'd', regionMin: 4, regionMax: 6, atk: 5, def: 1, hp: 12, atkSpd: 0.015, crit: 0.008 },
  { name: '냉기의 유물', slot: 'relic', grade: 'd', regionMin: 4, regionMax: 7, atk: 4, def: 3, hp: 18, atkSpd: 0, crit: 0.007 },
  { name: '번개의 반지', slot: 'ring', grade: 'd', regionMin: 5, regionMax: 8, atk: 4, def: 2, hp: 16, atkSpd: 0.018, crit: 0.01 },
  { name: '대지의 목걸이', slot: 'necklace', grade: 'c', regionMin: 6, regionMax: 9, atk: 6, def: 4, hp: 22, atkSpd: 0, crit: 0.009 },
  { name: '독안개의 유물', slot: 'relic', grade: 'c', regionMin: 6, regionMax: 10, atk: 7, def: 2, hp: 20, atkSpd: 0.02, crit: 0.012 },
  { name: '새벽의 반지', slot: 'ring', grade: 'c', regionMin: 7, regionMax: 11, atk: 5, def: 5, hp: 28, atkSpd: 0.01, crit: 0.01 },
  { name: '황혼의 목걸이', slot: 'necklace', grade: 'b', regionMin: 8, regionMax: 12, atk: 8, def: 4, hp: 30, atkSpd: 0.022, crit: 0.014 },
  { name: '달빛의 유물', slot: 'relic', grade: 'b', regionMin: 8, regionMax: 13, atk: 7, def: 6, hp: 35, atkSpd: 0, crit: 0.011 },
  { name: '별빛의 반지', slot: 'ring', grade: 'b', regionMin: 9, regionMax: 14, atk: 9, def: 3, hp: 32, atkSpd: 0.025, crit: 0.016 },
  { name: '심연의 목걸이', slot: 'necklace', grade: 'a', regionMin: 10, regionMax: 15, atk: 11, def: 7, hp: 40, atkSpd: 0, crit: 0.013 },
  { name: '성역의 유물', slot: 'relic', grade: 'a', regionMin: 10, regionMax: 16, atk: 10, def: 8, hp: 45, atkSpd: 0.018, crit: 0.015 },
  { name: '강철의 반지', slot: 'ring', grade: 'a', regionMin: 11, regionMax: 16, atk: 12, def: 6, hp: 38, atkSpd: 0.02, crit: 0.018 },
  { name: '용암의 목걸이', slot: 'necklace', grade: 's', regionMin: 12, regionMax: 17, atk: 14, def: 5, hp: 42, atkSpd: 0.028, crit: 0.02 },
  { name: '빙하의 유물', slot: 'relic', grade: 's', regionMin: 12, regionMax: 17, atk: 13, def: 10, hp: 55, atkSpd: 0, crit: 0.016 },
  { name: '폭풍의 반지', slot: 'ring', grade: 's', regionMin: 13, regionMax: 18, atk: 15, def: 7, hp: 48, atkSpd: 0.03, crit: 0.022 },
  { name: '고대의 목걸이', slot: 'necklace', grade: 'sr', regionMin: 13, regionMax: 18, atk: 18, def: 9, hp: 60, atkSpd: 0.025, crit: 0.024 },
  { name: '정령의 유물', slot: 'relic', grade: 'sr', regionMin: 14, regionMax: 18, atk: 16, def: 12, hp: 70, atkSpd: 0.02, crit: 0.02 },
  { name: '맹세의 반지', slot: 'ring', grade: 'sr', regionMin: 14, regionMax: 18, atk: 17, def: 8, hp: 58, atkSpd: 0.032, crit: 0.026 },
  { name: '망령의 목걸이', slot: 'necklace', grade: 'ssr', regionMin: 15, regionMax: 18, atk: 22, def: 10, hp: 75, atkSpd: 0.035, crit: 0.03 },
  { name: '태초의 유물', slot: 'relic', grade: 'ssr', regionMin: 15, regionMax: 18, atk: 20, def: 14, hp: 90, atkSpd: 0, crit: 0.028 },
  { name: '태양의 반지', slot: 'ring', grade: 'ssr', regionMin: 16, regionMax: 18, atk: 24, def: 11, hp: 80, atkSpd: 0.038, crit: 0.032 },
  { name: '달의 목걸이', slot: 'necklace', grade: 'ssr', regionMin: 16, regionMax: 18, atk: 21, def: 15, hp: 95, atkSpd: 0.03, crit: 0.03 },
  { name: '혼돈의 유물', slot: 'relic', grade: 'ssr', regionMin: 17, regionMax: 18, atk: 26, def: 12, hp: 85, atkSpd: 0.04, crit: 0.035 },
  { name: '수호의 반지', slot: 'ring', grade: 'e', regionMin: 2, regionMax: 5, atk: 2, def: 4, hp: 20, atkSpd: 0, crit: 0.004 },
  { name: '사냥꾼의 목걸이', slot: 'necklace', grade: 'f', regionMin: 1, regionMax: 4, atk: 3, def: 0, hp: 6, atkSpd: 0.014, crit: 0.008 },
  { name: '모험가의 유물', slot: 'relic', grade: 'f', regionMin: 1, regionMax: 3, atk: 1, def: 2, hp: 12, atkSpd: 0.008, crit: 0.005 },
  { name: '철벽의 반지', slot: 'ring', grade: 'c', regionMin: 7, regionMax: 10, atk: 4, def: 8, hp: 35, atkSpd: 0, crit: 0.006 },
  { name: '예언의 목걸이', slot: 'necklace', grade: 'd', regionMin: 5, regionMax: 8, atk: 5, def: 3, hp: 18, atkSpd: 0.016, crit: 0.012 },
  { name: '전장의 유물', slot: 'relic', grade: 'b', regionMin: 9, regionMax: 12, atk: 8, def: 6, hp: 38, atkSpd: 0.015, crit: 0.014 },
  { name: '그림자의 반지', slot: 'ring', grade: 'a', regionMin: 11, regionMax: 14, atk: 10, def: 4, hp: 34, atkSpd: 0.028, crit: 0.02 },
  { name: '생명의 목걸이', slot: 'necklace', grade: 's', regionMin: 12, regionMax: 15, atk: 7, def: 9, hp: 65, atkSpd: 0, crit: 0.01 },
  { name: '파멸의 유물', slot: 'relic', grade: 'sr', regionMin: 14, regionMax: 17, atk: 19, def: 7, hp: 52, atkSpd: 0.032, crit: 0.028 },
  { name: '수정의 반지', slot: 'ring', grade: 'c', regionMin: 6, regionMax: 9, atk: 6, def: 3, hp: 24, atkSpd: 0.02, crit: 0.011 },
  { name: '뇌전의 목걸이', slot: 'necklace', grade: 'b', regionMin: 8, regionMax: 11, atk: 9, def: 3, hp: 28, atkSpd: 0.026, crit: 0.018 },
  { name: '숲의 유물', slot: 'relic', grade: 'd', regionMin: 4, regionMax: 7, atk: 4, def: 4, hp: 22, atkSpd: 0.01, crit: 0.008 },
  { name: '용의 반지', slot: 'ring', grade: 'sr', regionMin: 15, regionMax: 18, atk: 20, def: 9, hp: 62, atkSpd: 0.034, crit: 0.027 },
  { name: '성검의 목걸이', slot: 'necklace', grade: 'ssr', regionMin: 17, regionMax: 18, atk: 23, def: 13, hp: 88, atkSpd: 0.032, crit: 0.031 },
  { name: '세계수의 유물', slot: 'relic', grade: 'a', regionMin: 10, regionMax: 13, atk: 9, def: 7, hp: 50, atkSpd: 0.012, crit: 0.014 },
  { name: '균열의 반지', slot: 'ring', grade: 's', regionMin: 13, regionMax: 16, atk: 14, def: 6, hp: 44, atkSpd: 0.03, crit: 0.021 },
  { name: '은빛의 목걸이', slot: 'necklace', grade: 'e', regionMin: 3, regionMax: 6, atk: 3, def: 3, hp: 16, atkSpd: 0.012, crit: 0.007 },
];

export const UNIVERSAL_ACCESSORIES: AccessoryDef[] = RAW.map((r, i) => ({
  ...r,
  id: `uni_acc_${String(i + 1).padStart(2, '0')}`,
}));

export const UNIVERSAL_ACCESSORY_RECIPES: EquipRecipe[] = UNIVERSAL_ACCESSORIES.map(a => ({
  id: a.id,
  name: a.name,
  slot: a.slot,
  grade: a.grade,
  desc: '던전 드랍 · 모든 캐릭터 장착 가능',
  atk: a.atk,
  def: a.def,
  hp: a.hp,
  atkSpd: a.atkSpd,
  crit: a.crit,
  craftGold: 0,
  materials: {},
  isUniversal: true,
} as EquipRecipe & { isUniversal: true }));

export function getAccessoriesForRegion(regionId: number): AccessoryDef[] {
  return UNIVERSAL_ACCESSORIES.filter(a => regionId >= a.regionMin && regionId <= a.regionMax);
}

export function pickRandomAccessoryDrop(regionId: number): AccessoryDef | null {
  const pool = getAccessoriesForRegion(regionId);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function formatAccessoryGradeList(regionId: number): string {
  const pool = getAccessoriesForRegion(regionId);
  const grades = [...new Set(pool.map(p => p.grade))].sort(
    (a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b),
  );
  return grades.map(g => g.toUpperCase()).join('·');
}
