import type { CardSuit, MatchTier, MetaUpgrades, SaveData } from '../data/types';
import { MATCH_TIER_BONUS } from '../data/constants';
import {
  getComboDamageMult, getDefenseMult, getGoldBonusMult, getMatchDamageMult, getMaxHp,
} from './MetaUpgradeSystem';
import { getEquipmentAtkBonus, getEquipmentDefBonus } from './EquipmentSystem';

export interface MonsterDef {
  name: string;
  spriteKey: string;
  hp: number;
  attack: number;
  isBoss: boolean;
}

const WAVE_MONSTERS: Omit<MonsterDef, 'hp' | 'attack'>[] = [
  { name: '그린 슬라임', spriteKey: 'mob_slime_green', isBoss: false },
  { name: '블루 슬라임', spriteKey: 'mob_slime_blue', isBoss: false },
  { name: '버섯 몬스터', spriteKey: 'mob_mushroom', isBoss: false },
  { name: '박쥐', spriteKey: 'mob_bat', isBoss: false },
  { name: '고블린', spriteKey: 'mob_goblin', isBoss: false },
  { name: '스켈레톤', spriteKey: 'mob_skeleton', isBoss: false },
  { name: '레드 슬라임', spriteKey: 'mob_slime_red', isBoss: false },
];

const BOSS_MONSTERS: Omit<MonsterDef, 'hp' | 'attack'>[] = [
  { name: '슬라임 킹', spriteKey: 'mob_boss_slime_king', isBoss: true },
  { name: '고블린 대장', spriteKey: 'mob_boss_goblin', isBoss: true },
  { name: '드래곤 유충', spriteKey: 'mob_boss_dragon', isBoss: true },
  { name: '리치', spriteKey: 'mob_boss_lich', isBoss: true },
];

const SUIT_ATK_MULT: Record<CardSuit, number> = {
  spades: 1.25, hearts: 1.0, diamonds: 1.0, clubs: 1.0,
};

export class BattleSystem {
  playerHp = 100;
  playerMaxHp = 100;
  monsterHp = 400;
  monsterMaxHp = 400;
  monster!: MonsterDef;
  wave = 1;
  turns = 0;
  runGold = 0;
  runKills = 0;
  /** 클로버 플러시 — 다음 몬스터 공격 경감 */
  shieldActive = false;

  init(save: SaveData) {
    this.wave = 1;
    this.runGold = 0;
    this.runKills = 0;
    this.turns = 0;
    this.shieldActive = false;
    this.playerMaxHp = getMaxHp(save.upgrades);
    this.playerHp = this.playerMaxHp;
    this.spawnWave(1);
  }

  spawnWave(wave: number) {
    this.wave = wave;
    this.turns = 0;
    const isBoss = wave % 5 === 0;
    const pool = isBoss ? BOSS_MONSTERS : WAVE_MONSTERS;
    const template = pool[(wave - 1) % pool.length];
    const scale = 1 + (wave - 1) * 0.12;
    const baseHp = isBoss ? 600 : 260;
    const baseAtk = isBoss ? 18 : 8;

    this.monster = {
      ...template,
      hp: Math.floor(baseHp * scale),
      attack: Math.floor(baseAtk * scale),
    };
    this.monsterMaxHp = this.monster.hp;
    this.monsterHp = this.monster.hp;
  }

  nextWave() {
    this.spawnWave(this.wave + 1);
  }

  calcDamage(
    cardCount: number,
    suit: CardSuit,
    tier: MatchTier,
    comboIndex: number,
    upgrades: MetaUpgrades,
    comboMult: number,
    equipAtk: number,
  ): number {
    const base = cardCount * 12 + MATCH_TIER_BONUS[tier];
    const comboBonus = 1 + (comboIndex - 1) * 0.65;
    return Math.floor(
      base * SUIT_ATK_MULT[suit] * getMatchDamageMult(upgrades) * getComboDamageMult(upgrades)
      * (1 + equipAtk) * comboBonus * comboMult,
    );
  }

  /** 문양별 부가 효과 */
  applySuitBonus(suit: CardSuit, damage: number): { heal: number; goldBonus: number; shield: boolean } {
    switch (suit) {
      case 'hearts':
        return { heal: Math.max(1, Math.floor(damage * 0.1)), goldBonus: 0, shield: false };
      case 'diamonds':
        return { heal: 0, goldBonus: Math.max(1, Math.floor(damage * 0.15)), shield: false };
      case 'clubs':
        return { heal: 0, goldBonus: 0, shield: true };
      default:
        return { heal: 0, goldBonus: 0, shield: false };
    }
  }

  healPlayer(amount: number) {
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + amount);
  }

  dealDamageToMonster(amount: number): number {
    const dmg = Math.max(1, amount);
    this.monsterHp = Math.max(0, this.monsterHp - dmg);
    return dmg;
  }

  monsterCounterAttack(upgrades: MetaUpgrades, equipDef: number): number {
    this.turns++;
    let raw = this.monster.attack + Math.floor(this.turns / 3) * 2;
    if (this.shieldActive) {
      raw = Math.floor(raw * 0.4);
      this.shieldActive = false;
    }
    const defMult = getDefenseMult(upgrades) * Math.max(0.5, 1 - equipDef);
    const dmg = Math.max(1, Math.floor(raw * defMult));
    this.playerHp = Math.max(0, this.playerHp - dmg);
    return dmg;
  }

  isVictory() { return this.monsterHp <= 0; }
  isDefeat() { return this.playerHp <= 0; }

  getKillReward(upgrades: MetaUpgrades): number {
    const base = this.monster.isBoss ? 80 : 35;
    return Math.floor((base + this.wave * 8) * getGoldBonusMult(upgrades));
  }
}
