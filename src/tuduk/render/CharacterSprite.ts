import { drawPixelSprite } from './SpriteLoader';
import { getCharAnimFramePath, hasCharAnim } from '../data/tinyRpgAnim';
export interface CharacterSpriteOpts {
  charId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  inCombat: boolean;
  animTime: number;
  flash?: number;
  slot?: number;
  dashProg?: number;
  dashSlot?: number | null;
  strikeAnimKey?: string | null;
  meleeEngaged?: boolean;
  hp?: number;
  dieAnimProgress?: number;
}

export function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  opts: CharacterSpriteOpts,
): boolean {
  const framePath = hasCharAnim(opts.charId) && opts.slot != null
    ? getCharAnimFramePath(opts.charId, {
      slot: opts.slot,
      animTime: opts.animTime,
      inCombat: opts.inCombat,
      flash: opts.flash ?? 0,
      dashProg: opts.dashProg ?? 0,
      dashSlot: opts.dashSlot ?? null,
      strikeAnimKey: opts.strikeAnimKey ?? null,
      meleeEngaged: opts.meleeEngaged ?? false,
      hp: opts.hp,
      dieAnimProgress: opts.dieAnimProgress,
    })
    : null;

  if (!framePath) return false;
  return drawPixelSprite(ctx, framePath, opts.x, opts.y, opts.w, opts.h, {
    flash: opts.flash,
  });
}
