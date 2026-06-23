import type { CharDef } from '../types';
import { CHAR_MAP } from './characters';
import { ROLE_LEVEL_GROWTH, ROLE_STAT_SHAPE } from './roleBalance';

export type StarterDifficultyId = 'easy' | 'normal' | 'hard';
export type StarterStarLevel = 1 | 2 | 3 | 4 | 5;

export interface StarterProfile {
  /** 18층 클리어 시뮬 순위 (1=최단) */
  simRank: number;
  /** 표시용 5단계 별 (1=쉬움 … 5=어려움) */
  starLevel: StarterStarLevel;
  /** 전투·성장 밸런스용 (표시와 별개) */
  difficulty: StarterDifficultyId;
  label: string;
  /** 예상 18층 총 클리어 시간(시간) — floor18-time-sim 기준 */
  estClearHours: number;
  hint: string;
  /** Lv13부터 레벨당 추가 성장 (역할 성장치 × 이 값) */
  lateGrowthPerLevel: number;
  lateLevelStart: number;
}

/** 시뮬 순위 (쉬움→어려움) */
export const STARTER_SIM_ORDER: string[] = [
  'dung', 'ujang', 'huchu', 'lesford', 'teso',
  'ampa', 'mujang', 'cutie', 'seoyoung', 'yujin',
  'hyesung', 'sodia', 'hyeoni', 'horangi', 'sanjeok',
  'jimjimi', 'pocket', 'isanim', 'danjong',
];

const RANK_LABELS: Record<number, string> = {
  1: '최상',
  2: '매우 쉬움',
  3: '쉬움',
  4: '약간 쉬움',
  5: '보통',
  6: '약간 어려움',
  7: '어려움',
  8: '매우 어려움',
  9: '최하',
  10: '극한',
  11: '쉬움+',
  12: '보통-',
  13: '보통',
  14: '보통+',
  15: '어려움-',
  16: '어려움',
  17: '어려움+',
  18: '매우 어려움',
  19: '최하급',
};

export function simRankToStarLevel(simRank: number): StarterStarLevel {
  return Math.min(5, Math.max(1, Math.ceil(simRank / 2))) as StarterStarLevel;
}

export function formatStarBar(filled: number, total = 5): string {
  const n = Math.max(0, Math.min(total, Math.round(filled)));
  return '★'.repeat(n) + '☆'.repeat(total - n);
}

