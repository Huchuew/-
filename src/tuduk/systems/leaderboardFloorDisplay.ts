import type { LeaderboardEntry } from '../services/PlayerProfileService';
import { LEADERBOARD_RANK_CAP_FLOOR } from '../data/leaderboardNormalization';
import { formatSpireBasementFloor } from '../data/endgame/spireDepth';

export interface LeaderboardFloorDisplay {
  displayFloor: number;
  isSpire: boolean;
  statLabel: string;
  statTitle: string;
}

/** 야탑 클리어 유저는 지하 B층, 그 외는 던전 최고층(17층 상한) */
export function resolveLeaderboardFloor(
  e: Pick<LeaderboardEntry, 'maxRegion' | 'spireBest'>,
): LeaderboardFloorDisplay {
  const spire = e.spireBest ?? 0;
  if (spire > 0) {
    return {
      displayFloor: spire,
      isSpire: true,
      statLabel: formatSpireBasementFloor(spire),
      statTitle: `야탑 지하 최심층 (${formatSpireBasementFloor(spire)})`,
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
