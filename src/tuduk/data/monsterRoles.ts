/** 몬스터 에셋 역할 분류 (도감·UI 표시용) */
export type MonsterRole =
  | 'orc' | 'armored_orc' | 'elite_orc' | 'fast' | 'werebear'
  | 'orc_rider' | 'skeleton' | 'armored_skeleton' | 'skeleton_archer' | 'filth';

export const MONSTER_ROLE_LABEL: Record<MonsterRole, string> = {
  orc: '오크',
  armored_orc: '갑옷 오크',
  elite_orc: '엘리트 오크',
  fast: '고속형',
  werebear: '곰인간',
  orc_rider: '오크 기수',
  skeleton: '해골',
  armored_skeleton: '갑옷 해골',
  skeleton_archer: '해골 궁수',
  filth: '더러운 것',
};

export const MONSTER_ROLE_BY_ID: Record<string, MonsterRole> = {
  goblin: 'orc',
  goblin_rare: 'elite_orc',
  boss_goblin_chief: 'elite_orc',
  soldier: 'armored_orc',
  boss_general: 'armored_orc',
  demon: 'elite_orc',
  dragon: 'armored_orc',
  dragon_rare: 'armored_orc',
  boss_brass: 'armored_orc',
  boss_final: 'elite_orc',
  bat: 'fast',
  bat_rare: 'skeleton_archer',
  wolf: 'fast',
  bee: 'fast',
  orc_rider: 'orc_rider',
  skeleton: 'skeleton',
  ghost: 'skeleton',
  shadow: 'skeleton',
  boss_shadow: 'skeleton',
  boss_stellar: 'skeleton',
  golem: 'armored_skeleton',
  jade_golem: 'armored_skeleton',
  boss_iron_knight: 'armored_skeleton',
  boss_frost: 'armored_skeleton',
  boss_jade: 'armored_skeleton',
  archer_mob: 'skeleton_archer',
  bear: 'werebear',
  treant: 'werebear',
  boss_treant: 'werebear',
  boss_wolf_king: 'fast',
  slime_green: 'filth',
  slime_blue: 'filth',
  ice_slime: 'filth',
  star_slime: 'filth',
  flower_mon: 'filth',
  fish: 'filth',
  frog: 'filth',
  mage_slime: 'filth',
  boss_kraken: 'filth',
  boss_rose: 'filth',
  boss_river: 'filth',
};

export function getMonsterRoleLabel(monsterId: string): string {
  const role = MONSTER_ROLE_BY_ID[monsterId];
  return role ? MONSTER_ROLE_LABEL[role] : '몬스터';
}
