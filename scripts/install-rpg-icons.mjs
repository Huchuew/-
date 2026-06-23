/**
 * RPG Maker 스타일 컷 아이콘 → public/assets/rpg-icons/tight/
 * 기본 소스: Downloads/cut_icons_clean/cut_icons_clean/tight
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DEFAULT_SRC = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? '',
  'Downloads',
  'cut_icons_clean',
  'cut_icons_clean',
  'tight',
);

const src = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SRC;
const dest = path.join(root, 'public', 'assets', 'rpg-icons', 'tight');

if (!fs.existsSync(src)) {
  console.error('[install-rpg-icons] source not found:', src);
  process.exit(1);
}

const CATS = ['weapons1', 'weapons2', 'iconset', 'states'];

function copyDir(cat) {
  const from = path.join(src, cat);
  const to = path.join(dest, cat);
  if (!fs.existsSync(from)) return 0;
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(from)) {
    if (!f.endsWith('.png')) continue;
    fs.copyFileSync(path.join(from, f), path.join(to, f));
    n++;
  }
  return n;
}

fs.mkdirSync(dest, { recursive: true });
let total = 0;
for (const cat of CATS) {
  const n = copyDir(cat);
  console.log(`[install-rpg-icons] ${cat}: ${n} files`);
  total += n;
}
console.log(`[install-rpg-icons] ${total} icons → ${dest}`);
