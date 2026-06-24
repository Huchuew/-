import type { PartyEliteSnapshot } from '../core/supabaseClient';

/** 던전 랭킹 기준 최고 층 (17층 보스 클리어 = 야탑 입장) */
export const LEADERBOARD_RANK_CAP_FLOOR = 17;

/** 야탑 기록 표시·유지 — 18층 보스 격파(19층 진입) 이상 */
export const LEADERBOARD_SPIRE_MIN_REGION = 19;

/** 이 레벨 초과 캐릭터는 270대로 표시·동기화 */
export const LEADERBOARD_LEVEL_SOFT_CAP = 300;

/** 1위(김러너) — 2위 대비 전투력 상한 배율 */
export const LEADERBOARD_TOP_VS_SECOND_MULT = 1.08;

/** 일반 과성장 1위 — 2위 대비 상한 */
export const LEADERBOARD_DEFAULT_TOP_VS_SECOND_MULT = 1.11;

export const LEADERBOARD_TOP_TARGET_NICKNAME = '김러너';

export interface LeaderboardDisplayEntry {
  rank: number;
  playerId: string;
  nickname: string;
  teamName: string;
  maxRegion: number;
  partySize: number;
  rosterSize: number;
  topDps: number;
  partyDps: number;
  weeklyScore: number;
  totalKills: number;
  touchCount: number;
  partyElites: PartyEliteSnapshot[];
  isPlayer: boolean;
  updatedAt?: string;
  spireBest?: number;
}

export interface LeaderboardRawStats {
  maxRegion: number;
  partyDps: number;
  topDps: number;
  totalKills: number;
  weeklyScore: number;
  touchCount: number;
  spireBest: number;
  partyElites: PartyEliteSnapshot[];
}

function clampLevel(level: number): number {
  if (level <= LEADERBOARD_LEVEL_SOFT_CAP) return level;
  return 270 + (level % 10);
}

export function normalizePartyEliteLevels(elites: PartyEliteSnapshot[]): PartyEliteSnapshot[] {
  return elites.map(e => ({ ...e, level: clampLevel(e.level) }));
}

/** 18층 클리어 후 야탑 기록이 있는 정상 엔드게임 유저 */
export function hasLeaderboardSpireRecord(
  raw: Pick<LeaderboardRawStats, 'maxRegion' | 'spireBest'>,
): boolean {
  return (raw.spireBest ?? 0) > 0 && (raw.maxRegion ?? 1) >= LEADERBOARD_SPIRE_MIN_REGION;
}

function nerfMultiplier(raw: LeaderboardRawStats): number {
  let mult = 1;
  const floorOver = Math.max(0, raw.maxRegion - LEADERBOARD_RANK_CAP_FLOOR);
  const hasOverLevel = raw.partyElites.some(e => e.level > LEADERBOARD_LEVEL_SOFT_CAP);
  const legitimateSpire = hasLeaderboardSpireRecord(raw);

  if (floorOver > 0 && !legitimateSpire) {
    mult *= Math.max(0.34, 0.68 - floorOver * 0.09);
  }
  if (hasOverLevel) {
    mult *= 0.58;
  }
  return mult;
}

export function normalizeLeaderboardStats(raw: LeaderboardRawStats): LeaderboardRawStats {
  const mult = nerfMultiplier(raw);
  const cappedFloor = Math.min(raw.maxRegion, LEADERBOARD_RANK_CAP_FLOOR);
  const partyElites = normalizePartyEliteLevels(raw.partyElites);
  const spireBest = hasLeaderboardSpireRecord(raw) ? (raw.spireBest ?? 0) : 0;

  return {
    maxRegion: cappedFloor,
    partyDps: Math.floor(raw.partyDps * mult),
    topDps: Math.floor(raw.topDps * mult),
    totalKills: Math.floor(raw.totalKills * mult),
    weeklyScore: Math.floor(raw.weeklyScore * mult),
    touchCount: raw.touchCount,
    spireBest,
    partyElites,
  };
}

export function normalizeLeaderboardEntry<T extends LeaderboardDisplayEntry>(entry: T): T {
  const n = normalizeLeaderboardStats({
    maxRegion: entry.maxRegion,
    partyDps: entry.partyDps,
    topDps: entry.topDps,
    totalKills: entry.totalKills,
    weeklyScore: entry.weeklyScore,
    touchCount: entry.touchCount,
    spireBest: entry.spireBest ?? 0,
    partyElites: entry.partyElites,
  });
  return { ...entry, ...n };
}

