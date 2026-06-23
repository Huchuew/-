import type { SpriteCrop } from '../data/pipoyaMap';

const cache = new Map<string, HTMLImageElement>();
const loading = new Map<string, Promise<HTMLImageElement | null>>();
export interface SpriteMetrics {
  crop: SpriteCrop;
  /** trim crop 하단에서 실제 발 접지선까지의 소스 픽셀 거리 */
  feetPadBottom: number;
}

const trimCache = new Map<string, SpriteCrop>();
const metricsCache = new Map<string, SpriteMetrics>();

let trimCanvas: HTMLCanvasElement | null = null;
let trimCtx: CanvasRenderingContext2D | null = null;

export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? './';
  return `${base}${path.replace(/^\//, '')}`;
}

export function loadImage(path: string, attempt = 0): Promise<HTMLImageElement | null> {
  const cached = cache.get(path);
  if (cached?.complete && cached.naturalWidth > 0) return Promise.resolve(cached);

  const pending = loading.get(path);
  if (pending) return pending;

  const p = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => { cache.set(path, img); resolve(img); };
    img.onerror = () => {
      if (attempt < 2) {
        window.setTimeout(() => {
          loadImage(path, attempt + 1).then(resolve);
        }, 280 * (attempt + 1));
      } else {
        resolve(null);
      }
    };
    img.src = assetUrl(path);
  });
  loading.set(path, p);
  return p.finally(() => loading.delete(path));
}

export function getImage(path: string): HTMLImageElement | null {
  const img = cache.get(path);
  return img?.complete && img.naturalWidth > 0 ? img : null;
}

function trimKey(path: string, crop: SpriteCrop): string {
  return `${path}|${crop.sx},${crop.sy},${crop.sw},${crop.sh}`;
}

/** Pipoya/Tiny RPG: 검정·흰색·마젠타 배경 투명 처리 */
function isBackgroundPixel(r: number, g: number, b: number, a: number): boolean {
  if (a <= 10) return true;
  if (r < 14 && g < 14 && b < 14) return true;
  if (r > 245 && g > 245 && b > 245) return true;
  if (r > 200 && b > 200 && g < 90) return true;
  /* 이펙트 시트 흰/회색 matte */
  if (r >= 232 && g >= 232 && b >= 232) return true;
  if (r >= 218 && g >= 218 && b >= 218 && Math.abs(r - g) < 10 && Math.abs(g - b) < 10) return true;
  return false;
}

/** @deprecated isBackgroundPixel negation */
function isSpritePixel(r: number, g: number, b: number, a: number): boolean {
  return !isBackgroundPixel(r, g, b, a);
}

const keyedCanvasCache = new Map<string, HTMLCanvasElement>();

interface KeyedContentMetrics {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** 소스 픽셀 — 이펙트 바닥(링·충격면) */
  footRow: number;
}

const keyedContentCache = new Map<string, KeyedContentMetrics>();

function scanAlphaBBox(data: Uint8ClampedArray, w: number, h: number) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  const rowCounts = new Array<number>(h).fill(0);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      if (data[i + 3]! <= 10) continue;
      found = true;
      rowCounts[py]++;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
  }

  return found ? { minX, minY, maxX, maxY, rowCounts } : null;
}

function getKeyedContentMetrics(path: string): KeyedContentMetrics | null {
  const hit = keyedContentCache.get(path);
  if (hit) return hit;

  const keyed = getKeyedCanvas(path);
  if (!keyed) return null;

  const w = keyed.width;
  const h = keyed.height;
  const ctx = keyed.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const scan = scanAlphaBBox(ctx.getImageData(0, 0, w, h).data, w, h);
  if (!scan) return null;

  const { minX, minY, maxX, maxY, rowCounts } = scan;
  const sw = maxX - minX + 1;
  const sh = maxY - minY + 1;
  const metrics: KeyedContentMetrics = {
    sx: minX,
    sy: minY,
    sw,
    sh,
    footRow: findFootRow(rowCounts, minY, maxY, sw),
  };
  keyedContentCache.set(path, metrics);
  return metrics;
}

