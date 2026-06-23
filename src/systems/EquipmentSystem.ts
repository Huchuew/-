import type { EquippedGear, EquipmentItem, HeroClass, SaveData } from '../data/types';

export const EQUIPMENT_SHOP: EquipmentItem[] = [
  { id: 'armor_bronze', slot: 'armor', name: '브론즈 갑옷', desc: '방어력 +5%', cost: 150, tier: 'bronze', statAtk: 0, statDef: 0.05 },
  { id: 'armor_iron', slot: 'armor', name: '아이언 갑옷', desc: '방어력 +12%', cost: 400, tier: 'iron', statAtk: 0, statDef: 0.12 },
  { id: 'armor_gold', slot: 'armor', name: '골드 갑옷', desc: '방어력 +20% 공격 +5%', cost: 900, tier: 'gold', statAtk: 0.05, statDef: 0.2 },
  { id: 'armor_legend', slot: 'armor', name: '전설 갑옷', desc: '방어력 +30% 공격 +12%', cost: 2000, tier: 'legend', statAtk: 0.12, statDef: 0.3 },
  { id: 'weapon_iron', slot: 'weapon', name: '철검', desc: '공격력 +10%', cost: 200, tier: 'iron', statAtk: 0.1, statDef: 0 },
  { id: 'weapon_gold', slot: 'weapon', name: '골드 블레이드', desc: '공격력 +22%', cost: 700, tier: 'gold', statAtk: 0.22, statDef: 0 },
  { id: 'weapon_holy', slot: 'weapon', name: '성스러운 지팡이', desc: '공격 +15% HP회복', cost: 500, tier: 'holy', statAtk: 0.15, statDef: 0 },
  { id: 'weapon_arcane', slot: 'weapon', name: '비전 스태프', desc: '공격력 +28%', cost: 1200, tier: 'arcane', statAtk: 0.28, statDef: 0 },
  { id: 'hero_nun', slot: 'hero', name: '힐러 수녀', desc: '캐릭터 변경', cost: 300, tier: 'nun', statAtk: 0, statDef: 0, heroClass: 'nun' },
  { id: 'hero_mage', slot: 'hero', name: '마법사', desc: '캐릭터 변경', cost: 300, tier: 'mage', statAtk: 0, statDef: 0, heroClass: 'mage' },
  { id: 'hero_hamster', slot: 'hero', name: '햄스터 기사', desc: '캐릭터 변경', cost: 500, tier: 'hamster', statAtk: 0, statDef: 0, heroClass: 'hamster' },
];

export const DEFAULT_GEAR: EquippedGear = {
  armor: 'cloth',
  weapon: 'wood',
  helmet: 'none',
};

export function getEquipped(save: SaveData): EquippedGear {
  return save.equipped ?? DEFAULT_GEAR;
}

export function buyEquipment(save: SaveData, itemId: string): boolean {
  const item = EQUIPMENT_SHOP.find(e => e.id === itemId);
  if (!item || save.gold < item.cost) return false;
  if (save.ownedEquipment.includes(itemId) && item.slot !== 'hero') return false;

  save.gold -= item.cost;
  if (!save.ownedEquipment.includes(itemId)) save.ownedEquipment.push(itemId);

  if (item.slot === 'hero' && item.heroClass) {
    save.heroClass = item.heroClass;
  } else if (item.slot === 'armor') {
    save.equipped.armor = item.tier as EquippedGear['armor'];
  } else if (item.slot === 'weapon') {
    save.equipped.weapon = item.tier as EquippedGear['weapon'];
  }
  return true;
}

export function equipOwned(save: SaveData, itemId: string): boolean {
  const item = EQUIPMENT_SHOP.find(e => e.id === itemId);
  if (!item || !save.ownedEquipment.includes(itemId)) return false;
  if (item.slot === 'armor') save.equipped.armor = item.tier as EquippedGear['armor'];
  if (item.slot === 'weapon') save.equipped.weapon = item.tier as EquippedGear['weapon'];
  if (item.slot === 'hero' && item.heroClass) save.heroClass = item.heroClass;
  return true;
}

export function getEquipmentAtkBonus(save: SaveData): number {
  let bonus = 0;
  for (const id of save.ownedEquipment) {
    const item = EQUIPMENT_SHOP.find(e => e.id === id);
    if (!item) continue;
    if (item.slot === 'weapon' && save.equipped.weapon === item.tier) bonus += item.statAtk;
    if (item.slot === 'armor' && save.equipped.armor === item.tier) bonus += item.statAtk;
  }
  return bonus;
}

export function getEquipmentDefBonus(save: SaveData): number {
  let bonus = 0;
  for (const id of save.ownedEquipment) {
    const item = EQUIPMENT_SHOP.find(e => e.id === id);
    if (!item) continue;
    if (item.slot === 'armor' && save.equipped.armor === item.tier) bonus += item.statDef;
  }
  return bonus;
}
