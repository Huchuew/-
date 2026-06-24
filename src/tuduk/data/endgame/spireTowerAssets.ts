export const SPIRE_TOWER_LAYERS = {
  back: 'assets/spire-tower/back.png',
  far: 'assets/spire-tower/far.png',
  middle: 'assets/spire-tower/middle.png',
  near: 'assets/spire-tower/near.png',
  foreground: 'assets/spire-tower/foreground.png',
  tileset: 'assets/spire-tower/tileset.png',
  torch: 'assets/spire-tower/torch.png',
} as const;

/** 패럴랙스 스크롤 배율 (느릴수록 멀리) */
export const SPIRE_PARALLAX = {
  back: 0.08,
  far: 0.16,
  middle: 0.32,
  near: 0.55,
  foreground: 0.85,
  floor: 1.0,
} as const;

export function spireTowerAssetPaths(): string[] {
  return Object.values(SPIRE_TOWER_LAYERS);
}
