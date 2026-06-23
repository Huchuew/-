import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const src = join(root, 'public/assets/ui/ui_atlas_source.png');
const out = join(root, 'public/assets/ui');
mkdirSync(out, { recursive: true });

/** 1024×944 UI 레퍼런스 시트 — 그리드 기준 크롭 */
const SLICES = {
  logo_poker_rush: { x: 8, y: 18, w: 328, h: 175 },
  btn_start: { x: 348, y: 42, w: 326, h: 118 },
  btn_setting: { x: 692, y: 22, w: 148, h: 72 },
  btn_mail: { x: 852, y: 22, w: 148, h: 72 },
  ui_gold_bar: { x: 8, y: 208, w: 328, h: 48 },
  ui_gem_bar: { x: 348, y: 208, w: 326, h: 48 },
  icon_gold: { x: 692, y: 212, w: 96, h: 82 },
  icon_gem: { x: 796, y: 212, w: 96, h: 82 },
  icon_energy: { x: 900, y: 212, w: 96, h: 82 },
  background_title: { x: 8, y: 318, w: 328, h: 318 },
  background_lobby: { x: 348, y: 318, w: 326, h: 318 },
  background_battle: { x: 688, y: 318, w: 328, h: 318 },
  btn_shop: { x: 18, y: 652, w: 58, h: 72 },
  btn_upgrade: { x: 82, y: 652, w: 58, h: 72 },
  btn_hero: { x: 146, y: 652, w: 58, h: 72 },
  btn_bag: { x: 210, y: 652, w: 58, h: 72 },
  btn_quest: { x: 274, y: 652, w: 58, h: 72 },
  panel_frame: { x: 388, y: 648, w: 210, h: 248 },
  panel_popup: { x: 688, y: 648, w: 328, h: 278 },
};

const img = sharp(src);
for (const [name, r] of Object.entries(SLICES)) {
  await img.clone().extract({ left: r.x, top: r.y, width: r.w, height: r.h }).png().toFile(join(out, `${name}.png`));
  console.log('ok', name);
}
