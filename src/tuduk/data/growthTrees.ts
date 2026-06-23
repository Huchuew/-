import type { GrowthNode } from '../types';
import { NEW_CHAR_GROWTH_NODES } from './newCharactersGrowth';
import { buildPrestigeBranches } from './prestigeBranchForks';
import { PRESTIGE_BRANCH_DEFS } from './prestigeBranchData';
import { formatStatNum } from '../utils/formatStat';

export const PRESTIGE_BRANCH_NODES = buildPrestigeBranches(PRESTIGE_BRANCH_DEFS);

type NodeIn = {
  name: string; desc: string; cost: number; lv: number; req?: string; rate: number;
  atk?: number; def?: number; hp?: number; atkSpd?: number; crit?: number; aoeBonus?: number;
  buffAtk?: number; buffSpd?: number; buffCrit?: number; buffExp?: number; offlineBonus?: number;
  mats?: Record<string, number>;
};

function treeMaterialMult(prefix: string): number {
  if (prefix.endsWith('_pr')) return 12;
  if (prefix.endsWith('_sw') || prefix.endsWith('_df')) return 6;
  return 1;
}

function scaleMats(mats: Record<string, number>, mult: number): Record<string, number> {
  if (mult <= 1) return mats;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(mats)) {
    out[k] = Math.max(1, Math.ceil(v * mult));
  }
  return out;
}

function defaultGrowthMaterials(tier: number, isPrestige: boolean, prefix: string): Record<string, number> {
  const step = tier + 1;
  const mult = treeMaterialMult(prefix);
  let base: Record<string, number>;
  if (isPrestige) {
    base = tier === 0
      ? { rare_ore: 8, magic_dust: 12, spirit_thread: 8, beast_fang: 6 }
      : tier === 1
        ? { rare_ore: 14, magic_dust: 22, spirit_thread: 12, beast_fang: 10, legend_scale: 2 }
        : { rare_ore: 22, legend_scale: 4, magic_dust: 35, spirit_thread: 18, void_shard: 3 };
  } else if (prefix.endsWith('_sw') || prefix.endsWith('_df')) {
    base = {
      iron_ore: 8 + step * 8,
      wood_chip: 6 + step * 5,
      beast_fang: 2 + step * 2,
      magic_dust: 3 + step * 3,
      rare_ore: step >= 3 ? 2 + step : 1,
      spirit_thread: step >= 4 ? 1 + Math.floor(step / 2) : 0,
      legend_scale: step >= 5 ? 1 + Math.floor(step / 3) : 0,
    };
  } else {
    base = {
      iron_ore: 3 + step * 3,
      wood_chip: 2 + step * 2,
      ...(step >= 2 ? { beast_fang: 1 + Math.floor(step / 2) } : {}),
      ...(step >= 3 ? { magic_dust: 2 + Math.floor(step / 2) } : {}),
      ...(step >= 4 ? { rare_ore: 1 + Math.floor(step / 3), spirit_thread: 1 + Math.floor(step / 4) } : {}),
      ...(step >= 5 ? { legend_scale: 1 } : {}),
    };
  }
  return scaleMats(base, mult);
}

function growthNodeCost(base: number, tier: number, isPrestige: boolean): number {
  const curve = Math.pow(1.42, tier);
  const scale = isPrestige ? 3.6 : 3.0;
  return Math.round(base * scale * curve * (isPrestige ? 2.0 : 1));
}

function tree(charId: string, treeName: string, prefix: string, nodes: NodeIn[]): GrowthNode[] {
  const isPrestige = prefix.endsWith('_pr');
  return nodes.map((n, i) => {
    const tier = i;
    const rateScale = Math.max(0.10, 0.58 - tier * 0.042) * (isPrestige ? 0.76 : 1);
    const id = `${prefix}_${i + 1}`;
    return {
      id,
      charId, tree: treeName, name: n.name, desc: n.desc,
      cost: growthNodeCost(n.cost, tier, isPrestige),
      reqLevel: n.lv,
      reqNode: n.req ?? (i > 0 ? `${prefix}_${i}` : undefined),
      successRate: Math.max(0.05, Math.round(n.rate * rateScale * 100) / 100),
      materials: n.mats ?? defaultGrowthMaterials(tier, isPrestige, prefix),
      atk: n.atk, def: n.def, hp: n.hp, atkSpd: n.atkSpd, crit: n.crit, aoeBonus: n.aoeBonus,
      buffAtk: n.buffAtk, buffSpd: n.buffSpd, buffCrit: n.buffCrit, buffExp: n.buffExp,
      offlineBonus: n.offlineBonus,
    };
  });
}

