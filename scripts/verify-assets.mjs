#!/usr/bin/env node
/**
 * 빌드 전 public/assets 필수 파일 존재 여부 검증.
 * APK에 에셋이 빠지는 문제를 조기에 잡기 위함.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

const STAGE_BACKGROUNDS = [
  'assets/backgrounds/01_grassland_castle.png',
  'assets/backgrounds/02_forest.png',
  'assets/backgrounds/03_autumn_ruins.png',
  'assets/backgrounds/04_snow_mountains.png',
  'assets/backgrounds/05_desert_arch.png',
  'assets/backgrounds/06_crystal_cave.png',
  'assets/backgrounds/07_volcano.png',
  'assets/backgrounds/08_beach_shipwreck.png',
  'assets/backgrounds/09_ancient_ruins.png',
  'assets/backgrounds/10_graveyard.png',
  'assets/backgrounds/11_windmill_village.png',
  'assets/backgrounds/12_enchanted_forest.png',
  'assets/backgrounds/13_overgrown_ruins.png',
  'assets/backgrounds/14_castle_hall.png',
  'assets/backgrounds/15_village_night.png',
  'assets/backgrounds/16_seaside_port.png',
  'assets/backgrounds/17_bone_desert.png',
  'assets/backgrounds/18_swamp.png',
  'assets/backgrounds/19_ice_cave.png',
  'assets/backgrounds/20_floating_islands.png',
  'assets/backgrounds/rival_colosseum.png',
];

const LODGING_UI = [
  'assets/lodging/bg_camp.png',
  'assets/lodging/ryua_sheet.png',
];

const CORE_UI = [
  'assets/icons/icon-192.webp',
  'assets/icons/icon-512.webp',
];

function norm(rel) {
  return rel.replace(/^\//, '').replace(/\\/g, '/');
}

function exists(rel) {
  const p = path.join(publicDir, norm(rel));
  return fs.existsSync(p) && fs.statSync(p).isFile();
}

function walkManifestClips(obj, out) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj.files)) {
    for (const f of obj.files) out.add(`assets/tiny-rpg/${norm(f)}`);
    return;
  }
  for (const v of Object.values(obj)) walkManifestClips(v, out);
}

function collectTinyRpgPaths() {
  const manifestPath = path.join(publicDir, 'assets/tiny-rpg/manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { paths: new Set(), error: 'manifest.json 없음' };
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const paths = new Set();
  walkManifestClips(manifest.assets, paths);
  return { paths, error: null };
}

function main() {
  const missing = [];
  const optionalMissing = [];
  const checked = new Set();

  const addCheck = (rel, optional = false) => {
    const key = norm(rel);
    if (checked.has(key)) return;
    checked.add(key);
    if (!exists(key)) {
      (optional ? optionalMissing : missing).push(key);
    }
  };

  const { paths: tinyPaths, error: manifestErr } = collectTinyRpgPaths();
  if (manifestErr) missing.push(manifestErr);
  for (const p of tinyPaths) addCheck(p);

  for (const p of STAGE_BACKGROUNDS) addCheck(p);
  for (const p of LODGING_UI) addCheck(p);
  for (const p of CORE_UI) addCheck(p, true);

  const total = checked.size;
  console.log(`[verify:assets] 검사 대상 ${total}개 (tiny-rpg ${tinyPaths.size}개)`);

  if (optionalMissing.length) {
    console.warn(`[verify:assets] 선택 항목 누락 ${optionalMissing.length}개 (빌드는 계속 가능):`);
    for (const m of optionalMissing) console.warn(`  - ${m}`);
  }

  if (missing.length) {
    console.error(`[verify:assets] 필수 에셋 누락 ${missing.length}개:`);
    for (const m of missing.slice(0, 40)) console.error(`  ✗ ${m}`);
    if (missing.length > 40) console.error(`  … 외 ${missing.length - 40}개`);
    console.error('\n누락 시 APK에서 캐릭터/배경이 비어 보일 수 있습니다.');
    console.error('복구: npm run install:tiny-rpg / install:backgrounds 등 설치 스크립트 실행');
    process.exit(1);
  }

  console.log('[verify:assets] OK — 필수 에셋 모두 존재');
}

main();
