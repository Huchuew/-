/**
 * Pipoya 캐릭터 프레임 — 알파/검정 배경·발 위치 분석
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';

const charDir = join(import.meta.dirname, '..', 'public', 'assets', 'characters');
const CROP = { sx: 32, sy: 64, sw: 32, sh: 32 };

function isOpaqueAlpha(a) { return a > 10; }
function isOpaqueWithBlackKey(r, g, b, a) {
  if (a <= 10) return false;
  if (r < 14 && g < 14 && b < 14) return false;
  return true;
}

function analyzeFrame(png, crop) {
  const { sx, sy, sw, sh } = crop;
  let alphaMinX = sw, alphaMinY = sh, alphaMaxX = 0, alphaMaxY = 0, alphaFound = false;
  let keyMinX = sw, keyMinY = sh, keyMaxX = 0, keyMaxY = 0, keyFound = false;
  const rowCounts = new Array(sh).fill(0);

  for (let py = 0; py < sh; py++) {
    for (let px = 0; px < sw; px++) {
      const ix = sx + px;
      const iy = sy + py;
      const idx = (png.width * iy + ix) << 2;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      const a = png.data[idx + 3];

      if (isOpaqueAlpha(a)) {
        alphaFound = true;
        if (px < alphaMinX) alphaMinX = px;
        if (py < alphaMinY) alphaMinY = py;
        if (px > alphaMaxX) alphaMaxX = px;
        if (py > alphaMaxY) alphaMaxY = py;
      }
      if (isOpaqueWithBlackKey(r, g, b, a)) {
        keyFound = true;
        rowCounts[py]++;
        if (px < keyMinX) keyMinX = px;
        if (py < keyMinY) keyMinY = py;
        if (px > keyMaxX) keyMaxX = px;
        if (py > keyMaxY) keyMaxY = py;
      }
    }
  }

  let footRow = -1;
  for (let py = sh - 1; py >= 0; py--) {
    if (rowCounts[py] >= 3) { footRow = py; break; }
  }

  const threshold = Math.max(4, Math.floor(sw * 0.1));
  let footWide = -1;
  for (let py = sh - 1; py >= 0; py--) {
    if (rowCounts[py] >= threshold) { footWide = py; break; }
  }
  const trimH = footWide >= 0 && keyFound ? footWide - keyMinY + 1 : null;

  return {
    alphaBBox: alphaFound ? { minX: alphaMinX, minY: alphaMinY, maxX: alphaMaxX, maxY: alphaMaxY } : null,
    keyBBox: keyFound ? { minX: keyMinX, minY: keyMinY, maxX: keyMaxX, maxY: keyMaxY } : null,
    footRow,
    footWide,
    trimH,
    feetPadBottom: keyFound && footWide >= 0 ? keyMaxY - footWide : null,
  };
}

const files = readdirSync(charDir).filter(f => f.endsWith('.png'));
const stats = [];

for (const f of files) {
  const buf = readFileSync(join(charDir, f));
  const png = PNG.sync.read(buf);
  const r = analyzeFrame(png, CROP);
  stats.push({ file: f.replace('.png', ''), ...r });
}

console.log('=== Pipoya char frame (sx=32,sy=64,32x32) feet analysis ===\n');
for (const s of stats) {
  const a = s.alphaBBox;
  const k = s.keyBBox;
  console.log(s.file);
  console.log('  alpha trim:', a ? `y=${a.minY}..${a.maxY} (h=${a.maxY - a.minY + 1}), bottom gap=${CROP.sh - 1 - a.maxY}px` : 'none');
  console.log('  foot-aware trim:', k ? `h=${s.trimH} (was ${k.maxY - k.minY + 1}), footWide=${s.footWide}, feetPadBottom=${s.feetPadBottom}px` : 'none');
}

const gaps = stats.map(s => s.footGapFromFrameBottom).filter(g => g != null);
const shadows = stats.map(s => s.footGapFromKeyBBoxBottom).filter(g => g != null);
console.log('\n=== Summary ===');
console.log(`footGapFromFrameBottom: min=${Math.min(...gaps)} max=${Math.max(...gaps)} avg=${(gaps.reduce((a,b)=>a+b,0)/gaps.length).toFixed(1)}`);
console.log(`shadowBelowFeet (bbox bottom - foot row): min=${Math.min(...shadows)} max=${Math.max(...shadows)} avg=${(shadows.reduce((a,b)=>a+b,0)/shadows.length).toFixed(1)}`);
