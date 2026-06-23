import {
  configurePixelArtContext, getImage, getSpriteMetrics, loadImage,
} from '../assets/AssetLoader';
import { CHAR_MAP } from '../data/characters';
import { getCharPortraitPath } from '../data/tinyRpgAnim';
import { applyCanvasPixelArtStyle } from './SpriteLoader';

export const PORTRAIT_FORMATION_PX = 58;
export const PORTRAIT_SKILL_BAR_PX = 28;
export const PORTRAIT_GROWTH_PICKER_PX = 40;
export const PORTRAIT_GROWTH_HERO_PX = 92;

/** trim 후 정사각형에 꽉 차게 (cover) — 얼굴·상반신 위주 */
function drawPortraitCover(
  ctx: CanvasRenderingContext2D,
  path: string,
  size: number,
  faceBias = 0,
  coverScale = 0.92,
): boolean {
  const img = getImage(path);
  if (!img?.naturalWidth) return false;

  const full = { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };
  const { crop } = getSpriteMetrics(path, full);
  const scale = Math.max(size / crop.sw, size / crop.sh) * coverScale;
  const dw = crop.sw * scale;
  const dh = crop.sh * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2 + faceBias;

  configurePixelArtContext(ctx);
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, dx, dy, dw, dh);
  return true;
}

export interface PortraitPaintOpts {
  coverScale?: number;
  faceBias?: number;
}

function drawFallback(
  ctx: CanvasRenderingContext2D,
  size: number,
  charId: string,
) {
  const def = CHAR_MAP[charId];
  if (!def) return;
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, def.color);
  g.addColorStop(1, def.accent);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(10, Math.round(size * 0.42))}px Outfit, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.name.slice(0, 1), size / 2, size / 2 + 1);
}

export function paintPortraitCanvas(
  canvas: HTMLCanvasElement,
  charId: string,
  size: number,
  opts: PortraitPaintOpts = {},
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  applyCanvasPixelArtStyle(canvas);
  canvas.dataset.charId = charId;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  configurePixelArtContext(ctx);
  ctx.clearRect(0, 0, size, size);

  const coverScale = opts.coverScale ?? 0.92;
  const faceBias = opts.faceBias ?? (size <= 32 ? size * 0.06 : 0);
  const path = getCharPortraitPath(charId);
  if (!path) {
    drawFallback(ctx, size, charId);
    if (!canvas.dataset.portraitRetry) {
      canvas.dataset.portraitRetry = '1';
      window.setTimeout(() => {
        delete canvas.dataset.portraitRetry;
        paintPortraitCanvas(canvas, charId, size, opts);
      }, 500);
    }
    return;
  }

  void loadImage(path).then(() => {
    if (canvas.dataset.charId !== charId) return;
    ctx.clearRect(0, 0, size, size);
    const drawn = drawPortraitCover(ctx, path, size, faceBias, coverScale);
    if (!drawn) drawFallback(ctx, size, charId);
  });
}

/** 컨테이너 내 초상화 캔버스 일괄 갱신 */
export function paintPortraitsIn(
  container: HTMLElement,
  selector: string,
  size: number,
  opts: PortraitPaintOpts = {},
) {
  container.querySelectorAll<HTMLCanvasElement>(selector).forEach(canvas => {
    const charId = canvas.dataset.charId ?? canvas.dataset.char;
    if (charId) paintPortraitCanvas(canvas, charId, size, opts);
  });
}

/** 전투 대열 카드 */
export function paintFormationPortraits(container: HTMLElement) {
  paintPortraitsIn(container, '.formation-portrait', PORTRAIT_FORMATION_PX);
}

/** 하단 스킬 바 */
export function paintSkillBarPortraits(container: HTMLElement) {
  paintPortraitsIn(container, '.skill-bar-portrait', PORTRAIT_SKILL_BAR_PX);
}

/** 강해지기 캐릭터 선택 */
export function paintGrowthCharPickers(container: HTMLElement) {
  paintPortraitsIn(container, '.growth-char-hero-portrait', PORTRAIT_GROWTH_HERO_PX, { coverScale: 0.76, faceBias: 0 });
  paintPortraitsIn(container, '.growth-char-pick-portrait', PORTRAIT_GROWTH_PICKER_PX, { coverScale: 0.74, faceBias: 0 });
}

export const PORTRAIT_BULLETIN_PX = 64;
export const PORTRAIT_ROSTER_PX = 42;

/** 소식탭 모집·명단 */
export function paintBulletinPortraits(container: HTMLElement) {
  paintPortraitsIn(container, '.bulletin-portrait', PORTRAIT_BULLETIN_PX, { coverScale: 0.78, faceBias: 2 });
  paintPortraitsIn(container, '.hero-roster-portrait', PORTRAIT_ROSTER_PX, { coverScale: 0.8, faceBias: 1 });
}

export const PORTRAIT_SURVEY_PX = 72;

/** 캐릭터 생성 설문 */
export function paintSurveyPortraits(container: HTMLElement) {
  paintPortraitsIn(container, '.survey-portrait', PORTRAIT_SURVEY_PX, { coverScale: 0.82, faceBias: 2 });
}

export const PORTRAIT_PARTY_MEMBER_PX = 76;

/** 모험단 탭 캐릭터 카드 */
export function paintPartyMemberPortraits(container: HTMLElement) {
  paintPortraitsIn(container, '.party-member-portrait', PORTRAIT_PARTY_MEMBER_PX, { coverScale: 0.82, faceBias: 2 });
}
