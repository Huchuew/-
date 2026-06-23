import type { EquippedGear } from '../../../data/types';
import { PixelCanvas } from '../PixelCanvas';
import {
  drawFace, drawEye, drawHairBlock, drawRobe, drawStaff, drawSkillSlash,
} from '../drawPrimitives';
import type { AnimState } from './types';
import { ANIM_FRAMES, animOffset } from './types';

const HAIR = { light: 0xcc99ff, mid: 0x9944dd, dark: 0x6622aa };
const ROBE = { base: 0x7733cc, hi: 0x9955ee, lo: 0x441188 };
const ROBE_GOLD = { base: 0x9944dd, hi: 0xbb66ff, lo: 0x552299 };

function drawMageBody(ctx: import('./types').FrameCtx) {
  const { canvas: c, bounce, armAngle, legPhase, gear, fx, frame } = ctx;
  const cx = 48;
  const baseY = 78 + bounce;
  const robe = gear.armor === 'gold' || gear.armor === 'legend' ? ROBE_GOLD : ROBE;

  const legOff = legPhase * 4;
  c.fillRect(cx - 8 - legOff, baseY - 14, 6, 14, 0x331166);
  c.fillRect(cx + 2 + legOff, baseY - 14, 6, 14, 0x331166);

  drawRobe(c, cx, baseY - 34, 32, 28, robe);
  c.fillRect(cx - 14, baseY - 52, 28, 4, 0x6622aa); // 로브 칼라

  const headY = baseY - 54;
  drawHairBlock(c, cx, headY - 4, HAIR, 'purple');
  drawFace(c, cx, headY + 2);
  drawEye(c, cx - 6, headY + 2, 0x8844cc);
  drawEye(c, cx + 6, headY + 2, 0x8844cc);

  const gem = gear.weapon === 'arcane' ? 0xaa55ff : 0xcc88ff;
  drawStaff(c, cx + 16, baseY - 8, 44 + armAngle * 0.4, 0x553311, gem);

  if (fx > 0.15) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + frame * 0.5;
      c.softCircle(cx + Math.cos(a) * 18, baseY - 42 + Math.sin(a) * 10, 3, 0xaa55ff, Math.floor(fx * 200));
    }
    if (fx > 0.4) drawSkillSlash(c, cx + 10, baseY - 40, Math.floor(fx * 8), 8);
  }
}

export function renderMageFrame(state: AnimState, frame: number, gear: EquippedGear): PixelCanvas {
  const c = new PixelCanvas();
  const off = animOffset(state, frame);
  drawMageBody({
    canvas: c, frame, total: ANIM_FRAMES[state], gear,
    bounce: off.bounce ?? 0, armAngle: off.armAngle ?? 0,
    legPhase: off.legPhase ?? 0, fx: off.fx ?? 0,
  });
  return c;
}
