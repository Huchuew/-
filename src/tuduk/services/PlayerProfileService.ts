import type { GameSave } from '../types';
import { getOrCreatePlayerId } from '../core/playerId';
import { getSupabase, isSupabaseConfigured, type PartyEliteSnapshot, type PlayerProfileRow } from '../core/supabaseClient';
import { getAdventureTeamName, getPlayerNickname } from '../data/starterSurvey';
import { CHAR_MAP } from '../data/characters';
import { getPartyDpsBreakdown } from '../systems/StatCalculator';
import { calcWeeklyScore } from '../systems/LeaderboardSystem';
import { getSpireWeekId } from '../data/endgame/spire';
import { LEADERBOARD_SYNC_COOLDOWN_MS } from '../data/leaderboardData';
import {
  findRankInList,
  normalizeLeaderboardEntry,
  normalizeProfilePayload,
  rerankOverall,
  rerankWeekly,
} from '../data/leaderboardNormalization';
import { findWeeklyRivals, type RivalNeighbor } from '../systems/LeaderboardCompetition';
import { isEndgameUnlocked } from '../systems/EndgameSystem';
import { applySeasonLeaderboardClamp } from '../systems/seasonLeaderboardClamp';

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
  touchCount: number;
  partyElites: PartyEliteSnapshot[];
  isPlayer: boolean;
  updatedAt?: string;
  spireBest?: number;
}

export interface LeaderboardSnapshot {
  overall: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  myOverallRank: number | null;
  myWeeklyRank: number | null;
  myEntry: LeaderboardEntry | null;
  weeklyRivals: RivalNeighbor[];
  recentTable: LeaderboardEntry[];
  potChips: number;
  tablePlayerCount: number;
  configured: boolean;
  error?: string;
}

let lastSyncAt = 0;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: GameSave | null = null;
const PARTY_ELITE_CACHE_KEY = 'tuduk_lb_party_cache';

function isOptionalColumnError(error: { code?: string; message?: string }, column: string): boolean {
  const msg = (error.message ?? '').toLowerCase();
  const col = column.toLowerCase();
  return error.code === 'PGRST204'
    || msg.includes(col)
    || msg.includes('schema cache');
}

async function upsertProfilePayload(sb: NonNullable<ReturnType<typeof getSupabase>>, payload: ReturnType<typeof extractProfilePayload>) {
  const optionalCols = ['party_elites', 'touch_count', 'spire_best'] as const;
  let current: Record<string, unknown> = { ...normalizeProfilePayload(payload) };

  for (let attempt = 0; attempt <= optionalCols.length; attempt++) {
    const { error } = await sb.from('player_profiles').upsert(current, { onConflict: 'player_id' });
    if (!error) return null;

    const missing = optionalCols.find(col => isOptionalColumnError(error, col));
    if (!missing || !(missing in current)) return error;
    const { [missing]: _drop, ...rest } = current;
    current = rest;
  }

  return { message: 'profile upsert failed', code: 'UPSERT_FAIL' };
}

