/** 주간 랭킹 규칙·일일 미션·보상 (CPU 길드 제거 — 실유저 랭킹 전용) */

export const LEADERBOARD_RANK_REWARDS: { maxRank: number; gold: number; gems: number; label: string }[] = [
  { maxRank: 1, gold: 25_000, gems: 12, label: '🥇 챔피언' },
  { maxRank: 2, gold: 15_000, gems: 8, label: '🥈 준우승' },
  { maxRank: 3, gold: 10_000, gems: 5, label: '🥉 포디움' },
  { maxRank: 10, gold: 6_000, gems: 3, label: '⭐ 상위권' },
  { maxRank: 99, gold: 2_500, gems: 1, label: '✓ 참가 보상' },
];

export interface LeaderboardWeeklyMod {
  id: string;
  name: string;
  icon: string;
  desc: string;
  floorMult: number;
  killMult: number;
  touchMult: number;
  achMult: number;
}

export const LEADERBOARD_WEEKLY_MODS: LeaderboardWeeklyMod[] = [
  { id: 'floor', name: '층 돌파전', icon: '🗺️', desc: '새 층 SP +50%', floorMult: 1.5, killMult: 1, touchMult: 1, achMult: 1 },
  { id: 'hunt', name: '사냥 러시', icon: '⚔️', desc: '처치 SP +55%', floorMult: 1, killMult: 1.55, touchMult: 1, achMult: 1 },
  { id: 'tap', name: '투닥 챌린지', icon: '👆', desc: '투닥 SP +80%', floorMult: 1, killMult: 1, touchMult: 1.8, achMult: 1 },
  { id: 'glory', name: '업적 쟁탈전', icon: '🏅', desc: '업적 SP +70%', floorMult: 1, killMult: 1, touchMult: 1, achMult: 1.7 },
  { id: 'blitz', name: '블리츠 위크', icon: '⚡', desc: '층·처치 SP +25%', floorMult: 1.25, killMult: 1.25, touchMult: 1, achMult: 1 },
];

export function getLeaderboardWeeklyMod(weekId: string): LeaderboardWeeklyMod {
  let h = 0;
  for (let i = 0; i < weekId.length; i++) h = (h * 31 + weekId.charCodeAt(i)) | 0;
  return LEADERBOARD_WEEKLY_MODS[Math.abs(h) % LEADERBOARD_WEEKLY_MODS.length]!;
}

export interface LeaderboardDailyChallengeDef {
  id: string;
  label: string;
  icon: string;
  target: number;
  spReward: number;
}

export const LEADERBOARD_DAILY_CHALLENGES: LeaderboardDailyChallengeDef[] = [
  { id: 'duel_kills', label: '몬스터 50마리 처치', icon: '⚔️', target: 50, spReward: 65 },
  { id: 'duel_taps', label: '투닥 45회', icon: '👆', target: 45, spReward: 40 },
  { id: 'duel_gold', label: '골드 12,000 획득', icon: '🪙', target: 12_000, spReward: 55 },
];

export const LEADERBOARD_DAILY_ALL_CLEAR_SP = 90;

export const LEADERBOARD_SYNC_COOLDOWN_MS = 90_000;
