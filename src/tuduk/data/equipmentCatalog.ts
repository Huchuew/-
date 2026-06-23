import type { ArmorKind, ElementType, EquipRole, EquipSlot, JobClass, WeaponKind } from '../types';
import { CHARACTERS } from './characters';
import {
  GRADE_CRAFT_GOLD, GRADE_LABEL, GRADE_ORDER, GRADE_POWER, getCraftSuccessRate,
} from './equipGrades';
import { formatEquipDisplayName, getEquipBaseName } from './equipNames';
import type { EquipRecipe } from './equipment';

export interface CharEquipTemplate {
  charId: string;
  role: EquipRole;
  element: ElementType;
  weaponKind: WeaponKind;
  armorKind: ArmorKind;
  weaponTheme: string;
  armorTheme: string;
  ringTheme: string;
  neckTheme: string;
  relicTheme: string;
  /** 무기 스탯 가중 */
  wAtk: number;
  wSpd: number;
  wCrit: number;
  /** 방어구 가중 */
  aDef: number;
  aHp: number;
  aSpd: number;
}

const ACCESSORY_SLOTS: EquipSlot[] = [
  'ring', 'necklace', 'relic', 'ring', 'necklace', 'relic', 'ring', 'necklace', 'relic', 'relic',
];

const CHAR_TEMPLATES: CharEquipTemplate[] = [
  { charId: 'huchu', role: 'dps', element: 'fire', weaponKind: 'staff', armorKind: 'robe',
    weaponTheme: '지팡이', armorTheme: '로브', ringTheme: '비전 반지', neckTheme: '마나 목걸이', relicTheme: '화염 유물',
    wAtk: 9, wSpd: 0, wCrit: 0.012, aDef: 2, aHp: 8, aSpd: 0 },
  { charId: 'mujang', role: 'tank', element: 'thunder', weaponKind: 'sword', armorKind: 'plate',
    weaponTheme: '검', armorTheme: '판금', ringTheme: '수호 반지', neckTheme: '철벽 목걸이', relicTheme: '군단 유물',
    wAtk: 4, wSpd: 0.01, wCrit: 0.005, aDef: 12, aHp: 55, aSpd: -0.01 },
  { charId: 'ujang', role: 'dps', element: 'none', weaponKind: 'fist', armorKind: 'leather',
    weaponTheme: '권갑', armorTheme: '격투복', ringTheme: '연타 반지', neckTheme: '기백 목걸이', relicTheme: '무투 유물',
    wAtk: 6, wSpd: 0.012, wCrit: 0.015, aDef: 4, aHp: 12, aSpd: 0.008 },
  { charId: 'dung', role: 'dps', element: 'thunder', weaponKind: 'bow', armorKind: 'leather',
    weaponTheme: '활', armorTheme: '레인저 코트', ringTheme: '명중 반지', neckTheme: '바람 목걸이', relicTheme: '사수 유물',
    wAtk: 7, wSpd: 0.014, wCrit: 0.018, aDef: 3, aHp: 8, aSpd: 0.012 },
  { charId: 'lesford', role: 'dps', element: 'thunder', weaponKind: 'spear', armorKind: 'plate',
    weaponTheme: '창', armorTheme: '중갑', ringTheme: '관통 반지', neckTheme: '돌격 목걸이', relicTheme: '창술 유물',
    wAtk: 7, wSpd: 0.01, wCrit: 0.01, aDef: 6, aHp: 18, aSpd: -0.005 },
  { charId: 'ampa', role: 'bruiser', element: 'fire', weaponKind: 'axe', armorKind: 'leather',
    weaponTheme: '도끼', armorTheme: '광전사 갑', ringTheme: '광폭 반지', neckTheme: '혈기 목걸이', relicTheme: '학살 유물',
    wAtk: 8, wSpd: -0.01, wCrit: 0.014, aDef: 5, aHp: 28, aSpd: 0 },
  { charId: 'yujin', role: 'healer', element: 'water', weaponKind: 'wand', armorKind: 'robe',
    weaponTheme: '성봉', armorTheme: '성의 로브', ringTheme: '치유 반지', neckTheme: '성스러운 목걸이', relicTheme: '신앙 유물',
    wAtk: 3, wSpd: 0.01, wCrit: 0.005, aDef: 4, aHp: 20, aSpd: 0 },
  { charId: 'seoyoung', role: 'tank', element: 'water', weaponKind: 'sword', armorKind: 'plate',
    weaponTheme: '성검', armorTheme: '성기사 갑', ringTheme: '결의 반지', neckTheme: '수호 목걸이', relicTheme: '기사단 유물',
    wAtk: 3, wSpd: 0, wCrit: 0.004, aDef: 14, aHp: 62, aSpd: -0.015 },
  { charId: 'teso', role: 'tank', element: 'thunder', weaponKind: 'sword', armorKind: 'plate',
    weaponTheme: '성스러운 검', armorTheme: '성전 갑', ringTheme: '성역 반지', neckTheme: '맹세 목걸이', relicTheme: '성전 유물',
    wAtk: 4, wSpd: 0, wCrit: 0.006, aDef: 13, aHp: 58, aSpd: -0.012 },
  { charId: 'horangi', role: 'bruiser', element: 'none', weaponKind: 'axe', armorKind: 'leather',
    weaponTheme: '발톱', armorTheme: '수인 갑', ringTheme: '백호 반지', neckTheme: '산신 목걸이', relicTheme: '수인 유물',
    wAtk: 8, wSpd: -0.01, wCrit: 0.013, aDef: 5, aHp: 30, aSpd: 0 },
  { charId: 'hyesung', role: 'dps', element: 'thunder', weaponKind: 'sword', armorKind: 'leather',
    weaponTheme: '유성검', armorTheme: '돌격 갑', ringTheme: '유성 반지', neckTheme: '혜성 목걸이', relicTheme: '유성 유물',
    wAtk: 7, wSpd: 0.014, wCrit: 0.017, aDef: 3, aHp: 10, aSpd: 0.010 },
  { charId: 'isanim', role: 'support', element: 'water', weaponKind: 'wand', armorKind: 'robe',
    weaponTheme: '점액 지팡이', armorTheme: '슬라임 망토', ringTheme: '슬라임 반지', neckTheme: '이사님 목걸이', relicTheme: '슬라임 유물',
    wAtk: 2, wSpd: 0.02, wCrit: 0.004, aDef: 4, aHp: 18, aSpd: 0.015 },
  { charId: 'sanjeok', role: 'bruiser', element: 'none', weaponKind: 'axe', armorKind: 'leather',
    weaponTheme: '산적 도끼', armorTheme: '산적 갑', ringTheme: '산적 반지', neckTheme: '산적 목걸이', relicTheme: '산적 유물',
    wAtk: 7, wSpd: 0.015, wCrit: 0.012, aDef: 4, aHp: 22, aSpd: 0.01 },
  { charId: 'sodia', role: 'dps', element: 'poison', weaponKind: 'bow', armorKind: 'leather',
    weaponTheme: '뼈 활', armorTheme: '망령 코트', ringTheme: '망령 반지', neckTheme: '시민 목걸이', relicTheme: '망령 유물',
    wAtk: 7, wSpd: 0.014, wCrit: 0.016, aDef: 3, aHp: 8, aSpd: 0.012 },
  { charId: 'jimjimi', role: 'dps', element: 'thunder', weaponKind: 'spear', armorKind: 'plate',
    weaponTheme: '기병 창', armorTheme: '기마 갑', ringTheme: '돌격 반지', neckTheme: '짐짐이 목걸이', relicTheme: '기병 유물',
    wAtk: 7, wSpd: 0.012, wCrit: 0.01, aDef: 5, aHp: 16, aSpd: 0.005 },
  { charId: 'danjong', role: 'tank', element: 'poison', weaponKind: 'sword', armorKind: 'plate',
    weaponTheme: '망령 검', armorTheme: '왕의 갑', ringTheme: '망령왕 반지', neckTheme: '단종 목걸이', relicTheme: '망령왕 유물',
    wAtk: 3, wSpd: 0, wCrit: 0.004, aDef: 14, aHp: 64, aSpd: -0.014 },
  { charId: 'hyeoni', role: 'dps', element: 'poison', weaponKind: 'staff', armorKind: 'robe',
    weaponTheme: '망령 지팡이', armorTheme: '네크로 로브', ringTheme: '망령 반지', neckTheme: '현이V 목걸이', relicTheme: '네크로 유물',
    wAtk: 9, wSpd: 0, wCrit: 0.012, aDef: 2, aHp: 8, aSpd: 0 },
  { charId: 'pocket', role: 'tank', element: 'none', weaponKind: 'sword', armorKind: 'plate',
    weaponTheme: '철갑 검', armorTheme: '압축 갑옷', ringTheme: '철갑 반지', neckTheme: '포켓 목걸이', relicTheme: '철갑 유물',
    wAtk: 4, wSpd: 0, wCrit: 0.005, aDef: 12, aHp: 52, aSpd: -0.01 },
  { charId: 'cutie', role: 'bruiser', element: 'poison', weaponKind: 'sword', armorKind: 'plate',
    weaponTheme: '대검', armorTheme: '망령 갑', ringTheme: '망령 반지', neckTheme: '공허 목걸이', relicTheme: '언데드 유물',
    wAtk: 10, wSpd: -0.02, wCrit: 0.01, aDef: 7, aHp: 22, aSpd: -0.01 },
  { charId: 'hidden', role: 'support', element: 'none', weaponKind: 'cleaver', armorKind: 'cloth',
    weaponTheme: '식칼', armorTheme: '앞치마', ringTheme: '요리 반지', neckTheme: '향신 목걸이', relicTheme: '비밀 유물',
    wAtk: 2, wSpd: 0, wCrit: 0.004, aDef: 3, aHp: 15, aSpd: 0.01 },
];

