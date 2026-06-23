/**
 * soldier_sliced_assets.zip → 무쟁 프레임 (fixed_100x100, 100×100)
 * npm run install:soldier
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'assets', 'characters', 'mujang');
const tmpDir = join(root, 'tools', '.tmp-soldier-extract');

const ZIP_CANDIDATES = [
  join(process.env.USERPROFILE ?? '', 'Downloads', 'soldier_sliced_assets.zip'),
  join(root, 'tools', 'incoming', 'soldier_sliced_assets.zip'),
];

function findZip() {
  return ZIP_CANDIDATES.find(p => existsSync(p)) ?? null;
}

function extractZip(zipPath) {
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  const cmd = `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force"`;
  execSync(cmd, { stdio: 'inherit' });
}

function sortWarriorFiles(files) {
  return files
    .filter(f => f.toLowerCase().endsWith('.png'))
    .sort((a, b) => {
      const na = Number(a.match(/warrior_(\d+)/i)?.[1] ?? 0);
      const nb = Number(b.match(/warrior_(\d+)/i)?.[1] ?? 0);
      return na - nb;
    });
}

const zip = findZip();
if (!zip) {
  console.error('ZIP 없음:', ZIP_CANDIDATES.join(' 또는 '));
  process.exit(1);
}

extractZip(zip);

const srcDir = join(tmpDir, 'fixed_100x100');
if (!existsSync(srcDir)) {
  console.error('fixed_100x100 폴더 없음');
  process.exit(1);
}

const files = sortWarriorFiles(readdirSync(srcDir));
mkdirSync(outDir, { recursive: true });

for (const [i, file] of files.entries()) {
  const outName = `frame_${String(i + 1).padStart(2, '0')}.png`;
  copyFileSync(join(srcDir, file), join(outDir, outName));
  console.log(`✓ ${outName} ← ${file}`);
}

rmSync(tmpDir, { recursive: true, force: true });
console.log(`\n완료: ${files.length}프레임 → ${outDir}`);
