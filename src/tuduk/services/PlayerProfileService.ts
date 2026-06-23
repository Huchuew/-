import type { GameSave } from '../types';
import { getOrCreatePlayerId } from '../core/playerId';
import { getSupabase, isSupabaseConfigured, type PlayerProfileRow } from '../core/supabaseClient';
import { getAdventureTeamName, getPlayerNickname } from '../data/starterSurvey';
import { getPartyDps, getPartyDpsBreakdown } from '../systems/StatCalculator';
import { calcWeeklyScore } from '../systems/LeaderboardSystem';
import { getSpireWeekId } from '../data/endgame/spire';
import { LEADERBOARD_SYNC_COOLDOWN_MS } from '../data/leaderboardData';

export interface ProfileCheckResult {
  available: boolean;
  message?: string;
}

export interface LeaderboardEntry {
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
  isPlayer: boolean;
  updatedAt?: string;
}

export interface LeaderboardSnapshot {
  overall: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  myOverallRank: number | null;
  myWeeklyRank: number | null;
  myEntry: LeaderboardEntry | null;
  configured: boolean;
  error?: string;
}

let lastSyncAt = 0;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: GameSave | null = null;

function rowToEntry(row: PlayerProfileRow, rank: number, playerId: string): LeaderboardEntry {
  return {
    rank,
    playerId: row.player_id,
    nickname: row.nickname,
    teamName: row.team_name,
    maxRegion: row.max_region,
    partySize: row.party_size,
    rosterSize: row.roster_size,
    topDps: row.top_dps,
    partyDps: row.party_dps,
    weeklyScore: row.weekly_score,
    totalKills: Number(row.total_kills),
    isPlayer: row.player_id === playerId,
    updatedAt: row.updated_at,
  };
}

export function extractProfilePayload(save: GameSave) {
  const breakdown = getPartyDpsBreakdown(save);
  const topDps = breakdown.reduce((max, e) => Math.max(max, e.dps), 0);
  const partyDps = breakdown.reduce((sum, e) => sum + e.dps, 0);
  return {
    player_id: getOrCreatePlayerId(),
    nickname: getPlayerNickname(save),
    team_name: getAdventureTeamName(save),
    max_region: save.maxRegion ?? 1,
    party_size: save.party.length,
    roster_size: save.owned.length,
    top_dps: topDps,
    party_dps: partyDps,
    weekly_score: calcWeeklyScore(save),
    week_id: getSpireWeekId(),
    total_kills: save.stats?.totalKills ?? 0,
    updated_at: new Date().toISOString(),
  };
}

export async function checkNicknameAvailable(
  nickname: string,
  playerId?: string,
): Promise<ProfileCheckResult> {
  const nick = nickname.trim();
  if (!nick) return { available: false, message: '닉네임을 입력해 주세요' };
  if (!isSupabaseConfigured()) {
    return { available: true, message: '오프라인 — 중복 확인 생략' };
  }
  const sb = getSupabase();
  if (!sb) return { available: false, message: '랭킹 서버 연결 실패' };

  const { data, error } = await sb
    .from('player_profiles')
    .select('player_id, nickname')
    .ilike('nickname', nick)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[Leaderboard] nickname check failed', error);
    return { available: false, message: '닉네임 확인 실패 — 잠시 후 다시 시도' };
  }
  if (!data) return { available: true };
  if (playerId && data.player_id === playerId) return { available: true };
  return { available: false, message: '이미 사용 중인 닉네임입니다' };
}

export async function registerPlayerProfile(save: GameSave): Promise<{ ok: boolean; message?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: '랭킹 서버 미설정 — .env에 Supabase 키 필요' };
  }
  const sb = getSupabase();
  if (!sb) return { ok: false, message: '랭킹 서버 연결 실패' };

  const nick = getPlayerNickname(save).trim();
  if (!nick) return { ok: false, message: '닉네임이 없습니다' };

  const playerId = getOrCreatePlayerId();
  const check = await checkNicknameAvailable(nick, playerId);
  if (!check.available) return { ok: false, message: check.message };

  const payload = extractProfilePayload(save);
  const { error } = await sb.from('player_profiles').upsert(payload, { onConflict: 'player_id' });
  if (error) {
    if (error.code === '23505') {
      return { ok: false, message: '이미 사용 중인 닉네임입니다' };
    }
    console.warn('[Leaderboard] register failed', error);
    return { ok: false, message: '프로필 등록 실패' };
  }
  lastSyncAt = Date.now();
  return { ok: true };
}

export async function syncPlayerProfile(save: GameSave, force = false): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const nick = getPlayerNickname(save).trim();
  if (!nick || nick === '단장') return;

  if (!force && Date.now() - lastSyncAt < LEADERBOARD_SYNC_COOLDOWN_MS) return;

  const sb = getSupabase();
  if (!sb) return;

  const payload = extractProfilePayload(save);
  const { error } = await sb.from('player_profiles').upsert(payload, { onConflict: 'player_id' });
  if (error) {
    console.warn('[Leaderboard] sync failed', error);
    return;
  }
  lastSyncAt = Date.now();
}