export const GROWTH_NODES: GrowthNode[] = [
  // ── 무쟁 · 전사 ──
  ...tree('mujang', '전사술', 'mj_sw', [
    { name: '초급 검술', desc: '기본 베기', cost: 40, lv: 1, rate: 0.35, atk: 5 },
    { name: '중급 검술', desc: '연속 베기', cost: 100, lv: 5, rate: 0.28, atk: 10 },
    { name: '상급 검술', desc: '강력한 일격', cost: 240, lv: 10, rate: 0.23, atk: 18 },
    { name: '달인의 검', desc: '치명 일격', cost: 550, lv: 20, rate: 0.18, atk: 30, crit: 0.05 },
    { name: '검성', desc: '검의 극의', cost: 1100, lv: 35, rate: 0.14, atk: 50, crit: 0.1 },
  ]),
  ...tree('mujang', '방어술', 'mj_df', [
    { name: '철갑', desc: '방어 입문', cost: 40, lv: 1, rate: 0.35, def: 5 },
    { name: '강철 피부', desc: '단단한 방어', cost: 100, lv: 5, rate: 0.28, def: 12, hp: 30 },
    { name: '불굴', desc: '끝없는 인내', cost: 240, lv: 10, rate: 0.23, def: 22, hp: 60 },
    { name: '수호자', desc: '동료를 지킨다', cost: 550, lv: 20, rate: 0.18, def: 35, hp: 100 },
    { name: '철벽', desc: '절대 방어', cost: 1100, lv: 35, rate: 0.14, def: 55, hp: 200 },
  ]),
  // ── 후추 · 마법사 ──
  ...tree('huchu', '주문술', 'hc_sp', [
    { name: '불꽃 주문', desc: '화염 마법 입문', cost: 40, lv: 1, rate: 0.35, atk: 8, aoeBonus: 0.1 },
    { name: '화염구', desc: '응축된 화염', cost: 100, lv: 5, rate: 0.28, atk: 15, aoeBonus: 0.15 },
    { name: '화염 폭발', desc: '광역 폭발', cost: 240, lv: 10, rate: 0.23, atk: 25, aoeBonus: 0.25 },
    { name: '메테오', desc: '하늘에서 떨어지는 불', cost: 550, lv: 20, rate: 0.18, atk: 40, aoeBonus: 0.35 },
    { name: '종말의 불꽃', desc: '최강 화염 주문', cost: 1100, lv: 35, rate: 0.14, atk: 65, aoeBonus: 0.5 },
  ]),
  ...tree('huchu', '방어 룬', 'hc_rn', [
    { name: '결계 룬', desc: '마력 방어막', cost: 40, lv: 1, rate: 0.35, def: 4, atk: 6 },
    { name: '얼음 룬', desc: '냉기로 막는다', cost: 100, lv: 5, rate: 0.28, atk: 14, def: 6 },
    { name: '서리 결계', desc: '광역 방어', cost: 240, lv: 10, rate: 0.23, atk: 22, aoeBonus: 0.2, def: 8 },
    { name: '절대영도', desc: '완전한 결계', cost: 700, lv: 25, rate: 0.16, atk: 45, aoeBonus: 0.4, def: 12 },
  ]),
  // ── 둥둥둥 · 궁수 ──
  ...tree('dung', '궁술', 'dg_arc', [
    { name: '조준 사격', desc: '궁술 입문', cost: 40, lv: 1, rate: 0.35, atk: 6, crit: 0.05 },
    { name: '속사', desc: '빠른 연사', cost: 120, lv: 8, rate: 0.27, atkSpd: 0.3, crit: 0.08 },
    { name: '저격술', desc: '한 발 한 명', cost: 380, lv: 15, rate: 0.21, atk: 25, crit: 0.15 },
    { name: '바람의 사수', desc: '궁술 극의', cost: 950, lv: 28, rate: 0.15, atk: 40, atkSpd: 0.5 },
  ]),
  ...tree('dung', '방어술', 'dg_df', [
    { name: '날렵한 몸놀림', desc: '회피 입문', cost: 50, lv: 3, rate: 0.33, atkSpd: 0.15 },
    { name: '엄폐 사격', desc: '거리를 벌린다', cost: 140, lv: 10, rate: 0.26, atkSpd: 0.25, crit: 0.05, def: 4 },
    { name: '바람의 방패', desc: '화살을 막는다', cost: 420, lv: 20, rate: 0.20, atkSpd: 0.4, atk: 10, def: 8 },
  ]),
  // ── 레시포드 · 창술사 ──
  ...tree('lesford', '창술', 'ls_spr', [
    { name: '창 찌르기', desc: '창술 입문', cost: 45, lv: 1, rate: 0.35, atk: 8 },
    { name: '연속 찌르기', desc: '관통 연타', cost: 120, lv: 6, rate: 0.28, atk: 16, atkSpd: 0.1 },
    { name: '용찌르기', desc: '강력한 관통', cost: 320, lv: 14, rate: 0.22, atk: 28 },
    { name: '창기사', desc: '창술 달인', cost: 850, lv: 26, rate: 0.16, atk: 45, def: 10 },
  ]),
  ...tree('lesford', '방어 창법', 'ls_df', [
    { name: '창날 막기', desc: '방어 입문', cost: 40, lv: 2, rate: 0.34, def: 6, hp: 20 },
    { name: '철벽 진형', desc: '단단한 방어', cost: 130, lv: 9, rate: 0.27, atk: 12, def: 8 },
    { name: '용비늘 방어', desc: '창으로 막아낸다', cost: 480, lv: 22, rate: 0.19, atk: 25, hp: 80, def: 12 },
  ]),
  // ── 암파 · 광전사 ──
  ...tree('ampa', '광폭술', 'am_rg', [
    { name: '분노', desc: '광폭 입문', cost: 40, lv: 1, rate: 0.35, atk: 6 },
    { name: '광란', desc: '분노가 커진다', cost: 120, lv: 7, rate: 0.28, atk: 14, atkSpd: 0.15 },
    { name: '폭주', desc: '통제 불가의 힘', cost: 380, lv: 16, rate: 0.22, atk: 28, crit: 0.1 },
    { name: '멸망의 일격', desc: '광폭 극의', cost: 1000, lv: 30, rate: 0.15, atk: 50, atkSpd: 0.3 },
  ]),
  ...tree('ampa', '방어술', 'am_df', [
    { name: '분노 억제', desc: '광기 속 이성', cost: 45, lv: 3, rate: 0.33, def: 5, hp: 25 },
    { name: '철의 의지', desc: '고통을 견딘다', cost: 140, lv: 10, rate: 0.26, def: 12, hp: 50 },
    { name: '광전 방어', desc: '맞아도 서 있다', cost: 450, lv: 22, rate: 0.19, def: 20, hp: 90 },
  ]),
  // ── 우쟁 · 격투가 ──
  ...tree('ujang', '권법', 'uj_cmb', [
    { name: '1단 콤보', desc: '권법 입문', cost: 45, lv: 1, rate: 0.35, atkSpd: 0.2, atk: 4 },
    { name: '10단 콤보', desc: '연타 숙련', cost: 150, lv: 10, rate: 0.27, atkSpd: 0.5, atk: 12 },
    { name: '무한 콤보', desc: '끊임없는 연타', cost: 520, lv: 25, rate: 0.20, atkSpd: 0.8, atk: 30 },
    { name: '격투의 신', desc: '권법 극의', cost: 1200, lv: 40, rate: 0.14, atkSpd: 1.0, atk: 45 },
  ]),
  ...tree('ujang', '방어권', 'uj_df', [
    { name: '막기', desc: '방어 입문', cost: 40, lv: 2, rate: 0.34, def: 5, hp: 20 },
    { name: '철벽 수비', desc: '단단한 몸', cost: 130, lv: 8, rate: 0.27, def: 10, hp: 40 },
    { name: '반격 자세', desc: '막으며 싸운다', cost: 400, lv: 18, rate: 0.21, def: 16, atk: 8 },
  ]),
  // ── 유진 · 힐러 ──
  ...tree('yujin', '치유술', 'yj_buf', [
    { name: '응급 치유', desc: '파티 회복 기도', cost: 55, lv: 3, rate: 0.30, hp: 20 },
    { name: '재생의 기도', desc: '지속적인 치유', cost: 150, lv: 10, rate: 0.24, hp: 45 },
    { name: '대치유의 축복', desc: '강력한 회복술', cost: 420, lv: 20, rate: 0.18, hp: 80 },
  ]),
  ...tree('yujin', '신성 마법', 'yj_mag', [
    { name: '성스러운 빛', desc: '신성 딜링 입문', cost: 40, lv: 1, rate: 0.35, atk: 8 },
    { name: '성광탄', desc: '빛의 일격', cost: 110, lv: 6, rate: 0.28, atk: 14, atkSpd: 0.05 },
    { name: '천벌의 광휘', desc: '강한 성스러운 마법', cost: 300, lv: 14, rate: 0.22, atk: 22 },
    { name: '성광 폭발', desc: '신성 마법 극의', cost: 780, lv: 28, rate: 0.16, atk: 34 },
  ]),
  // ── 서영 · 기사 ──
  ...tree('seoyoung', '수호술', 'sy_buf', [
    { name: '방패 자세', desc: '기사 방어 입문', cost: 55, lv: 3, rate: 0.30, def: 10, hp: 35 },
    { name: '수호 결의', desc: '단단한 수비', cost: 150, lv: 10, rate: 0.24, def: 18, hp: 65 },
    { name: '불굴의 기사', desc: '절대 방어', cost: 420, lv: 20, rate: 0.18, def: 28, hp: 110 },
  ]),
  ...tree('seoyoung', '기사 검술', 'sy_cmb', [
    { name: '기사 베기', desc: '검술 입문', cost: 40, lv: 1, rate: 0.35, atk: 5, def: 4 },
    { name: '수호 일격', desc: '방패와 검의 연계', cost: 110, lv: 6, rate: 0.28, atk: 10, def: 8 },
    { name: '성역 참격', desc: '강력한 일격', cost: 300, lv: 14, rate: 0.22, atk: 18, def: 12 },
    { name: '수호의 일격', desc: '기사 검술 극의', cost: 780, lv: 28, rate: 0.16, atk: 28, def: 16 },
  ]),
  // ── 테소 · 성기사 ──
  ...tree('teso', '성역 수호', 'bh_buf', [
    { name: '성스러운 가호', desc: '성기사 방어', cost: 55, lv: 3, rate: 0.30, def: 9, hp: 30 },
    { name: '성역 결계', desc: '신성한 방어막', cost: 150, lv: 10, rate: 0.24, def: 16, hp: 55 },
    { name: '맹세의 수호', desc: '성역 극의', cost: 420, lv: 20, rate: 0.18, def: 24, hp: 95 },
  ]),
  ...tree('teso', '성스러운 검', 'bh_cmb', [
    { name: '성광 베기', desc: '성스러운 일격', cost: 40, lv: 1, rate: 0.35, atk: 6 },
    { name: '성역 참격', desc: '신성 검술', cost: 110, lv: 6, rate: 0.28, atk: 12, crit: 0.04 },
    { name: '성스러운 일격', desc: '강력한 성검', cost: 300, lv: 14, rate: 0.22, atk: 20, crit: 0.06 },
    { name: '성검 낙하', desc: '성스러운 검 극의', cost: 780, lv: 28, rate: 0.16, atk: 30, crit: 0.08 },
  ]),
  // ── 큐티가이 · 언데드 ──
  ...tree('cutie', '망령의 힘', 'ct_buf', [
    { name: '망령의 기운', desc: '언데드 생명력', cost: 55, lv: 3, rate: 0.30, atk: 5, hp: 28 },
    { name: '공허 흡수', desc: '죽음의 힘', cost: 130, lv: 8, rate: 0.25, atk: 10, hp: 50 },
    { name: '언데드 각성', desc: '망령 극의', cost: 380, lv: 18, rate: 0.19, atk: 18, hp: 85 },
  ]),
  ...tree('cutie', '대검 검술', 'ct_cmb', [
    { name: '망령 베기', desc: '대검 입문', cost: 40, lv: 1, rate: 0.35, atk: 8, hp: 15 },
    { name: '해골 참격', desc: '무거운 일격', cost: 110, lv: 6, rate: 0.28, atk: 14, crit: 0.04 },
    { name: '망령의 대검', desc: '공허의 참격', cost: 300, lv: 14, rate: 0.22, atk: 24, crit: 0.06 },
    { name: '공허 참', desc: '대검 극의', cost: 780, lv: 28, rate: 0.16, atk: 38, crit: 0.08 },
  ]),
  // ── 히든카드 · 요리사 ──
  ...tree('hidden', '요리술', 'hd_cook', [
    { name: '기본 요리', desc: '요리 해금', cost: 80, lv: 5, rate: 0.32, atk: 3 },
    { name: '삼겹살 정식', desc: '삼겹살 요리 해금', cost: 200, lv: 12, rate: 0.25, atk: 8 },
    { name: '매운 짬뽕', desc: '짬뽕 요리 해금', cost: 200, lv: 12, rate: 0.25, atkSpd: 0.15 },
    { name: '도시락', desc: '오프라인 보상 +15%', cost: 480, lv: 25, rate: 0.18, hp: 50, offlineBonus: 0.15 },
    { name: '만찬', desc: '만찬 요리 해금', cost: 1100, lv: 35, rate: 0.14, atk: 10, def: 10, hp: 50 },
  ]),
  ...tree('hidden', '주방 방어', 'hd_df', [
    { name: '칼날 막기', desc: '주방에서도 전투', cost: 50, lv: 3, rate: 0.33, def: 5 },
    { name: '냄비 방패', desc: '튼튼한 수비', cost: 140, lv: 10, rate: 0.26, def: 10, hp: 30 },
    { name: '셰프의 인내', desc: '끝까지 버틴다', cost: 400, lv: 20, rate: 0.20, def: 16, hp: 60 },
  ]),
  ...PRESTIGE_BRANCH_NODES,
  ...NEW_CHAR_GROWTH_NODES,
];

