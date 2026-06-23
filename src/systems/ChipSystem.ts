import { CHIP_MERGE } from '../data/constants';
import type { ChipType } from '../data/types';

const NEXT: Partial<Record<ChipType, ChipType>> = {
  bronze: 'silver', silver: 'gold', gold: 'diamond', diamond: 'joker',
};

export class ChipSystem {
  inventory: Record<ChipType, number> = {
    none: 0, bronze: 0, silver: 0, gold: 0, diamond: 0, joker: 0,
  };
  mergeBonus = 1;

  add(type: ChipType) {
    if (type === 'none') return;
    this.inventory[type]++;
    this.tryMerge(type);
  }

  private tryMerge(startType: ChipType) {
    if (startType === 'joker') return;
    let required = CHIP_MERGE;
    if (this.mergeBonus > 1) required = Math.max(2, required - 1);

    let current: ChipType = startType;
    while (this.inventory[current] >= required) {
      this.inventory[current] -= required;
      const nextTier: ChipType | undefined = NEXT[current];
      if (!nextTier) break;
      this.inventory[nextTier]++;
      current = nextTier;
    }
  }

  useJoker(): boolean {
    if (this.inventory.joker <= 0) return false;
    this.inventory.joker--;
    return true;
  }

  reset() {
    this.inventory = { none: 0, bronze: 0, silver: 0, gold: 0, diamond: 0, joker: 0 };
  }
}
