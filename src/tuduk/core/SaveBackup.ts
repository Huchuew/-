import type { GameSave } from '../types';
import { reconcileSave, saveGame } from './SaveManager';

const EXPORT_VERSION = 1;

export interface SaveExportPayload {
  v: number;
  exportedAt: string;
  game: GameSave;
}

export function serializeSave(save: GameSave): string {
  const payload: SaveExportPayload = {
    v: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    game: save,
  };
  return JSON.stringify(payload);
}

export function parseSaveExport(raw: string): GameSave | null {
  try {
    const data = JSON.parse(raw) as SaveExportPayload | GameSave;
    const game = 'game' in data && data.game ? data.game : data;
    if (!game || typeof game !== 'object' || !Array.isArray((game as GameSave).party)) {
      return null;
    }
    return reconcileSave(game as GameSave);
  } catch {
    return null;
  }
}

export function downloadSaveBackup(save: GameSave): boolean {
  try {
    const blob = new Blob([serializeSave(save)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `tuduk-rpg-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export function importSaveFromFile(file: File): Promise<GameSave | null> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      resolve(text ? parseSaveExport(text) : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

export function applyImportedSave(save: GameSave): void {
  saveGame(save);
}
