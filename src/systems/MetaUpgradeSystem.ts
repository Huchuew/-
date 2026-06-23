import type { MetaUpgradeId, MetaUpgrades, SaveData } from '../data/types';

export interface UpgradeDef {
  id: MetaUpgradeId;
  name: string;
  desc: string;
  icon: string;
  maxLevel: number;
  baseCost: number;
}

export const UPGRADE_DEFS: UpgradeDef[] = [
  { id: 'comboDamage', name: '콤보 공격력', desc: '콤보당 데미지 +15%', icon: '⚔️', maxLevel: 20, baseCost: 100 },
  { id: 'matchDamage', name: '매치 공격력', desc: '기본 매치 데미지 +10%', icon: '💥', maxLevel: 20, baseCost: 80 },
  { id: 'maxHp', name: '체력 강화', desc: '최대 HP +20', icon: '❤️', maxLevel: 15, baseCost: 120 },
  { id: 'defense', name: '방어력', desc: '적 공격 -8%', icon: '🛡️', maxLevel: 15, baseCost: 100 },
  { id: 'goldBonus', name: '골드 보너스', desc: '전투 보상 +12%', icon: '🪙', maxLevel: 10, baseCost: 150 },
];

export function getUpgradeCost(def: UpgradeDef, level: number): number {
  return Math.floor(def.baseCost * Math.pow(1.35, level));
}

export function getUpgradeLevel(save: SaveData, id: MetaUpgradeId): number {
  return save.upgrades[id];
}

export function canBuyUpgrade(save: SaveData, id: MetaUpgradeId): boolean {
  const def = UPGRADE_DEFS.find(d => d.id === id)!;
  const lv = save.upgrades[id];
  if (lv >= def.maxLevel) return false;
  return save.gold >= getUpgradeCost(def, lv);
}

export function buyUpgrade(save: SaveData, id: MetaUpgradeId): boolean {
  const def = UPGRADE_DEFS.find(d => d.id === id)!;
  const lv = save.upgrades[id];
  if (lv >= def.maxLevel) return false;
  const cost = getUpgradeCost(def, lv);
  if (save.gold < cost) return false;
  save.gold -= cost;
  save.upgrades[id]++;
  return true;
}

export function getComboDamageMult(upgrades: MetaUpgrades): number {
  return 1 + upgrades.comboDamage * 0.15;
}

export function getMatchDamageMult(upgrades: MetaUpgrades): number {
  return 1 + upgrades.matchDamage * 0.10;
}

export function getMaxHp(upgrades: MetaUpgrades): number {
  return 100 + upgrades.maxHp * 20;
}

export function getDefenseMult(upgrades: MetaUpgrades): number {
  return Math.max(0.2, 1 - upgrades.defense * 0.08);
}

export function getGoldBonusMult(upgrades: MetaUpgrades): number {
  return 1 + upgrades.goldBonus * 0.12;
}
