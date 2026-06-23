import type { ElementType, GrowthNode } from '../types';
import { BUFF_SKILL_DURATION_SEC } from './combatBalance';
import { ELEMENT_ICON, ELEMENT_LABEL, elementCssClass, formatElementBadge } from './elemental';
import { getPrestigeSkillHueShift } from './prestigeCombatFlavor';

export type SkillAnimTier = 1 | 2 | 3;
export type SkillKind = 'damage' | 'heal' | 'block' | 'buff' | 'cleanse';

export interface CombatSkillDef {
  nodeId: string;
  name: string;
  element: ElementType;
  procRate: number;
  damageMult: number;
  dotPct?: number;
  dotTicks?: number;
  animTier: SkillAnimTier;
  skillKind: SkillKind;
  /** heal: 최대 HP 대비 회복 비율 */
  healPct?: number;
  /** block: 받는 피해 감소 (다음 타격 1회) */
  blockPct?: number;
  /** buff: 스탯 배율 (1.12 = +12%) */
  buffAtkMult?: number;
  buffDefMult?: number;
  buffSpdMult?: number;
  buffDuration?: number;
  /** buff: true면 파티 전원 */
  buffParty?: boolean;
  /** cleanse: 제거할 디버프 최대 개수 */
  cleanseCount?: number;
  /** cleanse: 도트(statusEffects)도 1건 제거 */
  cleanseDots?: boolean;
  motionKey?: string;
  /** 차지 후 발동 (초) — 미지정 시 등급·거리형 자동 */
  chargeSec?: number;
  /** 근접 돌진 / 원거리 투사체 / 즉발 */
  delivery?: 'melee' | 'projectile' | 'instant';
}

type SkillSeed = Partial<Pick<CombatSkillDef,
  'element' | 'procRate' | 'damageMult' | 'dotPct' | 'dotTicks' | 'animTier' | 'skillKind'
  | 'healPct' | 'blockPct' | 'buffAtkMult' | 'buffDefMult' | 'buffSpdMult' | 'buffDuration' | 'buffParty'
  | 'cleanseCount' | 'cleanseDots' | 'motionKey' | 'chargeSec' | 'delivery'
>> & {
  name?: string;
};

const CHAR_ELEMENT: Record<string, ElementType> = {
  mujang: 'none', seoyoung: 'thunder', ujang: 'none', cutie: 'poison',
  dung: 'thunder', huchu: 'fire', yujin: 'none', lesford: 'thunder',
  teso: 'fire', ampa: 'fire', hidden: 'poison',
  horangi: 'none', hyesung: 'thunder', isanim: 'water', sanjeok: 'none',
  sodia: 'poison', jimjimi: 'thunder', danjong: 'poison', hyeoni: 'poison', pocket: 'none',
};