function matCost(tier: number): Record<string, number> {
  if (tier <= 1) return { wood_chip: 2 + tier, iron_ore: 2 + tier };
  if (tier <= 4) return { iron_ore: 3 + tier, slime_gel: 2 + Math.floor(tier / 2) };
  if (tier <= 7) return { rare_ore: 3, magic_dust: 5 + tier, beast_fang: 3 };
  if (tier <= 11) return { rare_ore: 4 + Math.floor(tier / 2), magic_dust: 7 + tier * 2, beast_fang: 4, spirit_thread: 3 };
  if (tier <= 15) return { legend_scale: 3 + Math.floor(tier / 10), rare_ore: 7 + tier, void_shard: 3, magic_dust: 10 + tier };
  return { legend_scale: 4 + Math.floor(tier / 6), rare_ore: 10 + tier, void_shard: 4, rift_crystal: 3 };
}

/** S(영웅) 티어 인덱스 — 이상 제작 장비 추가 상향 */
export const S_CRAFT_TIER_INDEX = 6;

function tierStatBonus(tier: number): number {
  return 1 + Math.floor(tier / 3) * 0.12 + (tier >= 10 ? (tier - 9) * 0.08 : 0);
}

/** S등급부터 제작 스탯 추가 배율 */
function highGradeCraftMult(tier: number): number {
  if (tier < S_CRAFT_TIER_INDEX) return 1;
  const layers = tier - S_CRAFT_TIER_INDEX + 1;
  return 1 + layers * 0.13 + Math.max(0, tier - 9) * 0.055;
}

