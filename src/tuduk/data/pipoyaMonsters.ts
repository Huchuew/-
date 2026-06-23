/**
 * 배틀러 스프라이트 ↔ 게임 몬스터 ID
 * install-uploaded-monsters.mjs 와 monsters.ts 이름이 이 표를 따릅니다.
 */
export type PipoyaCropKind = 'enemy' | 'boss' | 'large';

export interface PipoyaMonsterBinding {
  file: string;
  name: string;
  crop: PipoyaCropKind;
}

export const PIPOYA_MONSTER_BINDINGS: Record<string, PipoyaMonsterBinding> = {
  goblin:          { file: 'Goblin.png',              name: '고블린',         crop: 'enemy' },
  slime_green:     { file: 'Petitdevil.png',          name: '꼬마 악마',      crop: 'enemy' },
  goblin_rare:     { file: 'Foxman.png',              name: '여우인간',       crop: 'enemy' },
  boss_goblin_chief: { file: 'Berserker.png',         name: '광전사',         crop: 'boss' },

  skeleton:        { file: 'Zombie.png',              name: '좀비',           crop: 'enemy' },
  bat:             { file: 'Crow.png',                name: '까마귀',         crop: 'enemy' },
  bat_rare:        { file: 'Harpy.png',               name: '하피',           crop: 'enemy' },
  boss_iron_knight:{ file: 'Blackknight.png',         name: '흑기사',         crop: 'boss' },

  wolf:            { file: 'SF_Wolf.png',             name: '늑대',           crop: 'enemy' },
  boss_wolf_king:  { file: 'Hakutaku.png',            name: '백택',           crop: 'boss' },

  ghost:           { file: 'Wraith.png',              name: '망령',           crop: 'enemy' },
  boss_lich:       { file: 'Lich.png',                name: '리치',           crop: 'boss' },

  mage_slime:      { file: 'Salamander.png',          name: '살라맨더',       crop: 'enemy' },
  boss_arcane:     { file: 'Evilbook.png',            name: '마도서',         crop: 'boss' },

  fish:            { file: 'Crab.png',                name: '거대 게',        crop: 'enemy' },
  slime_blue:      { file: 'Undine.png',              name: '운디네',         crop: 'enemy' },
  boss_kraken:     { file: 'Kraken.png',              name: '크라켄',         crop: 'boss' },

  treant:          { file: 'Treant.png',              name: '트렌트',         crop: 'enemy' },
  bear:            { file: 'SF_Brownbear.png',        name: '흑곰',           crop: 'enemy' },
  boss_treant:     { file: 'Hi_monster.png',          name: '고대 수목',      crop: 'large' },

  shadow:          { file: 'SF_Shadow.png',           name: '그림자',         crop: 'enemy' },
  boss_shadow:     { file: 'Goddess_of_death.png',    name: '죽음의 여신',    crop: 'boss' },

  ice_slime:       { file: 'Plasma.png',              name: '플라즈마',       crop: 'enemy' },
  boss_frost:      { file: 'SF_Whitewolf.png',        name: '백랑',           crop: 'boss' },

  flower_mon:      { file: 'Matango.png',             name: '마탱고',         crop: 'enemy' },
  bee:             { file: 'Machinerybee.png',        name: '기계벌',         crop: 'enemy' },
  boss_rose:       { file: 'Witch.png',               name: '마녀',           crop: 'boss' },

  golem:           { file: 'Stoneknight.png',         name: '석기사',         crop: 'enemy' },
  boss_brass:      { file: 'Mechascorpion.png',       name: '메카 전갈',      crop: 'boss' },

  frog:            { file: 'Frilledlizard.png',       name: '도마뱀',         crop: 'enemy' },
  boss_river:      { file: 'Siren.png',               name: '세이렌',         crop: 'boss' },

  soldier:         { file: 'Mercenary.png',           name: '용병',           crop: 'enemy' },
  archer_mob:      { file: 'Darkelf.png',             name: '다크엘프',       crop: 'enemy' },
  boss_general:    { file: 'Captain.png',             name: '함장',           crop: 'boss' },

  star_slime:      { file: 'Oddegg.png',              name: '기괴한 알',      crop: 'enemy' },
  boss_stellar:    { file: 'God_of_light.png',        name: '빛의 신',        crop: 'boss' },

  boss_sage:       { file: 'Sorcerer.png',            name: '대마법사',       crop: 'large' },
  boss_forest:     { file: 'Sylph.png',               name: '실프',           crop: 'large' },

  jade_golem:      { file: 'Mimic.png',               name: '미믹',           crop: 'enemy' },
  boss_jade:       { file: 'Ketos.png',               name: '케토스',         crop: 'large' },

  demon:           { file: 'Demon.png',               name: '악마',           crop: 'enemy' },
  dragon:          { file: 'Dragon.png',              name: '드래곤',         crop: 'enemy' },
  dragon_rare:     { file: 'Demon_metamorphosis.png', name: '각성 악마',      crop: 'large' },
  boss_final:      { file: 'SF_Demon_of_universe.png', name: '우주의 마신',   crop: 'boss' },
};
