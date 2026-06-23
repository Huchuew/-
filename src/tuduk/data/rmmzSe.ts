import type { ElementType } from '../types';
import type { SkillAnimTier } from './combatSkills';
import { assetUrl } from '../assets/AssetLoader';

/** 프로젝트에 복사되는 SE (npm run install:rmmz-se) */
export const RMMZ_SE_FILES = [
  'Absorb1.ogg', 'Attack1.ogg', 'Attack2.ogg', 'Attack3.ogg', 'Battle1.ogg', 'Battle2.ogg',
  'Bite.ogg', 'Blow1.ogg', 'Blow2.ogg', 'Blow3.ogg', 'Blow4.ogg', 'Blow5.ogg', 'Blow6.ogg', 'Blow7.ogg',
  'Bow1.ogg', 'Bow2.ogg', 'Bow3.ogg', 'Coin.ogg', 'Collapse1.ogg', 'Damage1.ogg', 'Damage2.ogg', 'Damage3.ogg',
  'Darkness1.ogg', 'Explosion1.ogg', 'Fire1.ogg', 'Fire2.ogg', 'Fire3.ogg', 'Fire4.ogg', 'Fire5.ogg', 'Fire6.ogg',
  'Flash1.ogg', 'Growl.ogg', 'Ice1.ogg', 'Ice2.ogg', 'Ice3.ogg', 'Ice4.ogg', 'Ice5.ogg',
  'Magic1.ogg', 'Magic2.ogg', 'Magic3.ogg', 'Magic4.ogg', 'Magic5.ogg', 'Magic6.ogg',
  'Magic7.ogg', 'Magic8.ogg', 'Magic9.ogg', 'Magic10.ogg', 'Magic11.ogg', 'Magic12.ogg',
  'Miss.ogg', 'Monster1.ogg', 'Monster2.ogg', 'Monster3.ogg', 'Monster4.ogg', 'Monster5.ogg',
  'Monster6.ogg', 'Monster7.ogg', 'Monster8.ogg', 'Monster9.ogg', 'Monster10.ogg',
  'Poison.ogg', 'Saint1.ogg', 'Saint2.ogg', 'Saint3.ogg', 'Shot1.ogg', 'Shot2.ogg', 'Shot3.ogg',
  'Skill1.ogg', 'Skill2.ogg', 'Skill3.ogg', 'Slash1.ogg', 'Slash2.ogg', 'Slash3.ogg', 'Slash4.ogg',
  'Slash5.ogg', 'Slash6.ogg', 'Slash7.ogg', 'Slash8.ogg', 'Splash.ogg',
  'Sword1.ogg', 'Sword2.ogg', 'Sword3.ogg', 'Sword4.ogg', 'Sword5.ogg', 'Sword6.ogg',
  'Thunder1.ogg', 'Thunder2.ogg', 'Thunder3.ogg', 'Thunder4.ogg', 'Thunder5.ogg',
  'Water1.ogg', 'Water2.ogg', 'Water3.ogg', 'Wind1.ogg', 'Wind2.ogg', 'Wind3.ogg',
] as const;

export type RmmzSeName = (typeof RMMZ_SE_FILES)[number];

export function sePath(file: RmmzSeName | string): string {
  return assetUrl(`assets/audio/se/${file}`);
}