function craftStatPower(tier: number): number {
  return GRADE_POWER[tier]! * tierStatBonus(tier) * highGradeCraftMult(tier);
}

function buildWeapon(t: CharEquipTemplate, tier: number): EquipRecipe {
  const grade = GRADE_ORDER[tier]!;
  const p = craftStatPower(tier);
  const rate = getCraftSuccessRate(tier);
  return {
    id: `${t.charId}_w_${grade}`,
    name: formatEquipDisplayName(getEquipBaseName(t.charId, 'weapon', tier), grade),
    slot: 'weapon',
    grade,
    charId: t.charId,
    weaponKind: t.weaponKind,
    desc: `${CHARACTERS.find(c => c.id === t.charId)?.name} 전용 무기 · ${GRADE_LABEL[grade]?.split(' · ')[0] ?? grade}`,
    atk: Math.round(t.wAtk * p),
    def: tier >= 4 ? Math.floor(tier * 0.55) : 0,
    hp: tier >= 5 ? Math.floor(tier * 3.2) : 0,
    atkSpd: Math.round(t.wSpd * p * 100) / 100,
    crit: Math.round(t.wCrit * p * 1000) / 1000,
    craftGold: GRADE_CRAFT_GOLD[tier]!,
    materials: matCost(tier),
    craftRate: rate < 1 ? rate : undefined,
    setId: `${t.charId}_set`,
    prefRole: t.role,
    element: t.element,
  };
}

