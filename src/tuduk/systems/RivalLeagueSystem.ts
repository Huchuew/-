import type { GameSave } from '../types';

import { getSpireWeekId } from '../data/endgame/spire';

import {

  RIVAL_GUILDS, RIVAL_GUILD_MAP, RIVAL_RANK_REWARDS, RIVAL_TAUNTS,

  RIVAL_DAILY_CHALLENGES, RIVAL_DAILY_ALL_CLEAR_SP, RIVAL_SURGE_MULT,

  RIVAL_REVENGE_FLOOR_MULT, RIVAL_REVENGE_GAP,

  getRivalWeeklyMod, type RivalGuildDef, type RivalWeeklyMod,

} from '../data/rivalLeague';

import { getAdventureTeamName } from '../data/starterSurvey';



export interface RivalLeagueEntry {

  id: string;

  name: string;

  emoji: string;

  tag: string;

  score: number;

  isPlayer: boolean;

  motto?: string;

  surging?: boolean;

}



export interface RivalDailyRow {

  id: string;

  label: string;

  icon: string;

  cur: number;

  target: number;

  done: boolean;

  claimed: boolean;

  spReward: number;

}



export interface RivalLeagueView {

  weekId: string;

  playerTeamName: string;

  entries: RivalLeagueEntry[];

  playerRank: number;

  playerScore: number;

  mainRivalId: string;

  mainRivalName: string;

  mainRivalGap: number;

  taunt: string;

  daysLeftLabel: string;

  rewardTier: typeof RIVAL_RANK_REWARDS[number] | null;

  rewardClaimed: boolean;

  canClaim: boolean;

  winStreak: number;

  seasonWins: number;

  weeklyMod: RivalWeeklyMod;

  surgeRivalName: string | null;

  dailyRows: RivalDailyRow[];

  dailyAllClearClaimed: boolean;

  dailyAllClearReady: boolean;

  headToHeadDays: number;

  rankDelta: number;

  revengeActive: boolean;

  bonusSp: number;

}



