/**
 * Tiny RPG 에셋 → public/assets/tiny-rpg/
 * 우선순위: 4x HD ZIP → 기존 ZIP → 추출 폴더
 * npm run install:tiny-rpg
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = join(root, 'public', 'assets', 'tiny-rpg');
const tmpRoot = join(root, 'tools', '.tmp-tiny-rpg-install');

const ZIP_CANDIDATES = [
  'C:/Users/User/.cursor/tmp-tiny-rpg-4x',
  join(process.env.USERPROFILE ?? '', 'Downloads', 'cursor_ready_tiny_rpg_assets_4x_HD.zip'),
  join(root, 'tools', 'incoming', 'cursor_ready_tiny_rpg_assets_4x_HD.zip'),
  'C:/Users/User/.cursor/tmp-tiny-rpg',
  join(process.env.USERPROFILE ?? '', 'Downloads', 'cursor_ready_tiny_rpg_assets.zip'),
  join(root, 'tools', 'incoming', 'cursor_ready_tiny_rpg_assets.zip'),
];

function findZip() {
  for (const p of ZIP_CANDIDATES) {
    if (p.endsWith('.zip') && existsSync(p)) return { type: 'zip', path: p, hd: p.includes('4x') };
    if (existsSync(join(p, 'manifest.json'))) return { type: 'dir', path: p, hd: p.includes('4x') };
  }
  return null;
}

function extractZip(zipPath) {
  mkdirSync(tmpRoot, { recursive: true });
  const cmd = `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmpRoot.replace(/'/g, "''")}' -Force"`;
  execSync(cmd, { stdio: 'inherit' });
  return tmpRoot;
}

function patchManifest(extracted, isHd) {
  const manifestPath = join(extracted, 'manifest.json');
  if (!existsSync(manifestPath)) return;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (isHd) {
    manifest.frame_size = [400, 400];
    manifest.hd_scale = 4;
    manifest.note = '4x HD nearest-neighbor upscale. Each frame PNG is 400x400 transparent.';
  }
  writeFileSync(join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

const src = findZip();
if (!src) {
  console.error('ZIP/폴더 없음. 후보:', ZIP_CANDIDATES.filter(p => !p.includes('.cursor')).join(', '));
  process.exit(1);
}

console.log(`소스: ${src.path} (${src.hd ? '4x HD' : '1x'})`);
const extracted = src.type === 'zip' ? extractZip(src.path) : src.path;
mkdirSync(outRoot, { recursive: true });

for (const folder of ['characters', 'monsters', 'projectiles', 'effects']) {
  const from = join(extracted, folder);
  const to = join(outRoot, folder);
  if (existsSync(from)) {
    cpSync(from, to, { recursive: true });
    console.log(`✓ ${folder}/`);
  }
}

patchManifest(extracted, src.hd);
console.log('✓ manifest.json');
console.log(`\n완료 → ${outRoot}`);
