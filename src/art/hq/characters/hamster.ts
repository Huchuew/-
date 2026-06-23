import type { EquippedGear } from '../../../data/types';
import { PixelCanvas } from '../PixelCanvas';
import {
  drawEye, drawMetalArmor, drawSword, drawShield, drawSkillSlash,
} from '../drawPrimitives';
import type { AnimState } from './types';
import { ANIM_FRAMES, animOffset } from './types';

const FUR = { light: 0xffcc88, mid: 0xeeaa55, dark: 0xcc8833 };
const ARMOR = { base: 0xb8c8d8, hi: 0xdee8f0, lo: 0x8899aa, trim: 0xffd700 };

function drawHamsterBody(ctx: import('./types').FrameCtx) {
  const { canvas: c, bounce, armAngle, legPhase, gear, fx } = ctx;
  const cx = 48;
  const baseY = 80 + bounce;

  const legOff = legPhase * 4;
  c.fillRect(cx - 8 - legOff, baseY - 10, 6, 10, FUR.dark);
  c.fillRect(cx + 2 + legOff, baseY - 10, 6, 10, FUR.dark);

  c.softCircle(cx, baseY - 28, 20, FUR.mid);
  c.softCircle(cx - 6, baseY - 30, 10, FUR.light);
  c.softCircle(cx + 8, baseY - 26, 8, FUR.dark);

  if (gear.armor !== 'cloth') {
    drawMetalArmor(c, cx, baseY - 30, 28, 22, ARMOR);
  }

  // 귀
  c.softCircle(cx - 14, baseY - 48, 7, FUR.mid);
  c.softCircle(cx + 14, baseY - 48, 7, FUR.mid);
  c.softCircle(cx - 14, baseY - 48, 4, FUR.light, 180);
  c.softCircle(cx + 14, baseY - 48, 4, FUR.light, 180);

  // 얼굴
  c.softCircle(cx, baseY - 44, 14, FUR.light);
  drawEye(c, cx - 5, baseY - 44, 0x2a2030);
  drawEye(c, cx + 5, baseY - 44, 0x2a2030);
  c.fillCircle(cx, baseY - 38, 3, 0xffaaaa); // 코
  c.line(cx - 4, baseY - 36, cx - 2, baseY - 34, 0xcc8866, 1);
  c.line(cx + 4, baseY - 36, cx + 2, baseY - 34, 0xcc8866, 1);

  drawShield(c, cx - 20, baseY - 28, { base: 0xccddee, hi: 0xffffff, emblem: 0xffd700 });

  const wpn = gear.weapon === 'gold' || gear.weapon === 'arcane' ? 'gold' : 'iron';
  const bladeCol = wpn === 'gold'
    ? { blade: 0xffeebb, edge: 0xffffff, guard: 0xffd700, handle: 0x6b3a1b }
    : { blade: 0xccddee, edge: 0xffffff, guard: 0x8899aa, handle: 0x4a3020 };
  drawSword(c, cx + 16, baseY - 26, -65 + armAngle, 22, bladeCol);

  if (fx > 0.3) {
    c.softCircle(cx - 18, baseY - 32, 14, 0xffee66, Math.floor(fx * 160));
    drawSkillSlash(c, cx + 15, baseY - 35, Math.floor(fx * 8), 8);
  }
}

export function renderHamsterFrame(state: AnimState, frame: number, gear: EquippedGear): PixelCanvas {
  const c = new PixelCanvas();
  const off = animOffset(state, frame);
  drawHamsterBody({
    canvas: c, frame, total: ANIM_FRAMES[state], gear,
    bounce: off.bounce ?? 0, armAngle: off.armAngle ?? 0,
    legPhase: off.legPhase ?? 0, fx: off.fx ?? 0,
  });
  return c;
}