/** 캐릭터별 일반 공격 SE 사다리 (티어 0→6) */
const CHAR_ATTACK: Record<string, RmmzSeName[]> = {
  mujang: ['Sword1.ogg', 'Sword2.ogg', 'Slash1.ogg', 'Slash3.ogg', 'Slash5.ogg', 'Slash7.ogg', 'Sword6.ogg'],
  huchu: ['Magic1.ogg', 'Magic2.ogg', 'Fire1.ogg', 'Fire3.ogg', 'Magic8.ogg', 'Fire5.ogg', 'Fire6.ogg'],
  dung: ['Bow1.ogg', 'Shot1.ogg', 'Bow2.ogg', 'Shot2.ogg', 'Wind2.ogg', 'Shot3.ogg', 'Bow3.ogg'],
  lesford: ['Sword4.ogg', 'Slash4.ogg', 'Attack2.ogg', 'Slash5.ogg', 'Sword5.ogg', 'Slash7.ogg', 'Attack3.ogg'],
  ampa: ['Slash5.ogg', 'Blow3.ogg', 'Sword5.ogg', 'Blow5.ogg', 'Slash6.ogg', 'Blow7.ogg', 'Slash8.ogg'],
  ujang: ['Blow4.ogg', 'Blow5.ogg', 'Slash6.ogg', 'Slash7.ogg', 'Sword5.ogg', 'Slash8.ogg', 'Attack3.ogg'],
  yujin: ['Saint1.ogg', 'Magic3.ogg', 'Skill1.ogg', 'Saint2.ogg', 'Magic6.ogg', 'Saint3.ogg', 'Magic10.ogg'],
  seoyoung: ['Wind2.ogg', 'Skill2.ogg', 'Magic4.ogg', 'Wind3.ogg', 'Skill3.ogg', 'Magic8.ogg', 'Magic11.ogg'],
  teso: ['Slash7.ogg', 'Skill3.ogg', 'Attack3.ogg', 'Slash8.ogg', 'Sword6.ogg', 'Skill2.ogg', 'Slash6.ogg'],
  horangi: ['Growl.ogg', 'Bite.ogg', 'Slash6.ogg', 'Monster5.ogg', 'Blow7.ogg', 'Attack3.ogg', 'Monster9.ogg'],
  hyesung: ['Thunder1.ogg', 'Slash5.ogg', 'Attack2.ogg', 'Thunder3.ogg', 'Slash7.ogg', 'Thunder5.ogg', 'Attack3.ogg'],
  isanim: ['Splash.ogg', 'Magic2.ogg', 'Water1.ogg', 'Magic4.ogg', 'Ice2.ogg', 'Magic6.ogg', 'Water3.ogg'],
  sanjeok: ['Growl.ogg', 'Blow4.ogg', 'Attack1.ogg', 'Blow6.ogg', 'Slash5.ogg', 'Blow7.ogg', 'Attack3.ogg'],
  sodia: ['Bow1.ogg', 'Attack2.ogg', 'Bow2.ogg', 'Shot2.ogg', 'Poison.ogg', 'Shot3.ogg', 'Bow3.ogg'],
  jimjimi: ['Sword4.ogg', 'Attack2.ogg', 'Slash4.ogg', 'Wind2.ogg', 'Sword5.ogg', 'Slash7.ogg', 'Attack3.ogg'],
  danjong: ['Attack2.ogg', 'Slash2.ogg', 'Skill2.ogg', 'Slash6.ogg', 'Sword5.ogg', 'Skill3.ogg', 'Slash8.ogg'],
  hyeoni: ['Magic1.ogg', 'Poison.ogg', 'Darkness1.ogg', 'Magic8.ogg', 'Explosion1.ogg', 'Magic10.ogg', 'Magic12.ogg'],
  pocket: ['Monster7.ogg', 'Sword2.ogg', 'Attack1.ogg', 'Sword6.ogg', 'Slash5.ogg', 'Attack3.ogg', 'Slash7.ogg'],
  cutie: ['Saint2.ogg', 'Wind3.ogg', 'Skill2.ogg', 'Saint3.ogg', 'Magic9.ogg', 'Wind2.ogg', 'Magic12.ogg'],
  hidden: ['Blow6.ogg', 'Fire4.ogg', 'Slash2.ogg', 'Growl.ogg', 'Fire5.ogg', 'Explosion1.ogg', 'Slash8.ogg'],
};

const ELEMENT_SKILL: Record<ElementType, Record<SkillAnimTier, RmmzSeName>> = {
  none: { 1: 'Slash1.ogg', 2: 'Slash3.ogg', 3: 'Skill1.ogg' },
  fire: { 1: 'Fire1.ogg', 2: 'Fire3.ogg', 3: 'Fire6.ogg' },
  water: { 1: 'Water1.ogg', 2: 'Ice2.ogg', 3: 'Ice5.ogg' },
  thunder: { 1: 'Thunder1.ogg', 2: 'Thunder3.ogg', 3: 'Thunder5.ogg' },
  poison: { 1: 'Poison.ogg', 2: 'Darkness1.ogg', 3: 'Explosion1.ogg' },
};