export function getCharGrowth(charId: string): GrowthNode[] {
  return GROWTH_NODES.filter(n => n.charId === charId);
}

export function getNodeBonusText(n: GrowthNode): string {
  const parts: string[] = [];
  if (n.atk) parts.push(`ATK+${n.atk}`);
  if (n.def) parts.push(`DEF+${n.def}`);
  if (n.hp) parts.push(`HP+${n.hp}`);
  if (n.atkSpd) parts.push(`공속+${formatStatNum(n.atkSpd)}`);
  if (n.crit) parts.push(`치명+${Math.round(n.crit * 100)}%`);
  if (n.aoeBonus) parts.push(`광역+${Math.round(n.aoeBonus * 100)}%`);
  if (n.buffAtk) parts.push(`파티ATK+${Math.round(n.buffAtk * 100)}%`);
  if (n.buffSpd) parts.push(`파티공속+${Math.round(n.buffSpd * 100)}%`);
  if (n.buffCrit) parts.push(`파티치명+${Math.round(n.buffCrit * 100)}%`);
  if (n.buffExp) parts.push(`파티EXP+${Math.round(n.buffExp * 100)}%`);
  if (n.offlineBonus) parts.push(`오프라인+${Math.round(n.offlineBonus * 100)}%`);
  return parts.join(' · ') || n.desc;
}

import { formatSkillProcText, getSkillForNode, registerGrowthSkills } from './combatSkills';

registerGrowthSkills(GROWTH_NODES);

export function getNodeBonusWithSkill(n: GrowthNode): string {
  const base = getNodeBonusText(n);
  const skill = getSkillForNode(n.id);
  if (!skill) return base;
  return `${base} · ${formatSkillProcText(skill)}`;
}
