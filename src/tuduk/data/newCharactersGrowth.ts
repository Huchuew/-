import type { GrowthNode } from '../types';

type NodeIn = {
  name: string; desc: string; cost: number; lv: number; req?: string; rate: number;
  atk?: number; def?: number; hp?: number; atkSpd?: number; crit?: number;
  buffAtk?: number; buffSpd?: number; buffCrit?: number; buffExp?: number;
};

function treeMaterialMult(prefix: string): number {
  if (prefix.endsWith('_pr')) return 12;
  if (prefix.endsWith('_sw') || prefix.endsWith('_df')) return 6;
  return 1;
}

function scaleMats(mats: Record<string, number>, mult: number): Record<string, number> {
  if (mult <= 1) return mats;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(mats)) out[k] = Math.max(1, Math.ceil(v * mult));
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
  const curve = Math.pow(1.48, tier);
  const scale = isPrestige ? 3.2 : 2.6;
  return Math.round(base * scale * curve * (isPrestige ? 2.1 : 1));
}

function tree(charId: string, treeName: string, prefix: string, nodes: NodeIn[]): GrowthNode[] {
  const isPrestige = prefix.endsWith('_pr');
  return nodes.map((n, i) => {
    const tier = i;
    const rateScale = Math.max(0.05, 0.36 - tier * 0.042) * (isPrestige ? 0.72 : 1);
    const id = `${prefix}_${i + 1}`;
    return {
      id, charId, tree: treeName, name: n.name, desc: n.desc,
      cost: growthNodeCost(n.cost, tier, isPrestige),
      reqLevel: n.lv,
      reqNode: n.req ?? (i > 0 ? `${prefix}_${i}` : undefined),
      successRate: Math.max(0.05, Math.round(n.rate * rateScale * 100) / 100),
      materials: defaultGrowthMaterials(tier, isPrestige, prefix),
      atk: n.atk, def: n.def, hp: n.hp, atkSpd: n.atkSpd, crit: n.crit,
      buffAtk: n.buffAtk, buffSpd: n.buffSpd, buffCrit: n.buffCrit, buffExp: n.buffExp,
    };
  });
}