const SKILL_SEEDS: Record<string, SkillSeed> = {
  mj_sw_2: { animTier: 2 },
  mj_sw_4: { element: 'thunder', animTier: 3, delivery: 'melee', chargeSec: 0.42 },
  mj_sw_5: { element: 'thunder', animTier: 3, procRate: 0.22, damageMult: 2.2, delivery: 'melee', chargeSec: 0.45 },
  mj_pr_a_3: { animTier: 3, procRate: 0.26, damageMult: 2.5 },
  mj_pr_b_3: { animTier: 3, procRate: 0.28, damageMult: 2.6 },
  sy_buf_1: { name: '방패 자세', skillKind: 'block', motionKey: 'block', animTier: 2, blockPct: 0.28, procRate: 0.18 },
  sy_buf_3: { name: '불굴의 기사', skillKind: 'block', motionKey: 'block', animTier: 3, blockPct: 0.38, procRate: 0.16 },
  sy_cmb_2: { name: '수호 일격', animTier: 2, motionKey: 'attack02' },
  sy_cmb_4: { name: '수호의 일격', animTier: 3, motionKey: 'attack03', delivery: 'melee', chargeSec: 0.38 },
  sy_pr_a_3: { name: '수호기사', skillKind: 'block', motionKey: 'block', animTier: 3, blockPct: 0.42, procRate: 0.2 },
  sy_pr_b_3: { name: '복수의 기사', animTier: 3, procRate: 0.22, damageMult: 2.4, motionKey: 'attack03' },
  bh_buf_2: { name: '성역 결계', skillKind: 'block', motionKey: 'block', animTier: 2, blockPct: 0.32 },
  bh_cmb_3: { name: '성스러운 일격', animTier: 2, element: 'fire' },
  bh_cmb_4: { name: '성검 낙하', animTier: 3, element: 'fire', motionKey: 'attack03' },
  bh_pr_a_3: { name: '성검의 기사', animTier: 3, procRate: 0.24, damageMult: 2.4, element: 'fire', motionKey: 'attack03' },
  bh_pr_b_3: { name: '심판관', skillKind: 'block', motionKey: 'block', animTier: 3, blockPct: 0.36, procRate: 0.18 },
  ct_cmb_2: { name: '해골 참격', animTier: 2, element: 'poison', motionKey: 'attack02' },
  ct_cmb_4: { name: '망령의 대검', animTier: 3, element: 'poison', motionKey: 'attack03' },
  ct_pr_a_3: { name: '공허의 검', animTier: 3, procRate: 0.22, damageMult: 2.6, element: 'poison' },
  ct_pr_b_3: { name: '망령 군주', skillKind: 'block', motionKey: 'block', animTier: 3, blockPct: 0.34, procRate: 0.17 },
  yj_buf_1: { name: '응급 치유', skillKind: 'heal', motionKey: 'heal', healPct: 0.05, procRate: 0.2, animTier: 2 },
  yj_buf_2: { name: '재생의 기도', skillKind: 'heal', motionKey: 'heal', healPct: 0.065, procRate: 0.18, animTier: 2 },
  yj_buf_3: { name: '대치유의 축복', skillKind: 'heal', motionKey: 'heal', healPct: 0.09, procRate: 0.16, animTier: 3 },
  yj_mag_3: { name: '천벌의 광휘', animTier: 2, element: 'thunder', motionKey: 'attack02' },
  yj_mag_4: { name: '성광 폭발', animTier: 3, element: 'thunder', motionKey: 'attack03' },
  yj_pr_a_3: { name: '성인', skillKind: 'heal', motionKey: 'heal', healPct: 0.1, procRate: 0.12, animTier: 3 },
  yj_pr_b_3: { name: '심판자', animTier: 3, procRate: 0.2, damageMult: 2.3, element: 'thunder', motionKey: 'attack03' },
  hd_cook_3: { name: '매운 국물', skillKind: 'heal', motionKey: 'heal', healPct: 0.055, procRate: 0.16, animTier: 2 },
  hd_cook_5: { name: '만찬의 축복', skillKind: 'heal', motionKey: 'heal', healPct: 0.085, animTier: 3, element: 'poison' },
  mn_buf_2: { name: '점성 치유', skillKind: 'heal', motionKey: 'heal', healPct: 0.05, procRate: 0.17, animTier: 2 },
  mn_spd_2: { name: '안개 정화', skillKind: 'cleanse', motionKey: 'heal', cleanseCount: 1, cleanseDots: true, procRate: 0.14, animTier: 2 },
  hc_sp_2: { name: '화염구', procRate: 0.17, animTier: 2, delivery: 'projectile', chargeSec: 0.34 },
  hc_sp_5: { procRate: 0.28, damageMult: 2.6, animTier: 3, motionKey: 'attack03', delivery: 'projectile', chargeSec: 0.52 },
  hc_rn_4: { element: 'water', animTier: 3, procRate: 0.22, delivery: 'projectile', chargeSec: 0.48 },
  dg_arc_2: { animTier: 2, motionKey: 'attack02', delivery: 'projectile', chargeSec: 0.32 },
  dg_arc_4: { name: '바람의 화살', animTier: 3, motionKey: 'attack03', delivery: 'projectile', chargeSec: 0.5 },
  ls_spr_3: { name: '용찌르기', element: 'thunder', animTier: 2, delivery: 'melee', chargeSec: 0.28 },
  am_rg_4: { name: '멸망의 일격', animTier: 3, procRate: 0.22, motionKey: 'attack03', delivery: 'melee', chargeSec: 0.44 },
  uj_cmb_2: { animTier: 2, motionKey: 'attack02', delivery: 'melee', chargeSec: 0.28 },
  uj_cmb_4: { name: '검풍', element: 'none', animTier: 3, motionKey: 'attack03', delivery: 'melee', chargeSec: 0.4 },
};

export const COMBAT_SKILLS: CombatSkillDef[] = [];
let SKILL_BY_NODE: Record<string, CombatSkillDef> = {};