/** 스타팅 프로필 — 표시 난이도는 시뮬 순위·5별 기준 */
export const STARTER_PROFILES: Record<string, StarterProfile> = {
  dung: {
    simRank: 1, starLevel: 1, difficulty: 'easy', label: RANK_LABELS[1]!, estClearHours: 27.4,
    hint: '솔로 화력 최고 · 영입 빠름',
    lateGrowthPerLevel: 0.08, lateLevelStart: 13,
  },
  ujang: {
    simRank: 2, starLevel: 1, difficulty: 'easy', label: RANK_LABELS[2]!, estClearHours: 31.6,
    hint: '연타 딜 · 안정적 초반',
    lateGrowthPerLevel: 0.07, lateLevelStart: 13,
  },
  huchu: {
    simRank: 3, starLevel: 2, difficulty: 'easy', label: RANK_LABELS[3]!, estClearHours: 31.8,
    hint: '광역 딜 · 초반 속도형',
    lateGrowthPerLevel: 0.06, lateLevelStart: 13,
  },
  lesford: {
    simRank: 4, starLevel: 2, difficulty: 'normal', label: RANK_LABELS[4]!, estClearHours: 35.3,
    hint: '관통 딜 · 중반부터 강해짐',
    lateGrowthPerLevel: 0.38, lateLevelStart: 13,
  },
  teso: {
    simRank: 5, starLevel: 3, difficulty: 'hard', label: RANK_LABELS[5]!, estClearHours: 36.4,
    hint: '마방 탱 · 초반 느림 · 후반 급성장',
    lateGrowthPerLevel: 1.38, lateLevelStart: 11,
  },
  ampa: {
    simRank: 6, starLevel: 3, difficulty: 'normal', label: RANK_LABELS[6]!, estClearHours: 43.4,
    hint: '브루저 · 체력 관리 필요',
    lateGrowthPerLevel: 0.4, lateLevelStart: 13,
  },
  mujang: {
    simRank: 7, starLevel: 4, difficulty: 'hard', label: RANK_LABELS[7]!, estClearHours: 43.7,
    hint: '탱커 · 솔로 딜 약함 · 후반 급성장',
    lateGrowthPerLevel: 1.38, lateLevelStart: 11,
  },
  cutie: {
    simRank: 8, starLevel: 4, difficulty: 'normal', label: RANK_LABELS[8]!, estClearHours: 44.0,
    hint: '느린 대검 · 후반 일점사',
    lateGrowthPerLevel: 0.36, lateLevelStart: 13,
  },
  seoyoung: {
    simRank: 9, starLevel: 4, difficulty: 'hard', label: RANK_LABELS[9]!, estClearHours: 44.0,
    hint: '최고 방어 · 영입·파밍 오래 걸림',
    lateGrowthPerLevel: 1.52, lateLevelStart: 11,
  },
  yujin: {
    simRank: 10, starLevel: 4, difficulty: 'normal', label: RANK_LABELS[10]!, estClearHours: 42.0,
    hint: '힐러 · 영입 빠름 · 후반 화력 보완',
    lateGrowthPerLevel: 0.82, lateLevelStart: 12,
  },
  hyesung: {
    simRank: 11, starLevel: 2, difficulty: 'normal', label: RANK_LABELS[11]!, estClearHours: 33.2,
    hint: '광속 검술 · 연타·치명 폭발',
    lateGrowthPerLevel: 0.10, lateLevelStart: 13,
  },
  sodia: {
    simRank: 12, starLevel: 2, difficulty: 'normal', label: RANK_LABELS[12]!, estClearHours: 34.5,
    hint: '망령 궁수 · 독·저격 특화',
    lateGrowthPerLevel: 0.09, lateLevelStart: 13,
  },
  hyeoni: {
    simRank: 13, starLevel: 2, difficulty: 'normal', label: RANK_LABELS[13]!, estClearHours: 35.8,
    hint: '사술사 · 독·저주 딜',
    lateGrowthPerLevel: 0.08, lateLevelStart: 13,
  },
  horangi: {
    simRank: 14, starLevel: 3, difficulty: 'normal', label: RANK_LABELS[14]!, estClearHours: 45.2,
    hint: '라미 · 수인 브루저 · 포효·연타',
    lateGrowthPerLevel: 0.38, lateLevelStart: 13,
  },
  sanjeok: {
    simRank: 15, starLevel: 3, difficulty: 'normal', label: RANK_LABELS[15]!, estClearHours: 46.1,
    hint: '도적 브루저 · 약탈·근접',
    lateGrowthPerLevel: 0.36, lateLevelStart: 13,
  },
  jimjimi: {
    simRank: 16, starLevel: 3, difficulty: 'normal', label: RANK_LABELS[16]!, estClearHours: 46.8,
    hint: '돌격 기병 · 관통·기동',
    lateGrowthPerLevel: 0.38, lateLevelStart: 13,
  },
  pocket: {
    simRank: 17, starLevel: 3, difficulty: 'normal', label: RANK_LABELS[17]!, estClearHours: 47.5,
    hint: '철갑 탱 · 기동 방어',
    lateGrowthPerLevel: 0.42, lateLevelStart: 13,
  },
  isanim: {
    simRank: 18, starLevel: 4, difficulty: 'normal', label: RANK_LABELS[18]!, estClearHours: 49.2,
    hint: '연금 서포트 · 회복·가속·정화',
    lateGrowthPerLevel: 0.45, lateLevelStart: 12,
  },
  danjong: {
    simRank: 19, starLevel: 4, difficulty: 'hard', label: RANK_LABELS[19]!, estClearHours: 50.8,
    hint: '망령 탱 · 왕권·방어 · 후반 급성장',
    lateGrowthPerLevel: 1.32, lateLevelStart: 11,
  },
};

export function getStarterProfile(charId: string): StarterProfile | undefined {
  const hit = STARTER_PROFILES[charId];
  if (hit) return hit;
  const def = CHAR_MAP[charId];
  if (!def || charId === 'hidden') return undefined;
  return deriveStarterProfile(def);
}

