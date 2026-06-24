import type { LeaderboardEntry } from '../services/PlayerProfileService';
import { SHOWDOWN_GAP_SP } from '../data/jackPubPoker';

export interface RivalNeighbor {
  rank: number;
  nickname: string;
  teamName: string;
  weeklyScore: number;
  maxRegion: number;
  gapSp: number;
  direction: 'above' | 'below';
  isShowdown: boolean;
}

export function findWeeklyRivals(
  weekly: LeaderboardEntry[],
  myPlayerId: string,
  myRank: number | null,
): RivalNeighbor[] {
  if (!myRank || myRank <= 0) return [];
  const me = weekly.find(e => e.playerId === myPlayerId);
  const myScore = me?.weeklyScore ?? 0;

  const rivals: RivalNeighbor[] = [];
  for (const e of weekly) {
    if (e.isPlayer) continue;
    const rankGap = Math.abs(e.rank - myRank);
    if (rankGap > 3) continue;
    const gapSp = e.rank < myRank ? e.weeklyScore - myScore : myScore - e.weeklyScore;
    rivals.push({
      rank: e.rank,
      nickname: e.nickname,
      teamName: e.teamName,
      weeklyScore: e.weeklyScore,
      maxRegion: e.maxRegion,
      gapSp: Math.abs(gapSp),
      direction: e.rank < myRank ? 'above' : 'below',
      isShowdown: Math.abs(gapSp) <= SHOWDOWN_GAP_SP,
    });
  }
  return rivals.sort((a, b) => a.rank - b.rank);
}

export function buildShowdownHeadline(rivals: RivalNeighbor[], myRank: number | null): string | null {
  const closest = rivals
    .filter(r => r.isShowdown)
    .sort((a, b) => a.gapSp - b.gapSp)[0];
  if (!closest) return null;
  if (closest.direction === 'above') {
    return `⚔️ ${closest.nickname}님과 ${closest.gapSp.toLocaleString()} SP 차 — 막판 승부!`;
  }
  return `📈 ${closest.nickname}님이 추격 중! ${closest.gapSp.toLocaleString()} SP 앞섬`;
}

export function buildRivalStripLine(rivals: RivalNeighbor[]): string {
  const above = rivals.filter(r => r.direction === 'above').sort((a, b) => b.rank - a.rank)[0];
  const below = rivals.filter(r => r.direction === 'below').sort((a, b) => a.rank - b.rank)[0];
  const parts: string[] = [];
  if (above) parts.push(`위 #${above.rank} ${above.nickname} (+${above.gapSp} SP)`);
  if (below) parts.push(`아래 #${below.rank} ${below.nickname} (-${below.gapSp} SP)`);
  return parts.join(' · ') || '라이벌 탐색 중…';
}