const MONSTER_ATTACK: Record<string, RmmzSeName[]> = {
  slime: ['Splash.ogg', 'Bite.ogg', 'Monster1.ogg'],
  orc: ['Growl.ogg', 'Attack1.ogg', 'Monster2.ogg'],
  skeleton: ['Attack2.ogg', 'Slash2.ogg', 'Monster3.ogg'],
  werewolf: ['Growl.ogg', 'Blow2.ogg', 'Monster4.ogg'],
  werebear: ['Blow3.ogg', 'Monster5.ogg', 'Attack3.ogg'],
  elite_orc: ['Monster6.ogg', 'Blow7.ogg', 'Growl.ogg'],
  armored_orc: ['Monster7.ogg', 'Sword6.ogg', 'Attack3.ogg'],
  armored_skeleton: ['Monster8.ogg', 'Slash8.ogg', 'Attack2.ogg'],
  greatsword_skeleton: ['Monster9.ogg', 'Slash7.ogg', 'Sword6.ogg'],
  skeleton_archer: ['Shot2.ogg', 'Monster3.ogg', 'Bow2.ogg'],
};

let rotateCounters = new Map<string, number>();

function pickRotating(list: RmmzSeName[], key: string): RmmzSeName {
  if (!list.length) return 'Attack1.ogg';
  const idx = rotateCounters.get(key) ?? 0;
  rotateCounters.set(key, idx + 1);
  return list[idx % list.length]!;
}

/** 티어 주변 2~3종을 번갈아 — 동일 티어에서도 단조로움 완화 */
function pickTierWindow(list: RmmzSeName[], tier: number, key: string): RmmzSeName {
  const t = Math.max(0, Math.min(list.length - 1, tier));
  const lo = Math.max(0, t - 1);
  const hi = Math.min(list.length - 1, t + 1);
  return pickRotating(list.slice(lo, hi + 1), key);
}

export function getCharAttackSe(charId: string, powerTier = 0): RmmzSeName {
  const list = CHAR_ATTACK[charId] ?? ['Attack1.ogg', 'Slash1.ogg', 'Slash3.ogg', 'Slash5.ogg', 'Slash7.ogg', 'Slash8.ogg', 'Attack3.ogg'];
  return pickTierWindow(list, powerTier, `atk:${charId}`);
}

/** 캐릭터 고유 스킬 SE (없으면 원소 스킬 SE) */
const CHAR_SKILL: Record<string, RmmzSeName[]> = {
  mujang: ['Sword2.ogg', 'Slash3.ogg', 'Slash5.ogg', 'Sword5.ogg', 'Slash8.ogg'],
  huchu: ['Fire1.ogg', 'Magic2.ogg', 'Fire3.ogg', 'Magic8.ogg', 'Fire6.ogg'],
  dung: ['Bow1.ogg', 'Shot1.ogg', 'Bow2.ogg', 'Shot3.ogg', 'Wind2.ogg'],
  ujang: ['Blow5.ogg', 'Slash6.ogg', 'Slash7.ogg', 'Sword5.ogg', 'Slash8.ogg'],
  yujin: ['Saint1.ogg', 'Magic3.ogg', 'Saint2.ogg', 'Magic6.ogg', 'Saint3.ogg'],
  horangi: ['Growl.ogg', 'Bite.ogg', 'Monster5.ogg', 'Slash6.ogg', 'Monster9.ogg'],
  hyesung: ['Thunder1.ogg', 'Slash5.ogg', 'Thunder3.ogg', 'Slash7.ogg', 'Thunder5.ogg'],
  hyeoni: ['Poison.ogg', 'Darkness1.ogg', 'Magic8.ogg', 'Explosion1.ogg', 'Magic12.ogg'],
  cutie: ['Saint2.ogg', 'Wind3.ogg', 'Skill2.ogg', 'Saint3.ogg', 'Magic12.ogg'],
  lesford: ['Sword4.ogg', 'Slash4.ogg', 'Attack2.ogg', 'Sword5.ogg', 'Slash8.ogg'],
  ampa: ['Slash5.ogg', 'Blow5.ogg', 'Slash6.ogg', 'Blow7.ogg', 'Slash8.ogg'],
  seoyoung: ['Wind2.ogg', 'Skill2.ogg', 'Wind3.ogg', 'Magic8.ogg', 'Magic11.ogg'],
  teso: ['Slash7.ogg', 'Skill3.ogg', 'Slash8.ogg', 'Sword6.ogg', 'Slash6.ogg'],
  isanim: ['Splash.ogg', 'Water1.ogg', 'Ice2.ogg', 'Magic6.ogg', 'Water3.ogg'],
  sanjeok: ['Growl.ogg', 'Blow6.ogg', 'Slash5.ogg', 'Blow7.ogg', 'Attack3.ogg'],
  sodia: ['Bow2.ogg', 'Shot2.ogg', 'Poison.ogg', 'Shot3.ogg', 'Bow3.ogg'],
  jimjimi: ['Sword4.ogg', 'Slash4.ogg', 'Wind2.ogg', 'Slash7.ogg', 'Attack3.ogg'],
  danjong: ['Slash2.ogg', 'Skill2.ogg', 'Slash6.ogg', 'Skill3.ogg', 'Slash8.ogg'],
  pocket: ['Monster7.ogg', 'Sword2.ogg', 'Sword6.ogg', 'Slash5.ogg', 'Slash7.ogg'],
  hidden: ['Blow6.ogg', 'Fire4.ogg', 'Fire5.ogg', 'Explosion1.ogg', 'Slash8.ogg'],
};

