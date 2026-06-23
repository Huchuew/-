import { CHAR_MAP } from './characters';
import { REGIONS } from './regions';
import { getStarterProfile, STARTER_SIM_ORDER } from './starterBalance';
import { STARTER_CHAR_IDS } from '../ui/StarterSelect';
import type { EquipRole } from '../types';

export type PlaystyleId = 'power' | 'guard' | 'heal' | 'support' | 'balance';
export type MotivationId = 'glory' | 'wealth' | 'explore' | 'protect';
export type PaceId = 'steady' | 'bold' | 'flexible';
export type CombatPrefId = 'melee' | 'ranged' | 'magic' | 'flex';

export interface StarterSurveyAnswers {
  motivation: MotivationId;
  playstyle: PlaystyleId;
  pace: PaceId;
  combat: CombatPrefId;
  homeStationId: number;
}

export interface SurveyOption {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export const SURVEY_STORY = {
  intro: {
    title: '던전의 부름',
    lines: [
      '전설이 된 18개 지점, 그 아래로 이어진 거대한 던전.',
      '잃어버린 배지를 되찾을 모험가— 길드가 당신을 기다리고 있었습니다.',
    ],
    quote: '「처음이시군요. 몇 가지만 여쭤볼게요. 당신에게 맞는 첫 동료를 찾아 드리겠습니다.」',
  },
  motivation: {
    lead: '길드 관리인이 펜을 들며 묻습니다.',
    question: '무엇이 당신을 던전 문 앞까지 이끌었나요?',
  },
  playstyle: {
    lead: '관리인이 고개를 끄덕입니다.',
    question: '전장에서 어떤 모험가가 되고 싶으신가요?',
  },
  pace: {
    lead: '던전 입구에서 바람이 불어옵니다.',
    question: '모험의 템포는 어떻게 가져가고 싶으신가요?',
  },
  combat: {
    lead: '무기고 앞을 지나며 관리인이 말합니다.',
    question: '전투에서 가장 끌리는 방식은 무엇인가요?',
  },
  station: {
    lead: '마지막으로, 고향 같은 곳이 있으신가요?',
    question: '본인의 지점은 어디입니까?',
    sub: '선택한 지점을 처음 클리어하면 보너스 골드를 드립니다',
  },
  team: {
    lead: '관리인이 서류를 내밉니다.',
    question: '모험단 이름과 대표 닉네임을 정해 주세요',
    sub: '라이벌 리그·마을 화면에 표시됩니다',
  },
  character: {
    lead: '관리인이 명단을 펼칩니다.',
    question: '함께할 첫 동료를 골라 주세요',
  },
} as const;

export const MOTIVATION_OPTIONS: SurveyOption[] = [
  { id: 'glory', icon: '🏆', title: '명예', desc: '전설이 되고 싶어요' },
  { id: 'wealth', icon: '💰', title: '재물', desc: '보물과 골드를 쌓고 싶어요' },
  { id: 'explore', icon: '🗺️', title: '탐험', desc: '미지의 층을 밝혀내고 싶어요' },
  { id: 'protect', icon: '🛡️', title: '수호', desc: '사람들을 지키고 싶어요' },
];

export const PLAYSTYLE_OPTIONS: SurveyOption[] = [
  { id: 'power', icon: '⚔️', title: '화력형', desc: '빠르게 적을 쓰러뜨리고 싶어요' },
  { id: 'guard', icon: '🛡️', title: '방어형', desc: '튼튼하게 맞아주며 버티고 싶어요' },
  { id: 'heal', icon: '💚', title: '회복형', desc: '천천히 안전하게 가고 싶어요' },
  { id: 'support', icon: '✨', title: '서포트형', desc: '버프·연금으로 돕고 싶어요' },
  { id: 'balance', icon: '⚖️', title: '균형형', desc: '때리기도 하고 버티기도 하고 싶어요' },
];

export const PACE_OPTIONS: SurveyOption[] = [
  { id: 'steady', icon: '🌱', title: '차근차근', desc: '안전하게 한 층씩 밀어가고 싶어요' },
  { id: 'bold', icon: '⚡', title: '속전속결', desc: '빠르게 층을 돌파하고 싶어요' },
  { id: 'flexible', icon: '🧭', title: '유연하게', desc: '상황에 맞게 전략을 바꾸고 싶어요' },
];

export const COMBAT_OPTIONS: SurveyOption[] = [
  { id: 'melee', icon: '⚔️', title: '근접 전투', desc: '앞에서 칼과 방패로 싸우고 싶어요' },
  { id: 'ranged', icon: '🏹', title: '원거리', desc: '멀리서 정확히 노리고 싶어요' },
  { id: 'magic', icon: '🔮', title: '마법·주문', desc: '마력과 기술로 제압하고 싶어요' },
  { id: 'flex', icon: '🎯', title: '상황 대응', desc: '무기보다 전술이 중요해요' },
];

const PLAYSTYLE_ROLES: Record<PlaystyleId, EquipRole[]> = {
  power: ['dps'],
  guard: ['tank'],
  heal: ['healer'],
  support: ['support'],
  balance: ['bruiser', 'dps', 'tank'],
};

const MOTIVATION_ROLES: Record<MotivationId, EquipRole[]> = {
  glory: ['dps', 'bruiser'],
  wealth: ['dps', 'support'],
  explore: ['bruiser', 'support'],
  protect: ['tank', 'healer'],
};

const PACE_DIFF_BIAS: Record<PaceId, 'easy' | 'normal' | 'hard'> = {
  steady: 'easy',
  bold: 'hard',
  flexible: 'normal',
};

const COMBAT_JOBS: Record<CombatPrefId, string[]> = {
  melee: ['warrior', 'fighter', 'berserker', 'lancer'],
  ranged: ['archer'],
  magic: ['mage', 'buffer_spd'],
  flex: [],
};

export const STATION_ICONS: Record<number, string> = {
  1: '🏟️', 2: '🏰', 3: '🎸', 4: '✨', 5: '📚',
  6: '🌊', 7: '🌲', 8: '🌙', 9: '❄️', 10: '🔥',
  11: '⚙️', 12: '🏞️', 13: '⚔️', 14: '⭐', 15: '🧘',
  16: '🌳', 17: '💎', 18: '🌹',
};

export function getStationIcon(regionId: number): string {
  return STATION_ICONS[regionId] ?? '📍';
}

export function getHomeStationClearBonus(regionId: number): number {
  const base = 2_500 + regionId * 750;
  const late = regionId > 10 ? (regionId - 10) * 500 : 0;
  return base + late;
}

export function formatHomeStationBonus(regionId: number): string {
  const gold = getHomeStationClearBonus(regionId);
  return `🪙${gold.toLocaleString()}`;
}

function paceScore(profile: ReturnType<typeof getStarterProfile>, pace: PaceId): number {
  if (!profile) return 0;
  const bias = PACE_DIFF_BIAS[pace];
  if (bias === 'easy') return Math.max(0, 20 - profile.simRank) * 1.2;
  if (bias === 'hard') return profile.simRank * 0.6 + profile.lateGrowthPerLevel * 30;
  return Math.max(0, 14 - Math.abs(profile.simRank - 7)) * 0.8;
}

function scoreCharForSurvey(charId: string, answers: StarterSurveyAnswers): number {
  const c = CHAR_MAP[charId];
  const profile = getStarterProfile(charId);
  if (!c || !profile) return 0;

  let score = 0;

  const playRoles = PLAYSTYLE_ROLES[answers.playstyle];
  if (playRoles.includes(c.equipRole)) score += 50;
  else if (answers.playstyle === 'balance' && (c.equipRole === 'healer' || c.equipRole === 'support')) score += 15;

  const motRoles = MOTIVATION_ROLES[answers.motivation];
  if (motRoles.includes(c.equipRole)) score += 22;

  score += paceScore(profile, answers.pace);

  const combatJobs = COMBAT_JOBS[answers.combat];
  if (combatJobs.length && combatJobs.includes(c.job)) score += 28;
  else if (answers.combat === 'flex') score += 8;

  const rank = profile.simRank;
  score += Math.max(0, 18 - rank) * 0.9;
  score += profile.lateGrowthPerLevel * 25;

  const stationBias = (answers.homeStationId - 1) % STARTER_SIM_ORDER.length;
  const orderIdx = STARTER_SIM_ORDER.indexOf(charId);
  if (orderIdx >= 0) {
    const dist = Math.abs(orderIdx - stationBias);
    score += Math.max(0, 6 - dist);
  }

  return score;
}

export function recommendStarterChars(answers: StarterSurveyAnswers, count = 3): string[] {
  const ranked = STARTER_CHAR_IDS
    .map(id => ({ id, score: scoreCharForSurvey(id, answers) }))
    .sort((a, b) => b.score - a.score);
  return ranked.slice(0, count).map(r => r.id);
}

export function getPrimaryRecommendation(answers: StarterSurveyAnswers): string {
  return recommendStarterChars(answers, 1)[0] ?? 'huchu';
}

export function getRegionName(regionId: number): string {
  return REGIONS.find(r => r.id === regionId)?.name ?? `${regionId}층`;
}

/** HUD·리그용 본거지 라벨 */
export function getHomeStationLabel(save: { homeStationId?: number; starterSurvey?: { homeStationId: number } }): string | null {
  const id = save.homeStationId ?? save.starterSurvey?.homeStationId;
  if (!id) return null;
  return `${getStationIcon(id)} ${getRegionName(id)}`;
}

const DEFAULT_TEAM_NAME = '투닥 모험단';
const DEFAULT_NICK = '단장';

export function getAdventureTeamName(save: {
  adventureTeamName?: string;
  homeStationId?: number;
  starterSurvey?: { homeStationId: number };
}): string {
  const trimmed = save.adventureTeamName?.trim();
  if (trimmed) return trimmed;
  const homeId = save.homeStationId ?? save.starterSurvey?.homeStationId;
  if (homeId) return `${getRegionName(homeId)} 모험단`;
  return DEFAULT_TEAM_NAME;
}

export function getPlayerNickname(save: { playerNickname?: string }): string {
  const trimmed = save.playerNickname?.trim();
  return trimmed || DEFAULT_NICK;
}

/** 설문·설정에서 모험단 이름 정규화 */
export function validateTeamIdentity(teamName: string, nickname: string): string | null {
  if (!nickname.trim()) return '대표 닉네임을 입력해 주세요';
  if (!teamName.trim()) return '모험단 이름을 입력해 주세요';
  return null;
}

export function normalizeTeamIdentity(
  teamName: string,
  nickname: string,
  homeStationId?: number,
): { adventureTeamName: string; playerNickname: string } {
  const team = teamName.trim().slice(0, 16) || (homeStationId
    ? `${getRegionName(homeStationId)} 모험단`
    : DEFAULT_TEAM_NAME);
  const nick = nickname.trim().slice(0, 10);
  if (!nick) {
    return {
      adventureTeamName: team.trim().slice(0, 16) || DEFAULT_TEAM_NAME,
      playerNickname: '',
    };
  }
  return { adventureTeamName: team, playerNickname: nick };
}
