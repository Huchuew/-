/** 가상 CPU 길드 — 주간 랭크 대결 */
export interface RivalGuildDef {
  id: string;
  name: string;
  emoji: string;
  tag: string;
  motto: string;
  /** 일일 성장 계수 */
  growthPerDay: number;
  /** 시즌 시작 기본 점수 */
  baseScore: number;
}

export const RIVAL_GUILDS: RivalGuildDef[] = [
  { id: 'neon', name: '네온 워크스', emoji: '💻', tag: 'CPU-α', motto: '야근 없이 층을 올린다', growthPerDay: 26, baseScore: 88 },
  { id: 'iron', name: '철벽 매크로단', emoji: '🛡️', tag: 'CPU-β', motto: '탱커는 우리가 만든다', growthPerDay: 24, baseScore: 96 },
  { id: 'burst', name: '속사 연구소', emoji: '🔥', tag: 'CPU-γ', motto: 'DPS 실험 중… 실험체는 너', growthPerDay: 30, baseScore: 82 },
  { id: 'moon', name: '달빛 빌드팀', emoji: '🌙', tag: 'CPU-δ', motto: '메타는 매주 바뀜', growthPerDay: 27, baseScore: 92 },
  { id: 'sim', name: '시뮬레이션 길드', emoji: '⚙️', tag: 'CPU-ε', motto: '가상이 아니라 진짜 상위권', growthPerDay: 29, baseScore: 100 },
  { id: 'turtle', name: '안전운행 연합', emoji: '🐢', tag: 'CPU-ζ', motto: '느리지만 끝까지 간다', growthPerDay: 20, baseScore: 76 },
  { id: 'dice', name: '랜덤워크 컴퍼니', emoji: '🎲', tag: 'CPU-η', motto: '오늘의 운은 우리 편', growthPerDay: 25, baseScore: 86 },
];

export const RIVAL_GUILD_MAP = Object.fromEntries(RIVAL_GUILDS.map(g => [g.id, g]));

export const RIVAL_TAUNTS: Record<string, string[]> = {
  neon: ['컴파일 끝. 다음 층 갑니다.', '버그 없는 루트만 탑니다.', '우리는 패치 노트를 읽어요.'],
  iron: ['방패 들고 천천히… 그런데 앞서요.', '넘어지면 다시 일어나는 게 우리 메타.', '탱커 없이 올라온 거야?'],
  burst: ['버스트 윈도우 열렸습니다.', '딜 미터는 우리가 찍었어요.', '한 방에 층이 바뀌죠.'],
  moon: ['이번 주 빌드는 신성 속성.', '패치 전까지는 우리가 1등.', '밤에 더 강해지는 타입이에요.'],
  sim: ['10,000번 시뮬 돌렸습니다.', '확률은 우리 편.', '예측 모델이 당신을 이겼어요.'],
  turtle: ['서두르지 마요. 어차피 우리가 이겨요.', 'HP 바가 길면 마음도 편해요.', '느려도 꼴등은 아닙니다.'],
  dice: ['크리티컬! …아, 우리 턴이었네.', '주사위는 거짓말 안 해요.', '운빨? 실력이죠.'],
};

export const RIVAL_RANK_REWARDS: { maxRank: number; gold: number; gems: number; label: string }[] = [
  { maxRank: 1, gold: 25_000, gems: 12, label: '🥇 챔피언' },
  { maxRank: 2, gold: 15_000, gems: 8, label: '🥈 준우승' },
  { maxRank: 3, gold: 10_000, gems: 5, label: '🥉 포디움' },
  { maxRank: 5, gold: 6_000, gems: 3, label: '⭐ 상위권' },
  { maxRank: 99, gold: 2_500, gems: 1, label: '✓ 참가 보상' },
];

/** 주간 리그 규칙 — 매주 로테이션 */
export interface RivalWeeklyMod {
  id: string;
  name: string;
  icon: string;
  desc: string;
  floorMult: number;
  killMult: number;
  touchMult: number;
  achMult: number;
}

export const RIVAL_WEEKLY_MODS: RivalWeeklyMod[] = [
  { id: 'floor', name: '층 돌파전', icon: '🗺️', desc: '새 층 SP +50%', floorMult: 1.5, killMult: 1, touchMult: 1, achMult: 1 },
  { id: 'hunt', name: '사냥 러시', icon: '⚔️', desc: '처치 SP +55%', floorMult: 1, killMult: 1.55, touchMult: 1, achMult: 1 },
  { id: 'tap', name: '투닥 챌린지', icon: '👆', desc: '투닥 SP +80%', floorMult: 1, killMult: 1, touchMult: 1.8, achMult: 1 },
  { id: 'glory', name: '업적 쟁탈전', icon: '🏅', desc: '업적 SP +70%', floorMult: 1, killMult: 1, touchMult: 1, achMult: 1.7 },
  { id: 'blitz', name: '블리츠 위크', icon: '⚡', desc: '층·처치 SP +25%', floorMult: 1.25, killMult: 1.25, touchMult: 1, achMult: 1 },
];

export function getRivalWeeklyMod(weekId: string): RivalWeeklyMod {
  let h = 0;
  for (let i = 0; i < weekId.length; i++) h = (h * 31 + weekId.charCodeAt(i)) | 0;
  return RIVAL_WEEKLY_MODS[Math.abs(h) % RIVAL_WEEKLY_MODS.length]!;
}

/** 일일 라이벌 대결 미션 */
export interface RivalDailyChallengeDef {
  id: string;
  label: string;
  icon: string;
  target: number;
  spReward: number;
}

export const RIVAL_DAILY_CHALLENGES: RivalDailyChallengeDef[] = [
  { id: 'duel_kills', label: '몬스터 50마리 처치', icon: '⚔️', target: 50, spReward: 65 },
  { id: 'duel_taps', label: '투닥 45회', icon: '👆', target: 45, spReward: 40 },
  { id: 'duel_gold', label: '골드 12,000 획득', icon: '🪙', target: 12_000, spReward: 55 },
];

export const RIVAL_DAILY_ALL_CLEAR_SP = 90;
export const RIVAL_SURGE_MULT = 1.32;
export const RIVAL_REVENGE_FLOOR_MULT = 1.25;
export const RIVAL_REVENGE_GAP = 55;

