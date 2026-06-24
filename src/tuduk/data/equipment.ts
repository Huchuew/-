import type { ArmorKind, ElementType, EquipGrade, EquipRole, EquipSlot, JobClass, WeaponKind } from '../types';
import { CHAR_MAP } from './characters';
import { CATALOG_RECIPES } from './equipmentCatalog';
import { GRADE_LABEL, GRADE_COLOR, GRADE_ORDER, gradeIndex } from './equipGrades';
import { UNIVERSAL_ACCESSORY_RECIPES } from './universalAccessories';
import { formatStatNum } from '../utils/formatStat';

export { GRADE_LABEL, GRADE_COLOR, GRADE_ORDER };

export interface EquipRecipe {
  id: string;
  name: string;
  slot: EquipSlot;
  grade: EquipGrade;
  desc: string;
  atk: number;
  def: number;
  hp: number;
  atkSpd: number;
  crit: number;
  craftGold: number;
  materials: Record<string, number>;
  charId?: string;
  weaponKind?: WeaponKind;
  armorKind?: ArmorKind;
  jobs?: JobClass[];
  /** 세트 시너지 ID */
  setId?: string;
  prefRole?: EquipRole;
  element?: ElementType;
  /** 던전 드랍 통합 장신구 — 모든 캐릭터 장착 */
  isUniversal?: boolean;
  /** 제작 성공률 0~1 (미설정 시 티어 기준) */
  craftRate?: number;
}

export const WEAPON_KIND_LABEL: Record<WeaponKind, string> = {
  sword: '검', bow: '활', staff: '지팡이', spear: '창',
  axe: '도끼', fist: '권갑', wand: '완드', cleaver: '식칼',
};

export const ARMOR_KIND_LABEL: Record<ArmorKind, string> = {
  plate: '판금', leather: '가죽', robe: '로브', cloth: '천옷',
};

export const MATERIAL_LABELS: Record<string, string> = {
  iron_ore: '철광석',
  slime_gel: '슬라임 젤리',
  shadow_wing: '그림자 날개',
  rare_ore: '희귀 광석',
  legend_scale: '전설 비늘',
  magic_dust: '마력 가루',
  beast_fang: '야수 송곳니',
  wood_chip: '목재 조각',
  spirit_thread: '정령 실',
  healing_herb: '치유 약초',
  void_shard: '공허 파편',
  rift_crystal: '균열 결정',
  spire_essence: '탑의 심핵',
};

const BUFFER_JOBS: JobClass[] = ['buffer_atk', 'buffer_spd', 'buffer_crit', 'buffer_exp'];

export const JOB_WEAPONS: Record<JobClass, WeaponKind[]> = {
  warrior: ['sword'],
  archer: ['bow'],
  mage: ['staff'],
  lancer: ['spear'],
  berserker: ['axe', 'sword'],
  fighter: ['fist'],
  buffer_atk: ['wand'],
  buffer_spd: ['wand'],
  buffer_crit: ['wand'],
  buffer_exp: ['wand'],
  chef: ['cleaver'],
  healer: ['wand', 'staff'],
};

export const JOB_ARMOR: Record<JobClass, ArmorKind[]> = {
  warrior: ['plate'],
  archer: ['leather'],
  mage: ['robe'],
  lancer: ['plate', 'leather'],
  berserker: ['leather', 'plate'],
  fighter: ['leather'],
  buffer_atk: ['robe', 'cloth'],
  buffer_spd: ['robe', 'cloth'],
  buffer_crit: ['robe', 'cloth'],
  buffer_exp: ['robe', 'cloth'],
  chef: ['cloth'],
  healer: ['robe', 'cloth'],
};

export function canCharUseRecipe(charId: string, recipe: EquipRecipe): boolean {
  const char = CHAR_MAP[charId];
  if (!char) return false;
  if (recipe.isUniversal) return true;
  if (recipe.charId && recipe.charId !== charId) return false;
  if (recipe.slot === 'weapon' && recipe.weaponKind) {
    return JOB_WEAPONS[char.job].includes(recipe.weaponKind);
  }
  if (recipe.slot === 'armor' && recipe.armorKind) {
    return JOB_ARMOR[char.job].includes(recipe.armorKind);
  }
  if (recipe.jobs?.length) return recipe.jobs.includes(char.job);
  return true;
}