function hashStr(s: string): number {

  let h = 0;

  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;

  return Math.abs(h);

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



/** 주간 진행도 0(월 00:00) ~ 7(일 말) — 시간에 따라 서서히 증가 */

function weekTimeProgress(d = new Date()): number {

  const day = dayInWeek(d);

  const hourFrac = (d.getHours() * 60 + d.getMinutes()) / (24 * 60);

  return day - 1 + hourFrac;

}



function pickTaunt(rivalId: string, weekId: string): string {

  const lines = RIVAL_TAUNTS[rivalId] ?? ['이번 주도 열심히 올라갑니다.'];

  return lines[hashStr(rivalId + weekId) % lines.length]!;

}



/**

 * CPU 길드 독립 시뮬 — 플레이어 진행과 무관, 주차·요일·시간만 반영.

 * 월초 낮은 출발 → 주말 상위권 280~360 SP대, 서지 길드만 일시 400 전후.

 */

function simulateRivalScore(def: RivalGuildDef, weekId: string, weekT: number): number {

  const seed = hashStr(def.id + weekId);

  const weekProgress = Math.min(1, weekT / 7);

  const dayIndex = Math.floor(weekT);

  const hourFrac = weekT - dayIndex;



  const curve = 0.68 + weekProgress * 0.92 + Math.pow(weekProgress, 1.35) * 0.34;

  const growth = def.growthPerDay * (dayIndex + hourFrac * 0.55) * curve * 0.9;

  const intraDay = hourFrac * def.growthPerDay * 0.28;

  const dailyJitter = (hashStr(def.id + weekId + String(dayIndex + 1)) % 17) - 8;

  const wave = Math.sin((weekT + seed * 0.013) * 1.05) * 11;



  return Math.max(52, Math.floor(def.baseScore + growth + intraDay + wave + dailyJitter));

}



export interface RivalLeagueBaseline {

  maxRegion: number;

  totalKills: number;

  achievements: number;

  touchCount: number;

}



function currentBaseline(save: GameSave): RivalLeagueBaseline {

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



function ensureSurge(save: GameSave) {

  const league = save.rivalLeague;

  if (!league) return;

  const dk = dayKey();

  if (league.surgeDayKey !== dk) {

    league.surgeDayKey = dk;

    league.surgeRivalId = RIVAL_GUILDS[hashStr(dk + league.weekId) % RIVAL_GUILDS.length]!.id;

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



export function getDailyChallengeRows(save: GameSave): RivalDailyRow[] {

  ensureRivalLeague(save);

  ensureDaily(save);

  const claimed = new Set(save.rivalLeague!.daily?.claimed ?? []);

  return RIVAL_DAILY_CHALLENGES.map(def => {

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

  ensureRivalLeague(save);

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

  ensureRivalLeague(save);

  ensureDaily(save);

  const league = save.rivalLeague!;

  if (league.daily!.allClearClaimed) return { ok: false, message: '오늘 보너스 이미 수령' };

  const rows = getDailyChallengeRows(save);

  if (!rows.every(r => r.claimed)) return { ok: false, message: '일일 대결 3개 모두 수령 후 가능' };

  league.daily!.allClearClaimed = true;

  league.bonusSp = (league.bonusSp ?? 0) + RIVAL_DAILY_ALL_CLEAR_SP;

  save.stats.rivalDailyClears = (save.stats.rivalDailyClears ?? 0) + 1;

  return { ok: true, message: `일일 대결 완료! +${RIVAL_DAILY_ALL_CLEAR_SP} SP` };

}



export function calcPlayerLeagueScore(

  save: GameSave,

  baseline?: RivalLeagueBaseline,

  opts?: { weeklyMod?: RivalWeeklyMod; revengeActive?: boolean },

): number {

  const b = baseline ?? save.rivalLeague?.baseline;

  const mod = opts?.weeklyMod ?? getRivalWeeklyMod(save.rivalLeague?.weekId ?? getSpireWeekId());

  const maxR = save.maxRegion ?? 1;

  const kills = save.stats?.totalKills ?? 0;

  const ach = save.achievements?.length ?? 0;

  const badges = save.badges?.length ?? 0;

  const touches = save.stats?.touchCount ?? 0;



  const floorGain = Math.max(0, maxR - (b?.maxRegion ?? 1));

  const killGain = Math.max(0, kills - (b?.totalKills ?? 0));

  const achGain = Math.max(0, ach - (b?.achievements ?? 0));

  const touchGain = Math.min(Math.max(0, touches - (b?.touchCount ?? 0)), 500);



  let floorSp = floorGain * 260 * mod.floorMult;

  if (opts?.revengeActive) floorSp *= RIVAL_REVENGE_FLOOR_MULT;



  const core = Math.floor(

    floorSp

    + Math.min(killGain, 700) * 2.4 * mod.killMult

    + achGain * 42 * mod.achMult

    + badges * 22

    + touchGain * 0.42 * mod.touchMult,

  );

  return core + (save.rivalLeague?.bonusSp ?? 0);

}



export function ensureRivalLeague(save: GameSave): void {

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

      mainRivalId: RIVAL_GUILDS[hashStr(weekId + (save.starterCharId ?? 'x')) % RIVAL_GUILDS.length]!.id,

      bonusSp: 0,

      headToHeadDays: prev?.headToHeadDays ?? 0,

    };

  }

  ensureDaily(save);

  ensureSurge(save);

}



export function getPlayerTeamName(save: GameSave): string {

  return getAdventureTeamName(save);

}



function trackHeadToHead(save: GameSave, playerAhead: boolean) {

  const league = save.rivalLeague!;

  const dk = dayKey();

  if (playerAhead && league.lastHeadToHeadDay !== dk) {

    league.headToHeadDays = (league.headToHeadDays ?? 0) + 1;

    league.lastHeadToHeadDay = dk;

  }

}



export function buildRivalLeagueView(save: GameSave): RivalLeagueView {

  ensureRivalLeague(save);

  const league = save.rivalLeague!;

  const weekId = league.weekId;

  const weekT = weekTimeProgress();

  const weeklyMod = getRivalWeeklyMod(weekId);



  const rivals: RivalLeagueEntry[] = RIVAL_GUILDS.map(def => {

    let score = simulateRivalScore(def, weekId, weekT);

    const surging = def.id === league.surgeRivalId;

    if (surging) score = Math.floor(score * RIVAL_SURGE_MULT);

    return {

      id: def.id,

      name: def.name,

      emoji: def.emoji,

      tag: def.tag,

      score,

      isPlayer: false,

      motto: def.motto,

      surging,

    };

  });



  const mainRival = RIVAL_GUILD_MAP[league.mainRivalId] ?? RIVAL_GUILDS[0]!;

  const mainEntryPre = rivals.find(r => r.id === mainRival.id);

  const previewScore = calcPlayerLeagueScore(save, league.baseline, { weeklyMod, revengeActive: false });

  const gapPre = mainEntryPre ? mainEntryPre.score - previewScore : 0;

  const revengeActive = gapPre >= RIVAL_REVENGE_GAP;



  const playerScore = calcPlayerLeagueScore(save, league.baseline, { weeklyMod, revengeActive });



  rivals.push({

    id: 'player',

    name: getPlayerTeamName(save),

    emoji: '🏴',

    tag: 'YOU',

    score: playerScore,

    isPlayer: true,

  });



  rivals.sort((a, b) => b.score - a.score || (a.isPlayer ? -1 : 1));



  const playerRank = rivals.findIndex(e => e.isPlayer) + 1;

  const dk = dayKey();

  if (league.dailyRankDay !== dk) {

    league.dailyRankSnapshot = league.lastRank ?? playerRank;

    league.dailyRankDay = dk;

  }

  const rankDelta = (league.dailyRankSnapshot ?? playerRank) - playerRank;

  league.lastRank = playerRank;



  const mainEntry = rivals.find(r => r.id === mainRival.id);

  const mainRivalGap = mainEntry ? mainEntry.score - playerScore : 0;

  trackHeadToHead(save, mainRivalGap < 0);



  const surgeDef = league.surgeRivalId ? RIVAL_GUILD_MAP[league.surgeRivalId] : null;

  const dailyRows = getDailyChallengeRows(save);

  const dailyAllClearClaimed = !!league.daily?.allClearClaimed;

  const dailyAllClearReady = dailyRows.every(r => r.claimed) && !dailyAllClearClaimed;



  const rewardTier = RIVAL_RANK_REWARDS.find(t => playerRank <= t.maxRank) ?? null;



  return {

    weekId,

    playerTeamName: getPlayerTeamName(save),

    entries: rivals,

    playerRank,

    playerScore,

    mainRivalId: mainRival.id,

    mainRivalName: `${mainRival.emoji} ${mainRival.name}`,

    mainRivalGap,

    taunt: pickTaunt(mainRival.id, weekId),

    daysLeftLabel: daysLeftInWeek() <= 1 ? '오늘 시즌 종료' : `${daysLeftInWeek()}일 남음`,

    rewardTier,

    rewardClaimed: league.rewardClaimed,

    canClaim: !league.rewardClaimed && playerScore >= 40,

    winStreak: league.winStreak ?? 0,

    seasonWins: league.seasonWins ?? 0,

    weeklyMod,

    surgeRivalName: surgeDef ? `${surgeDef.emoji} ${surgeDef.name}` : null,

    dailyRows,

    dailyAllClearClaimed,

    dailyAllClearReady,

    headToHeadDays: league.headToHeadDays ?? 0,

    rankDelta,

    revengeActive,

    bonusSp: league.bonusSp ?? 0,

  };

}



export function claimRivalLeagueReward(save: GameSave): { ok: boolean; message: string } {

  ensureRivalLeague(save);

  const view = buildRivalLeagueView(save);

  const league = save.rivalLeague!;

  if (league.rewardClaimed) return { ok: false, message: '이번 주 보상을 이미 받았어요' };

  if (!view.canClaim) return { ok: false, message: '점수 40 이상 달성 후 수령 가능' };

  if (!view.rewardTier) return { ok: false, message: '보상 정보 없음' };



  league.rewardClaimed = true;

  save.gold += view.rewardTier.gold;

  save.stats.totalGold += view.rewardTier.gold;

  save.gems += view.rewardTier.gems;

  const streakBonus = Math.min(5, view.winStreak);

  if (streakBonus > 0) save.gems += streakBonus;

  const h2hBonus = Math.min(3, Math.floor(view.headToHeadDays / 2));

  if (h2hBonus > 0) save.gems += h2hBonus;

  const gemTotal = view.rewardTier.gems + streakBonus + h2hBonus;

  const extras: string[] = [];

  if (streakBonus > 0) extras.push(`연승 💎+${streakBonus}`);

  if (h2hBonus > 0) extras.push(`라이벌 격파 💎+${h2hBonus}`);

  return {

    ok: true,

    message: `${view.rewardTier.label} — 🪙${view.rewardTier.gold.toLocaleString()} 💎${gemTotal}${extras.length ? ` (${extras.join(' · ')})` : ''}`,

  };

}



export function hasRivalLeagueAlert(save: GameSave): boolean {

  ensureRivalLeague(save);

  const view = buildRivalLeagueView(save);

  if (view.canClaim && !view.rewardClaimed) return true;

  if (view.dailyRows.some(r => r.done && !r.claimed)) return true;

  if (view.dailyAllClearReady) return true;

  if (view.playerRank <= 3 && view.mainRivalGap > 0 && view.mainRivalGap < 60) return true;

  return false;

}



export function hasClaimableDaily(save: GameSave): boolean {

  const rows = getDailyChallengeRows(save);

  return rows.some(r => r.done && !r.claimed)

    || (rows.every(r => r.claimed) && !save.rivalLeague?.daily?.allClearClaimed);

}


