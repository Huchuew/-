/**
 * A안: Pipoya 무료 에셋 → 스프라이트 크롭
 */
import { getImage, getSpriteMetrics } from '../assets/AssetLoader';
import { PIPOYA_MONSTER_BINDINGS, type PipoyaCropKind } from './pipoyaMonsters';

/** 던전 캔버스 지면 Y 비율 — 배경·캐릭터·몬스터 공통 */
export const GROUND_Y_RATIO = 0.96;

export interface SpriteCrop {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/** 1280×600 보스 시트 — 1프레임 전체 */
export const PIPOYA_BOSS_CROP: SpriteCrop = { sx: 0, sy: 0, sw: 320, sh: 600 };

/** 600×600 대형 몬스터 — 이미지 전체 */
export const PIPOYA_LARGE_CROP: SpriteCrop = { sx: 0, sy: 0, sw: 600, sh: 600 };

/** Pipoya 캐릭터 96×128 — 우측 방향 걷기 */
export const PIPOYA_CHAR_CROP: SpriteCrop = { sx: 32, sy: 64, sw: 32, sh: 32 };

const CROP_BY_KIND: Record<PipoyaCropKind, SpriteCrop> = {
  enemy: { sx: 0, sy: 0, sw: 160, sh: 160 }, // fallback, 이미지 기준으로 덮어씀
  boss: PIPOYA_BOSS_CROP,
  large: PIPOYA_LARGE_CROP,
};

/** 몬스터 — 이미지 전체 사용 (스프라이트 시트 셀 크롭 금지) */
export function getMonsterCropFromImage(img: HTMLImageElement, _monsterId?: string): SpriteCrop {
  return { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };
}

export function monsterAssetPath(id: string): string {
  return `assets/monsters/${id}.png`;
}

export function charAssetPath(id: string): string {
  return `assets/characters/${id}.png`;
}

export function dungeonAssetPath(regionId: number): string {
  return `assets/dungeon/dungeon_${String(regionId).padStart(2, '0')}.png`;
}

/** @deprecated getMonsterCropFromImage 사용 */
export function getMonsterCrop(monsterId: string): SpriteCrop {
  const kind = PIPOYA_MONSTER_BINDINGS[monsterId]?.crop ?? 'enemy';
  return CROP_BY_KIND[kind];
}

/** 비율 유지 축소만 — 몬스터는 작게 표시 */
export function getMonsterDrawSize(
  crop: SpriteCrop,
  canvasW: number,
  canvasH: number,
  hudH: number,
  isBoss = false,
): { w: number; h: number } {
  const groundY = canvasH * GROUND_Y_RATIO;
  const labelRoom = 28;
  const availH = groundY - hudH - labelRoom;
  const hRatio = isBoss ? 0.48 : 0.32;
  const wRatio = isBoss ? 0.28 : 0.18;
  const maxH = Math.max(24, availH * hRatio);
  const maxW = canvasW * wRatio;

  const scale = Math.min(maxH / crop.sh, maxW / crop.sw, 1);
  return { w: crop.sw * scale, h: crop.sh * scale };
}

/** 전투 화면 — 배틀러 PNG 표시 크기 (검정 여백 제거 후 화면 비율에 맞춤) */
export function getMonsterBattleSpriteSize(
  canvasW: number,
  canvasH: number,
  hudH: number,
  isBoss: boolean,
  monId?: string,
): { w: number; h: number } {
  const labelRoom = 36;
  /** 발 위치 보정과 무관하게 지면 기준으로 크기 산출 — 파티 상승 시 적 축소 방지 */
  const groundY = canvasH - 2;
  const availH = Math.max(80, groundY - hudH - labelRoom);
  const hRatio = isBoss ? 0.50 : 0.36;
  const wRatio = isBoss ? 0.30 : 0.22;
  const maxH = availH * hRatio;
  const maxW = canvasW * wRatio;

  let crop: SpriteCrop = { sx: 0, sy: 0, sw: 200, sh: 260 };
  if (monId) {
    const path = monsterAssetPath(monId);
    const img = getImage(path);
    if (img?.naturalWidth) {
      crop = getSpriteMetrics(path, getMonsterCropFromImage(img, monId)).crop;
    }
  }

  const scale = Math.min(maxH / crop.sh, maxW / crop.sw);
  return {
    w: Math.max(32, Math.round(crop.sw * scale)),
    h: Math.max(40, Math.round(crop.sh * scale)),
  };
}

export function getCharCrop(): SpriteCrop {
  return PIPOYA_CHAR_CROP;
}

/** 캐릭터 시트(96×128) — 프레임 크기 자동 감지 */
export function getCharCropFromImage(img: HTMLImageElement): SpriteCrop {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (nw === 96 && nh === 128) return PIPOYA_CHAR_CROP;
  if (nw % 3 === 0 && nh % 4 === 0) {
    const fw = nw / 3;
    const fh = nh / 4;
    return { sx: fw, sy: fh * 2, sw: fw, sh: fh };
  }
  return { sx: 0, sy: 0, sw: nw, sh: nh };
}

export const PIPOYA_SETUP_PATHS = {
  monsterZip: 'tools/incoming/Pipoya RPG Monster Pack.zip',
  charZip: 'tools/incoming/PIPOYA FREE RPG Character Sprites 32x32.zip',
  tileZip: 'tools/incoming/FREE RPG Tileset 32x32.zip',
};
