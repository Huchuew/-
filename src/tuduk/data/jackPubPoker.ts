/** 잭펍 — 모험단 랭킹·경쟁 UI 테마 */

export const JACKPUB_NAME = '잭펍';
export const JACKPUB_TABLE_LABEL = '잭펍 모험단 랭킹';
export const JACKPUB_TAGLINE = '모험단끼리 주간 성장 점수를 겨룹니다';

export interface PokerTierTitle {
  id: string;
  label: string;
  icon: string;
  flavor: string;
}

const WEEKLY_TIERS: { maxRank: number; tier: PokerTierTitle }[] = [
  { maxRank: 1, tier: { id: 'champion', label: '주간 챔피언', icon: '👑', flavor: '이번 주 1위 모험단' } },
  { maxRank: 3, tier: { id: 'elite', label: '엘리트', icon: '🏆', flavor: '상위권 — 시즌 보상 대상' } },
  { maxRank: 10, tier: { id: 'veteran', label: '베테랑', icon: '⚔️', flavor: '안정적인 상위 랭커' } },
  { maxRank: 25, tier: { id: 'rising', label: '성장세', icon: '📈', flavor: '순위 상승 중' } },
  { maxRank: 50, tier: { id: 'active', label: '활약단', icon: '🛡️', flavor: '꾸준히 점수를 올리는 중' } },
  { maxRank: 99, tier: { id: 'rookie', label: '신예', icon: '🪙', flavor: '이번 주 첫 도전 환영' } },
];

const OVERALL_TIERS: { maxRank: number; tier: PokerTierTitle }[] = [
  { maxRank: 1, tier: { id: 'legend', label: '전설', icon: '👑', flavor: '종합 1위 — 잭펍의 전설' } },
  { maxRank: 3, tier: { id: 'master', label: '마스터', icon: '🏆', flavor: '최고층·화력 최상위' } },
  { maxRank: 10, tier: { id: 'veteran', label: '베테랑', icon: '⚔️', flavor: '엔드게임 단골 모험단' } },
  { maxRank: 25, tier: { id: 'adept', label: '숙련', icon: '🗺️', flavor: '던전 심층 단골' } },
  { maxRank: 99, tier: { id: 'rookie', label: '신예', icon: '🪙', flavor: '성장 중인 모험단' } },
];

export function getWeeklyPokerTitle(rank: number | null): PokerTierTitle {
  if (rank == null || rank <= 0) {
    return { id: 'newcomer', label: '참가 대기', icon: '🎲', flavor: '이번 주 첫 점수를 올려보세요' };
  }
  return WEEKLY_TIERS.find(t => rank <= t.maxRank)?.tier
    ?? { id: 'climber', label: '도전자', icon: '📊', flavor: '다음 순위를 노려보세요' };
}

export function getOverallPokerTitle(rank: number | null): PokerTierTitle {
  if (rank == null || rank <= 0) {
    return { id: 'guest', label: '게스트', icon: '🚪', flavor: '랭킹에 등록해 보세요' };
  }
  return OVERALL_TIERS.find(t => rank <= t.maxRank)?.tier
    ?? { id: 'climber', label: '도전자', icon: '📊', flavor: '층·전투력을 올려 순위를 높이세요' };
}

export const POKER_BLIND_NAMES: Record<string, { name: string; desc: string }> = {
  floor: { name: '층 돌파전', desc: '새 층 SP +50% — 깊은 층을 노리는 주' },
  hunt: { name: '사냥 러시', desc: '처치 SP +55% — 사냥으로 점수를 쌓는 주' },
  tap: { name: '투닥 챌린지', desc: '투닥 SP +80% — 터치로 점수를 올리는 주' },
  glory: { name: '업적 쟁탈전', desc: '업적 SP +70% — 업적으로 점수를 쌓는 주' },
  blitz: { name: '블리츠 위크', desc: '층·처치 SP +25% — 빠르게 올리는 주' },
};

export function formatTablePot(weeklyScoreSum: number, playerCount: number): string {
  const total = Math.max(0, weeklyScoreSum);
  if (playerCount <= 1) return `주간 합계 ${total.toLocaleString()} SP · 참가 대기 중`;
  return `주간 합계 ${total.toLocaleString()} SP · ${playerCount}개 모험단 참가`;
}

export const SHOWDOWN_GAP_SP = 80;
