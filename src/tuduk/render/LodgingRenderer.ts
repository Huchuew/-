import { loadImage } from '../assets/AssetLoader';
import { CHAR_MAP } from '../data/characters';
import { CHAR_FOOT_LIFT_RATIO, getCharNameYRatio } from '../data/charUiLayout';
import { getBattleSpriteSize } from '../data/tinyRpgAnim';
import { LODGING_BG_PATH } from '../systems/LodgingSystem';
import type { GameSave } from '../types';
import { drawCharacterSprite } from './CharacterSprite';

const SCROLL_SPEED = 18;

export class LodgingRenderer {
  private scrollX = 0;
  private bg: HTMLImageElement | null = null;
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  ensureLoaded(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = loadImage(LODGING_BG_PATH).then(img => {
      this.bg = img;
      this.loaded = true;
    });
    return this.loadPromise;
  }

  update(dt: number) {
    this.scrollX += SCROLL_SPEED * dt;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    animTime: number,
    opts?: { save?: GameSave; atLodging?: boolean; resting?: boolean },
  ) {
    ctx.save();
    ctx.fillStyle = '#1a1428';
    ctx.fillRect(0, 0, w, h);

    const groundY = this.getGroundY(w, h);

    if (this.bg?.complete && this.bg.naturalWidth > 0) {
      const img = this.bg;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * 1.08;
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const y = h - drawH + h * 0.06;
      const offset = this.scrollX % drawW;
      for (let x = -offset - drawW; x < w + drawW; x += drawW) {
        ctx.drawImage(img, x, y, drawW, drawH);
      }
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(20, 12, 40, 0.35)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
      grad.addColorStop(1, 'rgba(8, 6, 18, 0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    if (opts?.save && opts.atLodging) {
      this.drawWalkingParty(ctx, w, h, groundY, animTime, opts.save, !!opts.resting);
    }

    ctx.restore();
  }

  private getGroundY(w: number, h: number): number {
    if (this.bg?.complete && this.bg.naturalWidth > 0) {
      const img = this.bg;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * 1.08;
      const drawH = img.naturalHeight * scale;
      const topY = h - drawH + h * 0.06;
      return Math.min(h - 2, topY + drawH * 0.828);
    }
    return h * 0.885;
  }

  /** 보유 캐릭터를 한 줄로 겹치지 않게 배치 */
  private layoutWalkingRow(
    w: number,
    count: number,
    baseW: number,
    baseH: number,
  ): { sw: number; sh: number; xs: number[] } {
    const sideMargin = Math.max(10, w * 0.04);
    const availW = w - sideMargin * 2;
    const spacing = 1.08; // 스프라이트 폭 대비 중심 간격 — 살짝 여유

    let sw = Math.max(26, Math.round(baseW * 0.88));
    let sh = Math.max(32, Math.round(baseH * 0.88));

    const rowWidth = count <= 1 ? sw : (count - 1) * sw * spacing + sw;
    if (rowWidth > availW && count > 1) {
      sw = Math.floor(availW / ((count - 1) * spacing + 1));
      sw = Math.max(22, Math.min(sw, baseW));
      sh = Math.max(28, Math.round(baseH * (sw / Math.max(1, baseW))));
    }

    const gap = count <= 1 ? 0 : sw * spacing;
    const totalSpan = count <= 1 ? sw : (count - 1) * gap + sw;
    const startX = sideMargin + (availW - totalSpan) * 0.5 + sw * 0.5;
    const xs = Array.from({ length: count }, (_, i) => Math.round(startX + i * gap));

    return { sw, sh, xs };
  }

  private drawWalkingParty(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    groundY: number,
    animTime: number,
    save: GameSave,
    resting: boolean,
  ) {
    const ids = save.owned.filter(id => CHAR_MAP[id]);
    if (!ids.length) return;

    const hudH = h * 0.11;
    const baseSize = getBattleSpriteSize(w, h, hudH, groundY, 'player');
    const { sw, sh, xs } = this.layoutWalkingRow(w, ids.length, baseSize.w, baseSize.h);
    const footLift = h * CHAR_FOOT_LIFT_RATIO * 0.58;
    const groundSink = h * 0.006;

    if (resting) {
      ctx.textAlign = 'center';
      ctx.font = `600 ${Math.max(10, h * 0.026)}px Outfit, 'Malgun Gothic', sans-serif`;
      ctx.fillStyle = 'rgba(180, 255, 210, 0.85)';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      const hint = '🛏️ 휴식 중…';
      ctx.strokeText(hint, w / 2, groundY - sh - 10);
      ctx.fillText(hint, w / 2, groundY - sh - 10);
    }

    ids.forEach((id, i) => {
      const def = CHAR_MAP[id]!;
      const px = xs[i]!;
      const bob = Math.sin(animTime * 2.6 + i * 0.85) * (resting ? 0.8 : 1.4);
      const py = Math.round(groundY - footLift + groundSink + bob);

      const drawn = drawCharacterSprite(ctx, {
        charId: id,
        x: px,
        y: py,
        w: sw,
        h: sh,
        inCombat: false,
        animTime: animTime * 0.52 + i * 0.35,
        slot: i,
      });

      if (!drawn) {
        ctx.fillStyle = def.color;
        ctx.fillRect(px - sw / 2, py - sh, sw, sh);
      }

      const nameY = py - Math.round(sh * getCharNameYRatio(id)) - 1;
      const level = save.chars[id]?.level ?? 1;
      this.drawCharName(ctx, px, nameY, def.name, level, sw, def.color);
    });
  }

  private drawCharName(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    name: string,
    level: number,
    spriteW: number,
    color: string,
  ) {
    const fontSize = Math.max(8, Math.min(11, Math.round(spriteW * 0.26)));
    const lvSize = Math.max(7, fontSize - 2);
    const lvText = `Lv.${level}`;

    ctx.save();
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = Math.max(2, fontSize * 0.22);
    ctx.strokeStyle = 'rgba(0,0,0,0.72)';

    ctx.font = `bold ${fontSize}px Outfit, 'Malgun Gothic', sans-serif`;
    const nameW = ctx.measureText(name).width;
    ctx.font = `600 ${lvSize}px Outfit, 'Malgun Gothic', sans-serif`;
    const lvW = ctx.measureText(` ${lvText}`).width;
    const totalW = nameW + lvW;
    const leftX = x - totalW / 2;

    ctx.textAlign = 'left';
    ctx.font = `bold ${fontSize}px Outfit, 'Malgun Gothic', sans-serif`;
    ctx.fillStyle = color;
    ctx.strokeText(name, leftX, y);
    ctx.fillText(name, leftX, y);

    ctx.font = `600 ${lvSize}px Outfit, 'Malgun Gothic', sans-serif`;
    ctx.fillStyle = 'rgba(220, 230, 255, 0.92)';
    ctx.strokeText(` ${lvText}`, leftX + nameW, y);
    ctx.fillText(` ${lvText}`, leftX + nameW, y);
    ctx.restore();
  }
}
