import type { ElementType, MonsterDef } from '../types';
import { PIPOYA_MONSTER_BINDINGS } from './pipoyaMonsters';
import { REGIONS } from './regions';

function m(
  id: string, regionId: number,
  hp: number, atk: number, def: number, mdef: number,
  gold: number, exp: number,
  opts: Partial<MonsterDef> = {},
): MonsterDef {
  const pipoya = PIPOYA_MONSTER_BINDINGS[id];
  return {
    id,
    name: pipoya?.name ?? id,
    regionId, hp, atk, def, mdef, gold, exp,
    isBoss: false, isRare: false, rareChance: 0, drops: [],
    ...opts,
  };
}

export const MONSTERS: MonsterDef[] = [
  m('goblin', 1, 80, 8, 5, 2, 12, 8),
  m('slime_green', 1, 60, 6, 3, 8, 8, 6, { isMagic: true }),
  m('goblin_rare', 1, 200, 15, 12, 5, 80, 40, { isRare: true, rareChance: 0.015, drops: ['rare_ore'] }),
  { ...m('boss_goblin_chief', 1, 800, 18, 25, 8, 200, 100), isBoss: true },

  m('skeleton', 2, 120, 12, 10, 4, 18, 12),
  m('bat', 2, 70, 14, 4, 6, 14, 10),
  m('bat_rare', 2, 250, 22, 8, 10, 100, 50, { isRare: true, rareChance: 0.008, drops: ['shadow_wing'] }),
  { ...m('boss_iron_knight', 2, 1500, 25, 45, 15, 400, 200), isBoss: true },

  m('wolf', 3, 150, 16, 8, 4, 22, 15),
  { ...m('boss_wolf_king', 3, 2200, 30, 35, 12, 550, 280), isBoss: true },

  m('ghost', 4, 100, 18, 4, 20, 25, 18, { isMagic: true }),
  { ...m('boss_lich', 4, 3000, 35, 30, 50, 700, 350), isBoss: true, isMagic: true },

  m('mage_slime', 5, 180, 20, 8, 25, 30, 20, { isMagic: true }),
  { ...m('boss_arcane', 5, 4000, 40, 55, 30, 900, 450), isBoss: true, isMagic: true },

  m('fish', 6, 200, 18, 12, 15, 35, 22),
  m('slime_blue', 6, 140, 14, 10, 18, 28, 18, { isMagic: true }),
  { ...m('boss_kraken', 6, 5000, 45, 40, 45, 1100, 550), isBoss: true },

  m('treant', 7, 350, 22, 25, 10, 40, 28),
  m('bear', 7, 400, 28, 20, 8, 45, 30),
  { ...m('boss_treant', 7, 6500, 50, 60, 25, 1400, 700), isBoss: true },

  m('shadow', 8, 220, 30, 8, 30, 50, 35),
  { ...m('boss_shadow', 8, 8000, 55, 35, 55, 1700, 850), isBoss: true },

  m('ice_slime', 9, 280, 25, 18, 22, 55, 38),
  { ...m('boss_frost', 9, 10000, 60, 70, 35, 2000, 1000), isBoss: true },

  m('demon', 10, 600, 55, 35, 40, 120, 70),
  m('dragon', 10, 800, 60, 45, 35, 150, 85),
  m('dragon_rare', 10, 2000, 80, 50, 45, 500, 250, { isRare: true, rareChance: 0.0015, drops: ['legend_scale'] }),
  { ...m('boss_final', 10, 18000, 120, 95, 80, 20000, 10000), isBoss: true },

  m('golem', 11, 580, 48, 38, 18, 85, 52),
  { ...m('boss_brass', 11, 15000, 70, 80, 30, 2800, 1400), isBoss: true },

  m('frog', 12, 520, 42, 24, 20, 90, 55),
  { ...m('boss_river', 12, 18000, 75, 50, 45, 3200, 1600), isBoss: true },

  m('soldier', 13, 380, 35, 25, 12, 80, 50),
  m('archer_mob', 13, 250, 40, 12, 10, 75, 48),
  { ...m('boss_general', 13, 22000, 80, 70, 35, 3800, 1900), isBoss: true },

  m('star_slime', 14, 420, 38, 20, 35, 90, 55),
  { ...m('boss_stellar', 14, 28000, 85, 55, 60, 4500, 2250), isBoss: true },

  { ...m('boss_sage', 15, 35000, 90, 75, 50, 5200, 2600), isBoss: true },
  { ...m('boss_forest', 16, 45000, 95, 80, 45, 6000, 3000), isBoss: true },

  m('jade_golem', 17, 500, 45, 40, 30, 100, 60),
  { ...m('boss_jade', 17, 60000, 100, 90, 55, 7500, 3750), isBoss: true },

  m('flower_mon', 18, 300, 28, 15, 20, 60, 40),
  m('bee', 18, 180, 32, 8, 12, 55, 38),
  { ...m('boss_rose', 18, 75000, 108, 92, 58, 8800, 4800), isBoss: true },
];

/** 몬스터 속성 — 공격 시 도트·전투 다양성 */
const MONSTER_ELEMENTS: Record<string, ElementType> = {
  goblin: 'none', goblin_rare: 'poison', boss_goblin_chief: 'poison',
  skeleton: 'none', bat: 'thunder', bat_rare: 'thunder', boss_iron_knight: 'thunder',
  wolf: 'none', boss_wolf_king: 'none',
  ghost: 'poison', boss_lich: 'poison',
  mage_slime: 'thunder', boss_arcane: 'thunder',
  fish: 'water', slime_blue: 'water', boss_kraken: 'water',
  treant: 'poison', bear: 'none', boss_treant: 'poison',
  shadow: 'poison', boss_shadow: 'poison',
  ice_slime: 'water', boss_frost: 'water',
  flower_mon: 'poison', bee: 'poison', boss_rose: 'poison',
  golem: 'thunder', boss_brass: 'thunder',
  frog: 'water', boss_river: 'water',
  soldier: 'none', archer_mob: 'thunder', boss_general: 'thunder',
  star_slime: 'thunder', boss_stellar: 'thunder',
  boss_sage: 'fire', boss_forest: 'poison',
  jade_golem: 'thunder', boss_jade: 'thunder',
  demon: 'fire', dragon: 'fire', dragon_rare: 'fire', boss_final: 'fire',
  slime_green: 'poison',
};

for (const mon of MONSTERS) {
  mon.element = MONSTER_ELEMENTS[mon.id] ?? (mon.isMagic ? 'thunder' : 'none');
}

export const MONSTER_MAP = Object.fromEntries(MONSTERS.map(m => [m.id, m]));

export function getRegionMonsters(regionId: number): MonsterDef[] {
  const region = REGIONS.find(r => r.id === regionId);
  if (!region) return [];
  return region.monsterIds
    .map(id => MONSTER_MAP[id])
    .filter((m): m is MonsterDef => !!m && !m.isBoss);
}

export function getRegionBoss(regionId: number): MonsterDef | undefined {
  const region = REGIONS.find(r => r.id === regionId);
  if (!region) return undefined;
  return MONSTER_MAP[region.bossId];
}