/** 1위·김러너 — 2위와 적당한 격차 유지 (야탑 기록 제거) */
export function applyTopRankGapNerf<T extends LeaderboardDisplayEntry>(entries: T[]): T[] {
  if (entries.length < 2) return entries;

  const sorted = [...entries].sort(compareOverallRank);
  const second = sorted[1]!;
  const kim = entries.find(e => e.nickname === LEADERBOARD_TOP_TARGET_NICKNAME);
  const topPlayerId = kim?.playerId ?? sorted[0]!.playerId;
  const gapMult = kim
    ? LEADERBOARD_TOP_VS_SECOND_MULT
    : LEADERBOARD_DEFAULT_TOP_VS_SECOND_MULT;

  const capPartyDps = Math.max(1, Math.floor(second.partyDps * gapMult));
  const capTopDps = Math.max(1, Math.floor(second.topDps * gapMult));
  const capWeekly = Math.max(0, Math.floor(second.weeklyScore * (gapMult + 0.03)));
  const capKills = Math.max(0, Math.floor(second.totalKills * gapMult));

  return entries.map((e) => {
    if (e.playerId !== topPlayerId) return e;
    return {
      ...e,
      maxRegion: Math.min(e.maxRegion, LEADERBOARD_RANK_CAP_FLOOR),
      spireBest: 0,
      partyDps: Math.min(e.partyDps, capPartyDps),
      topDps: Math.min(e.topDps, capTopDps),
      weeklyScore: Math.min(e.weeklyScore, capWeekly),
      totalKills: Math.min(e.totalKills, capKills),
      partyElites: normalizePartyEliteLevels(e.partyElites),
    };
  });
}

export function compareOverallRank(a: LeaderboardDisplayEntry, b: LeaderboardDisplayEntry): number {
  const aSpire = a.spireBest ?? 0;
  const bSpire = b.spireBest ?? 0;
  return bSpire - aSpire
    || b.maxRegion - a.maxRegion
    || b.partyDps - a.partyDps
    || b.rosterSize - a.rosterSize
    || b.totalKills - a.totalKills;
}

export function compareWeeklyRank(a: LeaderboardDisplayEntry, b: LeaderboardDisplayEntry): number {
  return b.weeklyScore - a.weeklyScore
    || (b.spireBest ?? 0) - (a.spireBest ?? 0)
    || b.maxRegion - a.maxRegion
    || b.partyDps - a.partyDps;
}

export function rerankOverall<T extends LeaderboardDisplayEntry>(entries: T[]): T[] {
  const gapAdjusted = applyTopRankGapNerf(entries.map(normalizeLeaderboardEntry));
  return gapAdjusted
    .sort(compareOverallRank)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export function rerankWeekly<T extends LeaderboardDisplayEntry>(entries: T[]): T[] {
  return [...entries]
    .map(normalizeLeaderboardEntry)
    .sort(compareWeeklyRank)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export function findRankInList(entries: LeaderboardDisplayEntry[], playerId: string): number | null {
  const hit = entries.find(e => e.playerId === playerId);
  return hit?.rank ?? null;
}

/** Supabase upsert payload 정규화 */
export function normalizeProfilePayload<T extends {
  max_region: number;
  top_dps: number;
  party_dps: number;
  weekly_score: number;
  total_kills: number;
  touch_count?: number;
  spire_best?: number;
  party_elites: PartyEliteSnapshot[];
}>(payload: T): T {
  const n = normalizeLeaderboardStats({
    maxRegion: payload.max_region,
    partyDps: payload.party_dps,
    topDps: payload.top_dps,
    totalKills: Number(payload.total_kills),
    weeklyScore: payload.weekly_score,
    touchCount: Number(payload.touch_count ?? 0),
    spireBest: payload.spire_best ?? 0,
    partyElites: payload.party_elites ?? [],
  });
  return {
    ...payload,
    max_region: n.maxRegion,
    top_dps: n.topDps,
    party_dps: n.partyDps,
    weekly_score: n.weeklyScore,
    total_kills: n.totalKills,
    spire_best: n.spireBest,
    party_elites: n.partyElites,
  };
}
