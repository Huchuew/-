import { getImage, getKeyedCanvas, getSpriteMetrics } from '../assets/AssetLoader';

import { getMonsterCropFromImage, monsterAssetPath } from '../data/pipoyaMap';

import { hasMonsterAnim, pickMonsterFramePath } from '../data/tinyRpgAnim';

import { drawPixelSprite } from './SpriteLoader';



export interface MonsterSpriteOpts {

  monId: string;

  x: number;

  y: number;

  w: number;

  h: number;

  animTime: number;

  flash?: number;

  inCombat: boolean;

  hp: number;

  maxHp: number;

  strikeProg?: number;

}



function drawStaticBattler(

  ctx: CanvasRenderingContext2D,

  path: string,

  x: number,

  y: number,

  w: number,

  h: number,

  opts: { flipX?: boolean; flash?: number; bounce?: number },

): boolean {

  const img = getImage(path);

  if (!img?.naturalWidth) return false;



  const fullCrop = getMonsterCropFromImage(img);

  const metrics = getSpriteMetrics(path, fullCrop);

  const { crop } = metrics;



  const keyed = getKeyedCanvas(path);

  const src: CanvasImageSource = keyed ?? img;



  const iw = Math.round(w);

  const ih = Math.round(h);

  const bounce = opts.bounce ?? 0;

  const cropSh = crop.sh || 1;

  const footInset = metrics.feetPadBottom > 0

    ? (metrics.feetPadBottom / cropSh) * ih

    : 0;

  const footLift = ih - footInset;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  let drawTop = Math.round(y - ih + footInset + bounce);
  if (opts.flipX) {
    ctx.translate(Math.round(x), Math.round(y + bounce));
    ctx.scale(-1, 1);
    ctx.drawImage(src, crop.sx, crop.sy, crop.sw, crop.sh, -iw / 2, -footLift, iw, ih);
  } else {
    drawTop = Math.round(y - ih + footInset + bounce);
    ctx.drawImage(
      src, crop.sx, crop.sy, crop.sw, crop.sh,
      Math.round(x - iw / 2), drawTop, iw, ih,
    );
  }

  if (opts.flash && opts.flash > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(255,55,55,${opts.flash})`;
    const flashW = Math.max(2, Math.round(iw * 0.32));
    const flashH = Math.max(2, Math.round(ih * 0.32));
    if (opts.flipX) {
      ctx.fillRect(-flashW / 2, -footLift + ih * 0.35, flashW, flashH);
    } else {
      ctx.fillRect(Math.round(x - iw / 2) + (iw - flashW) / 2, drawTop + ih * 0.35, flashW, flashH);
    }
  }

  ctx.restore();

  return true;

}



export function drawMonsterSprite(

  ctx: CanvasRenderingContext2D,

  opts: MonsterSpriteOpts,

): boolean {

  const staticPath = monsterAssetPath(opts.monId);

  if (getImage(staticPath)) {

    const strike = opts.strikeProg ?? 0;

    const bounce = opts.inCombat

      ? Math.sin(opts.animTime * 8) * 2 + strike * -6

      : Math.sin(opts.animTime * 4) * 3;

    return drawStaticBattler(ctx, staticPath, opts.x, opts.y, opts.w, opts.h, {

      flipX: true,

      flash: opts.flash,

      bounce,

    });

  }



  const framePath = hasMonsterAnim(opts.monId)

    ? pickMonsterFramePath(opts.monId, {

      animTime: opts.animTime,

      flash: opts.flash ?? 0,

      hp: opts.hp,

      maxHp: opts.maxHp,

      inCombat: opts.inCombat,

      strikeProg: opts.strikeProg ?? 0,

    })

    : null;



  if (!framePath) return false;

  return drawPixelSprite(ctx, framePath, opts.x, opts.y, opts.w, opts.h, {

    flipX: true,

    flash: opts.flash,

  });

}

