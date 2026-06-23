import type { EquippedGear } from '../../../data/types';
import { PixelCanvas } from '../PixelCanvas';
import {
  drawFace, drawEye, drawHairBlock, drawRobe, drawStaff, drawSkillSlash,
} from '../drawPrimitives';
import type { AnimState } from './types';
import { ANIM_FRAMES, animOffset } from './types';

const HAIR = { light: 0xeeeeff, mid: 0xccccdd, dark: 0x9999aa };
const ROBE = { base: 0xf8f8ff, hi: 0xffffff, lo: 0xd0d0e8 };
const ROBE_GOLD = { base: 0xffeecc, hi: 0xffffee, lo: 0xddbb88 };

function drawNunBody(ctx: import('./types').FrameCtx) {
  const { canvas: c, bounce, armAngle, legPhase, gear, fx } = ctx;
  const cx = 48;
  const baseY = 78 + bounce;
  const robe = gear.armor === 'gold' || gear.armor === 'legend' ? ROBE_GOLD : ROBE;

  const legOff = legPhase * 4;
  c.fillRect(cx - 9 - legOff, baseY - 16, 7, 16, 0x333355);
  c.fillRect(cx + 2 + legOff, baseY - 16, 7, 16, 0x333355);

  drawRobe(c, cx, baseY - 36, 34, 30, robe);
  c.fillRect(cx - 4, baseY - 34, 8, 20, 0x4488cc); // 파란 승복 띠

  const headY = baseY - 56;
  drawHairBlock(c, cx, headY, HAIR, 'silver');
  c.fillRect(cx - 16, headY - 8, 32, 6, 0xffffff); // 수녀 베일
  drawFace(c, cx, headY + 2);
  drawEye(c, cx - 6, headY + 2, 0x5588cc);
  drawEye(c, cx + 6, headY + 2, 0x5588cc);

  const staffGem = gear.weapon === 'holy' ? 0x55ee88 : 0x88ccff;
  drawStaff(c, cx + 18, baseY - 10, 42 + armAngle * 0.3, 0x8b6914, staffGem);

  if (fx > 0.2) {
    for (let i = 0; i < 6; i++) {
      c.softCircle(cx + (i - 3) * 8, baseY - 50 - i * 3, 4, 0x55ee88, Math.floor(fx * 180));
    }
    if (fx > 0.5) drawSkillSlash(c, cx, baseY - 45, Math.floor(fx * 6), 6);
  }
}

export function renderNunFrame(state: AnimState, frame: number, gear: EquippedGear): PixelCanvas {
  const c = new PixelCanvas();
  const off = animOffset(state, frame);
  drawNunBody({
    canvas: c, frame, total: ANIM_FRAMES[state], gear,
    bounce: off.bounce ?? 0, armAngle: off.armAngle ?? 0,
    legPhase: off.legPhase ?? 0, fx: off.fx ?? 0,
  });
  return c;
}
