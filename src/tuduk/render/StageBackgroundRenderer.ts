import { configurePixelArtContext, getImage } from '../assets/AssetLoader';
import {
  STAGE_BACKGROUNDS, backgroundIndexForRegion,
} from '../data/stageBackgrounds';
import { drawRegionAtmosphereOverlay, getRegionPalette } from '../data/regionVisuals';
import {
  computeBgTileScale, GROUND_STRIP_RATIO, PANORAMA_TOP_RATIO,
  type BattleSceneLayout,
} from './battleSceneLayout';

/** 스테이지 전환 페이드 시간(초) */
const FADE_SEC = 0.8;

interface ScaledTile {
  canvas: HTMLCanvasElement;
  tileW: number;
  tileH: number;
}

const tileCache = new Map<string, ScaledTile>();
let lastCanvasW = 0;
let lastCanvasH = 0;

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function cacheKey(bgIndex: number, canvasW: number, canvasH: number): string {
  return `${bgIndex}|${canvasW}|${canvasH}`;
}

/** 원본 비율 유지 + 최소 높이 업스케일, 오프스크린 1회 캐시 */
function getScaledTile(
  bgIndex: number, canvasW: number, canvasH: number,
): ScaledTile | null {
  if (canvasW !== lastCanvasW || canvasH !== lastCanvasH) {
    tileCache.clear();
    lastCanvasW = canvasW;
    lastCanvasH = canvasH;
  }

  const key = cacheKey(bgIndex, canvasW, canvasH);
  const hit = tileCache.get(key);
  if (hit) return hit;

  const def = STAGE_BACKGROUNDS[bgIndex];
  if (!def) return null;

  const img = getImage(def.file);
  if (!img?.naturalWidth) return null;

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const groundStripH = Math.round(canvasH * GROUND_STRIP_RATIO);
  const panoramaTop = Math.round(canvasH * PANORAMA_TOP_RATIO);
  const availableH = Math.max(40, canvasH - panoramaTop - groundStripH);
  const { tileW, tileH } = computeBgTileScale(iw, ih, canvasW, availableH);

  const off = document.createElement('canvas');
  off.width = tileW;
  off.height = tileH;
  const octx = off.getContext('2d');
  if (!octx) return null;
  configurePixelArtContext(octx);
  octx.drawImage(img, 0, 0, iw, ih, 0, 0, tileW, tileH);

  const entry: ScaledTile = { canvas: off, tileW, tileH };
  tileCache.set(key, entry);
  return entry;
}

function drawTiledStrip(
  ctx: CanvasRenderingContext2D,
  tile: ScaledTile,
  scrollPx: number,
  destY: number,
  canvasW: number,
  alpha: number,
) {
  const off = ((scrollPx % tile.tileW) + tile.tileW) % tile.tileW;
  const copies = Math.ceil((canvasW + off) / tile.tileW) + 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = -1; i < copies; i++) {
    ctx.drawImage(tile.canvas, i * tile.tileW - off, destY, tile.tileW, tile.tileH);
  }
  ctx.restore();
}

/** HUD 위 여백 — 낮은 층은 밝은 하늘색 */
function drawNeutralFill(ctx: CanvasRenderingContext2D, w: number, panoramaTop: number, regionId: number) {
  if (panoramaTop <= 0) return;
  const pal = getRegionPalette(regionId);
  const g = ctx.createLinearGradient(0, 0, 0, panoramaTop);
  g.addColorStop(0, pal.skyFill);
  g.addColorStop(1, '#12101c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, panoramaTop);
}

export interface StageBgDrawOpts {
  canvasW: number;
  canvasH: number;
  scrollX: number;
  regionId: number;
  layout: BattleSceneLayout;
  travelProgress?: number;
  travelDurationSec?: number;
  travelToRegionId?: number;
  animTime?: number;
}

export class StageBackgroundRenderer {
  invalidateCache() {
    tileCache.clear();
    lastCanvasW = 0;
    lastCanvasH = 0;
  }

  draw(ctx: CanvasRenderingContext2D, opts: StageBgDrawOpts) {
    const {
      canvasW: w, scrollX, regionId, layout,
      travelProgress, travelDurationSec, travelToRegionId,
    } = opts;

    const { panoramaTop } = layout;
    configurePixelArtContext(ctx);

    drawNeutralFill(ctx, w, panoramaTop, regionId);

    const fromIdx = backgroundIndexForRegion(regionId);
    const scrollPx = scrollX;
    const destY = panoramaTop;

    let fadeBlend = 0;
    if (travelProgress != null && travelProgress > 0 && travelToRegionId) {
      const elapsed = travelProgress * (travelDurationSec ?? 3);
      fadeBlend = smoothstep(Math.min(1, elapsed / FADE_SEC));
    }

    if (fadeBlend > 0.001 && travelToRegionId) {
      const toIdx = backgroundIndexForRegion(travelToRegionId);
      const fromTile = getScaledTile(fromIdx, w, opts.canvasH);
      const toTile = getScaledTile(toIdx, w, opts.canvasH);
      if (fromTile) drawTiledStrip(ctx, fromTile, scrollPx, destY, w, 1 - fadeBlend);
      if (toTile) drawTiledStrip(ctx, toTile, scrollPx, destY, w, fadeBlend);
      drawRegionAtmosphereOverlay(ctx, regionId, w, opts.canvasH, panoramaTop, opts.animTime ?? 0);
      if (fadeBlend > 0.35) {
        drawRegionAtmosphereOverlay(ctx, travelToRegionId, w, opts.canvasH, panoramaTop, opts.animTime ?? 0);
      }
    } else {
      const tile = getScaledTile(fromIdx, w, opts.canvasH);
      if (tile) {
        drawTiledStrip(ctx, tile, scrollPx, destY, w, 1);
      } else {
        const pal = getRegionPalette(regionId);
        const g = ctx.createLinearGradient(0, destY, 0, opts.canvasH);
        g.addColorStop(0, pal.skyFill);
        g.addColorStop(0.55, pal.horizonMid);
        g.addColorStop(1, pal.ground);
        ctx.fillStyle = g;
        ctx.fillRect(0, destY, w, opts.canvasH - destY);
      }
      drawRegionAtmosphereOverlay(ctx, regionId, w, opts.canvasH, panoramaTop, opts.animTime ?? 0);
    }
  }
}

export function invalidateStageBackgroundCache() {
  tileCache.clear();
  lastCanvasW = 0;
  lastCanvasH = 0;
}
