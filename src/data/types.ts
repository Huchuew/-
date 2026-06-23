export type CardRank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type SpecialType =
  | 'none' | 'joker' | 'bomb' | 'missile' | 'lightning'
  | 'flame' | 'rainbow' | 'blackchip' | 'jackpot';

export type ChipType = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'joker';

export type PokerHand =
  | 'none' | 'onePair' | 'twoPair' | 'triple' | 'straight'
  | 'flush' | 'fullHouse' | 'fourOfAKind' | 'straightFlush' | 'royalFlush';

/** 플러시 메이커 — 연결 개수 등급 */
export type MatchTier = 'none' | 'triple' | 'quad' | 'mega' | 'ultra';

export type MetaUpgradeId = 'comboDamage' | 'matchDamage' | 'maxHp' | 'defense' | 'goldBonus';

export type HeroClass = 'knight' | 'nun' | 'mage' | 'hamster';

export type ArmorTier = 'cloth' | 'bronze' | 'iron' | 'gold' | 'legend';
export type WeaponTier = 'wood' | 'iron' | 'gold' | 'holy' | 'arcane';

export interface EquippedGear {
  armor: ArmorTier;
  weapon: WeaponTier;
  helmet: 'none' | 'iron' | 'gold';
}

export interface EquipmentItem {
  id: string;
  slot: 'armor' | 'weapon' | 'helmet' | 'hero';
  name: string;
  desc: string;
  cost: number;
  tier: string;
  statAtk: number;
  statDef: number;
  heroClass?: HeroClass;
}

export interface CardData {
  id: number;
  rank: CardRank;
  suit: CardSuit;
  special: SpecialType;
}

export interface CellPos {
  x: number;
  y: number;
}

export interface RunModifiers {
  aceSpawn: number;
  flushBonus: number;
  comboMult: number;
  jokerRate: number;
  bombRadius: number;
  chipMerge: number;
  goldChip: number;
  straightBonus: number;
  bossDamage: number;
  specialRate: number;
}

export interface MetaUpgrades {
  comboDamage: number;
  matchDamage: number;
  maxHp: number;
  defense: number;
  goldBonus: number;
}

export interface SaveData {
  version: string;
  gold: number;
  gems: number;
  stage: number;
  highScore: number;
  totalRuns: number;
  wins: number;
  tutorialDone: boolean;
  heroClass: HeroClass;
  equipped: EquippedGear;
  ownedEquipment: string[];
  upgrades: MetaUpgrades;
  settings: {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    vibration: boolean;
  };
}

export interface BattleReward {
  gold: number;
  gems: number;
  items: string[];
}

export interface ComboStep {
  cards: CardData[];
  cells: CellPos[];
  suit: CardSuit;
  tier: MatchTier;
  damage: number;
  heal: number;
  goldBonus: number;
  comboIndex: number;
}
