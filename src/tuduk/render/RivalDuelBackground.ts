import { getImage } from '../assets/AssetLoader';
import type { BattleSceneLayout } from './battleSceneLayout';

export const RIVAL_DUEL_BG_PATH = 'assets/backgrounds/rival_colosseum.png';

/** 결투장 배경 — 고정 파노라마 (스크롤 없음) */
export function drawRivalDuelBackground(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  hudTop = 8,
): BattleSceneLayout {
  const groundY = Math.round(canvasH * 0.9);
  const panoramaTop = hudTop;

  const img = getImage(RIVAL_DUEL_BG_PATH);
  if (!img?.naturalWidth) {
    const g = ctx.createLinearGradient(0, 0, 0, canvasH);
    g.addColorStop(0, '#3a2858');
    g.addColorStop(0.45, '#6a4060');
    g.addColorStop(1, '#2a1810');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvasW, canvasH);
    return {
      panoramaTop,
      horizonY: groundY - 24,
      groundY,
      tileW: canvasW,
      tileH: canvasH,
    };
  }

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const availH = Math.max(40, canvasH - panoramaTop);
  const scale = Math.max(canvasW / iw, availH / ih);
  const drawW = Math.ceil(iw * scale);
  const drawH = Math.ceil(ih * scale);
  const x = Math.floor((canvasW - drawW) / 2);
  const y = Math.floor(canvasH - drawH);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, iw, ih, x, y, drawW, drawH);
  ctx.restore();

  const vignette = ctx.createLinearGradient(0, canvasH * 0.55, 0, canvasH);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvasW, canvasH);

  return {
    panoramaTop,
    horizonY: y + Math.floor(drawH * 0.72),
    groundY,
    tileW: drawW,
    tileH: drawH,
  };
}
