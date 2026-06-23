import type { BranchNodeIn, PrestigeBranchCharDef, PrestigeBranchPathDef } from './prestigeBranchBuilder';
import {
  PRESTIGE_TIER_COST_MULT, PRESTIGE_TIER_LEVELS, PRESTIGE_TIER_STAT_MULT,
} from './prestigeJobBalance';
import type { GrowthNode } from '../types';

export type PrestigeSfxTheme =
  | 'guardian' | 'berserker' | 'arcane' | 'frost' | 'blade' | 'holy'
  | 'shadow' | 'ranger' | 'beast' | 'support' | 'lancer' | 'royal';

export type ForkMeta = {
  tagline: string;
  sfxTheme: PrestigeSfxTheme;
  tier2Names: [string, string];
  tier3Names: [string, string, string, string];
  tier2Desc: [string, string];
  tier3Desc: [string, string, string, string];
};

/** 캐릭터별 A/B 경로 — 3차·4차 전용 직업명·테마 */
export const PRESTIGE_FORK_META: Record<string, { a: ForkMeta; b: ForkMeta }> = {
  mujang: {
    a: {
      tagline: '방패로 아군을 지키는 수호 루트',
      sfxTheme: 'guardian',
      tier2Names: ['요새 기사', '철벽 기사'],
      tier3Names: ['수호 대장', '전쟁 기사', '성채 기사', '불굴 수호'],
      tier2Desc: ['선봉 돌파 · 공격형 수호', '방패 진형 · 철벽 방어'],
      tier3Desc: ['최전선 파쇄', '돌격 지휘', '요새 수호', '절대 방어'],
    },
    b: {
      tagline: '분노로 적진을 찢는 광전 루트',
      sfxTheme: 'berserker',
      tier2Names: ['광전 기사', '혈투 기사'],
      tier3Names: ['광기 대장', '혈투 장군', '철갑 요새', '불멸 전사'],
      tier2Desc: ['광폭 돌파', '피의 인내'],
      tier3Desc: ['광기 극의', '혈투의 왕', '강철 성벽', '불멸의 수호'],
    },
  },
  huchu: {
    a: {
      tagline: '화염과 운석의 아크메이지 루트',
      sfxTheme: 'arcane',
      tier2Names: ['화염 마법사', '폭염 술사'],
      tier3Names: ['아크메이지', '화염 대마도사', '운석 술사', '종막 술사'],
      tier2Desc: ['연소 특화', '광역 폭발'],
      tier3Desc: ['화염 지배', '운석 낙하', '대마도 극의', '종막의 불꽃'],
    },
    b: {
      tagline: '냉기와 결계의 프로즌 루트',
      sfxTheme: 'frost',
      tier2Names: ['빙결 마법사', '서리 술사'],
      tier3Names: ['빙하 대마도사', '얼음 현자', '결계 현자', '절대영도 술사'],
      tier2Desc: ['빙결 제어', '결계 방어'],
      tier3Desc: ['냉기 폭풍', '얼음 지배', '결계 장막', '영하 극한'],
    },
  },
  ujang: {
    a: {
      tagline: '검기 없이 적을 베는 무영 루트',
      sfxTheme: 'blade',
      tier2Names: ['무영 검사', '질풍 검객'],
      tier3Names: ['무영검성', '천상 검사', '검풍 검성', '섬무 검성'],
      tier2Desc: ['공속 극대', '무영 입문'],
      tier3Desc: ['무영 극의', '천상 검도', '검기 난무', '연속 참격'],
    },
    b: {
      tagline: '마검과 일섬의 검마 루트',
      sfxTheme: 'shadow',
      tier2Names: ['혈검 검사', '마검 검사'],
      tier3Names: ['검마', '혈마 검사', '일섬 검성', '검왕'],
      tier2Desc: ['치명 일점', '마력 검기'],
      tier3Desc: ['검마 극의', '혈검 난무', '일섬 참격', '마검 지배'],
    },
  },
  dung: {
    a: {
      tagline: '한 발 한 명 — 저격의 바람 루트',
      sfxTheme: 'ranger',
      tier2Names: ['바람 궁수', '저격 궁수'],
      tier3Names: ['바람 사수', '하늘 저격수', '질풍 궁수', '천공 사수'],
      tier2Desc: ['원거리 일점', '바람 화살'],
      tier3Desc: ['바람 지배', '공중 저격', '질풍 연사', '천공 일격'],
    },
    b: {
      tagline: '연사와 폭풍의 속사 루트',
      sfxTheme: 'ranger',
      tier2Names: ['속사 궁수', '폭풍 궁수'],
      tier3Names: ['폭풍 사수', '태풍 궁수', '연사 사수', '폭우 궁수'],
      tier2Desc: ['연사 특화', '폭풍 다연발'],
      tier3Desc: ['폭풍 지배', '태풍 화살', '속사 극의', '폭우 난사'],
    },
  },
  lesford: {
    a: {
      tagline: '용의 창끝으로 찌르는 돌격 루트',
      sfxTheme: 'lancer',
      tier2Names: ['돌격 창기사', '용창 기사'],
      tier3Names: ['용창사', '드래곤 랜서', '창술 대가', '용격 기사'],
      tier2Desc: ['관통 돌격', '용창 숙련'],
      tier3Desc: ['용창 극의', '드래곤 돌파', '창술 지배', '용의 분노'],
    },
    b: {
      tagline: '방패창으로 진형을 지키는 수호 루트',
      sfxTheme: 'guardian',
      tier2Names: ['방패 창기사', '철벽 기사'],
      tier3Names: ['수호창기사', '요새 랜서', '철벽 진형', '용비늘 기사'],
      tier2Desc: ['방어 창법', '진형 수호'],
      tier3Desc: ['수호 극의', '요새 방어', '철벽 진군', '절대 방패'],
    },
  },
  ampa: {
    a: {
      tagline: '광기의 도끼로 적을 가르는 멸망 루트',
      sfxTheme: 'berserker',
      tier2Names: ['광전 투사', '혈투 광전사'],
      tier3Names: ['멸망 투사', '광기 학살자', '혈투 극전사', '파괴 투사'],
      tier2Desc: ['광폭 입문', '혈투 연계'],
      tier3Desc: ['멸망 일격', '광기 폭주', '혈투 지배', '파괴 극의'],
    },
    b: {
      tagline: '피와 강철로 버티는 수호 광전 루트',
      sfxTheme: 'guardian',
      tier2Names: ['피의 전사', '강철 광전사'],
      tier3Names: ['피의 수호', '불사 광전사', '강철 불굴', '피의 요새'],
      tier2Desc: ['생존 광전', '강철 인내'],
      tier3Desc: ['피의 방패', '불사 극의', '강철 수호', '요새 광전'],
    },
  },
  yujin: {
    a: {
      tagline: '축복과 치유의 성직 루트',
      sfxTheme: 'holy',
      tier2Names: ['축복 사제', '성역 사제'],
      tier3Names: ['성직자', '대사제', '성역 현자', '신성 사제'],
      tier2Desc: ['치유 특화', '파티 가호'],
      tier3Desc: ['성직 극의', '신성 치유', '성역 결계', '천상 축복'],
    },
    b: {
      tagline: '심판의 빛으로 적을 베는 성전 루트',
      sfxTheme: 'holy',
      tier2Names: ['성전사', '응징 성기사'],
      tier3Names: ['심판자', '응징 성기사', '천벌 기사', '성광 심판관'],
      tier2Desc: ['심판 특화', '응징 일격'],
      tier3Desc: ['심판 극의', '성광 폭발', '천벌 참격', '신성 심판'],
    },
  },
  seoyoung: {
    a: {
      tagline: '성스러운 방패의 수호기사 루트',
      sfxTheme: 'holy',
      tier2Names: ['수호 기사', '성역 기사'],
      tier3Names: ['수호기사', '성기사', '철벽 성기사', '성역 수호'],
      tier2Desc: ['막기 숙련', '성역 방어'],
      tier3Desc: ['수호 극의', '성스러운 맹세', '철벽 성역', '절대 수호'],
    },
    b: {
      tagline: '복수의 검으로 응징하는 기사 루트',
      sfxTheme: 'blade',
      tier2Names: ['응징 기사', '복수의 기사'],
      tier3Names: ['복수 기사', '심판 기사', '응징 성검', '정의의 기사'],
      tier2Desc: ['반격 탱커', '복수 연계'],
      tier3Desc: ['복수 극의', '심판 참격', '응징 폭발', '정의의 심판'],
    },
  },
  teso: {
    a: {
      tagline: '성검으로 악을 베는 성검 기사 루트',
      sfxTheme: 'holy',
      tier2Names: ['성역 템플러', '성광 기사'],
      tier3Names: ['성검 기사', '성전 템플러', '성광 검사', '천상 성기사'],
      tier2Desc: ['성역 수호', '성광 검술'],
      tier3Desc: ['성검 극의', '성전 돌격', '성광 폭발', '천상 일격'],
    },
    b: {
      tagline: '결계와 심판의 성역 루트',
      sfxTheme: 'holy',
      tier2Names: ['결계 기사', '성역 수호'],
      tier3Names: ['심판관', '결계 수호', '성역 심판관', '신성 결계사'],
      tier2Desc: ['마방 특화', '결계 방어'],
      tier3Desc: ['심판 극의', '결계 장막', '성역 심판', '신성 방벽'],
    },
  },
  cutie: {
    a: {
      tagline: '망령 검기로 적을 베는 멸망 루트',
      sfxTheme: 'shadow',
      tier2Names: ['망령 검객', '공허 검사'],
      tier3Names: ['멸망검사', '공허 검성', '망령 극검', '사신 검객'],
      tier2Desc: ['망령 검술', '공허 참격'],
      tier3Desc: ['멸망 극의', '공허 폭발', '망령 지배', '죽음의 검'],
    },
    b: {
      tagline: '망령 군단을 이끄는 공허 장군 루트',
      sfxTheme: 'shadow',
      tier2Names: ['망령 장군', '공허 기사'],
      tier3Names: ['공허장군', '망령 대장', '공허 결계사', '사신 장군'],
      tier2Desc: ['망령 지휘', '공허 방어'],
      tier3Desc: ['공허 극의', '망령 군단', '결계 지배', '죽음의 지배'],
    },
  },
  horangi: {
    a: {
      tagline: '백호의 힘으로 압도하는 야수 루트',
      sfxTheme: 'beast',
      tier2Names: ['맹호 투사', '백호 전사'],
      tier3Names: ['백호장군', '맹호 극전사', '산신 투사', '백호 전장'],
      tier2Desc: ['야성 폭발', '맹호 연타'],
      tier3Desc: ['백호 극의', '맹호 지배', '산신 분노', '백호 참격'],
    },
    b: {
      tagline: '섬광 연타로 적을 가르는 검사 루트',
      sfxTheme: 'blade',
      tier2Names: ['연격 검사', '섬광 검사'],
      tier3Names: ['산신검사', '섬광 극검', '연타 검성', '포효 검사'],
      tier2Desc: ['연타 특화', '섬광 치명'],
      tier3Desc: ['산신 검도', '섬광 폭발', '연타 극의', '포효 일격'],
    },
  },
  hyesung: {
    a: {
      tagline: '천강의 속도로 베는 검성 루트',
      sfxTheme: 'blade',
      tier2Names: ['천광 검사', '유성 검객'],
      tier3Names: ['천강검성', '유성 검성', '광속 검사', '천강 검성'],
      tier2Desc: ['광속 질주', '유성 일격'],
      tier3Desc: ['천강 극의', '유성 폭발', '광속 지배', '천강 참격'],
    },
    b: {
      tagline: '혜성처럼 떨어지는 치명 검성 루트',
      sfxTheme: 'blade',
      tier2Names: ['섬광 검사', '혜성 검객'],
      tier3Names: ['유성검성', '혜성 극검', '섬광 검성', '혜성 검성'],
      tier2Desc: ['폭발 치명', '섬광 연무'],
      tier3Desc: ['유성 극의', '혜성 폭발', '섬광 지배', '충돌 일격'],
    },
  },
  isanim: {
    a: {
      tagline: '점액으로 아군을 치유하는 현자 루트',
      sfxTheme: 'support',
      tier2Names: ['치유 연금술사', '가속 현자'],
      tier3Names: ['점액현자', '치유 대가', '생명 연금술사', '대현자'],
      tier2Desc: ['파티 가속', '점액 치유'],
      tier3Desc: ['현자 극의', '치유 지배', '생명 결계', '원천 현자'],
    },
    b: {
      tagline: '산성과 폭액으로 적을 녹이는 루트',
      sfxTheme: 'arcane',
      tier2Names: ['산성 술사', '부식 연금술사'],
      tier3Names: ['폭액술사', '부식 대마', '산성 마도사', '부식 현자'],
      tier2Desc: ['공격 서포트', '산성 강화'],
      tier3Desc: ['폭액 극의', '부식 지배', '산성 폭발', '부식 지옥'],
    },
  },
  sanjeok: {
    a: {
      tagline: '산적왕의 광폭한 일격 루트',
      sfxTheme: 'berserker',
      tier2Names: ['파검 도적', '호령 도적'],
      tier3Names: ['산적대장', '산적왕', '호령 도적왕', '산맥 도적'],
      tier2Desc: ['도적 근력', '광폭 일격'],
      tier3Desc: ['대장 극의', '산적왕', '호령 폭발', '산맥 지배'],
    },
    b: {
      tagline: '약탈과 전리품의 무법 루트',
      sfxTheme: 'shadow',
      tier2Names: ['약탈 도적', '무법 도적'],
      tier3Names: ['약탈왕', '황금 도적', '무법 제왕', '전리 도적'],
      tier2Desc: ['전리품 특화', '약탈 숙련'],
      tier3Desc: ['약탈 극의', '황금 폭풍', '무법 지배', '전리 지배'],
    },
  },
  sodia: {
    a: {
      tagline: '저승 화살로 영혼을 꿰뚫는 사신 루트',
      sfxTheme: 'shadow',
      tier2Names: ['망령 궁수', '저승 사수'],
      tier3Names: ['사신궁수', '저승 저격수', '망령 사수', '사신 사수'],
      tier2Desc: ['망령 사격', '저격 강화'],
      tier3Desc: ['사신 극의', '저승 일격', '망령 지배', '심판 사수'],
    },
    b: {
      tagline: '독과 맹독 화살의 독령 루트',
      sfxTheme: 'ranger',
      tier2Names: ['독궁 사수', '망독 궁수'],
      tier3Names: ['독령궁수', '망독 사수', '독령 사수', '맹독 궁수'],
      tier2Desc: ['독 특화', '연사 독화살'],
      tier3Desc: ['독령 극의', '망독 폭발', '독 지배', '맹독 일격'],
    },
  },
  jimjimi: {
    a: {
      tagline: '질풍 돌격으로 진형을 찢는 파쇄 루트',
      sfxTheme: 'lancer',
      tier2Names: ['질풍 기마', '돌격 기병'],
      tier3Names: ['파쇄기사', '질풍 기사', '관통 기사', '파쇄 기병'],
      tier2Desc: ['질풍 돌격', '관통 특화'],
      tier3Desc: ['파쇄 극의', '질풍 지배', '관통 일격', '돌격 지배'],
    },
    b: {
      tagline: '철갑 기동으로 버티는 돌격 루트',
      sfxTheme: 'guardian',
      tier2Names: ['철갑 기병', '중장 기사'],
      tier3Names: ['돌격기사', '강철 기병', '철벽 기동', '불굴 기사'],
      tier2Desc: ['방어 기동', '철벽 돌격'],
      tier3Desc: ['돌격 극의', '강철 지배', '철벽 진군', '불굴 기동'],
    },
  },
  danjong: {
    a: {
      tagline: '절대 방어의 왕령 기사 루트',
      sfxTheme: 'royal',
      tier2Names: ['왕령 기사', '절대 수호'],
      tier3Names: ['절대기사', '왕령 수호', '절대 방패', '군주 기사'],
      tier2Desc: ['왕의 방패', '절대 방어'],
      tier3Desc: ['절대 극의', '왕령 지배', '방패 지배', '군주 결계'],
    },
    b: {
      tagline: '멸망의 왕검으로 심판하는 루트',
      sfxTheme: 'royal',
      tier2Names: ['왕검 기사', '심판 군주'],
      tier3Names: ['멸망기사', '왕검 심판', '멸망 참격', '군주 검사'],
      tier2Desc: ['공격형 군주', '왕검 일격'],
      tier3Desc: ['멸망 극의', '왕검 지배', '심판 참격', '군주 분노'],
    },
  },
  hyeoni: {
    a: {
      tagline: '사신의 손으로 영혼을 거두는 루트',
      sfxTheme: 'shadow',
      tier2Names: ['망령 마도사', '영혼 술사'],
      tier3Names: ['사신술사', '망령 대마', '영혼 마도사', '사신 마도사'],
      tier2Desc: ['망령 마법', '영혼 흡수'],
      tier3Desc: ['사신 극의', '망령 지배', '영혼 지배', '죽음의 손'],
    },
    b: {
      tagline: '저주와 결계의 영주 루트',
      sfxTheme: 'arcane',
      tier2Names: ['저주 술사', '영혼 결계사'],
      tier3Names: ['영주술사', '저주 대마', '영혼 결계사', '죽음 술사'],
      tier2Desc: ['저주 특화', '영혼 방어'],
      tier3Desc: ['영주 극의', '저주 지배', '결계 장막', '죽음 장막'],
    },
  },
  pocket: {
    a: {
      tagline: '압축 강철로 적을 막아내는 루트',
      sfxTheme: 'guardian',
      tier2Names: ['철갑 호위', '강철 기사'],
      tier3Names: ['강철기사', '압축 기사', '강철 요새', '철의 수호'],
      tier2Desc: ['소형 철벽', '압축 방어'],
      tier3Desc: ['강철 극의', '방패 지배', '요새 결계', '철 수호'],
    },
    b: {
      tagline: '어그로와 성벽으로 버티는 불굴 루트',
      sfxTheme: 'guardian',
      tier2Names: ['방패 호위', '요새 기사'],
      tier3Names: ['불굴기사', '요새 수호', '결계 기사', '불굴 성벽'],
      tier2Desc: ['어그로 특화', '결계 탱커'],
      tier3Desc: ['불굴 극의', '요새 지배', '결계 지배', '성벽 수호'],
    },
  },
};

