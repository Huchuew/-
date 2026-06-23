import { HAND_DAMAGE, HAND_SCORES, CHIP_FOR_HAND } from '../data/constants';
import type { CardData, ChipType, PokerHand } from '../data/types';

export function evaluateMatch(cards: CardData[]): PokerHand {
  if (cards.length < 2) return 'none';

  const ranks = new Map<number, number>();
  let jokers = 0;
  for (const c of cards) {
    if (c.special === 'joker') jokers++;
    else ranks.set(c.rank, (ranks.get(c.rank) ?? 0) + 1);
  }

  const counts = [...ranks.values()].sort((a, b) => b - a);
  const maxCount = (counts[0] ?? 0) + jokers;
  const pairs = counts.filter(c => c >= 2).length + (jokers > 0 ? 1 : 0);

  if (cards.length >= 5 && isFlush(cards) && isStraight(cards)) {
    return isRoyal(cards) ? 'royalFlush' : 'straightFlush';
  }
  if (maxCount >= 4) return 'fourOfAKind';
  if (maxCount >= 3 && pairs >= 2) return 'fullHouse';
  if (cards.length >= 5 && isFlush(cards)) return 'flush';
  if (cards.length >= 5 && isStraight(cards)) return 'straight';
  if (maxCount >= 3) return 'triple';
  if (pairs >= 2) return 'twoPair';
  if (pairs >= 1 || maxCount >= 2) return 'onePair';
  return 'none';
}

function isFlush(cards: CardData[]): boolean {
  const suits = new Set(cards.filter(c => c.special !== 'joker').map(c => c.suit));
  return suits.size === 1;
}

function isStraight(cards: CardData[]): boolean {
  const values: number[] = [...new Set(cards.filter(c => c.special !== 'joker').map(c => c.rank))];
  const jokers = cards.filter(c => c.special === 'joker').length;
  if (values.includes(14)) values.push(1);
  values.sort((a, b) => a - b);
  const set = new Set<number>(values);

  for (let start = 1; start <= 10; start++) {
    let needed = 0;
    for (let i = 0; i < 5; i++) if (!set.has(start + i)) needed++;
    if (needed <= jokers) return true;
  }
  return false;
}

function isRoyal(cards: CardData[]): boolean {
  const needed = new Set([10, 11, 12, 13, 14]);
  for (const c of cards) {
    if (c.special !== 'joker') needed.delete(c.rank);
  }
  return needed.size <= cards.filter(c => c.special === 'joker').length;
}

export function getHandScore(hand: PokerHand, mod?: { flushBonus: number; straightBonus: number }): number {
  let score = HAND_SCORES[hand];
  if (hand === 'flush' && mod) score = Math.floor(score * mod.flushBonus);
  if (hand === 'straight' && mod) score = Math.floor(score * mod.straightBonus);
  return score;
}

export function getBossDamage(hand: PokerHand, bonus = 1): number {
  return Math.floor(HAND_DAMAGE[hand] * bonus);
}

export function getChipForHand(hand: PokerHand): ChipType {
  return (CHIP_FOR_HAND[hand] ?? 'none') as ChipType;
}