/** 스프라이트 배경색 제거 — 캐시 */
export function getKeyedCanvas(path: string): HTMLCanvasElement | null {
  const hit = keyedCanvasCache.get(path);
  if (hit) return hit;

  const img = getImage(path);
  if (!img?.naturalWidth) return null;

  const out = document.createElement('canvas');
  out.width = img.naturalWidth;
  out.height = img.naturalHeight;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, out.width, out.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (isBackgroundPixel(d[i]!, d[i + 1]!, d[i + 2]!, d[i + 3]!)) d[i + 3] = 0;
  }
  ctx.putImageData(imgData, 0, 0);
  keyedCanvasCache.set(path, out);
  return out;
}

export function invalidateKeyedCanvasCache() {
  keyedCanvasCache.clear();
  keyedContentCache.clear();
}

function scanSpritePixels(
  data: Uint8ClampedArray, w: number, h: number,
): { minX: number; minY: number; maxX: number; maxY: number; rowCounts: number[] } | null {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  const rowCounts = new Array<number>(h).fill(0);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      if (!isSpritePixel(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
      found = true;
      rowCounts[py]++;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
  }

  return found ? { minX, minY, maxX, maxY, rowCounts } : null;
}

function findFootRow(rowCounts: number[], minY: number, maxY: number, sw: number): number {
  const threshold = Math.max(6, Math.floor(sw * 0.15));
  for (let py = maxY; py >= minY; py--) {
    if (rowCounts[py] >= threshold) return py;
  }
  return maxY;
}

/** 투명·검정 여백 제거 + 발 접지선 기준 하단 정렬 (캐시) */
export function getSpriteMetrics(path: string, crop: SpriteCrop): SpriteMetrics {
  const key = trimKey(path, crop);
  const hit = metricsCache.get(key);
  if (hit) return hit;

  const fallback: SpriteMetrics = { crop, feetPadBottom: 0 };
  const img = getImage(path);
  if (!img) return fallback;

  if (!trimCanvas) {
    trimCanvas = document.createElement('canvas');
    trimCtx = trimCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!trimCtx) return fallback;

  const w = crop.sw;
  const h = crop.sh;
  if (trimCanvas.width < w) trimCanvas.width = w;
  if (trimCanvas.height < h) trimCanvas.height = h;

  trimCtx.clearRect(0, 0, w, h);
  trimCtx.drawImage(img, crop.sx, crop.sy, w, h, 0, 0, w, h);
  const scan = scanSpritePixels(trimCtx.getImageData(0, 0, w, h).data, w, h);
  if (!scan) {
    metricsCache.set(key, fallback);
    return fallback;
  }

  const { minX, minY, maxX, maxY, rowCounts } = scan;
  const footRow = findFootRow(rowCounts, minY, maxY, maxX - minX + 1);
  // 스프라이트 본체는 절대 자르지 않음 — 검정/투명 여백(bbox)만 제거
  const trimmed: SpriteCrop = {
    sx: crop.sx + minX,
    sy: crop.sy + minY,
    sw: maxX - minX + 1,
    sh: maxY - minY + 1,
  };
  const metrics: SpriteMetrics = {
    crop: trimmed,
    feetPadBottom: maxY - footRow,
  };

  metricsCache.set(key, metrics);
  trimCache.set(key, trimmed);
  return metrics;
}

/** @deprecated getSpriteMetrics 사용 */
export function getTrimmedCrop(path: string, crop: SpriteCrop): SpriteCrop {
  return getSpriteMetrics(path, crop).crop;
}

/** trim 후 비율 유지, maxH 기준 표시 크기 */
export function getSpriteDrawSize(crop: SpriteCrop, maxH: number, maxW?: number): { w: number; h: number } {
  const aspect = crop.sw / crop.sh;
  let h = maxH;
  let w = h * aspect;
  if (maxW && w > maxW) {
    w = maxW;
    h = w / aspect;
  }
  return { w, h };
}

export interface DrawSpriteOpts {
  flipX?: boolean;
  alpha?: number;
  flash?: number;
  sx?: number;
  sy?: number;
  sw?: number;
  sh?: number;
  /** true면 투명 여백 제거 후 그림 (기본 true) */
  trim?: boolean;
}

/** Canvas 픽셀아트 모드 (nearest-neighbor) */
export function configurePixelArtContext(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = false;
  (ctx as CanvasRenderingContext2D & { webkitImageSmoothingEnabled?: boolean }).webkitImageSmoothingEnabled = false;
  (ctx as CanvasRenderingContext2D & { mozImageSmoothingEnabled?: boolean }).mozImageSmoothingEnabled = false;
}

/** 프레임 내 발 위치 (0=상단, 1=하단) — keyed 알파 스캔 */
export function getSpriteFootNorm(path: string, srcH: number): number {
  const m = getKeyedContentMetrics(path);
  if (!m || srcH <= 0) return 1;
  return Math.min(1, Math.max(0, m.footRow / srcH));
}

/** Canvas 픽셀아트 — chroma key 후 발 접지선(footY)에 맞춤 */
export function drawPixelSprite(
  ctx: CanvasRenderingContext2D,
  path: string,
  x: number, y: number,
  w: number, h: number,
  opts?: { flipX?: boolean; alpha?: number; flash?: number },
): boolean {
  const img = getImage(path);
  if (!img) return false;

  const keyed = getKeyedCanvas(path);
  const src: CanvasImageSource = keyed ?? img;

  ctx.save();
  configurePixelArtContext(ctx);
  if (opts?.alpha != null) ctx.globalAlpha = opts.alpha;

  const iw = Math.round(w);
  const ih = Math.round(h);
  const sw = keyed ? keyed.width : img.naturalWidth;
  const sh = keyed ? keyed.height : img.naturalHeight;
  const footNorm = getSpriteFootNorm(path, sh);
  const footLift = ih * footNorm;

  if (opts?.flipX) {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0, sw, sh, -iw / 2, -footLift, iw, ih);
  } else {
    const dx = Math.round(x - iw / 2);
    const dy = Math.round(y - footLift);
    ctx.drawImage(src, 0, 0, sw, sh, dx, dy, iw, ih);
  }

  if (opts?.flash && opts.flash > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(255,55,55,${opts.flash})`;
    const flashW = Math.max(2, Math.round(iw * 0.32));
    const flashH = Math.max(2, Math.round(ih * 0.32));
    const dx = Math.round(x - iw / 2);
    const dy = Math.round(y - footLift);
    const torsoY = opts?.flipX ? -ih * 0.58 : dy + ih * 0.42 - flashH / 2;
    if (opts?.flipX) {
      ctx.fillRect(-flashW / 2, torsoY - flashH / 2, flashW, flashH);
    } else {
      ctx.fillRect(dx + (iw - flashW) / 2, torsoY, flashW, flashH);
    }
  }
  ctx.restore();
  return true;
}

/** 이펙트 — chroma key + trim, 바닥 접지선을 footY에 맞춤 */
export function drawPixelSpriteImpact(
  ctx: CanvasRenderingContext2D,
  path: string,
  x: number,
  footY: number,
  maxH: number,
  maxW?: number,
  opts?: { alpha?: number; flash?: number; glow?: boolean },
): boolean {
  const keyed = getKeyedCanvas(path);
  if (!keyed) return false;
  const m = getKeyedContentMetrics(path);
  if (!m) return false;

  let ih = Math.round(maxH);
  let iw = Math.round(ih * (m.sw / m.sh));
  if (maxW && iw > maxW) {
    iw = Math.round(maxW);
    ih = Math.round(iw / (m.sw / m.sh));
  }

  const footInCrop = m.footRow - m.sy;
  const footNorm = footInCrop / m.sh;
  const dx = Math.round(x - iw / 2);
  const dy = Math.round(footY - ih * footNorm);

  ctx.save();
  configurePixelArtContext(ctx);
  if (opts?.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.drawImage(keyed, m.sx, m.sy, m.sw, m.sh, dx, dy, iw, ih);

  if (opts?.glow) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.28;
    ctx.drawImage(keyed, m.sx, m.sy, m.sw, m.sh, dx, dy, iw, ih);
  }

  if (opts?.flash && opts.flash > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,220,120,${opts.flash})`;
    const fw = Math.max(2, Math.round(iw * 0.5));
    const fh = Math.max(2, Math.round(ih * 0.5));
    ctx.fillRect(dx + (iw - fw) / 2, dy + (ih - fh) / 2, fw, fh);
  }
  ctx.restore();
  return true;
}

