import type { GameSave } from '../types';

import { getSpireWeekId } from '../data/endgame/spire';

import {
  LEADERBOARD_DAILY_ALL_CLEAR_SP,
  LEADERBOARD_DAILY_CHALLENGES,
  LEADERBOARD_RANK_REWARDS,
  getLeaderboardWeeklyMod,
  type LeaderboardWeeklyMod,
} from '../data/leaderboardData';

import { getAdventureTeamName } from '../data/starterSurvey';

export interface LeaderboardDailyRow {
  id: string;
  label: string;
  icon: string;
  cur: number;
  target: number;
  done: boolean;
  claimed: boolean;
  spReward: number;
}

export interface LeaderboardLocalView {
  weekId: string;
  playerTeamName: string;
  playerScore: number;
  weeklyMod: LeaderboardWeeklyMod;
  dailyRows: LeaderboardDailyRow[];
  dailyAllClearClaimed: boolean;
  dailyAllClearReady: boolean;
  rewardTier: typeof LEADERBOARD_RANK_REWARDS[number] | null;
  rewardClaimed: boolean;
  canClaim: boolean;
  bonusSp: number;
  daysLeftLabel: string;
}

export interface LeaderboardBaseline {
  maxRegion: number;
  totalKills: number;
  achievements: number;
  touchCount: number;
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function dayInWeek(d = new Date()): number {
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

function daysLeftInWeek(d = new Date()): number {
  return 7 - dayInWeek(d);
}

function currentBaseline(save: GameSave): LeaderboardBaseline {
  return {
    maxRegion: save.maxRegion ?? 1,
    totalKills: save.stats?.totalKills ?? 0,
    achievements: save.achievements?.length ?? 0,
    touchCount: save.stats?.touchCount ?? 0,
  };
}

function ensureDaily(save: GameSave) {
  const league = save.rivalLeague;
  if (!league) return;
  const dk = dayKey();
  if (!league.daily || league.daily.dayKey !== dk) {
    league.daily = {
      dayKey: dk,
      baseline: {
        kills: save.stats?.totalKills ?? 0,
        touches: save.stats?.touchCount ?? 0,
        totalGold: save.stats?.totalGold ?? 0,
      },
      claimed: [],
      allClearClaimed: false,
    };
  }
}

function dailyProgress(save: GameSave, id: string): number {
  const d = save.rivalLeague?.daily;
  if (!d) return 0;
  const b = d.baseline;
  switch (id) {
    case 'duel_kills':
      return Math.max(0, (save.stats?.totalKills ?? 0) - b.kills);
    case 'duel_taps':
      return Math.max(0, (save.stats?.touchCount ?? 0) - b.touches);
    case 'duel_gold':
      return Math.max(0, (save.stats?.totalGold ?? 0) - b.totalGold);
    default:
      return 0;
  }
}

export function calcWeeklyScore(
  save: GameSave,
  baseline?: LeaderboardBaseline,
  opts?: { weeklyMod?: LeaderboardWeeklyMod },
): number {
  const b = baseline ?? save.rivalLeague?.baseline;
  const mod = opts?.weeklyMod ?? getLeaderboardWeeklyMod(save.rivalLeague?.weekId ?? getSpireWeekId());

  const maxR = save.maxRegion ?? 1;
  const kills = save.stats?.totalKills ?? 0;
  const ach = save.achievements?.length ?? 0;
  const badges = save.badges?.length ?? 0;
  const touches = save.stats?.touchCount ?? 0;

  const floorGain = Math.max(0, maxR - (b?.maxRegion ?? 1));
  const killGain = Math.max(0, kills - (b?.totalKills ?? 0));
  const achGain = Math.max(0, ach - (b?.achievements ?? 0));
  const touchGain = Math.min(Math.max(0, touches - (b?.touchCount ?? 0)), 500);

  const core = Math.floor(
    floorGain * 260 * mod.floorMult
    + Math.min(killGain, 700) * 2.4 * mod.killMult
    + achGain * 42 * mod.achMult
    + badges * 22
    + touchGain * 0.42 * mod.touchMult,
  );
  return core + (save.rivalLeague?.bonusSp ?? 0);
}

export function ensureLeaderboardState(save: GameSave): void {
  const weekId = getSpireWeekId();
  if (!save.rivalLeague || save.rivalLeague.weekId !== weekId) {
    const prev = save.rivalLeague;
    const prevRank = prev?.lastRank;
    const wonLast = prevRank != null && prevRank <= 3;
    save.rivalLeague = {
      weekId,
      baseline: currentBaseline(save),
      rewardClaimed: false,
      lastRank: undefined,
      winStreak: wonLast && prev?.weekId ? (prev.winStreak ?? 0) + 1 : 0,
      seasonWins: (prev?.seasonWins ?? 0) + (wonLast ? 1 : 0),
      bonusSp: 0,
    };
  }
  ensureDaily(save);
}

export function getDailyChallengeRows(save: GameSave): LeaderboardDailyRow[] {
  ensureLeaderboardState(save);
  const claimed = new Set(save.rivalLeague!.daily?.claimed ?? []);
  return LEADERBOARD_DAILY_CHALLENGES.map(def => {
    const cur = Math.min(def.target, dailyProgress(save, def.id));
    const done = cur >= def.target;
    return {
      id: def.id,
      label: def.label,
      icon: def.icon,
      cur,
      target: def.target,
      done,
      claimed: claimed.has(def.id),
      spReward: def.spReward,
    };
  });
}

export function claimDailyChallenge(save: GameSave, id: string): { ok: boolean; message: string } {
  ensureLeaderboardState(save);
  ensureDaily(save);
  const league = save.rivalLeague!;
  const row = getDailyChallengeRows(save).find(r => r.id === id);
  if (!row) return { ok: false, message: '알 수 없는 미션' };
  if (row.claimed) return { ok: false, message: '이미 수령함' };
  if (!row.done) return { ok: false, message: '조건 미달성' };
  league.daily!.claimed.push(id);
  league.bonusSp = (league.bonusSp ?? 0) + row.spReward;
  return { ok: true, message: `${row.label} — +${row.spReward} SP!` };
}

export function claimDailyAllClearBonus(save: GameSave): { ok: boolean; message: string } {
  ensureLeaderboardState(save);
  ensureDaily(save);
  const league = save.rivalLeague!;
  if (league.daily!.allClearClaimed) return { ok: false, message: '오늘 보너스 이미 수령' };
  const rows = getDailyChallengeRows(save);
  if (!rows.every(r => r.claimed)) return { ok: false, message: '일일 미션 3개 모두 수령 후 가능' };
  league.daily!.allClearClaimed = true;
  league.bonusSp = (league.bonusSp ?? 0) + LEADERBOARD_DAILY_ALL_CLEAR_SP;
  save.stats.rivalDailyClears = (save.stats.rivalDailyClears ?? 0) + 1;
  return { ok: true, message: `일일 미션 완료! +${LEADERBOARD_DAILY_ALL_CLEAR_SP} SP` };
}

export function buildLeaderboardLocalView(save: GameSave): LeaderboardLocalView {
  ensureLeaderboardState(save);
  const league = save.rivalLeague!;
  const weeklyMod = getLeaderboardWeeklyMod(league.weekId);
  const playerScore = calcWeeklyScore(save, league.baseline, { weeklyMod });
  const dailyRows = getDailyChallengeRows(save);
  const dailyAllClearClaimed = !!league.daily?.allClearClaimed;
  const dailyAllClearReady = dailyRows.every(r => r.claimed) && !dailyAllClearClaimed;

  return {
    weekId: league.weekId,
    playerTeamName: getAdventureTeamName(save),
    playerScore,
    weeklyMod,
    dailyRows,
    dailyAllClearClaimed,
    dailyAllClearReady,
    rewardTier: null,
    rewardClaimed: league.rewardClaimed,
    canClaim: !league.rewardClaimed && playerScore >= 40,
    bonusSp: league.bonusSp ?? 0,
    daysLeftLabel: daysLeftInWeek() <= 1 ? '오늘 시즌 종료' : `${daysLeftInWeek()}일 남음`,
  };
}

export function claimLeaderboardReward(
  save: GameSave,
  weeklyRank: number,
): { ok: boolean; message: string } {
  ensureLeaderboardState(save);
  const view = buildLeaderboardLocalView(save);
  const league = save.rivalLeague!;
  if (league.rewardClaimed) return { ok: false, message: '이번 주 보상을 이미 받았어요' };
  if (!view.canClaim) return { ok: false, message: '점수 40 이상 달성 후 수령 가능' };

  const rewardTier = LEADERBOARD_RANK_REWARDS.find(t => weeklyRank <= t.maxRank);
  if (!rewardTier) return { ok: false, message: '보상 정보 없음' };

  league.rewardClaimed = true;
  league.lastRank = weeklyRank;
  save.gold += rewardTier.gold;
  save.stats.totalGold += rewardTier.gold;
  save.gems += rewardTier.gems;

  const streakBonus = Math.min(5, league.winStreak ?? 0);
  if (streakBonus > 0) save.gems += streakBonus;
  const gemTotal = rewardTier.gems + streakBonus;
  const extras: string[] = [];
  if (streakBonus > 0) extras.push(`연승 💎+${streakBonus}`);

  return {
    ok: true,
    message: `${rewardTier.label} (#${weeklyRank}) — 🪙${rewardTier.gold.toLocaleString()} 💎${gemTotal}${extras.length ? ` (${extras.join(' · ')})` : ''}`,
  };
}

export function hasLeaderboardAlert(save: GameSave): boolean {
  ensureLeaderboardState(save);
  const view = buildLeaderboardLocalView(save);
  if (view.dailyRows.some(r => r.done && !r.claimed)) return true;
  if (view.dailyAllClearReady) return true;
  if (view.canClaim && !view.rewardClaimed) return true;
  return false;
}

export function hasClaimableDaily(save: GameSave): boolean {
  const rows = getDailyChallengeRows(save);
  return rows.some(r => r.done && !r.claimed)
    || (rows.every(r => r.claimed) && !save.rivalLeague?.daily?.allClearClaimed);
}

/** @deprecated use ensureLeaderboardState */
export const ensureRivalLeague = ensureLeaderboardState;
