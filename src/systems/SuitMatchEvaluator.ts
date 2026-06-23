import type { CardData, CardSuit, MatchTier } from '../data/types';
import { MATCH_TIER_LABELS, SUIT_LABELS, SUIT_SYMBOLS } from '../data/constants';

export function getPrimarySuit(cards: CardData[]): CardSuit {
  const counts = new Map<CardSuit, number>();
  for (const c of cards) {
    counts.set(c.suit, (counts.get(c.suit) ?? 0) + 1);
  }
  let best: CardSuit = cards[0]?.suit ?? 'spades';
  let max = 0;
  for (const [suit, n] of counts) {
    if (n > max) { max = n; best = suit; }
  }
  return best;
}

export function getMatchTier(count: number): MatchTier {
  if (count >= 6) return 'ultra';
  if (count >= 5) return 'mega';
  if (count >= 4) return 'quad';
  if (count >= 3) return 'triple';
  return 'none';
}

export function getMatchLabel(suit: CardSuit, tier: MatchTier): string {
  if (tier === 'none') return '';
  return `${SUIT_SYMBOLS[suit]} ${MATCH_TIER_LABELS[tier]}`;
}

export function getSuitName(suit: CardSuit): string {
  return SUIT_LABELS[suit];
}
