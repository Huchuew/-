/**
 * 채팅 업로드 RPG Maker 배틀러 PNG → public/assets/monsters/{gameId}.png
 * npm run install:monsters
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'assets', 'monsters');

const CURSOR_ASSETS = join(
  process.env.USERPROFILE ?? '',
  '.cursor', 'projects', 'c-Users-User-Desktop', 'assets',
);

/** 게임 몬스터 id → 업로드 파일 베이스명 (images_<Name>-<uuid>.png) */
const MONSTER_SOURCES = {
  goblin: 'Goblin',
  slime_green: 'Petitdevil',
  goblin_rare: 'Foxman',
  boss_goblin_chief: 'Berserker',

  skeleton: 'Zombie',
  bat: 'Crow',
  bat_rare: 'Harpy',
  boss_iron_knight: 'Blackknight',

  wolf: 'SF_Wolf',
  boss_wolf_king: 'Hakutaku',

  ghost: 'Wraith',
  boss_lich: 'Lich',

  mage_slime: 'Salamander',
  boss_arcane: 'Evilbook',

  fish: 'Crab',
  slime_blue: 'Undine',
  boss_kraken: 'Kraken',

  treant: 'Treant',
  bear: 'SF_Brownbear',
  boss_treant: 'Hi_monster',

  shadow: 'SF_Shadow',
  boss_shadow: 'Goddess_of_death',

  ice_slime: 'Plasma',
  boss_frost: 'SF_Whitewolf',

  flower_mon: 'Matango',
  bee: 'Machinerybee',
  boss_rose: 'Witch',

  golem: 'Stoneknight',
  boss_brass: 'Mechascorpion',

  frog: 'Frilledlizard',
  boss_river: 'Siren',

  soldier: 'Mercenary',
  archer_mob: 'Darkelf',
  boss_general: 'Captain',

  star_slime: 'Oddegg',
  boss_stellar: 'God_of_light',

  boss_sage: 'Sorcerer',
  boss_forest: 'Sylph',

  jade_golem: 'Mimic',
  boss_jade: 'Ketos',

  demon: 'Demon',
  dragon: 'Dragon',
  dragon_rare: 'Demon_metamorphosis',
  boss_final: 'SF_Demon_of_universe',
};

function findUploaded(baseName) {
  const needle = `_images_${baseName}-`.toLowerCase();
  const dirs = [
    CURSOR_ASSETS,
    join(root, 'tools', 'incoming', 'monsters'),
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const hit = readdirSync(dir).find(f =>
      f.toLowerCase().includes(needle)
      || f.toLowerCase() === `${baseName.toLowerCase()}.png`,
    );
    if (hit) return join(dir, hit);
  }
  return null;
}

mkdirSync(outDir, { recursive: true });

let ok = 0;
let miss = 0;
for (const [gameId, srcName] of Object.entries(MONSTER_SOURCES)) {
  const src = findUploaded(srcName);
  if (src) {
    copyFileSync(src, join(outDir, `${gameId}.png`));
    console.log(`✓ ${gameId} ← ${srcName}`);
    ok++;
  } else {
    console.log(`✗ ${gameId} (${srcName} 없음)`);
    miss++;
  }
}
console.log(`\n완료: ${ok}개 복사, ${miss}개 누락`);
