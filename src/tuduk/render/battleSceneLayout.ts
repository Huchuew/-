import { getImage } from '../assets/AssetLoader';
import { STAGE_BACKGROUNDS, backgroundIndexForRegion } from '../data/stageBackgrounds';

/** 파노라마 시작 (HUD는 캔버스 밖) */
export const PANORAMA_TOP_RATIO = 0.02;

/** 캐릭터·몬스터 발 위치 — 별도 녹색 지면 없이 배경 PNG 하단까지 사용 */
export const GROUND_STRIP_RATIO = 0;

const DEFAULT_IMG_W = 1536;
const DEFAULT_IMG_H = 112;

export interface BgTileScale {
  tileW: number;
  tileH: number;
  scale: number;
}

export interface BattleSceneLayout {
  panoramaTop: number;
  horizonY: number;
  groundY: number;
  tileW: number;
  tileH: number;
}

function resolveImageSize(regionId: number): { iw: number; ih: number } {
  const idx = backgroundIndexForRegion(regionId);
  const def = STAGE_BACKGROUNDS[idx];
  if (def) {
    const img = getImage(def.file);
    if (img?.naturalWidth) {
      return { iw: img.naturalWidth, ih: img.naturalHeight };
    }
  }
  return { iw: DEFAULT_IMG_W, ih: DEFAULT_IMG_H };
}

/** 파노라마가 남은 세로 공간을 꽉 채우도록 스케일 */
export function computeBgTileScale(
  iw: number, ih: number, canvasW: number, availableH: number,
): BgTileScale {
  const scale = Math.max(canvasW / iw, availableH / ih);
  return {
    tileW: Math.round(iw * scale),
    tileH: Math.round(ih * scale),
    scale,
  };
}

export function getBattleSceneLayout(
  canvasW: number,
  canvasH: number,
  regionId: number,
): BattleSceneLayout {
  const { iw, ih } = resolveImageSize(regionId);

  const panoramaTop = Math.round(canvasH * PANORAMA_TOP_RATIO);
  const groundStripH = Math.round(canvasH * GROUND_STRIP_RATIO);
  const groundY = canvasH - 2;
  const availablePanoramaH = Math.max(40, canvasH - panoramaTop - groundStripH);

  const { tileW, tileH } = computeBgTileScale(iw, ih, canvasW, availablePanoramaH);
  const horizonY = panoramaTop + tileH;

  return { panoramaTop, horizonY, groundY, tileW, tileH };
}
