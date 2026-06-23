import type { MetaUpgrades, SaveData } from '../data/types';

const KEY = 'poker_rush_save';

export const DEFAULT_UPGRADES: MetaUpgrades = {
  comboDamage: 0,
  matchDamage: 0,
  maxHp: 0,
  defense: 0,
  goldBonus: 0,
};

export const defaultSave = (): SaveData => ({
  version: '2.1.0',
  gold: 300,
  gems: 5,
  stage: 1,
  highScore: 0,
  totalRuns: 0,
  wins: 0,
  tutorialDone: false,
  heroClass: 'knight',
  equipped: { armor: 'cloth', weapon: 'wood', helmet: 'none' },
  ownedEquipment: [],
  upgrades: { ...DEFAULT_UPGRADES },
  settings: { masterVolume: 1, musicVolume: 0.8, sfxVolume: 1, vibration: true },
});

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const d = defaultSave();
      return {
        ...d, ...parsed,
        upgrades: { ...DEFAULT_UPGRADES, ...parsed.upgrades },
        equipped: { ...d.equipped, ...parsed.equipped },
        ownedEquipment: parsed.ownedEquipment ?? d.ownedEquipment,
        heroClass: parsed.heroClass ?? d.heroClass,
      };
    }
  } catch { /* ignore */ }
  return defaultSave();
}

export function saveGame(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}
