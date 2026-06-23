/**
 * rpg_backgrounds_stage_sliced_exact.zip → public/assets/backgrounds/
 * 이미지를 자르거나 합치지 않고 그대로 복사한다.
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const outDir = join(root, 'public/assets/backgrounds');

const STAGE_FILES = [
  '01_grassland_castle.png',
  '02_forest.png',
  '03_autumn_ruins.png',
  '04_snow_mountains.png',
  '05_desert_arch.png',
  '06_crystal_cave.png',
  '07_volcano.png',
  '08_beach_shipwreck.png',
  '09_ancient_ruins.png',
  '10_graveyard.png',
  '11_windmill_village.png',
  '12_enchanted_forest.png',
  '13_overgrown_ruins.png',
  '14_castle_hall.png',
  '15_village_night.png',
  '16_seaside_port.png',
  '17_bone_desert.png',
  '18_swamp.png',
  '19_ice_cave.png',
  '20_floating_islands.png',
];

const ZIP_CANDIDATES = [
  join(root, 'tools/incoming/rpg_backgrounds_stage_sliced_exact.zip'),
  'C:/Users/User/Downloads/rpg_backgrounds_stage_sliced_exact.zip',
];

function findZip() {
  return ZIP_CANDIDATES.find(p => existsSync(p));
}

function extractZip(zipPath) {
  const tmp = join(root, 'tools/incoming/_bg_extract');
  mkdirSync(tmp, { recursive: true });
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force"`,
    { stdio: 'inherit' },
  );
  return tmp;
}

function findFile(dir, name) {
  if (existsSync(join(dir, name))) return join(dir, name);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const hit = findFile(join(dir, entry.name), name);
      if (hit) return hit;
    }
  }
  return null;
}

mkdirSync(outDir, { recursive: true });

const zip = findZip();
if (!zip) {
  console.error('ZIP not found. Place rpg_backgrounds_stage_sliced_exact.zip in tools/incoming/ or Downloads/');
  process.exit(1);
}

console.log('Extracting', zip);
const extracted = extractZip(zip);

let copied = 0;
for (const file of STAGE_FILES) {
  const src = findFile(extracted, file);
  if (!src) {
    console.warn('missing:', file);
    continue;
  }
  const dest = join(outDir, file);
  copyFileSync(src, dest);
  console.log('→', dest.replace(root, ''));
  copied++;
}

console.log(`\nInstalled ${copied}/${STAGE_FILES.length} stage backgrounds (no crop/slice).`);
