import type { GameSave } from '../types';
import { fetchLeaderboardSnapshot, type LeaderboardSnapshot } from '../services/PlayerProfileService';
import { getWeeklyPokerTitle } from '../data/jackPubPoker';
import { isSupabaseConfigured } from '../core/supabaseClient';

const STASH_KEY = 'tuduk_pub_rank_stash';

interface RankStash {
  weekId: string;
  weeklyRank: number | null;
  overallRank: number | null;
  weeklyScore: number;
  at: number;
}

function readStash(): RankStash | null {
  try {
    const raw = sessionStorage.getItem(STASH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RankStash;
  } catch {
    return null;
  }
}

function writeStash(snap: LeaderboardSnapshot, weekId: string, weeklyScore: number): void {
  try {
    const payload: RankStash = {
      weekId,
      weeklyRank: snap.myWeeklyRank,
      overallRank: snap.myOverallRank,
      weeklyScore,
      at: Date.now(),
    };
    sessionStorage.setItem(STASH_KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
}

/** 랭킹 탭 진입 시 호출 — 귀환 토스트 비교용 */
export function stashLeaderboardRanks(snap: LeaderboardSnapshot, weekId: string, weeklyScore: number): void {
  writeStash(snap, weekId, weeklyScore);
}

/** 숙소 귀환 시 순위 변동 메시지 (없으면 null) */
export function formatLodgingRankToast(prev: RankStash, snap: LeaderboardSnapshot, weekId: string): string | null {
  if (prev.weekId !== weekId) return null;
  const parts: string[] = [];

  if (prev.weeklyRank != null && snap.myWeeklyRank != null && prev.weeklyRank !== snap.myWeeklyRank) {
    const delta = prev.weeklyRank - snap.myWeeklyRank;
    if (delta > 0) parts.push(`주간 #${prev.weeklyRank}→#${snap.myWeeklyRank} (↑${delta})`);
    else parts.push(`주간 #${prev.weeklyRank}→#${snap.myWeeklyRank} (↓${Math.abs(delta)})`);
  }

  const scoreGain = (snap.myEntry?.weeklyScore ?? 0) - prev.weeklyScore;
  if (scoreGain > 0) parts.push(`+${scoreGain.toLocaleString()} SP`);

  if (!parts.length) return null;

  const title = snap.myWeeklyRank != null ? getWeeklyPokerTitle(snap.myWeeklyRank) : null;
  const badge = title ? `${title.icon}${title.label}` : '🏆';
  return `${badge} 잭펍 귀환 — ${parts.join(' · ')}`;
}

export async function tryLodgingPubRankToast(
  save: GameSave,
  weekId: string,
  weeklyScore: number,
  showToast: (msg: string) => void,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const prev = readStash();
  if (!prev) return;

  try {
    const snap = await fetchLeaderboardSnapshot(save);
    const msg = formatLodgingRankToast(prev, snap, weekId);
    writeStash(snap, weekId, weeklyScore);
    if (msg) showToast(msg);
  } catch {
    /* ignore */
  }
}
