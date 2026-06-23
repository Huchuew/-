import type { GameSave } from '../types';

export const GEM_AD_REWARD = 5;
export const GEM_AD_COOLDOWN_MS = 35 * 60 * 1000;

export function canWatchGemAd(save: GameSave): boolean {
  return Date.now() >= (save.gemAdUntil ?? 0);
}

export function getGemAdCooldownSec(save: GameSave): number {
  return Math.max(0, Math.ceil(((save.gemAdUntil ?? 0) - Date.now()) / 1000));
}

export function formatGemAdCooldown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function grantGemAdReward(save: GameSave) {
  save.gems += GEM_AD_REWARD;
  save.gemAdUntil = Date.now() + GEM_AD_COOLDOWN_MS;
  save.stats.adsWatched = (save.stats.adsWatched ?? 0) + 1;
}
