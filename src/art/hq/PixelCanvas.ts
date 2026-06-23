/** 96×96 고해상도 픽셀 캔버스 — 1픽셀 단위 색상·알파 블렌딩 */
export const HQ_SIZE = 96;

export function hex(c: number): [number, number, number] {
  return [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff];
}

export class PixelCanvas {
  readonly w: number;
  readonly h: number;
  private px: Uint8ClampedArray;

  constructor(w = HQ_SIZE, h = HQ_SIZE) {
    this.w = w;
    this.h = h;
    this.px = new Uint8ClampedArray(w * h * 4);
  }

  clear() {
    this.px.fill(0);
  }

  clone(): PixelCanvas {
    const c = new PixelCanvas(this.w, this.h);
    c.px.set(this.px);
    return c;
  }

  set(x: number, y: number, color: number, a = 255) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    const i = (iy * this.w + ix) * 4;
    if (a >= 255) {
      const [r, g, b] = hex(color);
      this.px[i] = r; this.px[i + 1] = g; this.px[i + 2] = b; this.px[i + 3] = 255;
      return;
    }
    const srcA = a / 255;
    const [sr, sg, sb] = hex(color);
    const dstA = this.px[i + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA < 0.001) return;
    this.px[i] = Math.round((sr * srcA + this.px[i] * dstA * (1 - srcA)) / outA);
    this.px[i + 1] = Math.round((sg * srcA + this.px[i + 1] * dstA * (1 - srcA)) / outA);
    this.px[i + 2] = Math.round((sb * srcA + this.px[i + 2] * dstA * (1 - srcA)) / outA);
    this.px[i + 3] = Math.round(outA * 255);
  }

  fillRect(x0: number, y0: number, w: number, h: number, color: number, a = 255) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) this.set(x, y, color, a);
  }

  fillCircle(cx: number, cy: number, r: number, color: number, a = 255) {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) this.set(x, y, color, a);
  }

  /** 부드러운 원 — 가장자리 알파 감쇠 */
  softCircle(cx: number, cy: number, r: number, color: number, maxA = 255) {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (d > r) continue;
        const edge = d > r - 1.2 ? (r - d) / 1.2 : 1;
        this.set(x, y, color, Math.round(maxA * Math.max(0, edge)));
      }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: number, thick = 1) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const steps = Math.max(dx, dy, 1);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      for (let oy = -thick; oy <= thick; oy++)
        for (let ox = -thick; ox <= thick; ox++)
          if (ox * ox + oy * oy <= thick * thick) this.set(x + ox, y + oy, color);
    }
  }

  blit(other: PixelCanvas, ox: number, oy: number) {
    for (let y = 0; y < other.h; y++)
      for (let x = 0; x < other.w; x++) {
        const i = (y * other.w + x) * 4;
        if (other.px[i + 3] === 0) continue;
        this.set(ox + x, oy + y,
          (other.px[i] << 16) | (other.px[i + 1] << 8) | other.px[i + 2],
          other.px[i + 3],
        );
      }
  }

  toImageData(): ImageData {
    return new ImageData(new Uint8ClampedArray(this.px), this.w, this.h);
  }
}