function treeMaterialMult(prefix: string): number {
  if (prefix.endsWith('_pr')) return 10;
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

function defaultGrowthMaterials(tier: number, prefix: string): Record<string, number> {
  const mult = treeMaterialMult(prefix);
  let base: Record<string, number>;
  if (tier === 0) {
    base = { rare_ore: 6, magic_dust: 10, spirit_thread: 6, beast_fang: 4 };
  } else if (tier === 1) {
    base = { rare_ore: 12, magic_dust: 18, spirit_thread: 10, beast_fang: 8, legend_scale: 2 };
  } else {
    base = { rare_ore: 18, legend_scale: 3, magic_dust: 28, spirit_thread: 14, void_shard: 2 };
  }
  return scaleMats(base, mult);
}

function growthNodeCost(base: number, tier: number): number {
  const curve = Math.pow(1.42, tier);
  const mult = PRESTIGE_TIER_COST_MULT[tier] ?? 1;
  return Math.round(base * 2.8 * curve * mult);
}

function scalePrestigeStat(value: number | undefined, tier: number, forkMult = 1): number | undefined {
  if (value == null) return undefined;
  const mult = (PRESTIGE_TIER_STAT_MULT[tier] ?? 1) * forkMult;
  const scaled = value * mult;
  return value < 1 && value > 0 ? Math.round(scaled * 1000) / 1000 : Math.round(scaled);
}

type ForkProfile = 'assault' | 'bastion' | 'apex' | 'zenith';

function applyForkProfile(base: BranchNodeIn, profile: ForkProfile, tier: number): BranchNodeIn {
  const assault = profile === 'assault' || profile === 'apex';
  const bastion = profile === 'bastion' || profile === 'zenith';
  const tierBoost = tier >= 2 ? 1.38 + tier * 0.06 : 1 + tier * 0.06;
  const atkM = assault ? 1.75 : bastion ? 0.72 : 1.15;
  const defM = bastion ? 1.7 : assault ? 0.55 : 1.05;
  const hpM = bastion ? 1.55 : assault ? 1.08 : 1.12;
  const spdM = assault ? 1.35 : 0.92;
  const critAdd = assault ? 0.08 : bastion ? 0.02 : 0.04;
  return {
    ...base,
    atk: base.atk != null ? Math.round(base.atk * atkM * tierBoost) : undefined,
    def: base.def != null ? Math.round(base.def * defM * tierBoost) : undefined,
    hp: base.hp != null ? Math.round(base.hp * hpM * tierBoost) : undefined,
    atkSpd: base.atkSpd != null ? Math.round(base.atkSpd * spdM * 100) / 100 : (assault ? 0.06 : undefined),
    crit: base.crit != null ? Math.round((base.crit + critAdd) * 1000) / 1000 : (assault ? critAdd : undefined),
    aoeBonus: base.aoeBonus != null ? Math.round(base.aoeBonus * (assault ? 1.4 : 0.85) * 100) / 100 : undefined,
    buffAtk: base.buffAtk != null ? Math.round(base.buffAtk * (bastion ? 1.1 : 1.25) * 100) / 100 : undefined,
    buffSpd: base.buffSpd != null ? Math.round(base.buffSpd * 1.2 * 100) / 100 : undefined,
  };
}

function pushNode(
  out: GrowthNode[],
  def: PrestigeBranchCharDef,
  n: BranchNodeIn,
  tierIdx: number,
  branchPath: string,
  branchGroup: string,
  id: string,
  reqNode: string | undefined,
  pathLabel: string,
  displayName?: string,
) {
  const branchTier = (tierIdx + 1) as 1 | 2 | 3;
  const tierTag = branchTier === 1 ? '2차' : branchTier === 2 ? '3차' : '4차';
  const name = displayName ?? n.name;
  out.push({
    id,
    charId: def.charId,
    tree: def.treeName,
    name,
    desc: `${tierTag} · ${pathLabel} · Lv.${PRESTIGE_TIER_LEVELS[tierIdx]} · ${n.desc}`,
    cost: growthNodeCost(n.cost, tierIdx),
    reqLevel: PRESTIGE_TIER_LEVELS[tierIdx] ?? n.lv,
    reqNode,
    successRate: 1,
    materials: defaultGrowthMaterials(tierIdx, def.prefix),
    atk: scalePrestigeStat(n.atk, tierIdx),
    def: scalePrestigeStat(n.def, tierIdx),
    hp: scalePrestigeStat(n.hp, tierIdx),
    atkSpd: scalePrestigeStat(n.atkSpd, tierIdx),
    crit: scalePrestigeStat(n.crit, tierIdx),
    aoeBonus: scalePrestigeStat(n.aoeBonus, tierIdx),
    buffAtk: scalePrestigeStat(n.buffAtk, tierIdx),
    buffSpd: scalePrestigeStat(n.buffSpd, tierIdx),
    buffCrit: scalePrestigeStat(n.buffCrit, tierIdx),
    buffExp: scalePrestigeStat(n.buffExp, tierIdx),
    branchGroup,
    branchPath,
    branchTier,
  });
}

export function enrichPath(path: PrestigeBranchPathDef, charId: string): PrestigeBranchPathDef {
  const meta = PRESTIGE_FORK_META[charId]?.[path.key as 'a' | 'b'];
  if (!meta) return path;
  return {
    ...path,
    tagline: meta.tagline,
    sfxTheme: meta.sfxTheme,
    tier2Names: meta.tier2Names,
    tier3Names: meta.tier3Names,
    tier2Desc: meta.tier2Desc,
    tier3Desc: meta.tier3Desc,
  };
}

/** A/B 루트 → 3차 2갈래 → 4차 각 2갈래 (경로별 고유 직업명) */
export function buildPrestigeBranches(defs: PrestigeBranchCharDef[]): GrowthNode[] {
  const out: GrowthNode[] = [];
  for (const def of defs) {
    for (const rawPath of def.paths) {
      const path = enrichPath(rawPath, def.charId);
      const meta = PRESTIGE_FORK_META[def.charId]?.[path.key as 'a' | 'b'];
      if (!meta) continue;

      const rootKey = path.key;
      const id1 = `${def.prefix}_${rootKey}_1`;
      const group1 = `${def.charId}_job_t1`;

      pushNode(out, def, path.nodes[0], 0, rootKey, group1, id1, undefined, path.label, path.nodes[0].name);

      const t2Profiles: [ForkProfile, ForkProfile] = ['assault', 'bastion'];
      const t2Ids: [string, string] = [`${def.prefix}_${rootKey}1_2`, `${def.prefix}_${rootKey}2_2`];
      const group2 = `${def.charId}_job_t2`;

      t2Profiles.forEach((prof, i) => {
        const forkNode = applyForkProfile(path.nodes[1], prof, 1);
        forkNode.desc = meta.tier2Desc[i]!;
        pushNode(
          out, def, forkNode, 1, `${rootKey}${i + 1}`, group2, t2Ids[i]!, id1,
          path.label, meta.tier2Names[i],
        );
      });

      const t3Profiles: ForkProfile[] = ['apex', 'zenith', 'apex', 'zenith'];
      const group3 = `${def.charId}_job_t3`;
      const t3Paths = [`${rootKey}1x`, `${rootKey}1y`, `${rootKey}2x`, `${rootKey}2y`];
      const t3Reqs = [t2Ids[0], t2Ids[0], t2Ids[1], t2Ids[1]];

      t3Profiles.forEach((prof, i) => {
        const forkNode = applyForkProfile(path.nodes[2], prof, 2);
        forkNode.desc = meta.tier3Desc[i]!;
        const id3 = `${def.prefix}_${t3Paths[i]}_3`;
        pushNode(
          out, def, forkNode, 2, t3Paths[i]!, group3, id3, t3Reqs[i]!,
          path.label, meta.tier3Names[i],
        );
      });
    }
  }
  return out;
}

import { PRESTIGE_BRANCH_DEFS } from './prestigeBranchData';

/** UI용 경로 표시명 [2차, 3차, 4차] */
export function getPrestigePathDisplay(charId: string, pathKey: 'a' | 'b'): string[] {
  const def = PRESTIGE_BRANCH_DEFS.find(d => d.charId === charId);
  const meta = PRESTIGE_FORK_META[charId]?.[pathKey];
  const pathIdx = pathKey === 'b' ? 1 : 0;
  const t1 = def?.paths[pathIdx]?.nodes[0]?.name ?? pathKey;
  if (!meta) return [t1, '3차', '4차'];
  return [t1, meta.tier2Names[0]!, meta.tier3Names[0]!];
}

export function buildPrestigePathsRecord(): Record<string, string[][]> {
  const out: Record<string, string[][]> = {};
  for (const def of PRESTIGE_BRANCH_DEFS) {
    out[def.charId] = [
      getPrestigePathDisplay(def.charId, 'a'),
      getPrestigePathDisplay(def.charId, 'b'),
    ];
  }
  return out;
}