/** 프로필 미등록 캐릭터 — 역할 기반 표시용 난이도 */
function deriveStarterProfile(def: CharDef): StarterProfile {
  const role = def.equipRole;
  if (role === 'tank') {
    return {
      simRank: 17, starLevel: 4, difficulty: 'hard', label: '어려움',
      estClearHours: 48, hint: def.desc,
      lateGrowthPerLevel: 1.2, lateLevelStart: 11,
    };
  }
  if (role === 'healer' || role === 'support') {
    return {
      simRank: 16, starLevel: 4, difficulty: 'normal', label: '보통',
      estClearHours: 46, hint: def.desc,
      lateGrowthPerLevel: 0.45, lateLevelStart: 12,
    };
  }
  if (role === 'bruiser') {
    return {
      simRank: 15, starLevel: 3, difficulty: 'normal', label: '보통',
      estClearHours: 44, hint: def.desc,
      lateGrowthPerLevel: 0.36, lateLevelStart: 13,
    };
  }
  if (def.atkSpd >= 1.15) {
    return {
      simRank: 12, starLevel: 2, difficulty: 'easy', label: '쉬움',
      estClearHours: 34, hint: def.desc,
      lateGrowthPerLevel: 0.07, lateLevelStart: 13,
    };
  }
  return {
    simRank: 14, starLevel: 3, difficulty: 'normal', label: '보통',
    estClearHours: 40, hint: def.desc,
    lateGrowthPerLevel: 0.3, lateLevelStart: 13,
  };
}

export function compareStarterSimRank(a: string, b: string): number {
  const ra = getStarterProfile(a)?.simRank ?? 99;
  const rb = getStarterProfile(b)?.simRank ?? 99;
  return ra - rb;
}

export function formatStarterDifficulty(charId: string): string {
  const p = getStarterProfile(charId);
  if (!p) return '';
  return `${formatStarBar(p.starLevel)} ${p.label}`;
}

export function formatStarterSimMeta(charId: string): string {
  const p = getStarterProfile(charId);
  if (!p) return '';
  const h = Math.round(p.estClearHours);
  return `순위 #${p.simRank} · 18층 ~${h}시간`;
}

/** lateGrowthPerLevel → 1~5 후반 성장 등급 (높을수록 동그라미 많이) */
export function getStarterLateGrowthStars(charId: string): StarterStarLevel {
  const p = getStarterProfile(charId);
  if (!p) return 1;
  const v = p.lateGrowthPerLevel;
  if (v >= 1.2) return 5;
  if (v >= 0.7) return 4;
  if (v >= 0.35) return 3;
  if (v >= 0.12) return 2;
  return 1;
}

/** 초반 쉬움 → 5칸 가득 (starLevel·difficulty 반영, starLevel은 높을수록 어려움) */
export function getStarterEarlyEaseStars(charId: string): StarterStarLevel {
  const p = getStarterProfile(charId);
  if (!p) return 3;
  const diffAdj = p.difficulty === 'easy' ? 1 : p.difficulty === 'hard' ? -1 : 0;
  const raw = 6 - p.starLevel + diffAdj;
  return Math.min(5, Math.max(1, raw)) as StarterStarLevel;
}

function earlyEaseLabel(stars: StarterStarLevel): string {
  if (stars >= 5) return '매우 쉬움';
  if (stars >= 4) return '쉬움';
  if (stars >= 3) return '보통';
  if (stars >= 2) return '어려움';
  return '매우 어려움';
}

function lateGrowthLabel(stars: StarterStarLevel): string {
  if (stars >= 5) return '매우 높음';
  if (stars >= 4) return '높음';
  if (stars >= 3) return '보통';
  if (stars >= 2) return '낮음';
  return '매우 낮음';
}

function renderStarMeter(filled: number, variant: 'easy' | 'growth'): string {
  const dots = Array.from({ length: 5 }, (_, i) => {
    const on = i < filled;
    return `<span class="star-meter-dot${on ? ' on' : ''}" aria-hidden="true"></span>`;
  }).join('');
  return `<div class="star-meter star-meter--${variant}" title="${filled}/5">${dots}</div>`;
}

