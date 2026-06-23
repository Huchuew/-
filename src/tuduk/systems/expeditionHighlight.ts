import type { GameSave } from '../types';

export interface ExpeditionHighlight {
  kind: 'return' | 'defeat';
  matQty: number;
  goldEarned: number;
  at: number;
  dismissed?: boolean;
}

export function setExpeditionHighlight(
  save: GameSave,
  data: Omit<ExpeditionHighlight, 'at' | 'dismissed'>,
): void {
  save.lastExpeditionHighlight = {
    ...data,
    at: Date.now(),
    dismissed: false,
  };
}

export function dismissExpeditionHighlight(save: GameSave): void {
  if (save.lastExpeditionHighlight) {
    save.lastExpeditionHighlight.dismissed = true;
  }
}

export function clearExpeditionHighlight(save: GameSave): void {
  delete save.lastExpeditionHighlight;
}

export function getActiveExpeditionHighlight(save: GameSave): ExpeditionHighlight | null {
  const h = save.lastExpeditionHighlight;
  if (!h || h.dismissed) return null;
  return h;
}
