import { configurePixelArtContext } from '../assets/AssetLoader';
import {
  type BiomeDef, type LayerKind, PARALLAX_SPEED,
  biomeForRegion, nextBiome,
} from '../data/backgroundConfig';
import { getCachedLayer } from './BackgroundLayerCache';
import { AtmosphereEffects } from './AtmosphereEffects';

const LAYER_ORDER: LayerKind[] = ['far', 'middle', 'front'];

export interface ScrollBgDrawOpts {
  canvasW: number;
  canvasH: number;
  scrollX: number;
  regionId: number;
  /** 0~1 던전 이동 중 다음 지역 블렌드 */
  travelBlend?: number;
  travelToRegionId?: number;
  isMoving: boolean;
  animTime: number;
}

function drawTiledLayer(
  ctx: CanvasRenderingContext2D,
  cached: { canvas: HTMLCanvasElement; tileW: number; tileH: number },
  scrollPx: number,
  canvasW: number,
  canvasH: number,
  alignBottom: boolean,
) {
  const { canvas, tileW, tileH } = cached;
  const off = ((scrollPx % tileW) + tileW) % tileW;
  const destY = alignBottom ? canvasH - tileH : 0;
  const copies = Math.ceil((canvasW + off) / tileW) + 2;
  for (let i = -1; i < copies; i++) {
    ctx.drawImage(canvas, i * tileW - off, destY, tileW, tileH);
  }
}

function drawBiome(
  ctx: CanvasRenderingContext2D,
  biome: BiomeDef,
  opts: ScrollBgDrawOpts,
  alpha: number,
) {
  const { canvasW: w, canvasH: h, scrollX, isMoving } = opts;
  const boost = isMoving ? 1 : 0.25;
  const bgScroll = -scrollX * boost;

  ctx.save();
  ctx.globalAlpha = alpha;

  for (const layer of LAYER_ORDER) {
    const cached = getCachedLayer(biome.id, layer, w, h);
    if (!cached) continue;
    const speed = PARALLAX_SPEED[layer];
    const alignBottom = layer === 'front' || layer === 'middle';
    drawTiledLayer(ctx, cached, bgScroll * speed, w, h, alignBottom);
  }

  ctx.restore();
}

function drawFallbackGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  top: string,
  bottom: string,
) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export class ScrollingBackgroundSystem {
  private atmosphere = new AtmosphereEffects();
  private lastRegionId = 0;

  invalidateCache() {
    this.atmosphere.reset();
  }

  draw(
    ctx: CanvasRenderingContext2D,
    opts: ScrollBgDrawOpts,
    fallback?: { bgTop: string; bgBottom: string },
  ) {
    const { canvasW: w, canvasH: h, regionId, travelBlend, travelToRegionId } = opts;
    configurePixelArtContext(ctx);

    const biome = biomeForRegion(regionId);
    const farCached = getCachedLayer(biome.id, 'far', w, h);

    if (!farCached) {
      drawFallbackGradient(ctx, w, h, fallback?.bgTop ?? '#223344', fallback?.bgBottom ?? '#112233');
      return;
    }

    if (regionId !== this.lastRegionId) {
      this.atmosphere.reset();
      this.lastRegionId = regionId;
    }

    const blend = travelBlend ?? 0;
    if (blend > 0.001 && travelToRegionId) {
      const toBiome = biomeForRegion(travelToRegionId);
      drawBiome(ctx, biome, opts, 1 - blend);
      drawBiome(ctx, toBiome, opts, blend);
      if (blend > 0.3 && blend < 0.7) {
        this.drawTravelStreaks(ctx, w, h, opts.animTime, blend);
      }
    } else {
      drawBiome(ctx, biome, opts, 1);
    }

    const atmoBiome = blend > 0.5 && travelToRegionId
      ? biomeForRegion(travelToRegionId)
      : biome;
    this.atmosphere.update(
      1 / 60, w, h, atmoBiome.atmosphere,
      opts.isMoving ? opts.scrollX * 0.02 : 0,
    );
    this.atmosphere.draw(ctx, w, h);
  }

  private drawTravelStreaks(
    ctx: CanvasRenderingContext2D, w: number, h: number, t: number, blend: number,
  ) {
    ctx.save();
    ctx.globalAlpha = 0.15 + Math.sin(t * 12) * 0.05;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) {
      const y = h * (0.15 + i * 0.08);
      const x = ((t * (140 + i * 30) + i * 70) % (w + 120)) - 60;
      ctx.fillRect(x, y, 36 + (i % 2) * 20, 2);
    }
    ctx.globalAlpha = blend * 0.12;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/** 지역 18 클리어 후 1번으로 순환 시 다음 바이옴 */
export function cyclicNextRegion(current: number): number {
  if (current >= 18) return 1;
  return current + 1;
}

export function cyclicNextBiome(current: BiomeDef): BiomeDef {
  return nextBiome(current);
}
