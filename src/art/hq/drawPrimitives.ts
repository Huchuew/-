import { PixelCanvas } from './PixelCanvas';

const SKIN = { base: 0xffd5b8, mid: 0xf0b890, shadow: 0xd4956a, blush: 0xffa8a0 };
const EYE = { white: 0xffffff, iris: 0x3d7fd9, pupil: 0x1a1a2e, shine: 0xffffff };

/** 머리+얼굴 — SD 비율, 머리 큼 */
export function drawFace(c: PixelCanvas, cx: number, cy: number, skin = SKIN) {
  c.softCircle(cx, cy, 17, skin.base);
  c.softCircle(cx - 5, cy + 2, 8, skin.mid);
  c.softCircle(cx + 6, cy + 3, 7, skin.shadow);
  c.softCircle(cx - 10, cy + 4, 4, skin.blush, 120);
  c.softCircle(cx + 10, cy + 4, 4, skin.blush, 120);
}

export function drawEye(c: PixelCanvas, x: number, y: number, iris = EYE.iris, lookX = 0) {
  c.fillCircle(x, y, 5, EYE.white);
  c.fillCircle(x + lookX, y + 1, 3, iris);
  c.fillCircle(x + lookX + 1, y + 2, 1.5, EYE.pupil);
  c.set(x + lookX - 1, y, EYE.shine);
  c.set(x + lookX + 2, y + 1, EYE.shine, 180);
}

export function drawHairBlock(
  c: PixelCanvas, cx: number, cy: number,
  colors: { light: number; mid: number; dark: number },
  style: 'blonde' | 'silver' | 'purple' | 'brown',
) {
  const bump = style === 'purple' ? 3 : 0;
  c.softCircle(cx, cy - 4 + bump, 18, colors.mid);
  c.softCircle(cx - 8, cy - 2, 10, colors.light);
  c.softCircle(cx + 9, cy - 1, 9, colors.dark);
  c.softCircle(cx, cy - 12, 14, colors.light);
  if (style === 'blonde') {
    c.line(cx - 14, cy + 2, cx - 18, cy + 14, colors.mid, 2);
    c.line(cx + 14, cy + 2, cx + 17, cy + 12, colors.light, 2);
  }
  if (style === 'silver') {
    c.line(cx - 12, cy, cx - 16, cy + 18, colors.light, 2);
    c.line(cx + 12, cy, cx + 15, cy + 16, colors.mid, 2);
  }
  if (style === 'purple') {
    c.fillRect(cx - 20, cy - 18, 40, 8, colors.dark);
    c.softCircle(cx, cy - 20, 12, colors.mid);
  }
  if (style === 'brown') {
    c.softCircle(cx - 10, cy - 8, 6, colors.dark);
    c.softCircle(cx + 10, cy - 8, 6, colors.dark);
  }
}

export function drawMetalArmor(
  c: PixelCanvas, cx: number, cy: number, w: number, h: number,
  colors: { base: number; hi: number; lo: number; trim?: number },
) {
  c.fillRect(cx - w / 2, cy, w, h, colors.lo);
  c.fillRect(cx - w / 2 + 2, cy + 2, w - 4, h - 4, colors.base);
  for (let i = 0; i < 3; i++)
    c.fillRect(cx - w / 2 + 4, cy + 6 + i * 8, w - 8, 2, colors.hi, 160);
  c.fillRect(cx - w / 2, cy, w, 3, colors.hi);
  if (colors.trim) c.fillRect(cx - w / 2, cy + h - 4, w, 3, colors.trim);
}

export function drawRobe(
  c: PixelCanvas, cx: number, cy: number, w: number, h: number,
  colors: { base: number; hi: number; lo: number },
) {
  c.fillRect(cx - w / 2, cy, w, h, colors.lo);
  c.fillRect(cx - w / 2 + 1, cy + 1, w - 2, h - 2, colors.base);
  c.line(cx, cy + 4, cx, cy + h - 2, colors.hi, 1);
  c.fillRect(cx - w / 2 + 2, cy + h - 6, w - 4, 4, colors.hi, 100);
}

export function drawSword(
  c: PixelCanvas, x: number, y: number, angle: number, len: number,
  colors: { blade: number; edge: number; guard: number; handle: number },
) {
  const rad = (angle * Math.PI) / 180;
  const ex = x + Math.cos(rad) * len;
  const ey = y + Math.sin(rad) * len;
  c.line(x, y, ex, ey, colors.handle, 2);
  const bx = x + Math.cos(rad) * (len * 0.25);
  const by = y + Math.sin(rad) * (len * 0.25);
  c.line(bx, by, ex, ey, colors.blade, 3);
  c.line(bx, by, ex, ey, colors.edge, 1);
  const gx = x + Math.cos(rad) * 8;
  const gy = y + Math.sin(rad) * 8;
  c.fillCircle(gx, gy, 4, colors.guard);
}

export function drawStaff(
  c: PixelCanvas, x: number, y: number, len: number,
  wood: number, gem: number,
) {
  c.line(x, y, x, y - len, wood, 2);
  c.softCircle(x, y - len - 4, 6, gem);
  c.set(x - 2, y - len - 6, 0xffffff, 200);
  c.set(x + 1, y - len - 5, 0xffffff, 150);
}

export function drawShield(c: PixelCanvas, x: number, y: number, colors: { base: number; hi: number; emblem: number }) {
  c.softCircle(x, y, 12, colors.base);
  c.softCircle(x - 3, y - 2, 6, colors.hi, 140);
  c.fillCircle(x, y, 5, colors.emblem);
  c.fillRect(x - 1, y - 8, 2, 16, colors.hi, 120);
}

export function drawSlimeBody(
  c: PixelCanvas, cx: number, cy: number, r: number,
  colors: { base: number; hi: number; lo: number },
  squash = 0,
) {
  const sy = 1 - squash * 0.15;
  const sx = 1 + squash * 0.1;
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const nx = x / (r * sx);
      const ny = y / (r * sy);
      if (nx * nx + ny * ny <= 1) {
        const shade = ny < -0.2 ? colors.hi : ny > 0.3 ? colors.lo : colors.base;
        c.set(cx + x, cy + y, shade);
      }
    }
  c.softCircle(cx - r * 0.25, cy - r * 0.35, r * 0.22, 0xffffff, 90);
  c.softCircle(cx + r * 0.1, cy - r * 0.2, r * 0.1, 0xffffff, 60);
}

export function drawSlimeEyes(c: PixelCanvas, cx: number, cy: number, mood: number) {
  const spread = 6;
  drawEye(c, cx - spread, cy + mood, 0x2a4060);
  drawEye(c, cx + spread, cy + mood, 0x2a4060);
}

export function drawSkillSlash(c: PixelCanvas, cx: number, cy: number, frame: number, total: number) {
  const t = frame / total;
  const arc = t * 140 - 70;
  for (let i = 0; i < 12; i++) {
    const a = ((arc + i * 8) * Math.PI) / 180;
    const r = 20 + i * 2;
    const col = i < 4 ? 0xffffff : i < 8 ? 0xffee66 : 0xffaa22;
    c.softCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, 4 - i * 0.2, col, 220 - i * 12);
  }
}
