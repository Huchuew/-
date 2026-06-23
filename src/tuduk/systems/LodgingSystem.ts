import type { GameSave } from '../types';

export const LODGING_BG_PATH = '/assets/lodging/bg_camp.png';

export function isAtLodging(save: GameSave): boolean {
  return save.location !== 'dungeon';
}

export function isInExpedition(save: GameSave): boolean {
  return save.inExpedition === true && save.location === 'dungeon';
}

export function ensureLocation(save: GameSave) {
  if (!save.location) save.location = 'lodging';
  if (save.inExpedition == null) save.inExpedition = false;
}
