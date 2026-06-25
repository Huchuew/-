/** 야탑 = 지하 심연 하강 (B1, B2 …) */

export type SpireDepthTier = 'entry' | 'deep' | 'abyss' | 'void';

export interface SpireDepthProfile {
  floor: number;
  label: string;
  saturation: number;
  brightness: number;
  vignette: number;
  bgmVolume: number;
  touchOnly: boolean;
  uiFade: number;
  tier: SpireDepthTier;
  hint?: string;
}

export function formatSpireBasementFloor(floor: number): string {
  if (floor <= 0) return '—';
  return `B${floor}`;
}

export function formatSpireBasementLabel(floor: number, withIcon = true): string {
  const base = formatSpireBasementFloor(floor);
  return withIcon ? `🗼 ${base}` : base;
}

export function formatSpireBasementWithWave(floor: number, wave: number, wavesRequired: number): string {
  return `${formatSpireBasementLabel(floor)} · ${wave}/${wavesRequired}웨이브`;
}

export function getSpireDepthProfile(floor: number): SpireDepthProfile {
  const label = formatSpireBasementFloor(floor);

  if (floor <= 5) {
    return {
      floor,
      label,
      saturation: 1,
      brightness: 1,
      vignette: 0.18,
      bgmVolume: 1,
      touchOnly: false,
      uiFade: 0,
      tier: 'entry',
      hint: '지하 입구 — 탑은 위가 아니라 아래로 이어진다',
    };
  }

  if (floor <= 12) {
    const t = (floor - 5) / 7;
    return {
      floor,
      label,
      saturation: 1 - t * 0.38,
      brightness: 1 - t * 0.22,
      vignette: 0.18 + t * 0.22,
      bgmVolume: 1 - t * 0.3,
      touchOnly: false,
      uiFade: t * 0.18,
      tier: 'deep',
    };
  }

  if (floor <= 24) {
    const t = (floor - 12) / 12;
    return {
      floor,
      label,
      saturation: 0.62 - t * 0.48,
      brightness: 0.78 - t * 0.38,
      vignette: 0.4 + t * 0.38,
      bgmVolume: Math.max(0, 0.7 - t * 0.7),
      touchOnly: floor >= 20,
      uiFade: 0.18 + t * 0.52,
      tier: 'abyss',
      hint: floor >= 18 ? '멀리서 들리던 소리가 끊긴다…' : undefined,
    };
  }

  const t = Math.min(1, (floor - 24) / 16);
  return {
    floor,
    label,
    saturation: Math.max(0.05, 0.14 - t * 0.1),
    brightness: Math.max(0.2, 0.4 - t * 0.18),
    vignette: 0.78 + t * 0.2,
    bgmVolume: 0,
    touchOnly: true,
    uiFade: 0.7 + t * 0.28,
    tier: 'void',
    hint: '심연 — 투닥만이 남았다',
  };
}

export function isSpireTouchOnlyFloor(floor: number): boolean {
  return getSpireDepthProfile(floor).touchOnly;
}
