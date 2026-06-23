/** 층별 배경·분위기 — 낮은 층 밝은 야외 → 고층 어둡고 용암 */

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  const u = clamp01(t);
  const r = Math.round(r1 + (r2 - r1) * u);
  const g = Math.round(g1 + (g2 - g1) * u);
  const bl = Math.round(b1 + (b2 - b1) * u);
  return `rgb(${r},${g},${bl})`;
}

export function getRegionDepth(regionId: number): number {
  return (Math.max(1, Math.min(18, regionId)) - 1) / 17;
}

/** 지역별 스테이지 PNG — 1~17층은 배경 파일과 1:1, 18층은 전용 관문 */
export function backgroundIndexForRegion(regionId: number): number {
  const r = Math.max(1, Math.min(18, regionId));
  return r - 1;
}

export interface RegionPalette {
  bgTop: string;
  bgBottom: string;
  ground: string;
  skyFill: string;
  horizonMid: string;
  darkness: number;
  lava: number;
}

export function getRegionPalette(regionId: number): RegionPalette {
  const t = getRegionDepth(regionId);
  return {
    bgTop: lerpColor('#87ceeb', '#180608', t),
    bgBottom: lerpColor('#7ecf8a', '#3a1208', t),
    ground: lerpColor('#4a9a58', '#281008', t),
    skyFill: lerpColor('#b8e4ff', '#0a0406', t),
    horizonMid: lerpColor('#5a9a6a', '#1a0808', t),
    darkness: t * 0.32,
    lava: clamp01((t - 0.42) / 0.58),
  };
}

export function drawRegionAtmosphereOverlay(
  ctx: CanvasRenderingContext2D,
  regionId: number,
  w: number,
  h: number,
  panoramaTop: number,
  animTime: number,
) {
  const pal = getRegionPalette(regionId);
  const destH = h - panoramaTop;
  if (destH <= 0) return;

  if (regionId <= 4) {
    const wash = 0.06 - regionId * 0.008;
    const skyG = ctx.createLinearGradient(0, panoramaTop, 0, panoramaTop + h * 0.35);
    skyG.addColorStop(0, `rgba(255,250,230,${wash})`);
    skyG.addColorStop(1, 'transparent');
    ctx.fillStyle = skyG;
    ctx.fillRect(0, panoramaTop, w, h * 0.35);
  }

  if (pal.darkness > 0.04) {
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.42, w * 0.15, w * 0.5, h * 0.5, w * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${pal.darkness})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, panoramaTop, w, destH);
  }

  if (pal.lava > 0.04) {
    const lavaTop = panoramaTop + destH * 0.45;
    const lg = ctx.createLinearGradient(0, lavaTop, 0, h);
    lg.addColorStop(0, 'rgba(0,0,0,0)');
    lg.addColorStop(0.4, `rgba(255,70,15,${0.06 + pal.lava * 0.14})`);
    lg.addColorStop(1, `rgba(120,20,0,${0.12 + pal.lava * 0.22})`);
    ctx.fillStyle = lg;
    ctx.fillRect(0, lavaTop, w, h - lavaTop);

    ctx.save();
    for (let i = 0; i < 6; i++) {
      const drift = animTime * (18 + i * 4) * (i % 2 === 0 ? 1 : -1);
      const x = ((w * (0.12 + i * 0.14) + drift) % (w + 50) + w + 50) % (w + 50) - 25;
      const y = h - destH * (0.12 + (i % 3) * 0.04) + Math.sin(animTime * 1.8 + i * 1.1) * 5;
      const alpha = 0.12 + pal.lava * 0.28;
      ctx.fillStyle = `rgba(255,110,35,${alpha})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 14 + (i % 3) * 6, 5 + (i % 2) * 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,180,60,${alpha * 0.65})`;
      ctx.beginPath();
      ctx.ellipse(x - 4, y - 2, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (regionId >= 14) {
    ctx.fillStyle = `rgba(40,10,60,${0.04 + (regionId - 13) * 0.02})`;
    ctx.fillRect(0, panoramaTop, w, destH);
  }

  const footFade = Math.min(36, h * 0.12);
  const fg = ctx.createLinearGradient(0, h - footFade, 0, h);
  fg.addColorStop(0, 'rgba(0,0,0,0)');
  fg.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, h - footFade, w, footFade);
}