export function getJobEquipHint(charId: string): string {
  const char = CHAR_MAP[charId];
  if (!char) return '';
  const weapons = JOB_WEAPONS[char.job].map(w => WEAPON_KIND_LABEL[w]).join('·');
  const armors = JOB_ARMOR[char.job].map(a => ARMOR_KIND_LABEL[a]).join('·');
  return `${char.name}(${char.jobLabel}) · 무기 ${weapons} / 방어구 ${armors} · 세트 시너지 권장`;
}

export function getCraftRecipesForChar(charId: string): EquipRecipe[] {
  return EQUIP_RECIPES.filter(r => canCharUseRecipe(charId, r));
}

export const EQUIP_RECIPES: EquipRecipe[] = [
  ...CATALOG_RECIPES,
  ...UNIVERSAL_ACCESSORY_RECIPES,
];

export const RECIPE_MAP = Object.fromEntries(EQUIP_RECIPES.map(r => [r.id, r]));

/** 모든 등급 공통 최대 +3강 */
export function getMaxEnhanceForGrade(_grade: EquipGrade): number {
  return 3;
}

/** 이전 세대 MAX 대비 +0이 살짝 위 — 베이스 스탯 폭증 방지 (티어당 최대 +8%) */
function applySoftTierBridges(recipes: EquipRecipe[]) {
  const byCharSlot = new Map<string, EquipRecipe[]>();
  for (const r of recipes) {
    if (r.isUniversal || !r.charId) continue;
    const key = `${r.charId}:${r.slot}`;
    const list = byCharSlot.get(key) ?? [];
    list.push(r);
    byCharSlot.set(key, list);
  }
  for (const chain of byCharSlot.values()) {
    chain.sort((a, b) => gradeIndex(a.grade) - gradeIndex(b.grade));
    for (let i = 1; i < chain.length; i++) {
      const prev = chain[i - 1]!;
      const next = chain[i]!;
      const prevMax = getEnhanceStatPreview(prev, getMaxEnhanceForGrade(prev.grade));
      const next0 = getEnhanceStatPreview(next, 0);
      const nextGi = gradeIndex(next.grade);
      const maxScale = nextGi <= 3 ? 1.35 : nextGi <= 6 ? 1.14 : 1.06;
      const bump = (cur: number, prevEff: number, nextEff: number) => {
        if (cur <= 0 || prevEff <= 0 || nextEff <= 0) return cur;
        if (nextEff >= prevEff * 1.02) return cur;
        const target = Math.ceil(prevEff * 1.03);
        const scale = Math.min(maxScale, target / Math.max(1, nextEff));
        return Math.ceil(cur * scale);
      };
      next.atk = bump(next.atk, prevMax.atk, next0.atk);
      next.def = bump(next.def, prevMax.def, next0.def);
      next.hp = bump(next.hp, prevMax.hp, next0.hp);
      if (prev.atkSpd > 0 && next.atkSpd > 0 && next0.atkSpd < prevMax.atkSpd * 1.02) {
        const target = Math.round(prevMax.atkSpd * 1.03 * 100) / 100;
        next.atkSpd = Math.max(next.atkSpd, Math.min(next.atkSpd * maxScale, target));
      }
      if (prev.crit > 0 && next.crit > 0 && next0.crit < prevMax.crit * 1.02) {
        const target = Math.round(prevMax.crit * 1.03 * 1000) / 1000;
        next.crit = Math.max(next.crit, Math.min(next.crit * maxScale, target));
      }
    }
  }
}

const ENHANCE_MULT: Record<EquipGrade, number> = {
  f: 1, e: 1.2, d: 1.4, c: 1.65, b: 2, a: 2.5, s: 3.2, sr: 4, ssr: 5, ur: 6.5,
  u1: 7.5, u2: 8.5, u3: 9.5, u4: 10.5, u5: 11.5, u6: 12.5, u7: 13.5, u8: 14.5, u9: 15.5, ua: 17,
};

/** A등급+ 강화·제작 프리미엄 */
function highGradeCostMult(grade: EquipGrade): number {
  const gi = gradeIndex(grade);
  if (gi < 5) return 1;
  return 2.65 + (gi - 5) * 0.78;
}

/** +3강 상한 기준 스탯 배율 */
function enhanceCapMult(_maxLv: number): number {
  return 1.82;
}

