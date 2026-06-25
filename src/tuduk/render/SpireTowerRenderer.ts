import { loadImage, getImage, configurePixelArtContext } from '../assets/AssetLoader';
import { getSpireDepthProfile } from '../data/endgame/spireDepth';
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

function drawGradientFallback(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  floor: number,
  brightness: number,
) {
  const depth = getSpireDepthProfile(floor);
  const b = Math.max(0.12, brightness);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const topR = Math.floor((12 + (floor % 5) * 2) * b);
  const topG = Math.floor((8 + (floor % 3)) * b);
  const topB = Math.floor((32 + (floor % 7) * 4) * b);
  g.addColorStop(0, `rgb(${topR}, ${topG}, ${topB})`);
  g.addColorStop(0.45, `rgb(${Math.floor(18 * b)}, ${Math.floor(10 * b)}, ${Math.floor(48 * b)})`);
  g.addColorStop(1, `rgb(${Math.floor(6 * b)}, ${Math.floor(4 * b)}, ${Math.floor(14 * b)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.35, w * 0.1, w * 0.5, h * 0.4, w * 0.75);
  const glow = depth.tier === 'void' ? 0.04 : depth.tier === 'abyss' ? 0.1 : 0.18;
  vignette.addColorStop(0, `rgba(120, 80, 220, ${glow})`);
  vignette.addColorStop(1, `rgba(0,0,0,${0.45 + depth.vignette * 0.35})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function applyDepthGrade(ctx: CanvasRenderingContext2D, w: number, h: number, floor: number) {
  const depth = getSpireDepthProfile(floor);
  if (depth.saturation >= 0.98 && depth.brightness >= 0.98) return;

  ctx.save();
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = `hsl(0, ${Math.round(depth.saturation * 100)}%, 50%)`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  if (depth.brightness < 0.98) {
    ctx.save();
    ctx.globalAlpha = 1 - depth.brightness;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  if (depth.vignette > 0.2) {
    ctx.save();
    const v = ctx.createRadialGradient(w * 0.5, h * 0.42, w * 0.08, w * 0.5, h * 0.5, w * 0.82);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, `rgba(0,0,0,${depth.vignette * 0.85})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

function drawDepthLabel(ctx: CanvasRenderingContext2D, w: number, h: number, floor: number, animTime: number) {
  const depth = getSpireDepthProfile(floor);
  if (depth.tier === 'entry' && floor <= 2) return;

  ctx.save();
  const pulse = 0.72 + Math.sin(animTime * 1.4) * 0.08;
  ctx.globalAlpha = pulse;
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.max(11, Math.min(14, h * 0.032))}px Outfit, sans-serif`;
  ctx.fillStyle = depth.tier === 'void' ? '#888899' : '#bbaadd';
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 3;
  const title = depth.tier === 'void'
    ? `${depth.label} · 심연`
    : `${depth.label} · 하강`;
  ctx.strokeText(title, w / 2, h * 0.1);
  ctx.fillText(title, w / 2, h * 0.1);
  if (depth.hint) {
    ctx.font = `${Math.max(9, h * 0.024)}px Outfit, sans-serif`;
    ctx.fillStyle = '#99aabb';
    ctx.fillText(depth.hint, w / 2, h * 0.1 + Math.max(14, h * 0.028));
  }
  ctx.restore();
}

export function drawSpireTowerScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: SpireTowerDrawState,
) {
  const depth = getSpireDepthProfile(state.floor);
  const descendScroll = state.scrollX + state.floor * 12;

  drawGradientFallback(ctx, w, h, state.floor, depth.brightness);

  const groundY = Math.round(h * 0.82);
  const floorH = Math.round(h * 0.2);
  const scroll = descendScroll;

  const layerAlphaScale = depth.tier === 'void' ? 0.55 : depth.tier === 'abyss' ? 0.75 : 1;
  const layers: { key: keyof typeof SPIRE_PARALLAX; path: string; yRatio: number; hRatio: number; alpha: number }[] = [
    { key: 'back', path: SPIRE_TOWER_LAYERS.back, yRatio: 0, hRatio: 1, alpha: 0.9 * layerAlphaScale },
    { key: 'far', path: SPIRE_TOWER_LAYERS.far, yRatio: 0.04, hRatio: 0.92, alpha: 0.95 * layerAlphaScale },
    { key: 'middle', path: SPIRE_TOWER_LAYERS.middle, yRatio: 0.08, hRatio: 0.88, alpha: 1 * layerAlphaScale },
    { key: 'near', path: SPIRE_TOWER_LAYERS.near, yRatio: 0.12, hRatio: 0.84, alpha: 1 * layerAlphaScale },
    { key: 'foreground', path: SPIRE_TOWER_LAYERS.foreground, yRatio: 0.16, hRatio: 0.8, alpha: 1 * layerAlphaScale },
  ];

  for (const layer of layers) {
    const drawH = Math.round(h * layer.hRatio);
    const y = Math.round(h * layer.yRatio);
    drawTiledLayer(ctx, layer.path, w, h, scroll * SPIRE_PARALLAX[layer.key], y, drawH, layer.alpha);
  }

  drawTiledLayer(ctx, SPIRE_TOWER_LAYERS.tileset, w, h, scroll * SPIRE_PARALLAX.floor, groundY - floorH * 0.35, floorH, layerAlphaScale);

  ctx.save();
  const floorGlow = ctx.createLinearGradient(0, groundY - 4, 0, h);
  const glowA = depth.tier === 'void' ? 0.06 : depth.tier === 'abyss' ? 0.12 : 0.25;
  floorGlow.addColorStop(0, `rgba(140, 90, 255, ${glowA})`);
  floorGlow.addColorStop(1, 'rgba(20, 10, 40, 0.9)');
  ctx.fillStyle = floorGlow;
  ctx.fillRect(0, groundY - 2, w, h - groundY + 2);
  ctx.restore();

  applyDepthGrade(ctx, w, h, state.floor);
  drawDepthLabel(ctx, w, h, state.floor, state.animTime);
}