function buildArmor(t: CharEquipTemplate, tier: number): EquipRecipe {
  const grade = GRADE_ORDER[tier]!;
  const p = craftStatPower(tier);
  const rate = getCraftSuccessRate(tier);
  return {
    id: `${t.charId}_a_${grade}`,
    name: formatEquipDisplayName(getEquipBaseName(t.charId, 'armor', tier), grade),
    slot: 'armor',
    grade,
    charId: t.charId,
    armorKind: t.armorKind,
    desc: `${CHARACTERS.find(c => c.id === t.charId)?.name} 전용 방어구 · 역할 시너지`,
    atk: tier >= 6 ? Math.floor(tier * 0.45) : 0,
    def: Math.round(t.aDef * p),
    hp: Math.round(t.aHp * p),
    atkSpd: Math.round(t.aSpd * p * 100) / 100,
    crit: 0,
    craftGold: Math.floor(GRADE_CRAFT_GOLD[tier]! * 1.1),
    materials: matCost(tier),
    craftRate: rate < 1 ? rate : undefined,
    setId: `${t.charId}_set`,
    prefRole: t.role,
    element: t.element,
  };
}

function buildAccessory(t: CharEquipTemplate, tier: number): EquipRecipe {
  const grade = GRADE_ORDER[tier]!;
  const p = GRADE_POWER[tier]! * highGradeCraftMult(tier);
  const slot = ACCESSORY_SLOTS[tier]!;
  const roleBias = t.role === 'tank'
    ? { atk: 0, def: 4, hp: 22, atkSpd: 0, crit: 0 }
    : t.role === 'dps'
      ? { atk: 6, def: 0, hp: 0, atkSpd: 0.025, crit: 0.014 }
      : t.role === 'healer'
        ? { atk: 2, def: 2, hp: 12, atkSpd: 0, crit: 0 }
        : { atk: 3, def: 2, hp: 10, atkSpd: 0.01, crit: 0.006 };

  return {
    id: `${t.charId}_x_${grade}`,
    name: formatEquipDisplayName(getEquipBaseName(t.charId, slot, tier), grade),
    slot,
    grade,
    charId: t.charId,
    desc: `${getCharName(t.charId)} 악세 · ${slot === 'ring' ? '반지' : slot === 'necklace' ? '목걸이' : '유물'}`,
    atk: Math.round(roleBias.atk * p),
    def: Math.round(roleBias.def * p),
    hp: Math.round(roleBias.hp * p),
    atkSpd: Math.round(roleBias.atkSpd * p * 100) / 100,
    crit: Math.round(roleBias.crit * p * 1000) / 1000,
    craftGold: Math.floor(GRADE_CRAFT_GOLD[tier]! * 0.95),
    materials: matCost(tier),
    setId: `${t.charId}_set`,
    prefRole: t.role,
    element: t.element,
  };
}

function getCharName(id: string): string {
  return CHARACTERS.find(c => c.id === id)?.name ?? id;
}

function buildCharRecipes(t: CharEquipTemplate): EquipRecipe[] {
  const out: EquipRecipe[] = [];
  for (let i = 0; i < GRADE_ORDER.length; i++) {
    out.push(buildWeapon(t, i), buildArmor(t, i));
  }
  return out;
}

export const CATALOG_RECIPES: EquipRecipe[] = CHAR_TEMPLATES.flatMap(buildCharRecipes);

export const CHAR_EQUIP_LINES_FROM_CATALOG: Record<string, {
  weapon: string[];
  armor: string[];
  accessory: { label: string; slot: EquipSlot; recipeIds: string[] }[];
}> = Object.fromEntries(
  CHAR_TEMPLATES.map(t => {
    const weapons = GRADE_ORDER.map(g => `${t.charId}_w_${g}`);
    const armors = GRADE_ORDER.map(g => `${t.charId}_a_${g}`);
    return [t.charId, { weapon: weapons, armor: armors, accessory: [] }];
  }),
);

export function getCharElement(charId: string): ElementType {
  return CHAR_TEMPLATES.find(t => t.charId === charId)?.element ?? 'none';
}

export function getCharEquipRole(charId: string): EquipRole {
  return CHAR_TEMPLATES.find(t => t.charId === charId)?.role ?? 'dps';
}

export function getStarterRecipeId(charId: string, slot: 'weapon' | 'armor'): string | null {
  const lines = CHAR_EQUIP_LINES_FROM_CATALOG[charId];
  if (!lines) return null;
  return slot === 'weapon' ? lines.weapon[0] ?? null : lines.armor[0] ?? null;
}
