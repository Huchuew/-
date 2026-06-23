#!/usr/bin/env node
/**
 * RMMZ 기본 BGM → public/assets/audio/bgm/
 * 기본 경로: %USERPROFILE%\Documents\RMMZ\펍\audio\bgm
 * 환경변수 RMMZ_BGM_DIR 로 덮어쓰기 가능
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'assets', 'audio', 'bgm');

const defaultSrc = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? '',
  'Documents', 'RMMZ', '펍', 'audio', 'bgm',
);
const srcDir = process.env.RMMZ_BGM_DIR ?? defaultSrc;

const FILES = [
  'Battle1.ogg', 'Battle2.ogg', 'Battle3.ogg', 'Battle4.ogg', 'Battle5.ogg',
  'Battle6.ogg', 'Battle7.ogg', 'Battle8.ogg',
  'Castle1.ogg', 'Castle2.ogg', 'Castle3.ogg',
  'Dungeon1.ogg', 'Dungeon2.ogg', 'Dungeon3.ogg', 'Dungeon4.ogg', 'Dungeon5.ogg',
  'Dungeon6.ogg', 'Dungeon7.ogg',
  'Field1.ogg', 'Field2.ogg', 'Field3.ogg', 'Field4.ogg',
  'Scene1.ogg', 'Scene2.ogg', 'Scene3.ogg', 'Scene4.ogg', 'Scene5.ogg',
  'Scene6.ogg', 'Scene7.ogg', 'Scene8.ogg', 'Scene9.ogg',
  'Ship1.ogg', 'Ship2.ogg', 'Ship3.ogg',
  'Theme1.ogg', 'Theme2.ogg', 'Theme3.ogg', 'Theme4.ogg', 'Theme5.ogg', 'Theme6.ogg',
  'Town1.ogg', 'Town2.ogg', 'Town3.ogg', 'Town4.ogg', 'Town5.ogg', 'Town6.ogg',
  'Town7.ogg', 'Town8.ogg',
];

if (!existsSync(srcDir)) {
  console.error(`BGM 소스 폴더 없음: ${srcDir}`);
  console.error('RMMZ_BGM_DIR 환경변수로 경로 지정하세요.');
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
console.log(`RMMZ BGM 설치 완료: ${ok}개 복사, ${miss}개 누락 → ${outDir}`);
