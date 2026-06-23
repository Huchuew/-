import type { EquippedGear } from '../../../data/types';
import { PixelCanvas } from '../PixelCanvas';
import {
  drawFace, drawEye, drawHairBlock, drawMetalArmor, drawSword, drawShield, drawSkillSlash,
} from '../drawPrimitives';
import type { AnimState, FrameCtx } from './types';
import { ANIM_FRAMES, animOffset } from './types';

const HAIR = { light: 0xffee88, mid: 0xeecc44, dark: 0xcc9922 };
const ARMOR_CLOTH = { base: 0x3a6fcc, hi: 0x6ba3ff, lo: 0x1e4080, trim: 0xe84545 };
const ARMOR_BRONZE = { base: 0xb87333, hi: 0xddb07a, lo: 0x7a4a1a, trim: 0xe84545 };
const ARMOR_GOLD = { base: 0xffd700, hi: 0xffee99, lo: 0xcc9900, trim: 0xe84545 };

function armorColors(gear: EquippedGear) {
  if (gear.armor === 'gold' || gear.armor === 'legend') return ARMOR_GOLD;
  if (gear.armor === 'bronze' || gear.armor === 'iron') return ARMOR_BRONZE;
  return ARMOR_CLOTH;
}

function weaponTier(gear: EquippedGear) {
  if (gear.weapon === 'gold' || gear.weapon === 'arcane') return 'gold';
  if (gear.weapon === 'iron' || gear.weapon === 'holy') return 'iron';
  return 'wood';
}

function drawKnightBody(ctx: FrameCtx) {
  const { canvas: c, bounce, armAngle, legPhase, gear, fx } = ctx;
  const cx = 48;
  const baseY = 78 + bounce;
  const armor = armorColors(gear);
  const wpn = weaponTier(gear);

  // 다리
  const legOff = legPhase * 5;
  c.fillRect(cx - 10 - legOff, baseY - 18, 8, 18, 0x2a3060);
  c.fillRect(cx - 9 - legOff, baseY - 16, 6, 4, 0x4a5090);
  c.fillRect(cx + 2 + legOff, baseY - 18, 8, 18, 0x2a3060);
  c.fillRect(cx + 3 + legOff, baseY - 16, 6, 4, 0x4a5090);

  // 몸통 갑옷
  drawMetalArmor(c, cx, baseY - 38, 32, 26, armor);
  c.fillRect(cx - 6, baseY - 36, 12, 8, 0xe84545); // 빨간 심장 문양

  // 팔
  const armX = cx + 14;
  const armY = baseY - 32;
  c.fillRect(armX, armY, 8, 14, armor.lo);
  c.fillRect(armX + 1, armY + 1, 6, 12, armor.base);

  // 머리 (머리카락 → 얼굴 → 눈 순)
  const headY = baseY - 58;
  drawHairBlock(c, cx, headY, HAIR, 'blonde');
  drawFace(c, cx, headY + 2);
  drawEye(c, cx - 6, headY + 2, 0x3d7fd9, Math.sin(ctx.frame * 0.3));
  drawEye(c, cx + 6, headY + 2, 0x3d7fd9, Math.sin(ctx.frame * 0.3));

  // 방패 (왼손)
  drawShield(c, cx - 22, baseY - 30, { base: 0x8899aa, hi: 0xccddee, emblem: 0xe84545 });

  // 검
  const bladeCol = wpn === 'gold'
    ? { blade: 0xffeebb, edge: 0xffffff, guard: 0xffd700, handle: 0x6b3a1b }
    : wpn === 'iron'
      ? { blade: 0xccddee, edge: 0xffffff, guard: 0x8899aa, handle: 0x4a3020 }
      : { blade: 0xbb9977, edge: 0xddbb99, guard: 0x886644, handle: 0x5a4030 };
  drawSword(c, armX + 4, armY + 4, -70 + armAngle, 28, bladeCol);

  if (fx > 0.3) {
    drawSkillSlash(c, cx + 20, baseY - 40, Math.floor(fx * 8), 8);
  }
}

export function renderKnightFrame(state: AnimState, frame: number, gear: EquippedGear): PixelCanvas {
  const c = new PixelCanvas();
  const off = animOffset(state, frame);
  drawKnightBody({
    canvas: c,
    frame,
    total: ANIM_FRAMES[state],
    gear,
    bounce: off.bounce ?? 0,
    armAngle: off.armAngle ?? 0,
    legPhase: off.legPhase ?? 0,
    fx: off.fx ?? 0,
  });
  return c;
}
