import { configurePixelArtContext, getImage } from '../assets/AssetLoader';
import type { BiomeId, LayerKind } from '../data/backgroundConfig';
import { biomeLayerPathCandidates } from '../data/backgroundConfig';

export interface CachedLayer {
  canvas: HTMLCanvasElement;
  tileW: number;
  tileH: number;
  srcPath: string;
}

const cache = new Map<string, CachedLayer>();
let lastCanvasW = 0;
let lastCanvasH = 0;

function cacheKey(biomeId: BiomeId, layer: LayerKind, w: number, h: number): string {
  return `${biomeId}|${layer}|${w}|${h}`;
}

function resolveLayerImage(biomeId: BiomeId, layer: LayerKind): { img: HTMLImageElement; path: string } | null {
  for (const path of biomeLayerPathCandidates(biomeId, layer)) {
    const img = getImage(path);
    if (img?.naturalWidth) return { img, path };
  }
  return null;
}

/** cover 스케일 — 검은 여백 없이 화면 전체 채움 */
function coverScale(iw: number, ih: number, cw: number, ch: number): number {
  return Math.max(cw / iw, ch / ih);
}

/**
 * 레이어를 오프스크린 캔버스에 1회 렌더 후 타일링에 재사용 (매 프레임 재생성 없음)
 */
export function getCachedLayer(
  biomeId: BiomeId,
  layer: LayerKind,
  canvasW: number,
  canvasH: number,
): CachedLayer | null {
  if (canvasW !== lastCanvasW || canvasH !== lastCanvasH) {
    cache.clear();
    lastCanvasW = canvasW;
    lastCanvasH = canvasH;
  }

  const key = cacheKey(biomeId, layer, canvasW, canvasH);
  const hit = cache.get(key);
  if (hit) return hit;

  const resolved = resolveLayerImage(biomeId, layer);
  if (!resolved) return null;

  const { img, path } = resolved;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = coverScale(iw, ih, canvasW, canvasH);
  const tileW = Math.ceil(iw * scale);
  const tileH = Math.ceil(ih * scale);

  const off = document.createElement('canvas');
  off.width = tileW;
  off.height = tileH;
  const ctx = off.getContext('2d');
  if (!ctx) return null;
  configurePixelArtContext(ctx);
  ctx.drawImage(img, 0, 0, iw, ih, 0, 0, tileW, tileH);

  const entry: CachedLayer = { canvas: off, tileW, tileH, srcPath: path };
  cache.set(key, entry);
  return entry;
}

export function hasBiomeLayers(biomeId: BiomeId): boolean {
  return !!resolveLayerImage(biomeId, 'far');
}

export function invalidateBackgroundCache() {
  cache.clear();
  lastCanvasW = 0;
  lastCanvasH = 0;
}