export function getCharSkillSe(
  charId: string,
  element: ElementType,
  animTier: SkillAnimTier,
  powerTier = 0,
): RmmzSeName {
  const list = CHAR_SKILL[charId];
  if (list?.length) {
    const tier = Math.max(0, Math.min(list.length - 1, animTier - 1 + Math.floor(powerTier / 2)));
    return pickTierWindow(list, tier, `skill:${charId}`);
  }
  return getSkillSeWithPower(element, animTier, powerTier);
}

const SKILL_HEAVY: Record<ElementType, RmmzSeName[]> = {
  none: ['Slash3.ogg', 'Slash5.ogg', 'Slash8.ogg'],
  fire: ['Fire3.ogg', 'Fire5.ogg', 'Fire6.ogg'],
  water: ['Ice2.ogg', 'Ice4.ogg', 'Ice5.ogg'],
  thunder: ['Thunder3.ogg', 'Thunder4.ogg', 'Thunder5.ogg'],
  poison: ['Darkness1.ogg', 'Poison.ogg', 'Explosion1.ogg'],
};

/** 스킬 티어 + 장비·전직 성장 합산 */
export function getSkillSeWithPower(
  element: ElementType,
  animTier: SkillAnimTier,
  powerTier = 0,
): RmmzSeName {
  const base = getSkillSe(element, animTier);
  const tier = Math.max(0, Math.min(6, powerTier));
  if (tier >= 5 && animTier >= 2) {
    const heavy = SKILL_HEAVY[element] ?? SKILL_HEAVY.none;
    return heavy[2]!;
  }
  if (tier >= 3 && animTier >= 2) {
    const heavy = SKILL_HEAVY[element] ?? SKILL_HEAVY.none;
    return heavy[Math.min(1, animTier - 1)]!;
  }
  if (tier >= 2 && animTier >= 2) return getSkillSe(element, 3);
  if (tier >= 1 && animTier >= 2) return getSkillSe(element, Math.min(3, animTier + 1) as SkillAnimTier);
  return base;
}

const UPGRADE_LADDER: RmmzSeName[] = [
  'Skill1.ogg', 'Skill2.ogg', 'Saint1.ogg', 'Saint2.ogg', 'Saint3.ogg', 'Magic10.ogg', 'Magic12.ogg',
];

const CRAFT_LADDER: RmmzSeName[] = [
  'Coin.ogg', 'Skill2.ogg', 'Skill3.ogg', 'Magic4.ogg', 'Magic8.ogg', 'Magic11.ogg', 'Flash1.ogg',
];

const EQUIP_LADDER: RmmzSeName[] = [
  'Skill1.ogg', 'Slash2.ogg', 'Slash4.ogg', 'Sword4.ogg', 'Sword6.ogg', 'Slash7.ogg', 'Slash8.ogg',
];

export function getUpgradeSe(tier = 0): RmmzSeName {
  return UPGRADE_LADDER[Math.min(UPGRADE_LADDER.length - 1, Math.max(0, tier))]!;
}

export function getCraftSe(tier = 0): RmmzSeName {
  return CRAFT_LADDER[Math.min(CRAFT_LADDER.length - 1, Math.max(0, tier))]!;
}

