/**
 * 지역 픽셀 배경 — 3단 패럴랙스 (하늘 / 중경 / 지면)
 */
import { getImage } from '../assets/AssetLoader';

interface ParallaxLayer {
  syRatio: number;
  shRatio: number;
  scrollMult: number;
  /** 지면(groundY) 기준 바닥 정렬 오프셋 비율 */
  bottomAlign: number;
}

const LAYERS: ParallaxLayer[] = [
  { syRatio: 0, shRatio: 0.58, scrollMult: 0.12, bottomAlign: 0.88 },
  { syRatio: 0.22, shRatio: 0.62, scrollMult: 0.35, bottomAlign: 0.94 },
  { syRatio: 0.55, shRatio: 0.45, scrollMult: 0.88, bottomAlign: 1.0 },
];

function drawTiledLayer(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx: number, sy: number, sw: number, sh: number,
  scrollPx: number,
  destY: number, tileW: number, destH: number,
  canvasW: number,
) {
  if (sw <= 0 || sh <= 0 || tileW <= 0 || destH <= 0) return;
  const off = ((scrollPx % tileW) + tileW) % tileW;
  const copies = Math.ceil((canvasW + off) / tileW) + 1;
  for (let i = -1; i < copies; i++) {
    const x = i * tileW - off;
    ctx.drawImage(img, sx, sy, sw, sh, x, destY, tileW, destH);
  }
}

export function drawRegionPixelParallax(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number,
  groundY: number,
  scroll: number,
  scrollBoost: number,
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const bgScroll = -scroll * scrollBoost;
  const baseScale = (groundY * 0.97) / ih;
  const tileW = iw * baseScale;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  for (const layer of LAYERS) {
    const sy = Math.floor(ih * layer.syRatio);
    const sh = Math.max(1, Math.ceil(ih * layer.shRatio));
    const destH = sh * baseScale;
    const destBottom = groundY * layer.bottomAlign;
    const destY = destBottom - destH;
    const parallax = bgScroll * layer.scrollMult;
    drawTiledLayer(ctx, img, 0, sy, iw, sh, parallax, destY, tileW, destH, canvasW);
  }

  ctx.restore();

  const vignette = ctx.createLinearGradient(0, groundY - 6, 0, canvasH);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.2, 'rgba(0,0,0,0.1)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, groundY - 6, canvasW, canvasH - groundY + 6);
}

export function hasRegionPixelBg(regionBgPath: string): boolean {
  const img = getImage(regionBgPath);
  return !!img && img.naturalWidth > 0;
}