function readPartyEliteCache(): Record<string, PartyEliteSnapshot[]> {
  try {
    const raw = localStorage.getItem(PARTY_ELITE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PartyEliteSnapshot[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePartyEliteCache(cache: Record<string, PartyEliteSnapshot[]>): void {
  try {
    localStorage.setItem(PARTY_ELITE_CACHE_KEY, JSON.stringify(cache));
  } catch { /* quota */ }
}

function mergePartyEliteCache(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const cache = readPartyEliteCache();
  let dirty = false;

  const merged = entries.map((e) => {
    if (e.partyElites.length) {
      const prev = cache[e.playerId];
      if (!prev || JSON.stringify(prev) !== JSON.stringify(e.partyElites)) {
        cache[e.playerId] = e.partyElites;
        dirty = true;
      }
      return e;
    }
    const cached = cache[e.playerId];
    if (cached?.length) return { ...e, partyElites: cached };
    return e;
  });

  if (dirty) writePartyEliteCache(cache);
  return merged;
}

function parsePartyElites(raw: unknown): PartyEliteSnapshot[] {
  let data: unknown = raw;
  if (raw == null) return [];
  if (typeof raw === 'string') {
    try { data = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(data)) return [];

  return data
    .map((item): PartyEliteSnapshot | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const charId = String(row.charId ?? row.char_id ?? '');
      if (!charId || !CHAR_MAP[charId]) return null;
      const level = Number(row.level ?? 1) || 1;
      const name = typeof row.name === 'string' && row.name
        ? row.name
        : CHAR_MAP[charId]!.name;
      return { charId, level, name };
    })
    .filter((e): e is PartyEliteSnapshot => e !== null)
    .slice(0, 4);
}

export function buildPartyEliteSnapshot(save: GameSave): PartyEliteSnapshot[] {
  const partyIds = save.party.filter(id => CHAR_MAP[id]);
  const ownedByLevel = save.owned
    .filter(id => CHAR_MAP[id])
    .sort((a, b) => (save.chars[b]?.level ?? 0) - (save.chars[a]?.level ?? 0));
  const ordered = [...partyIds, ...ownedByLevel.filter(id => !partyIds.includes(id))];

  return ordered.slice(0, 4).map(id => ({
    charId: id,
    level: save.chars[id]?.level ?? 1,
    name: CHAR_MAP[id]!.name,
  }));
}

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
    touchCount: Number(row.touch_count ?? 0),
    partyElites: parsePartyElites(row.party_elites),
    isPlayer: row.player_id === playerId,
    updatedAt: row.updated_at,
    spireBest: row.spire_best ?? 0,
  };
}

function resolveSpireBestForProfile(save: GameSave): number {
  if (!isEndgameUnlocked(save)) return 0;
  const best = save.endgame?.spireBest ?? 0;
  const runFloor = save.spireRun?.active ? (save.spireRun.floor ?? 0) : 0;
  return Math.max(best, runFloor);
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
    touch_count: save.stats?.touchCount ?? 0,
    party_elites: buildPartyEliteSnapshot(save),
    spire_best: resolveSpireBestForProfile(save),
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

  if (applySeasonLeaderboardClamp(save)) {
    void import('../core/SaveManager').then(({ saveGame }) => saveGame(save));
  }

  const payload = extractProfilePayload(save);
  const error = await upsertProfilePayload(sb, payload);
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

  if (applySeasonLeaderboardClamp(save)) {
    void import('../core/SaveManager').then(({ saveGame }) => saveGame(save));
  }

  const payload = extractProfilePayload(save);
  const error = await upsertProfilePayload(sb, payload);
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


async function refetchPartyElites(entries: LeaderboardEntry[]): Promise<LeaderboardEntry[]> {
  const missingIds = [...new Set(
    entries.filter(e => !e.partyElites.length).map(e => e.playerId),
  )];
  if (!missingIds.length) return entries;

  const sb = getSupabase();
  if (!sb) return entries;

  const { data, error } = await sb
    .from('player_profiles')
    .select('player_id, party_elites')
    .in('player_id', missingIds);
  if (error || !data?.length) return entries;

  const eliteMap = new Map(
    data.map(row => [row.player_id, parsePartyElites(row.party_elites)]),
  );

  return entries.map((e) => {
    if (e.partyElites.length) return e;
    const elites = eliteMap.get(e.playerId) ?? [];
    return elites.length ? { ...e, partyElites: elites } : e;
  });
}

function hydratePartyElites(entries: LeaderboardEntry[], save: GameSave, playerId: string): LeaderboardEntry[] {
  const localElites = buildPartyEliteSnapshot(save);
  const patched = entries.map((e) => {
    if (e.partyElites.length) return e;
    if (e.playerId === playerId) return { ...e, partyElites: localElites };
    return e;
  });
  return mergePartyEliteCache(patched);
}

async function fetchRecentTableActivity(playerId: string, limit = 6): Promise<PlayerProfileRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('player_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit + 2);
  if (error) {
    console.warn('[Leaderboard] recent table failed', error);
    return [];
  }
  return ((data ?? []) as PlayerProfileRow[]).filter(r => r.player_id !== playerId).slice(0, limit);
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
      weeklyRivals: [],
      recentTable: [],
      potChips: 0,
      tablePlayerCount: 0,
      configured: false,
      error: 'Supabase 미설정 — GitHub Secrets 또는 .env.local에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 추가',
    };
  }

  await syncPlayerProfile(save, true);

  const weekId = getSpireWeekId();
  const [overallRows, weeklyRows, recentRows] = await Promise.all([
    fetchRankedList('max_region', false, 'party_dps'),
    fetchRankedList('weekly_score', false, 'max_region', weekId),
    fetchRecentTableActivity(playerId, 6),
  ]);

  const overall = overallRows.map((r, i) => rowToEntry(r, i + 1, playerId));
  const weekly = weeklyRows
    .filter(r => r.week_id === weekId)
    .map((r, i) => rowToEntry(r, i + 1, playerId));

  const payload = normalizeProfilePayload(extractProfilePayload(save));
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
    touchCount: Number(payload.touch_count),
    partyElites: payload.party_elites,
    isPlayer: true,
    spireBest: payload.spire_best,
  };

  const allEntries = [
    ...overall,
    ...weekly,
    ...recentRows.map((r, i) => rowToEntry(r, i + 1, playerId)),
    myEntry,
  ];
  const refetched = await refetchPartyElites(allEntries);
  const refetchMap = new Map(refetched.map(e => [e.playerId, e.partyElites]));

  const applyElites = (e: LeaderboardEntry): LeaderboardEntry => {
    const elites = e.partyElites.length ? e.partyElites : (refetchMap.get(e.playerId) ?? []);
    return elites.length ? { ...e, partyElites: elites } : e;
  };

  const hydratedOverall = hydratePartyElites(overall.map(applyElites), save, playerId);
  const hydratedWeekly = hydratePartyElites(weekly.map(applyElites), save, playerId);
  const hydratedRecent = hydratePartyElites(
    recentRows.map((r, i) => applyElites(rowToEntry(r, i + 1, playerId))),
    save,
    playerId,
  );
  const hydratedMe = hydratePartyElites([applyElites(myEntry)], save, playerId)[0] ?? myEntry;

  const withMeOverall = hydratedOverall.some(e => e.playerId === playerId)
    ? hydratedOverall
    : [...hydratedOverall, hydratedMe];
  const withMeWeekly = hydratedWeekly.some(e => e.playerId === playerId)
    ? hydratedWeekly
    : [...hydratedWeekly, hydratedMe];

  const rankedOverall = rerankOverall(withMeOverall);
  const rankedWeekly = rerankWeekly(withMeWeekly);
  const myOverallRank = findRankInList(rankedOverall, playerId);
  const myWeeklyRank = findRankInList(rankedWeekly, playerId);
  const rankedMe = rankedOverall.find(e => e.playerId === playerId) ?? normalizeLeaderboardEntry(hydratedMe);

  return enrichLeaderboardSnapshot({
    overall: rankedOverall,
    weekly: rankedWeekly,
    myOverallRank,
    myWeeklyRank: payload.weekly_score > 0 ? myWeeklyRank : null,
    myEntry: { ...rankedMe, rank: myOverallRank ?? rankedMe.rank },
    weeklyRivals: findWeeklyRivals(rankedWeekly, playerId, myWeeklyRank),
    recentTable: hydratedRecent.map(normalizeLeaderboardEntry),
    potChips: rankedWeekly.reduce((sum, e) => sum + e.weeklyScore, 0),
    tablePlayerCount: rankedWeekly.length,
    configured: true,
  }, save);
}

/** 랭킹 렌더 전 — 초상화 로컬·캐시 보강 */
export function enrichLeaderboardSnapshot(snap: LeaderboardSnapshot, save: GameSave): LeaderboardSnapshot {
  const playerId = getOrCreatePlayerId();
  return {
    ...snap,
    overall: hydratePartyElites(snap.overall, save, playerId),
    weekly: hydratePartyElites(snap.weekly, save, playerId),
    recentTable: hydratePartyElites(snap.recentTable, save, playerId),
    myEntry: snap.myEntry
      ? hydratePartyElites([snap.myEntry], save, playerId)[0] ?? snap.myEntry
      : null,
  };
}