export function getEquipSe(tier = 0): RmmzSeName {
  return EQUIP_LADDER[Math.min(EQUIP_LADDER.length - 1, Math.max(0, tier))]!;
}

export function getSkillSe(element: ElementType, animTier: SkillAnimTier): RmmzSeName {
  const tier = Math.max(1, Math.min(3, animTier)) as SkillAnimTier;
  return ELEMENT_SKILL[element]?.[tier] ?? ELEMENT_SKILL.none[tier];
}

export function getMonsterSe(monsterId: string, tinyPack: string, isBoss: boolean): RmmzSeName {
  if (isBoss) {
    const pool = ['Monster6.ogg', 'Monster7.ogg', 'Monster8.ogg', 'Monster9.ogg', 'Monster10.ogg'] as RmmzSeName[];
    return pickRotating(pool, `monboss:${monsterId}`);
  }
  const list = MONSTER_ATTACK[tinyPack] ?? ['Attack1.ogg', 'Monster1.ogg', 'Growl.ogg'];
  return pickRotating(list, `mon:${tinyPack}`);
}

const HIT_LANDED_PHYS: RmmzSeName[] = ['Damage1.ogg', 'Damage2.ogg', 'Blow2.ogg', 'Slash2.ogg'];
const HIT_LANDED_MAGIC: RmmzSeName[] = ['Absorb1.ogg', 'Magic5.ogg', 'Water2.ogg'];

export function getHitLandedSe(magic: boolean): RmmzSeName {
  return pickRotating(magic ? HIT_LANDED_MAGIC : HIT_LANDED_PHYS, magic ? 'hit:magic' : 'hit:phys');
}

const HURT_PHYS: RmmzSeName[] = ['Damage3.ogg', 'Blow3.ogg', 'Blow5.ogg'];
const HURT_MAGIC: RmmzSeName[] = ['Magic5.ogg', 'Magic7.ogg', 'Damage2.ogg'];

export function getHurtSe(magic: boolean): RmmzSeName {
  return pickRotating(magic ? HURT_MAGIC : HURT_PHYS, magic ? 'hurt:magic' : 'hurt:phys');
}

const DOT_POOL: Record<ElementType, RmmzSeName[]> = {
  none: ['Damage2.ogg', 'Blow2.ogg'],
  fire: ['Fire2.ogg', 'Fire1.ogg'],
  water: ['Water2.ogg', 'Splash.ogg'],
  thunder: ['Thunder2.ogg', 'Thunder1.ogg'],
  poison: ['Poison.ogg', 'Darkness1.ogg'],
};

export function getKillSe(isBoss = false, isElite = false): RmmzSeName {
  if (isBoss) {
    return pickRotating(['Explosion1.ogg', 'Collapse1.ogg', 'Blow7.ogg'], 'kill:boss');
  }
  if (isElite) {
    return pickRotating(['Collapse1.ogg', 'Blow5.ogg', 'Slash4.ogg'], 'kill:elite');
  }
  return pickRotating(['Collapse1.ogg', 'Damage2.ogg', 'Blow3.ogg', 'Slash3.ogg'], 'kill:normal');
}

export function getDotSe(element: ElementType): RmmzSeName {
  const pool = DOT_POOL[element] ?? DOT_POOL.none;
  return pickRotating(pool, `dot:${element}`);
}

const ENCOUNTER_POOL: RmmzSeName[] = ['Wind3.ogg', 'Wind2.ogg', 'Battle1.ogg'];

export const UI_SE = {
  crit: 'Flash1.ogg' as RmmzSeName,
  kill: 'Collapse1.ogg' as RmmzSeName,
  gold: 'Coin.ogg' as RmmzSeName,
  touch: 'Blow2.ogg' as RmmzSeName,
  encounter: 'Wind3.ogg' as RmmzSeName,
  hurtMagic: 'Magic5.ogg' as RmmzSeName,
  hurtPhys: 'Damage3.ogg' as RmmzSeName,
  upgrade: 'Saint3.ogg' as RmmzSeName,
  fail: 'Miss.ogg' as RmmzSeName,
};

export function getEncounterSe(): RmmzSeName {
  return pickRotating(ENCOUNTER_POOL, 'encounter');
}
