/**
 * 6×3 픽셀 던전 배경 아틀라스 → 지역별 dungeon_01~18.png 슬라이스
 */
import sharp from 'sharp';
import { copyFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const outDir = join(root, 'public/assets/dungeon');

const SRC_CANDIDATES = [
  join(root, 'public/assets/dungeon/atlas_source.png'),
  join(root, 'tools/incoming/dungeon_bg_atlas.png'),
  'C:/Users/User/.cursor/projects/c-Users-User-Desktop/assets/c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_image-d1c82c63-605e-446e-8fd3-5994985a3f2c.png',
];

mkdirSync(outDir, { recursive: true });

import { existsSync } from 'fs';
const srcCandidate = SRC_CANDIDATES.find(p => existsSync(p));
if (!srcCandidate) {
  console.error('atlas not found — place image in public/assets/dungeon/atlas_source.png');
  process.exit(1);
}
const src = join(outDir, 'atlas_source.png');
if (srcCandidate !== src) copyFileSync(srcCandidate, src);

const COLS = 3;
const ROWS = 6;
const meta = await sharp(src).metadata();
const W = meta.width;
const H = meta.height;

console.log(`Atlas ${W}×${H} → ${COLS}×${ROWS} grid`);

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const regionId = row * COLS + col + 1;
    const left = Math.round((col * W) / COLS);
    const top = Math.round((row * H) / ROWS);
    const right = Math.round(((col + 1) * W) / COLS);
    const bottom = Math.round(((row + 1) * H) / ROWS);
    const width = right - left;
    const height = bottom - top;

    const outPath = join(outDir, `dungeon_${String(regionId).padStart(2, '0')}.png`);
    await sharp(src)
      .extract({ left, top, width, height })
      .png()
      .toFile(outPath);
    console.log(`dungeon_${String(regionId).padStart(2, '0')}.png  ${width}×${height}`);
  }
}

console.log('Done — 18 region backgrounds.');
