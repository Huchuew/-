import type { PokerHand } from './types';

export const BOARD_SIZE = 7;
export const MIN_MATCH = 3;
export const BOSS_INTERVAL = 10;
export const CHIP_MERGE = 3;
export const GAME_W = 1080;
export const GAME_H = 1920;

export const RANK_LABELS: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
};

export const SUIT_LABELS: Record<string, string> = {
  spades: '스페이드', hearts: '하트', diamonds: '다이아', clubs: '클로버',
};

/** 플러시 메이커 타일 색상 */
export const SUIT_TILE_COLORS: Record<string, number> = {
  spades: 0x4a6cf7,
  hearts: 0xff4d6d,
  diamonds: 0xff8c32,
  clubs: 0x2ecc71,
};

export const SUIT_TILE_DARK: Record<string, number> = {
  spades: 0x2a4099,
  hearts: 0xcc2244,
  diamonds: 0xcc6600,
  clubs: 0x1a9955,
};

export const MATCH_TIER_LABELS: Record<string, string> = {
  none: '', triple: '트리플!', quad: '쿼드!', mega: '메가!', ultra: '울트라!',
};

export const MATCH_TIER_RANK: Record<string, number> = {
  none: 0, triple: 1, quad: 2, mega: 3, ultra: 4,
};

/** 등급별 추가 데미지 */
export const MATCH_TIER_BONUS: Record<string, number> = {
  none: 0, triple: 15, quad: 40, mega: 90, ultra: 200,
};

/** 문양별 특수 효과 설명 */
export const SUIT_EFFECT_DESC: Record<string, string> = {
  spades: '⚔️ 강력 공격 +25%',
  hearts: '❤️ HP 회복',
  diamonds: '💎 즉시 골드',
  clubs: '🛡️ 다음 피격 경감',
};

export const HAND_SCORES: Record<PokerHand, number> = {
  none: 0, onePair: 50, twoPair: 120, triple: 250, straight: 400,
  flush: 600, fullHouse: 900, fourOfAKind: 1500, straightFlush: 3000, royalFlush: 10000,
};

export const HAND_DAMAGE: Record<PokerHand, number> = {
  none: 0, onePair: 5, twoPair: 10, triple: 25, straight: 40,
  flush: 55, fullHouse: 80, fourOfAKind: 150, straightFlush: 250, royalFlush: 500,
};

export const HAND_LABELS: Record<PokerHand, string> = {
  none: '', onePair: '원페어!', twoPair: '투페어!', triple: '트리플!',
  straight: '스트레이트!', flush: '플러시!', fullHouse: '풀하우스!',
  fourOfAKind: '포카드!', straightFlush: '스트레이트 플러시!', royalFlush: '로열 플러시!',
};

export const CHIP_FOR_HAND: Partial<Record<PokerHand, string>> = {
  onePair: 'bronze',
  twoPair: 'silver', triple: 'silver',
  straight: 'gold', flush: 'gold', fullHouse: 'gold',
  fourOfAKind: 'diamond', straightFlush: 'diamond',
  royalFlush: 'joker',
};

export const DEFAULT_MODIFIERS = {
  aceSpawn: 0, flushBonus: 1, comboMult: 1, jokerRate: 0, bombRadius: 0,
  chipMerge: 1, goldChip: 0.3, straightBonus: 1, bossDamage: 1, specialRate: 0.04,
};
