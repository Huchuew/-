#!/usr/bin/env node
/**
 * RMMZ 기본 SE → public/assets/audio/se/
 * 기본 경로: %USERPROFILE%\Documents\RMMZ\펍\audio\se
 * 환경변수 RMMZ_SE_DIR 로 덮어쓰기 가능
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'assets', 'audio', 'se');

const defaultSrc = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? '',
  'Documents', 'RMMZ', '펍', 'audio', 'se',
);
const srcDir = process.env.RMMZ_SE_DIR ?? defaultSrc;

const FILES = [
  'Absorb1.ogg', 'Attack1.ogg', 'Attack2.ogg', 'Attack3.ogg', 'Battle1.ogg', 'Battle2.ogg',
  'Bite.ogg', 'Blow1.ogg', 'Blow2.ogg', 'Blow3.ogg', 'Blow4.ogg', 'Blow5.ogg', 'Blow6.ogg', 'Blow7.ogg',
  'Bow1.ogg', 'Bow2.ogg', 'Bow3.ogg', 'Coin.ogg', 'Collapse1.ogg', 'Damage1.ogg', 'Damage2.ogg', 'Damage3.ogg',
  'Darkness1.ogg', 'Explosion1.ogg', 'Fire1.ogg', 'Fire2.ogg', 'Fire3.ogg', 'Fire4.ogg', 'Fire5.ogg', 'Fire6.ogg',
  'Flash1.ogg', 'Growl.ogg', 'Ice1.ogg', 'Ice2.ogg', 'Ice3.ogg', 'Ice4.ogg', 'Ice5.ogg',
  'Magic1.ogg', 'Magic2.ogg', 'Magic3.ogg', 'Magic4.ogg', 'Magic5.ogg', 'Magic6.ogg',
  'Magic7.ogg', 'Magic8.ogg', 'Magic9.ogg', 'Magic10.ogg', 'Magic11.ogg', 'Magic12.ogg',
  'Miss.ogg', 'Monster1.ogg', 'Monster2.ogg', 'Monster3.ogg', 'Monster4.ogg', 'Monster5.ogg',
  'Monster6.ogg', 'Monster7.ogg', 'Monster8.ogg', 'Monster9.ogg', 'Monster10.ogg',
  'Poison.ogg', 'Saint1.ogg', 'Saint2.ogg', 'Saint3.ogg', 'Shot1.ogg', 'Shot2.ogg', 'Shot3.ogg',
  'Skill1.ogg', 'Skill2.ogg', 'Skill3.ogg', 'Slash1.ogg', 'Slash2.ogg', 'Slash3.ogg', 'Slash4.ogg',
  'Slash5.ogg', 'Slash6.ogg', 'Slash7.ogg', 'Slash8.ogg', 'Splash.ogg',
  'Sword1.ogg', 'Sword2.ogg', 'Sword3.ogg', 'Sword4.ogg', 'Sword5.ogg', 'Sword6.ogg',
  'Thunder1.ogg', 'Thunder2.ogg', 'Thunder3.ogg', 'Thunder4.ogg', 'Thunder5.ogg',
  'Water1.ogg', 'Water2.ogg', 'Water3.ogg', 'Wind1.ogg', 'Wind2.ogg', 'Wind3.ogg',
];

if (!existsSync(srcDir)) {
  console.error(`SE 소스 폴더 없음: ${srcDir}`);
  console.error('RMMZ_SE_DIR 환경변수로 경로 지정하세요.');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
let ok = 0;
let miss = 0;
for (const f of FILES) {
  const from = path.join(srcDir, f);
  const to = path.join(outDir, f);
  if (!existsSync(from)) {
    console.warn(`  skip (없음): ${f}`);
    miss++;
    continue;
  }
  await copyFile(from, to);
  ok++;
}
console.log(`RMMZ SE 설치 완료: ${ok}개 복사, ${miss}개 누락 → ${outDir}`);
