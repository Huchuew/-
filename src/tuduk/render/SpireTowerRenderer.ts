import { loadImage, getImage, configurePixelArtContext } from '../assets/AssetLoader';
import { SPIRE_PARALLAX, SPIRE_TOWER_LAYERS } from '../data/endgame/spireTowerAssets';

export interface SpireTowerDrawState {
  scrollX: number;
  animTime: number;
  floor: number;
}

let preloadPromise: Promise<void> | null = null;

export function preloadSpireTowerAssets(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = Promise.all(
      Object.values(SPIRE_TOWER_LAYERS).map(p => loadImage(p)),
    ).then(() => undefined);
  }
  return preloadPromise;
}

function drawTiledLayer(
  ctx: CanvasRenderingContext2D,
  path: string,
  w: number,
  h: number,
  scroll: number,
  y: number,
  drawH: number,
  alpha = 1,
) {
  const img = getImage(path);
  if (!img?.naturalWidth) return false;

  ctx.save();
  ctx.globalAlpha = alpha;
  configurePixelArtContext(ctx);

  const scale = drawH / img.naturalHeight;
  const tileW = Math.max(1, Math.ceil(img.naturalWidth * scale));
  const offset = -((scroll % tileW) + tileW) % tileW;

  for (let x = offset; x < w + tileW; x += tileW) {
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, Math.round(x), Math.round(y), tileW, drawH);
  }
  ctx.restore();
  return true;
}

function drawGradientFallback(ctx: CanvasRenderingContext2D, w: number, h: number, floor: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const pulse = (floor % 7) * 0.02;
  g.addColorStop(0, `rgb(${12 + pulse * 40}, ${8 + pulse * 20}, ${32 + pulse * 60})`);
  g.addColorStop(0.45, `rgb(${18 + pulse * 30}, ${10 + pulse * 15}, ${48 + pulse * 40})`);
  g.addColorStop(1, '#06040e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.35, w * 0.1, w * 0.5, h * 0.4, w * 0.75);
  vignette.addColorStop(0, 'rgba(120, 80, 220, 0.18)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

export function drawSpireTowerScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: SpireTowerDrawState,
) {
  drawGradientFallback(ctx, w, h, state.floor);

  const groundY = Math.round(h * 0.82);
  const floorH = Math.round(h * 0.2);
  const scroll = state.scrollX;

  const layers: { key: keyof typeof SPIRE_PARALLAX; path: string; yRatio: number; hRatio: number; alpha: number }[] = [
    { key: 'back', path: SPIRE_TOWER_LAYERS.back, yRatio: 0, hRatio: 1, alpha: 0.9 },
    { key: 'far', path: SPIRE_TOWER_LAYERS.far, yRatio: 0.04, hRatio: 0.92, alpha: 0.95 },
    { key: 'middle', path: SPIRE_TOWER_LAYERS.middle, yRatio: 0.08, hRatio: 0.88, alpha: 1 },
    { key: 'near', path: SPIRE_TOWER_LAYERS.near, yRatio: 0.12, hRatio: 0.84, alpha: 1 },
    { key: 'foreground', path: SPIRE_TOWER_LAYERS.foreground, yRatio: 0.16, hRatio: 0.8, alpha: 1 },
  ];

  for (const layer of layers) {
    const drawH = Math.round(h * layer.hRatio);
    const y = Math.round(h * layer.yRatio);
    drawTiledLayer(ctx, layer.path, w, h, scroll * SPIRE_PARALLAX[layer.key], y, drawH, layer.alpha);
  }

  drawTiledLayer(ctx, SPIRE_TOWER_LAYERS.tileset, w, h, scroll * SPIRE_PARALLAX.floor, groundY - floorH * 0.35, floorH, 1);

  ctx.save();
  const floorGlow = ctx.createLinearGradient(0, groundY - 4, 0, h);
  floorGlow.addColorStop(0, 'rgba(140, 90, 255, 0.25)');
  floorGlow.addColorStop(1, 'rgba(20, 10, 40, 0.9)');
  ctx.fillStyle = floorGlow;
  ctx.fillRect(0, groundY - 2, w, h - groundY + 2);
  ctx.restore();
}