export function scheduleProfileSync(save: GameSave): void {
  if (!isSupabaseConfigured()) return;
  pendingSave = save;
  if (syncTimer) return;
  syncTimer = setTimeout(() => {
    syncTimer = null;
    const s = pendingSave;
    pendingSave = null;
    if (s) void syncPlayerProfile(s);
  }, 3_000);
}

export async function updatePlayerIdentity(
  save: GameSave,
  nickname: string,
  teamName: string,
): Promise<{ ok: boolean; message: string }> {
  const check = await checkNicknameAvailable(nickname, getOrCreatePlayerId());
  if (!check.available) return { ok: false, message: check.message ?? '닉네임 사용 불가' };

  save.playerNickname = nickname.trim().slice(0, 10);
  save.adventureTeamName = teamName.trim().slice(0, 16);

  if (!isSupabaseConfigured()) {
    return { ok: true, message: '로컬 저장됨 (랭킹 서버 미연결)' };
  }

  const res = await registerPlayerProfile(save);
  if (!res.ok) return { ok: false, message: res.message ?? '프로필 업데이트 실패' };
  return { ok: true, message: '프로필이 업데이트되었습니다' };
}

async function fetchRankedList(
  orderCol: string,
  orderAsc: boolean,
  secondaryCol: string,
  weekId?: string,
  limit = 50,
): Promise<PlayerProfileRow[]> {
  const sb = getSupabase();
  if (!sb) return [];

  let q = sb.from('player_profiles').select('*');
  if (weekId) q = q.eq('week_id', weekId);
  q = q.order(orderCol, { ascending: orderAsc });
  if (secondaryCol !== orderCol) {
    q = q.order(secondaryCol, { ascending: orderAsc });
  }
  if (weekId) {
    q = q.order('weekly_score', { ascending: false });
  } else {
    q = q.order('roster_size', { ascending: false });
  }
  const { data, error } = await q.limit(limit);
  if (error) {
    console.warn('[Leaderboard] fetch failed', error);
    return [];
  }
  return (data ?? []) as PlayerProfileRow[];
}

async function countBetterWeekly(weekId: string, score: number): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;
  const { count, error } = await sb
    .from('player_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('week_id', weekId)
    .gt('weekly_score', score);
  if (error) return 0;
  return count ?? 0;
}

async function countBetterOverall(maxRegion: number, partyDps: number, rosterSize: number): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;
  const { count, error } = await sb
    .from('player_profiles')
    .select('*', { count: 'exact', head: true })
    .or(
      `max_region.gt.${maxRegion},and(max_region.eq.${maxRegion},party_dps.gt.${partyDps}),`
      + `and(max_region.eq.${maxRegion},party_dps.eq.${partyDps},roster_size.gt.${rosterSize})`,
    );
  if (error) {
    const { count: c2 } = await sb
      .from('player_profiles')
      .select('*', { count: 'exact', head: true })
      .gt('max_region', maxRegion);
    return c2 ?? 0;
  }
  return count ?? 0;
}

export async function fetchLeaderboardSnapshot(save: GameSave): Promise<LeaderboardSnapshot> {
  const playerId = getOrCreatePlayerId();
  const configured = isSupabaseConfigured();

  if (!configured) {
    return {
      overall: [],
      weekly: [],
      myOverallRank: null,
      myWeeklyRank: null,
      myEntry: null,
      configured: false,
      error: 'Supabase 미설정 — GitHub Secrets 또는 .env.local에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 추가',
    };
  }

  await syncPlayerProfile(save, true);

  const weekId = getSpireWeekId();
  const [overallRows, weeklyRows] = await Promise.all([
    fetchRankedList('max_region', false, 'party_dps'),
    fetchRankedList('weekly_score', false, 'max_region', weekId),
  ]);

  const overall = overallRows.map((r, i) => rowToEntry(r, i + 1, playerId));
  const weekly = weeklyRows
    .filter(r => r.week_id === weekId)
    .sort((a, b) => b.weekly_score - a.weekly_score || b.max_region - a.max_region)
    .map((r, i) => rowToEntry(r, i + 1, playerId));

  const payload = extractProfilePayload(save);
  const myEntry: LeaderboardEntry = {
    rank: 0,
    playerId,
    nickname: payload.nickname,
    teamName: payload.team_name,
    maxRegion: payload.max_region,
    partySize: payload.party_size,
    rosterSize: payload.roster_size,
    topDps: payload.top_dps,
    partyDps: payload.party_dps,
    weeklyScore: payload.weekly_score,
    totalKills: Number(payload.total_kills),
    isPlayer: true,
  };

  const [weeklyAhead, overallAhead] = await Promise.all([
    countBetterWeekly(weekId, payload.weekly_score),
    countBetterOverall(payload.max_region, payload.party_dps, payload.roster_size),
  ]);

  const myWeeklyRank = weeklyAhead + 1;
  const myOverallRank = overallAhead + 1;
  myEntry.rank = myOverallRank;

  const inOverall = overall.find(e => e.playerId === playerId);
  const inWeekly = weekly.find(e => e.playerId === playerId);

  return {
    overall,
    weekly,
    myOverallRank: inOverall?.rank ?? myOverallRank,
    myWeeklyRank: inWeekly?.rank ?? (payload.weekly_score > 0 ? myWeeklyRank : null),
    myEntry,
    configured: true,
  };
}