/** 캐릭터 카드용 초반·후반 성장 미터 HTML */
export function renderStarterRatingRows(charId: string): string {
  const p = getStarterProfile(charId);
  if (!p) return '';
  const earlyStars = getStarterEarlyEaseStars(charId);
  const lateStars = getStarterLateGrowthStars(charId);
  return `
    <div class="starter-rating-block">
      <div class="starter-rating-row">
        <span class="starter-rating-label">🌱 초반</span>
        ${renderStarMeter(earlyStars, 'easy')}
        <span class="starter-rating-tag starter-rating-tag--easy">${earlyEaseLabel(earlyStars)}</span>
      </div>
      <div class="starter-rating-row">
        <span class="starter-rating-label">📈 후반</span>
        ${renderStarMeter(lateStars, 'growth')}
        <span class="starter-rating-tag starter-rating-tag--growth">Lv${p.lateLevelStart}+ · ${lateGrowthLabel(lateStars)}</span>
      </div>
    </div>`;
}

export function formatStarterLateGrowthHint(charId: string): string {
  const p = getStarterProfile(charId);
  if (!p) return '';
  const stars = getStarterLateGrowthStars(charId);
  return `후반 성장 ${formatStarBar(stars)} (Lv${p.lateLevelStart}+ · ${lateGrowthLabel(stars)})`;
}

/** 어려운 스타터 — 고레벨·고층에서 추가 스탯 */
export function getStarterLateGrowthBonus(
  def: CharDef,
  level: number,
  maxRegion = 1,
): { atk: number; def: number; hp: number } {
  const profile = getStarterProfile(def.id);
  if (!profile || level < profile.lateLevelStart) {
    return { atk: 0, def: 0, hp: 0 };
  }

  const growth = ROLE_LEVEL_GROWTH[def.equipRole];
  const shape = ROLE_STAT_SHAPE[def.equipRole];
  const lateLv = level - profile.lateLevelStart + 1;
  let mult = profile.lateGrowthPerLevel;

  if (profile.difficulty === 'hard' && maxRegion >= 10) {
    mult *= 1 + Math.min(0.62, (maxRegion - 9) * 0.068);
  }
  if (profile.difficulty === 'easy' && maxRegion >= 10) {
    mult *= 0.82;
  }

  return {
    atk: lateLv * growth.atk * shape.atk * mult,
    def: lateLv * growth.def * shape.def * mult * 0.85,
    hp: lateLv * growth.hp * shape.hp * mult,
  };
}

/** 스타터 난이도 — 10층 전·3인 미만 구간 공격 템포 (영입 후에도 유지) */
export function getStarterPaceAtkMult(save: {
  starterCharId?: string;
  party: string[];
  maxRegion?: number;
}): number {
  const sid = save.starterCharId ?? save.party[0];
  const profile = sid ? getStarterProfile(sid) : undefined;
  const maxR = save.maxRegion ?? 1;
  if (!profile) return 1;

  if (profile.difficulty === 'easy') {
    if (maxR < 10) return 0.88;
    if (maxR < 14) return 0.94;
    return 0.98;
  }
  if (profile.difficulty === 'normal') {
    if (maxR < 10) return 0.96;
    if (maxR < 14) return 1;
    return 1;
  }
  if (maxR < 10) return 1.02;
  if (maxR < 14) return 1;
  return 0.98;
}

/** 솔로 파밍 골드 — 탱·힐 스타터 영입 가속 */
export function getSoloGoldMult(save: {
  party: string[];
  maxRegion?: number;
  starterCharId?: string;
}): number {
  const maxR = save.maxRegion ?? 1;
  if (maxR >= 10) return 1;
  const sid = save.starterCharId ?? save.party[0];
  const role = sid ? CHAR_MAP[sid]?.equipRole : undefined;
  if (save.party.length > 1 && role !== 'tank' && role !== 'healer') return 1;
  const profile = sid ? getStarterProfile(sid) : undefined;
  if (role === 'tank') {
    const solo = save.party.length === 1 ? 1.55 : 1.28;
    return profile?.difficulty === 'hard' ? solo * 1.18 : solo;
  }
  if (role === 'healer') {
    const base = save.party.length === 1 ? 1.22 : 1.1;
    return profile?.difficulty === 'normal' && sid === 'yujin' ? base * 1.14 : base;
  }
  return 1;
}