/** @deprecated drawPixelSpriteImpact 권장 */
export function drawPixelSpriteCentered(
  ctx: CanvasRenderingContext2D,
  path: string,
  x: number, y: number,
  w: number, h: number,
  opts?: { alpha?: number; flash?: number; glow?: boolean },
): boolean {
  const img = getImage(path);
  if (!img) return false;

  const keyed = getKeyedCanvas(path);
  const src: CanvasImageSource = keyed ?? img;
  const sw = keyed ? keyed.width : img.naturalWidth;
  const sh = keyed ? keyed.height : img.naturalHeight;

  ctx.save();
  configurePixelArtContext(ctx);
  if (opts?.alpha != null) ctx.globalAlpha = opts.alpha;

  const iw = Math.round(w);
  const ih = Math.round(h);
  const dx = Math.round(x - iw / 2);
  const dy = Math.round(y - ih / 2);
  ctx.drawImage(src, 0, 0, sw, sh, dx, dy, iw, ih);

  if (opts?.glow) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.28;
    ctx.drawImage(src, 0, 0, sw, sh, dx, dy, iw, ih);
  }

  if (opts?.flash && opts.flash > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,220,120,${opts.flash})`;
    const fw = Math.max(2, Math.round(iw * 0.5));
    const fh = Math.max(2, Math.round(ih * 0.5));
    ctx.fillRect(dx + (iw - fw) / 2, dy + (ih - fh) / 2, fw, fh);
  }
  ctx.restore();
  return true;
}

/** 투사체·이펙트 프레임 chroma key 선처리 */
export function preloadKeyedFrames(paths: string[]) {
  for (const path of paths) {
    void loadImage(path).then(() => { getKeyedCanvas(path); });
  }
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  path: string,
  x: number, y: number,
  w: number, h: number,
  opts?: DrawSpriteOpts,
) {
  const img = getImage(path);
  if (!img) return false;

  let sx = opts?.sx ?? 0;
  let sy = opts?.sy ?? 0;
  let sw = opts?.sw ?? img.naturalWidth;
  let sh = opts?.sh ?? img.naturalHeight;
  if (opts?.trim !== false) {
    const metrics = getSpriteMetrics(path, { sx, sy, sw, sh });
    sx = metrics.crop.sx;
    sy = metrics.crop.sy;
    sw = metrics.crop.sw;
    sh = metrics.crop.sh;
  }

  ctx.save();
  if (opts?.alpha != null) ctx.globalAlpha = opts.alpha;
  const dx = opts?.flipX ? -w / 2 : x - w / 2;
  const dy = y - h;
  if (opts?.flipX) {
    ctx.translate(x + w / 2, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, w, h);
  } else {
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, w, h);
  }
  if (opts?.flash && opts.flash > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(255,55,55,${opts.flash})`;
    const fw = Math.max(2, w * 0.32);
    const fh = Math.max(2, h * 0.32);
    ctx.fillRect(dx + (w - fw) / 2, dy + h * 0.42 - fh / 2, fw, fh);
  }
  ctx.restore();
  return true;
}
