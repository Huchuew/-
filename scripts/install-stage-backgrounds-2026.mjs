/**
 * 01F~18F 층 배경 설치 — regions.ts 지역명과 1:1 매칭
 * 실행: npm run install:backgrounds:2026
 */
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const assetsDir = join(
  process.env.USERPROFILE ?? '',
  '.cursor/projects/c-Users-User-Desktop/assets',
);
const outDir = join(root, 'public/assets/backgrounds');

/** 좌우 이음새 블렌드 — 너비의 ~12% */
const SEAM_BLEND_RATIO = 0.12;

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** 수평 타일 반복용 좌측 가장자리를 우측과 블렌드 */
function makeHorizontallySeamless(buffer, width, height, channels) {
  const blendW = Math.min(Math.max(16, Math.floor(width * SEAM_BLEND_RATIO)), Math.floor(width / 4));
  if (blendW < 4) return buffer;

  const out = Buffer.from(buffer);
  for (let y = 0; y < height; y++) {
    const row = y * width * channels;
    for (let x = 0; x < blendW; x++) {
      const t = smoothstep(x / (blendW - 1 || 1));
      const li = row + x * channels;
      const ri = row + (width - blendW + x) * channels;
      for (let c = 0; c < 3; c++) {
        out[li + c] = Math.round(buffer[li + c] * (1 - t) + buffer[ri + c] * t);
      }
    }
  }
  return out;
}

/** 1~18층 — 파일명은 기존 에셋 경로 유지, src는 01F~18F 이미지 */
const STAGES = [
  { file: '01_grassland_castle.png', floor: 1, name: '가락동 스타디움', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_01F-e760e3fa-821c-4326-ae7d-7f66e92cdc29.png' },
  { file: '02_forest.png', floor: 2, name: '왕십리', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_02F-1c7b08fc-60e8-4e3a-b70b-6cfa4cf29499.png' },
  { file: '03_autumn_ruins.png', floor: 3, name: '건대 화양', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_03F-638a43d5-ed96-40ec-9735-af8868e81562.png' },
  { file: '04_snow_mountains.png', floor: 4, name: '성신여대', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_04F-82452cf3-93eb-46ea-94e3-f331ab355b83.png' },
  { file: '05_desert_arch.png', floor: 5, name: '회기', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_05F-3f2fed64-865b-4bf0-abb0-53c0f9fee5cd.png' },
  { file: '06_crystal_cave.png', floor: 6, name: '잠실', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_06F-7e28ca78-d6bd-4013-bc08-c5d4c8b8b58a.png' },
  { file: '07_volcano.png', floor: 7, name: '강동', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_07F-91bcaf3b-4a46-45a2-a162-f69c40a0f257.png' },
  { file: '08_beach_shipwreck.png', floor: 8, name: '수유', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_08F-7edf3f26-7f0b-4619-aefd-a5832bae6dab.png' },
  { file: '09_ancient_ruins.png', floor: 9, name: '노원', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_09F-903a9cb4-e7c6-4a02-a8db-566cacc9afc5.png' },
  { file: '10_graveyard.png', floor: 10, name: '경기광주', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_10F-b2c5025f-aaae-4e3c-9b00-6ec6854145d3.png' },
  { file: '11_windmill_village.png', floor: 11, name: '구리', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_11F-7d5863c1-d49a-418f-bd3b-ae1d7763783e.png' },
  { file: '12_enchanted_forest.png', floor: 12, name: '하남', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_12F-22d12634-482a-4920-9999-15f03e1c905d.png' },
  { file: '13_overgrown_ruins.png', floor: 13, name: '의정부', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_13F-bd47b231-b536-4742-8355-d19e76fc1876.png' },
  { file: '14_castle_hall.png', floor: 14, name: '별내', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_14F-cba6d0f6-941d-47cf-88b2-771741b46b8f.png' },
  { file: '15_village_night.png', floor: 15, name: '평내호평', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_15F-ed2dd86b-1468-4e95-aeb8-5f3b2c0c6d4d.png' },
  { file: '16_seaside_port.png', floor: 16, name: '진접', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_16F-02f6405f-d579-42bc-b035-3a1bab82150b.png' },
  { file: '17_bone_desert.png', floor: 17, name: '옥정', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_17F-f5a178ad-bce9-4650-8713-e9ee9383e364.png' },
  { file: '18_swamp.png', floor: 18, name: '모란', src: 'c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_6b29ce5f7db2194d72fcf59fb0a7d47f_images_18F-a237d4eb-c830-4b4f-a88d-917a653935d8.png' },
];

mkdirSync(outDir, { recursive: true });

let ok = 0;
for (const stage of STAGES) {
  const srcPath = join(assetsDir, stage.src);
  if (!existsSync(srcPath)) {
    console.warn('[skip] missing:', stage.src);
    continue;
  }
  const dest = join(outDir, stage.file);
  const targetW = 1536;
  const targetH = 512;

  const { data, info } = await sharp(srcPath)
    .resize(targetW, targetH, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const seamless = makeHorizontallySeamless(
    data, info.width, info.height, info.channels,
  );

  await sharp(seamless, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png({ compressionLevel: 8 })
    .toFile(dest);

  console.log(`→ ${stage.floor}F ${stage.name} → ${stage.file} (${info.width}x${info.height})`);
  ok++;
}

console.log(`\nInstalled ${ok}/${STAGES.length} floor backgrounds.`);
