import type { BgmResolveInput } from '../data/rmmzBgm';
import { audio } from './AudioManager';

let provider: (() => BgmResolveInput) | null = null;

export function setBgmContextProvider(fn: () => BgmResolveInput) {
  provider = fn;
}

export function refreshBgm() {
  if (provider) audio.syncBgm(provider());
}