/** 초반 등급·강화 단계 골드 (할인 완화 — +3 상한에 맞춤) */
function earlyEnhanceGoldMult(level: number, grade: EquipGrade): number {
  const gi = gradeIndex(grade);
  if (gi >= 5) return highGradeCostMult(grade);
  if (level >= 2) return gi <= 4 ? 0.78 : gi <= 7 ? 0.9 : 1;
  if (level >= 1) return gi <= 4 ? 0.58 : gi <= 7 ? 0.72 : 0.86;
  return gi <= 4 ? 0.45 : gi <= 7 ? 0.58 : 0.72;
}

/** 강화 비용 — 골드·재료 상향 (+3 상한) */
export function enhanceCost(level: number, grade: EquipGrade): { gold: number; mats: Record<string, number> } {
  const gi = gradeIndex(grade);
  const gradeMult = ENHANCE_MULT[grade];
  const costMult = 1 + (gradeMult - 1) * (gi >= 5 ? 0.52 : 0.35);
  const tierScale = 1 + level * (gi >= 5 ? 0.12 : 0.08);
  const goldBase = gi >= 5 && gi <= 7 ? 7_500 : 8_800;
  const gold = Math.floor(
    goldBase * (level + 1) * costMult * tierScale * (1 + level * 0.045) * earlyEnhanceGoldMult(level, grade),
  );
  const iron = 1 + level + (gi >= 5 ? 1 : 0);
  if (level >= 2 && gi >= 4) {
    return { gold, mats: { iron_ore: iron, magic_dust: gi >= 5 ? 2 : 1 } };
  }
  if (level >= 1 && gi >= 6) {
    return { gold, mats: { iron_ore: iron, magic_dust: 1 } };
  }
  return { gold, mats: { iron_ore: iron } };
}

/**
 * 등급별 강화 상한 — 구(舊) 10강 체감에 맞춘 완만한 곡선
 */
export function enhanceBonus(level: number, grade?: EquipGrade): number {
  if (level <= 0) return 1;
  const maxLv = grade ? getMaxEnhanceForGrade(grade) : 3;
  const cap = enhanceCapMult(maxLv);
  const t = Math.min(1, level / maxLv);
  let mult = 1 + (cap - 1) * Math.pow(t, 0.94);
  if (level >= Math.ceil(maxLv * 0.5)) mult += (cap - 1) * 0.035;
  if (level >= maxLv) mult += (cap - 1) * 0.025;
  return mult;
}

export function getEnhanceStatPreview(recipe: EquipRecipe, level: number) {
  const mult = enhanceBonus(level, recipe.grade);
  return {
    atk: Math.floor(recipe.atk * mult),
    def: Math.floor(recipe.def * mult),
    hp: Math.floor(recipe.hp * mult),
    atkSpd: Math.round(recipe.atkSpd * mult * 100) / 100,
    crit: Math.round(recipe.crit * mult * 1000) / 1000,
  };
}

export function formatEnhanceStatDelta(recipe: EquipRecipe, level: number): string {
  const maxLv = getMaxEnhanceForGrade(recipe.grade);
  if (level >= maxLv) return 'MAX';
  const cur = getEnhanceStatPreview(recipe, level);
  const nxt = getEnhanceStatPreview(recipe, level + 1);
  const parts: string[] = [];
  if (recipe.atk) parts.push(`ATK ${cur.atk}→${nxt.atk}`);
  if (recipe.def) parts.push(`DEF ${cur.def}→${nxt.def}`);
  if (recipe.hp) parts.push(`HP ${cur.hp}→${nxt.hp}`);
  if (recipe.atkSpd) parts.push(`공속 ${formatStatNum(cur.atkSpd)}→${formatStatNum(nxt.atkSpd)}`);
  if (recipe.crit) parts.push(`치명 ${formatStatNum(cur.crit)}→${formatStatNum(nxt.crit)}`);
  const multCur = enhanceBonus(level, recipe.grade);
  const multNxt = enhanceBonus(level + 1, recipe.grade);
  return parts.join(' · ') || `×${formatStatNum(multCur)}→×${formatStatNum(multNxt)}`;
}

export function getEnhanceMilestoneLabel(nextLevel: number, grade?: EquipGrade): string | null {
  const maxLv = grade ? getMaxEnhanceForGrade(grade) : 3;
  if (nextLevel === maxLv) return '💥 +3 MAX 달성!';
  if (nextLevel === 2) return '✦ 2강 돌파';
  return null;
}

applySoftTierBridges(EQUIP_RECIPES);
