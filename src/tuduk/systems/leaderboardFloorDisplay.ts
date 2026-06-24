import type { LeaderboardEntry } from '../services/PlayerProfileService';
import { LEADERBOARD_RANK_CAP_FLOOR } from '../data/leaderboardNormalization';

export interface LeaderboardFloorDisplay {
  displayFloor: number;
  isSpire: boolean;
  statLabel: string;
  statTitle: string;
}

/** 야탑 클리어 유저는 야탑 층, 그 외는 던전 최고층(17층 상한) */
export function resolveLeaderboardFloor(
  e: Pick<LeaderboardEntry, 'maxRegion' | 'spireBest'>,
): LeaderboardFloorDisplay {
  const spire = e.spireBest ?? 0;
  if (spire > 0) {
    return {
      displayFloor: spire,
      isSpire: true,
      statLabel: '야탑',
      statTitle: '야탑 최고층 (18층 클리어 후)',
    };
  }
  const displayFloor = Math.min(e.maxRegion ?? 1, LEADERBOARD_RANK_CAP_FLOOR);
  return {
    displayFloor,
    isSpire: false,
    statLabel: '층',
    statTitle: '최고 층 (던전)',
  };
}