function nodeTier(nodeId: string): number {
  const n = Number(nodeId.split('_').pop());
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function inferElement(charId: string, nodeId: string): ElementType {
  if (nodeId.startsWith('hc_rn')) return 'water';
  if (nodeId.startsWith('hc_sp')) return 'fire';
  if (nodeId.includes('_pr_')) return CHAR_ELEMENT[charId] ?? 'none';
  return CHAR_ELEMENT[charId] ?? 'none';
}

function isCombatSkillNode(n: GrowthNode): boolean {
  const tier = nodeTier(n.id);
  if (n.atk && n.atk > 0) return true;
  if ((n.atkSpd ?? 0) > 0 && tier >= 2) return true;
  if ((n.crit ?? 0) >= 0.05 && tier >= 2) return true;
  if ((n.def ?? 0) >= 8 && tier >= 2) return true;
  if ((n.hp ?? 0) >= 25 && tier >= 2) return true;
  if ((n.buffAtk ?? 0) > 0 || (n.buffSpd ?? 0) > 0 || (n.buffCrit ?? 0) > 0) return tier >= 1;
  if ((n.buffExp ?? 0) > 0 && tier >= 2) return true;
  return false;
}

function buildSkillFromNode(n: GrowthNode): CombatSkillDef | null {
  if (!isCombatSkillNode(n)) return null;
  const tier = nodeTier(n.id);
  const prestige = n.id.includes('_pr_');
  const is4th = n.branchTier === 3;
  const seed = SKILL_SEEDS[n.id] ?? {};
  const element = seed.element ?? inferElement(n.charId, n.id);
  const animTier: SkillAnimTier = seed.animTier ?? (tier >= 4 || prestige ? 3 : tier >= 2 ? 2 : 1);
  const procRate = seed.procRate ?? Math.min(0.5,
    0.14 + tier * 0.045 + (prestige ? 0.06 : 0) + (is4th ? 0.11 : 0));
  const damageMult = seed.damageMult ?? (
    1.28 + tier * 0.26 + (prestige ? 0.42 : 0) + (is4th ? 0.78 : 0) + (n.atk ?? 0) * 0.009
  );
  const skillKind: SkillKind = seed.skillKind
    ?? (n.charId === 'yujin' && n.id.includes('_buf') ? 'heal'
      : (n.charId === 'hidden' && n.id.includes('cook') ? 'heal'
        : ((n.def ?? 0) >= 10 && tier >= 2 ? 'block' : 'damage')));

  const hasDot = element !== 'none' && animTier >= 2 && skillKind === 'damage';
  const dotPct = hasDot ? 0.09 + tier * 0.018 : undefined;
  const dotTicks = hasDot ? 4 + Math.min(5, tier) : undefined;

  return {
    nodeId: n.id,
    name: seed.name ?? n.name,
    element,
    procRate,
    damageMult: skillKind === 'heal' ? 0 : damageMult,
    dotPct: seed.dotPct ?? dotPct,
    dotTicks: seed.dotTicks ?? dotTicks,
    animTier,
    skillKind,
    healPct: seed.healPct ?? (skillKind === 'heal'
      ? 0.06 + tier * 0.025 + (is4th ? 0.05 : 0) : undefined),
    blockPct: seed.blockPct ?? (skillKind === 'block'
      ? 0.15 + tier * 0.04 + (is4th ? 0.12 : 0) : undefined),
    motionKey: seed.motionKey
      ?? (skillKind === 'heal' ? 'heal' : skillKind === 'block' ? 'block' : animTier >= 3 ? 'attack03' : animTier >= 2 ? 'attack02' : undefined),
    chargeSec: seed.chargeSec,
    delivery: seed.delivery,
  };
}

export function registerGrowthSkills(nodes: GrowthNode[]) {
  COMBAT_SKILLS.length = 0;
  for (const n of nodes) {
    const skill = buildSkillFromNode(n);
    if (skill) COMBAT_SKILLS.push(skill);
  }
  registerSignatureBuffs();
  registerInnateSkills();
  SKILL_BY_NODE = Object.fromEntries(COMBAT_SKILLS.map(s => [s.nodeId, s]));
}

export function getSkillForNode(nodeId: string): CombatSkillDef | undefined {
  return SKILL_BY_NODE[nodeId];
}

const SIGNATURE_BUFF_SKILLS: CombatSkillDef[] = [
  { nodeId: 'sig_mujang', name: '전장의 함성', element: 'none', procRate: 0.18, damageMult: 0, animTier: 2, skillKind: 'buff', buffDefMult: 1.18, buffDuration: 36, buffParty: true, motionKey: 'block' },
  { nodeId: 'sig_huchu', name: '마력 증폭', element: 'fire', procRate: 0.17, damageMult: 0, animTier: 2, skillKind: 'buff', buffAtkMult: 1.16, buffDuration: 33, buffParty: true, motionKey: 'attack02' },
  { nodeId: 'sig_dung', name: '바람의 집중', element: 'thunder', procRate: 0.18, damageMult: 0, animTier: 2, skillKind: 'buff', buffSpdMult: 1.2, buffAtkMult: 1.1, buffDuration: 30, buffParty: true, motionKey: 'attack02' },
  { nodeId: 'sig_ujang', name: '연타 집중', element: 'none', procRate: 0.19, damageMult: 0, animTier: 2, skillKind: 'buff', buffSpdMult: 1.24, buffAtkMult: 1.08, buffDuration: 27, buffParty: true, motionKey: 'attack02' },
  { nodeId: 'sig_lesford', name: '창진 결속', element: 'thunder', procRate: 0.17, damageMult: 0, animTier: 2, skillKind: 'buff', buffAtkMult: 1.18, buffDefMult: 1.1, buffDuration: 33, buffParty: true, motionKey: 'attack02' },
  { nodeId: 'sig_ampa', name: '광기의 외침', element: 'fire', procRate: 0.16, damageMult: 0, animTier: 3, skillKind: 'buff', buffAtkMult: 1.32, buffSpdMult: 1.18, buffDuration: 24, buffParty: false, motionKey: 'attack03' },
  { nodeId: 'sig_yujin', name: '축복의 장막', element: 'none', procRate: 0.18, damageMult: 0, animTier: 2, skillKind: 'buff', buffDefMult: 1.16, buffDuration: 39, buffParty: true, motionKey: 'heal' },
  { nodeId: 'sig_seoyoung', name: '수호의 맹세', element: 'thunder', procRate: 0.17, damageMult: 0, animTier: 2, skillKind: 'buff', buffDefMult: 1.22, buffDuration: 36, buffParty: true, motionKey: 'block' },
  { nodeId: 'sig_teso', name: '성역 가호', element: 'fire', procRate: 0.17, damageMult: 0, animTier: 2, skillKind: 'buff', buffDefMult: 1.18, buffAtkMult: 1.1, buffDuration: 33, buffParty: true, motionKey: 'block' },
  { nodeId: 'sig_horangi', name: '라미의 포효', element: 'none', procRate: 0.18, damageMult: 0, animTier: 2, skillKind: 'buff', buffAtkMult: 1.28, buffSpdMult: 1.18, buffDuration: 30, buffParty: false, motionKey: 'attack02' },
  { nodeId: 'sig_hyesung', name: '혜성 가속', element: 'thunder', procRate: 0.18, damageMult: 0, animTier: 2, skillKind: 'buff', buffSpdMult: 1.26, buffAtkMult: 1.12, buffDuration: 24, buffParty: false, motionKey: 'attack02' },
  { nodeId: 'sig_isanim', name: '점성 치유', element: 'water', procRate: 0.17, damageMult: 0, animTier: 2, skillKind: 'heal', healPct: 0.052, buffDuration: 0, buffParty: true, motionKey: 'heal' },
  { nodeId: 'sig_sanjeok', name: '산적 함성', element: 'none', procRate: 0.17, damageMult: 0, animTier: 2, skillKind: 'buff', buffAtkMult: 1.18, buffDuration: 30, buffParty: true, motionKey: 'attack02' },
  { nodeId: 'sig_sodia', name: '망령 조준', element: 'poison', procRate: 0.17, damageMult: 0, animTier: 2, skillKind: 'buff', buffAtkMult: 1.18, buffSpdMult: 1.1, buffDuration: 30, buffParty: false, motionKey: 'attack02' },
  { nodeId: 'sig_jimjimi', name: '돌격 대형', element: 'thunder', procRate: 0.17, damageMult: 0, animTier: 2, skillKind: 'buff', buffAtkMult: 1.14, buffDefMult: 1.12, buffDuration: 33, buffParty: true, motionKey: 'attack02' },
  { nodeId: 'sig_danjong', name: '왕의 결의', element: 'poison', procRate: 0.16, damageMult: 0, animTier: 2, skillKind: 'buff', buffDefMult: 1.24, buffDuration: 36, buffParty: true, motionKey: 'block' },
  { nodeId: 'sig_hyeoni', name: '망령 저주', element: 'poison', procRate: 0.17, damageMult: 0, animTier: 2, skillKind: 'buff', buffAtkMult: 1.18, buffDuration: 30, buffParty: false, motionKey: 'attack02' },
  { nodeId: 'sig_pocket', name: '철갑 방벽', element: 'none', procRate: 0.17, damageMult: 0, animTier: 2, skillKind: 'buff', buffDefMult: 1.2, buffDuration: 33, buffParty: true, motionKey: 'block' },
  { nodeId: 'sig_cutie', name: '망령의 기운', element: 'poison', procRate: 0.16, damageMult: 0, animTier: 2, skillKind: 'buff', buffAtkMult: 1.2, buffSpdMult: 1.12, buffDuration: 30, buffParty: false, motionKey: 'attack02' },
  { nodeId: 'sig_hidden', name: '해독 수프', element: 'poison', procRate: 0.18, damageMult: 0, animTier: 2, skillKind: 'heal', healPct: 0.05, buffParty: true, motionKey: 'heal' },
];

const SIGNATURE_BY_CHAR: Record<string, CombatSkillDef> = Object.fromEntries(
  SIGNATURE_BUFF_SKILLS.map(s => [s.nodeId.replace('sig_', ''), s]),
);

function innateSkill(
  charId: string,
  slot: number,
  name: string,
  kind: SkillKind,
  opts: Partial<CombatSkillDef> = {},
): CombatSkillDef {
  const element = opts.element ?? CHAR_ELEMENT[charId] ?? 'none';
  return {
    nodeId: `inn_${charId}_${slot}`,
    name,
    element,
    procRate: opts.procRate ?? 0.16,
    damageMult: kind === 'damage' ? (opts.damageMult ?? 1.35) : 0,
    animTier: opts.animTier ?? 2,
    skillKind: kind,
    healPct: opts.healPct,
    blockPct: opts.blockPct,
    buffAtkMult: opts.buffAtkMult,
    buffDefMult: opts.buffDefMult,
    buffSpdMult: opts.buffSpdMult,
    buffDuration: opts.buffDuration ?? BUFF_SKILL_DURATION_SEC,
    buffParty: opts.buffParty,
    cleanseCount: opts.cleanseCount,
    cleanseDots: opts.cleanseDots,
    dotPct: opts.dotPct,
    dotTicks: opts.dotTicks,
    motionKey: opts.motionKey ?? (kind === 'heal' || kind === 'cleanse' ? 'heal' : kind === 'block' ? 'block' : 'attack02'),
  };
}

/** 성장 해금 없이도 전투에 등장하는 기본 스킬 (캐릭터당 2~3개) */
const INNATE_CHAR_SKILLS: Record<string, CombatSkillDef[]> = {
  huchu: [
    innateSkill('huchu', 1, '불꽃탄', 'damage', { procRate: 0.17, damageMult: 1.42, element: 'fire' }),
    innateSkill('huchu', 2, '열파', 'damage', { procRate: 0.14, damageMult: 1.65, animTier: 3, element: 'fire' }),
  ],
  mujang: [
    innateSkill('mujang', 1, '방패 강타', 'block', { procRate: 0.15, blockPct: 0.22 }),
    innateSkill('mujang', 2, '도발 일격', 'damage', { procRate: 0.16, damageMult: 1.28 }),
  ],
  ujang: [
    innateSkill('ujang', 1, '연속 베기', 'damage', { procRate: 0.18, damageMult: 1.32 }),
    innateSkill('ujang', 2, '검풍', 'damage', { procRate: 0.14, damageMult: 1.58, animTier: 3 }),
  ],
  dung: [
    innateSkill('dung', 1, '조준 사격', 'damage', { procRate: 0.17, damageMult: 1.38, element: 'thunder' }),
    innateSkill('dung', 2, '저격', 'damage', { procRate: 0.13, damageMult: 1.72, animTier: 3, element: 'thunder' }),
  ],
  lesford: [
    innateSkill('lesford', 1, '창 찌르기', 'damage', { procRate: 0.16, damageMult: 1.4, element: 'thunder' }),
    innateSkill('lesford', 2, '관통 찌르기', 'damage', { procRate: 0.14, damageMult: 1.62, animTier: 3 }),
  ],
  ampa: [
    innateSkill('ampa', 1, '분노 일격', 'damage', { procRate: 0.16, damageMult: 1.45, element: 'fire' }),
    innateSkill('ampa', 2, '광폭', 'buff', { procRate: 0.13, buffAtkMult: 1.18, buffParty: false }),
  ],
  yujin: [
    innateSkill('yujin', 1, '치유의 손', 'heal', { procRate: 0.22, healPct: 0.045, animTier: 2 }),
    innateSkill('yujin', 2, '정화 기도', 'cleanse', { procRate: 0.14, cleanseCount: 2, cleanseDots: true }),
    innateSkill('yujin', 3, '수호 축복', 'buff', { procRate: 0.12, buffDefMult: 1.12, buffParty: true }),
  ],
  seoyoung: [
    innateSkill('seoyoung', 1, '방패 자세', 'block', { procRate: 0.16, blockPct: 0.26 }),
    innateSkill('seoyoung', 2, '수호 일격', 'damage', { procRate: 0.15, damageMult: 1.34, element: 'thunder' }),
  ],
  teso: [
    innateSkill('teso', 1, '성역 결계', 'block', { procRate: 0.15, blockPct: 0.24 }),
    innateSkill('teso', 2, '성광 베기', 'damage', { procRate: 0.16, damageMult: 1.36, element: 'fire' }),
  ],
  horangi: [
    innateSkill('horangi', 1, '발톱 베기', 'damage', { procRate: 0.19, damageMult: 1.55 }),
    innateSkill('horangi', 2, '포효', 'buff', { procRate: 0.15, buffAtkMult: 1.22, buffSpdMult: 1.14 }),
  ],
  hyesung: [
    innateSkill('hyesung', 1, '유성 베기', 'damage', { procRate: 0.17, damageMult: 1.4, element: 'thunder' }),
    innateSkill('hyesung', 2, '혜성 가속', 'buff', { procRate: 0.14, buffSpdMult: 1.18, buffAtkMult: 1.08 }),
  ],
  isanim: [
    innateSkill('isanim', 1, '점액 흡수', 'heal', { procRate: 0.2, healPct: 0.04, element: 'water' }),
    innateSkill('isanim', 2, '점액 세정', 'cleanse', { procRate: 0.15, cleanseCount: 1, cleanseDots: true, element: 'water' }),
    innateSkill('isanim', 3, '가속 분비', 'buff', { procRate: 0.14, buffSpdMult: 1.14, buffParty: true }),
  ],
  sanjeok: [
    innateSkill('sanjeok', 1, '강타', 'damage', { procRate: 0.17, damageMult: 1.38 }),
    innateSkill('sanjeok', 2, '약탈 일격', 'damage', { procRate: 0.14, damageMult: 1.55, animTier: 3 }),
  ],
  sodia: [
    innateSkill('sodia', 1, '독화살', 'damage', { procRate: 0.16, damageMult: 1.4, element: 'poison', dotPct: 0.08, dotTicks: 4 }),
    innateSkill('sodia', 2, '저격', 'damage', { procRate: 0.13, damageMult: 1.68, animTier: 3, element: 'poison' }),
  ],
  jimjimi: [
    innateSkill('jimjimi', 1, '돌격 찌르기', 'damage', { procRate: 0.16, damageMult: 1.4, element: 'thunder' }),
    innateSkill('jimjimi', 2, '질풍 돌진', 'damage', { procRate: 0.14, damageMult: 1.6, animTier: 3 }),
  ],
  danjong: [
    innateSkill('danjong', 1, '왕검 방어', 'block', { procRate: 0.15, blockPct: 0.24 }),
    innateSkill('danjong', 2, '망령 일격', 'damage', { procRate: 0.15, damageMult: 1.36, element: 'poison' }),
  ],
  hyeoni: [
    innateSkill('hyeoni', 1, '저주탄', 'damage', { procRate: 0.16, damageMult: 1.42, element: 'poison' }),
    innateSkill('hyeoni', 2, '망령 폭발', 'damage', { procRate: 0.13, damageMult: 1.66, animTier: 3, element: 'poison' }),
  ],
  pocket: [
    innateSkill('pocket', 1, '철갑 방어', 'block', { procRate: 0.16, blockPct: 0.22 }),
    innateSkill('pocket', 2, '오크 강타', 'damage', { procRate: 0.15, damageMult: 1.32 }),
  ],
  cutie: [
    innateSkill('cutie', 1, '대검 베기', 'damage', { procRate: 0.15, damageMult: 1.44, element: 'poison' }),
    innateSkill('cutie', 2, '공허 참', 'damage', { procRate: 0.12, damageMult: 1.7, animTier: 3, element: 'poison' }),
  ],
  hidden: [
    innateSkill('hidden', 1, '수제 국물', 'heal', { procRate: 0.21, healPct: 0.048, element: 'poison' }),
    innateSkill('hidden', 2, '해독 차', 'cleanse', { procRate: 0.15, cleanseCount: 2, cleanseDots: true }),
    innateSkill('hidden', 3, '응원 요리', 'buff', { procRate: 0.13, buffAtkMult: 1.1, buffSpdMult: 1.1, buffParty: true }),
  ],
};

function registerInnateSkills() {
  for (const list of Object.values(INNATE_CHAR_SKILLS)) {
    for (const s of list) {
      COMBAT_SKILLS.push(s);
      SKILL_BY_NODE[s.nodeId] = s;
    }
  }
}

export function getInnateSkills(charId: string): CombatSkillDef[] {
  return INNATE_CHAR_SKILLS[charId] ?? [];
}

export function getSkillKindIcon(kind: SkillKind, element: ElementType = 'none'): string {
  if (kind === 'heal') return '💚';
  if (kind === 'cleanse') return '🧹';
  if (kind === 'buff') return '✨';
  if (kind === 'block') return '🛡';
  return element !== 'none' ? ELEMENT_ICON[element] : '⚔';
}

const KIND_HUE: Record<SkillKind, number> = {
  damage: 8, heal: 142, cleanse: 198, buff: 48, block: 220,
};

const KIND_TAG: Record<SkillKind, string> = {
  damage: '공격', heal: '회복', cleanse: '정화', buff: '버프', block: '방어',
};

/** 스킬 바 슬롯 — 종류별 색 + 스킬마다 다른 hue, 이름 전체 표시용 */
export function getSkillSlotMeta(skill: CombatSkillDef, prestigeLevel = 0): {
  abbr: string;
  hue: number;
  kindTag: string;
  tierLabel: string;
  elementAccent: string;
  badgeBg: string;
  rowGlow: string;
} {
  const name = skill.name.trim();
  const abbr = name.length <= 3 ? name : name.slice(0, 2);
  let hash = 0;
  for (let i = 0; i < skill.nodeId.length; i++) {
    hash = (hash * 17 + skill.nodeId.charCodeAt(i)) >>> 0;
  }
  const baseHue = KIND_HUE[skill.skillKind] ?? 0;
  const hueShift = getPrestigeSkillHueShift(prestigeLevel);
  const sat = Math.min(72, 58 + prestigeLevel * 5);
  const hue = (baseHue + (hash % 36) - 18 + hueShift + 360) % 360;
  const tierLabel = skill.animTier >= 3 ? '★3' : skill.animTier >= 2 ? '◆2' : '1';
  const elementAccent = skill.element !== 'none'
    ? ({ fire: '#ff6644', water: '#44aaff', thunder: '#ffcc33', poison: '#88cc44' } as Record<string, string>)[skill.element] ?? '#aaaacc'
    : 'transparent';
  const badgeBg = `linear-gradient(145deg, hsl(${hue}, ${sat}%, 46%) 0%, hsl(${hue}, ${sat - 6}%, 30%) 100%)`;
  const rowGlow = `hsla(${hue}, 65%, 52%, ${0.28 + prestigeLevel * 0.08})`;
  return { abbr, hue, kindTag: KIND_TAG[skill.skillKind], tierLabel, elementAccent, badgeBg, rowGlow };
}

export function getDisplaySkillsForBar(unlockedNodes: string[], charId: string): CombatSkillDef[] {
  const all = getActiveSkills(unlockedNodes, charId);
  const picked: CombatSkillDef[] = [];
  const take = (pred: (s: CombatSkillDef) => boolean) => {
    const s = all.find(x => pred(x) && !picked.includes(x));
    if (s) picked.push(s);
  };
  take(s => s.skillKind === 'heal');
  take(s => s.skillKind === 'cleanse');
  take(s => s.skillKind === 'buff' || s.skillKind === 'block');
  take(s => s.skillKind === 'damage');
  for (const s of all) {
    if (picked.length >= 4) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked.slice(0, 4);
}

function registerSignatureBuffs() {
  for (const s of SIGNATURE_BUFF_SKILLS) {
    COMBAT_SKILLS.push(s);
    SKILL_BY_NODE[s.nodeId] = s;
  }
}

export function getSignatureBuffSkill(charId: string): CombatSkillDef | undefined {
  return SIGNATURE_BY_CHAR[charId];
}

export function getActiveSkills(unlockedNodes: string[], charId?: string): CombatSkillDef[] {
  const innate = charId ? getInnateSkills(charId) : [];
  const growth = unlockedNodes
    .map(id => SKILL_BY_NODE[id])
    .filter((s): s is CombatSkillDef => !!s && !s.nodeId.startsWith('sig_') && !s.nodeId.startsWith('inn_'));
  const skills = [...innate, ...growth];
  if (charId) {
    const sig = getSignatureBuffSkill(charId);
    if (sig) skills.push(sig);
  }
  return skills.sort((a, b) =>
    (b.damageMult + (b.healPct ?? 0) * 3) - (a.damageMult + (a.healPct ?? 0) * 3));
}

export function formatSkillProcText(skill: CombatSkillDef): string {
  const pct = Math.round(skill.procRate * 100);
  if (skill.skillKind === 'cleanse') {
    const n = skill.cleanseCount ?? 1;
    return `🧹${skill.name} ${pct}% · 디버프 ${n}건 제거`;
  }
  if (skill.skillKind === 'heal') {
    return `💚${skill.name} ${pct}% · HP+${Math.round((skill.healPct ?? 0) * 100)}%`;
  }
  if (skill.skillKind === 'block') {
    return `🛡${skill.name} ${pct}% · 피해-${Math.round((skill.blockPct ?? 0) * 100)}%`;
  }
  if (skill.skillKind === 'buff') {
    const parts: string[] = [];
    if (skill.buffAtkMult) parts.push(`ATK+${Math.round((skill.buffAtkMult - 1) * 100)}%`);
    if (skill.buffDefMult) parts.push(`DEF+${Math.round((skill.buffDefMult - 1) * 100)}%`);
    if (skill.buffSpdMult) parts.push(`공속+${Math.round((skill.buffSpdMult - 1) * 100)}%`);
    const scope = skill.buffParty ? '파티' : '자신';
    return `✨${skill.name} ${pct}% · ${scope} ${parts.join(' ')}`;
  }
  const icon = skill.element !== 'none' ? ELEMENT_ICON[skill.element] : '⚡';
  const motion = skill.animTier >= 3 ? ' · 필살' : skill.animTier === 2 ? ' · 강공' : '';
  return `${icon}${skill.name} ${pct}%${motion}`;
}

/** 성장 탭 — 속성 색 뱃지 포함 HTML */
export function formatSkillProcHtml(skill: CombatSkillDef): string {
  const pct = Math.round(skill.procRate * 100);
  const elBadge = skill.element !== 'none' && skill.skillKind !== 'heal' && skill.skillKind !== 'buff'
    && skill.skillKind !== 'block' && skill.skillKind !== 'cleanse'
    ? formatElementBadge(skill.element, true)
    : '';
  if (skill.skillKind === 'cleanse') {
    return `<span class="skill-proc-line">🧹${skill.name} ${pct}% · 디버프 ${skill.cleanseCount ?? 1}건</span>`;
  }
  if (skill.skillKind === 'heal') {
    return `<span class="skill-proc-line skill-heal-line">💚${skill.name} ${pct}% · HP+${Math.round((skill.healPct ?? 0) * 100)}%</span>`;
  }
  if (skill.skillKind === 'block') {
    return `<span class="skill-proc-line">🛡${skill.name} ${pct}% · 피해-${Math.round((skill.blockPct ?? 0) * 100)}%</span>`;
  }
  if (skill.skillKind === 'buff') {
    const parts: string[] = [];
    if (skill.buffAtkMult) parts.push(`ATK+${Math.round((skill.buffAtkMult - 1) * 100)}%`);
    if (skill.buffDefMult) parts.push(`DEF+${Math.round((skill.buffDefMult - 1) * 100)}%`);
    if (skill.buffSpdMult) parts.push(`공속+${Math.round((skill.buffSpdMult - 1) * 100)}%`);
    const scope = skill.buffParty ? '파티' : '자신';
    return `<span class="skill-proc-line">✨${skill.name} ${pct}% · ${scope} ${parts.join(' ')}</span>`;
  }
  const motion = skill.animTier >= 3 ? ' · 필살' : skill.animTier === 2 ? ' · 강공' : '';
  const cls = skill.element !== 'none' ? elementCssClass(skill.element) : '';
  return `<span class="skill-proc-line ${cls}">${elBadge}${skill.name} ${pct}%${motion}</span>`;
}