/** 신규 9인 성장 트리 */
export const NEW_CHAR_GROWTH_NODES: GrowthNode[] = [
  // 라미 · 수인전사
  ...tree('horangi', '수인의 힘', 'hg_buf', [
    { name: '야성의 피', desc: '수인 체력', cost: 55, lv: 3, rate: 0.30, atk: 5, hp: 30 },
    { name: '맹호 발톱', desc: '공격 강화', cost: 140, lv: 9, rate: 0.24, atk: 12, hp: 45 },
    { name: '백수의 포효', desc: '수인 각성', cost: 400, lv: 18, rate: 0.18, atk: 20, hp: 80 },
  ]),
  ...tree('horangi', '연타 난무', 'hg_cmb', [
    { name: '발톱 베기', desc: '연속 공격', cost: 40, lv: 1, rate: 0.35, atk: 7, hp: 12 },
    { name: '맹호 덮치기', desc: '강력 일격', cost: 110, lv: 6, rate: 0.28, atk: 14, crit: 0.04 },
    { name: '백호 참격', desc: '수인 극의', cost: 300, lv: 14, rate: 0.22, atk: 24, crit: 0.06 },
    { name: '산왕 일격', desc: '최종 참격', cost: 780, lv: 28, rate: 0.16, atk: 36, crit: 0.08 },
  ]),
  // 혜성처럼 · 돌격
  ...tree('hyesung', '혜성 질주', 'hs_cmb', [
    { name: '유성 베기', desc: '빠른 일격', cost: 40, lv: 1, rate: 0.35, atk: 8, atkSpd: 0.04 },
    { name: '혜성 돌진', desc: '연속 타격', cost: 110, lv: 6, rate: 0.28, atk: 14, atkSpd: 0.06 },
    { name: '유성낙하', desc: '폭발 딜', cost: 300, lv: 14, rate: 0.22, atk: 22, crit: 0.05 },
    { name: '혜성처럼', desc: '극의 일격', cost: 780, lv: 28, rate: 0.16, atk: 34, crit: 0.08 },
  ]),
  ...tree('hyesung', '광속 강화', 'hs_buf', [
    { name: '가속', desc: '공속 상승', cost: 50, lv: 3, rate: 0.32, atkSpd: 0.05, buffSpd: 0.03 },
    { name: '혜성 가호', desc: '치명 강화', cost: 130, lv: 8, rate: 0.25, crit: 0.04, buffCrit: 0.02 },
    { name: '유성의 축복', desc: '파티 가속', cost: 380, lv: 18, rate: 0.19, buffSpd: 0.05, buffAtk: 0.03 },
  ]),
  // 이사님 · 점액 서포트
  ...tree('isanim', '점액 체질', 'mn_buf', [
    { name: '점성 체력', desc: 'HP 강화', cost: 50, lv: 3, rate: 0.32, hp: 35, def: 5 },
    { name: '흡수', desc: '방어 강화', cost: 130, lv: 8, rate: 0.26, def: 10, hp: 50 },
    { name: '분열', desc: '생존력 극대', cost: 380, lv: 18, rate: 0.19, def: 16, hp: 85 },
  ]),
  ...tree('isanim', '점액 가호', 'mn_spd', [
    { name: '가속 회의', desc: '파티 공속', cost: 45, lv: 1, rate: 0.35, buffSpd: 0.04 },
    { name: '안개 가속', desc: '공속 버프', cost: 110, lv: 6, rate: 0.28, buffSpd: 0.06, buffAtk: 0.02 },
    { name: '폭풍 가루', desc: '강력 가속', cost: 300, lv: 14, rate: 0.22, buffSpd: 0.08, buffAtk: 0.04 },
    { name: '대점액 폭풍', desc: '극의 가속', cost: 780, lv: 28, rate: 0.16, buffSpd: 0.1, buffExp: 0.03 },
  ]),
  // 산적 · 도적
  ...tree('sanjeok', '도적 근력', 'cl_cmb', [
    { name: '오크 펀치', desc: '근접 입문', cost: 40, lv: 1, rate: 0.35, atk: 7 },
    { name: '분쇄 타격', desc: '강타', cost: 110, lv: 6, rate: 0.28, atk: 13, hp: 15 },
    { name: '도적 일격', desc: '연계 공격', cost: 300, lv: 14, rate: 0.22, atk: 22, crit: 0.04 },
    { name: '광폭 일격', desc: '도적 극의', cost: 780, lv: 28, rate: 0.16, atk: 32, crit: 0.06 },
  ]),
  ...tree('sanjeok', '도적 체력', 'cl_buf', [
    { name: '단단한 피부', desc: '체력 강화', cost: 50, lv: 3, rate: 0.32, hp: 28, def: 4 },
    { name: '분노', desc: '공격력 상승', cost: 130, lv: 8, rate: 0.26, atk: 8, hp: 40 },
    { name: '광폭화', desc: '브루저 각성', cost: 380, lv: 18, rate: 0.19, atk: 16, hp: 65 },
  ]),
  // 소디아 · 유령궁수
  ...tree('sodia', '망령 사격', 'sd_arc', [
    { name: '뼈 화살', desc: '궁술 입문', cost: 40, lv: 1, rate: 0.35, atk: 7, crit: 0.03 },
    { name: '저격', desc: '치명 강화', cost: 110, lv: 6, rate: 0.28, atk: 12, crit: 0.05 },
    { name: '망령 화살', desc: '독 화살', cost: 300, lv: 14, rate: 0.22, atk: 20, crit: 0.07 },
    { name: '사신 일제', desc: '궁술 극의', cost: 780, lv: 28, rate: 0.16, atk: 30, crit: 0.09 },
  ]),
  ...tree('sodia', '망령 집중', 'sd_buf', [
    { name: '냉정 조준', desc: '명중·치명', cost: 50, lv: 3, rate: 0.32, crit: 0.03, atkSpd: 0.03 },
    { name: '망령의 눈', desc: '저격 강화', cost: 130, lv: 8, rate: 0.26, atk: 6, crit: 0.05 },
    { name: '죽음의 시선', desc: '극한 조준', cost: 380, lv: 18, rate: 0.19, atk: 12, crit: 0.07 },
  ]),
  // 짐짐이 · 기병
  ...tree('jimjimi', '기병 창술', 'tn_spr', [
    { name: '돌격 찌르기', desc: '창술 입문', cost: 40, lv: 1, rate: 0.35, atk: 7, def: 3 },
    { name: '질주 창', desc: '관통 강화', cost: 110, lv: 6, rate: 0.28, atk: 13, def: 5 },
    { name: '질풍 돌파', desc: '돌격 일격', cost: 300, lv: 14, rate: 0.22, atk: 22, atkSpd: 0.03 },
    { name: '파쇄 돌격', desc: '창술 극의', cost: 780, lv: 28, rate: 0.16, atk: 32, crit: 0.05 },
  ]),
  ...tree('jimjimi', '기마 수호', 'tn_buf', [
    { name: '안장 방어', desc: '방어 강화', cost: 50, lv: 3, rate: 0.32, def: 8, hp: 25 },
    { name: '질주', desc: '기동성', cost: 130, lv: 8, rate: 0.26, atkSpd: 0.04, def: 6 },
    { name: '돌격 대형', desc: '기병 각성', cost: 380, lv: 18, rate: 0.19, atk: 10, def: 12 },
  ]),
  // 단종 · 망령 탱커
  ...tree('danjong', '망령 방어', 'dj_buf', [
    { name: '망령 갑', desc: '방어 입문', cost: 55, lv: 3, rate: 0.30, def: 10, hp: 35 },
    { name: '왕의 결의', desc: '철벽 수비', cost: 150, lv: 10, rate: 0.24, def: 18, hp: 60 },
    { name: '절대 방어', desc: '탱킹 극의', cost: 420, lv: 20, rate: 0.18, def: 26, hp: 100 },
  ]),
  ...tree('danjong', '망령 검', 'dj_cmb', [
    { name: '망령 베기', desc: '검술 입문', cost: 40, lv: 1, rate: 0.35, atk: 5, def: 4 },
    { name: '왕검 일격', desc: '수호 일격', cost: 110, lv: 6, rate: 0.28, atk: 9, def: 8 },
    { name: '왕검 참', desc: '망령 검술', cost: 300, lv: 14, rate: 0.22, atk: 16, def: 12 },
    { name: '멸검 일격', desc: '검술 극의', cost: 780, lv: 28, rate: 0.16, atk: 24, def: 16 },
  ]),
  // 현이V · 사술
  ...tree('hyeoni', '망령 마법', 'hv_sp', [
    { name: '뼈 화살', desc: '어둠 마법', cost: 40, lv: 1, rate: 0.35, atk: 8 },
    { name: '저주', desc: '독·저주', cost: 110, lv: 6, rate: 0.28, atk: 14 },
    { name: '영혼 흡수', desc: '강력 마법', cost: 300, lv: 14, rate: 0.22, atk: 24 },
    { name: '사신 소환', desc: '사술 극의', cost: 780, lv: 28, rate: 0.16, atk: 36 },
  ]),
  ...tree('hyeoni', '망령 방어', 'hv_rn', [
    { name: '뼈 방패', desc: '마방 강화', cost: 50, lv: 3, rate: 0.32, def: 4, hp: 20 },
    { name: '영혼 결계', desc: '저항', cost: 130, lv: 8, rate: 0.26, def: 8, hp: 35 },
    { name: '망령의 장막', desc: '마법 방어', cost: 380, lv: 18, rate: 0.19, def: 12, hp: 55 },
  ]),
  // 포켓 · 철갑전사
  ...tree('pocket', '철갑 수비', 'pk_df', [
    { name: '철갑 훈련', desc: '방어 입문', cost: 55, lv: 3, rate: 0.30, def: 9, hp: 32 },
    { name: '철벽 방패', desc: '소형 철벽', cost: 150, lv: 10, rate: 0.24, def: 16, hp: 55 },
    { name: '불굴 방어', desc: '탱킹 극의', cost: 420, lv: 20, rate: 0.18, def: 24, hp: 90 },
  ]),
  ...tree('pocket', '철갑 검술', 'pk_sw', [
    { name: '짧은 검', desc: '검술 입문', cost: 40, lv: 1, rate: 0.35, atk: 5, def: 3 },
    { name: '철갑 일격', desc: '연계 공격', cost: 110, lv: 6, rate: 0.28, atk: 10, def: 6 },
    { name: '강철 일격', desc: '강타', cost: 300, lv: 14, rate: 0.22, atk: 18, def: 10 },
    { name: '강철 참', desc: '검술 극의', cost: 780, lv: 28, rate: 0.16, atk: 26, def: 14 },
  ]),
];
