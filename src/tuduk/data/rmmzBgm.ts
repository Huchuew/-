import type { AdventurePhase } from '../types';
import { assetUrl } from '../assets/AssetLoader';

export const RMMZ_BGM_FILES = [
  'Battle1.ogg', 'Battle2.ogg', 'Battle3.ogg', 'Battle4.ogg', 'Battle5.ogg',
  'Battle6.ogg', 'Battle7.ogg', 'Battle8.ogg',
  'Castle1.ogg', 'Castle2.ogg', 'Castle3.ogg',
  'Dungeon1.ogg', 'Dungeon2.ogg', 'Dungeon3.ogg', 'Dungeon4.ogg', 'Dungeon5.ogg',
  'Dungeon6.ogg', 'Dungeon7.ogg',
  'Field1.ogg', 'Field2.ogg', 'Field3.ogg', 'Field4.ogg',
  'Scene1.ogg', 'Scene2.ogg', 'Scene3.ogg', 'Scene4.ogg', 'Scene5.ogg',
  'Scene6.ogg', 'Scene7.ogg', 'Scene8.ogg', 'Scene9.ogg',
  'Ship1.ogg', 'Ship2.ogg', 'Ship3.ogg',
  'Theme1.ogg', 'Theme2.ogg', 'Theme3.ogg', 'Theme4.ogg', 'Theme5.ogg', 'Theme6.ogg',
  'Town1.ogg', 'Town2.ogg', 'Town3.ogg', 'Town4.ogg', 'Town5.ogg', 'Town6.ogg',
  'Town7.ogg', 'Town8.ogg',
] as const;

export type RmmzBgmName = (typeof RMMZ_BGM_FILES)[number];

export function bgmPath(file: RmmzBgmName): string {
  return assetUrl(`assets/audio/bgm/${file}`);
}

export type LodgingWorldSub = 'dungeon' | 'codex' | 'camp' | 'shop' | 'rest' | 'bulletin';
export type CampSub = 'facilities' | 'town' | 'guild' | 'dungeon';

export interface BgmResolveInput {
  atLodging: boolean;
  phase: AdventurePhase;
  regionId: number;
  isBossFight: boolean;
  isEliteFight: boolean;
  isReturningToLodging: boolean;
  isDefeatRest: boolean;
  worldSub: LodgingWorldSub;
  campSub: CampSub;
}

const FIELD_BGMS = ['Field1.ogg', 'Field2.ogg', 'Field3.ogg', 'Field4.ogg'] as const;
const DUNGEON_BGMS = [
  'Dungeon1.ogg', 'Dungeon2.ogg', 'Dungeon3.ogg', 'Dungeon4.ogg',
  'Dungeon5.ogg', 'Dungeon6.ogg', 'Dungeon7.ogg',
] as const;
const DEEP_DUNGEON_BGMS = ['Dungeon4.ogg', 'Dungeon5.ogg', 'Dungeon6.ogg', 'Dungeon7.ogg'] as const;

export interface BgmSession {
  /** 같은 상황(층·숙소·보스 등)에서는 BGM 끊지 않음 */
  key: string;
  playlist: RmmzBgmName[];
  startIndex: number;
}

const IN_REGION_PHASES = new Set<AdventurePhase>(['walk', 'encounter', 'combat', 'loot']);

/** 숙소·마을 — 탭과 무관하게 통일 (잔잔한 마을곡) */
export const LODGING_BGM: RmmzBgmName = 'Town3.ogg';

const LODGING_PLAYLIST: RmmzBgmName[] = ['Town3.ogg', 'Town1.ogg', 'Town2.ogg', 'Town4.ogg'];
const DEFEAT_PLAYLIST: RmmzBgmName[] = ['Scene6.ogg', 'Scene7.ogg', 'Scene8.ogg'];
const RETURN_PLAYLIST: RmmzBgmName[] = ['Scene3.ogg', 'Scene1.ogg', 'Scene2.ogg'];
const BOSS_PLAYLIST: RmmzBgmName[] = ['Battle6.ogg', 'Battle7.ogg', 'Battle8.ogg'];
const SHIP_PLAYLIST: RmmzBgmName[] = ['Ship1.ogg', 'Ship2.ogg', 'Ship3.ogg'];

/** null이면 현재 곡 유지 (전리품 정산 등 짧은 구간) */
export function resolveBgm(input: BgmResolveInput): RmmzBgmName | null {
  const session = resolveBgmSession(input);
  if (!session?.playlist.length) return null;
  return session.playlist[session.startIndex] ?? null;
}

export function resolveBgmSession(input: BgmResolveInput): BgmSession | null {
  const {
    atLodging, phase, regionId, isBossFight,
    isReturningToLodging, isDefeatRest,
  } = input;

  if (isDefeatRest || phase === 'defeat') {
    return { key: 'defeat', playlist: DEFEAT_PLAYLIST, startIndex: 0 };
  }

  if (atLodging) {
    return { key: 'lodging', playlist: LODGING_PLAYLIST, startIndex: 0 };
  }

  if (phase === 'boss' || isBossFight) {
    const startIndex = regionId <= 5 ? 0 : regionId <= 11 ? 1 : 2;
    return { key: `boss:${regionId}`, playlist: BOSS_PLAYLIST, startIndex };
  }

  if (IN_REGION_PHASES.has(phase)) {
    if (regionId <= 4) {
      const playlist = [...FIELD_BGMS];
      return { key: `explore:field:${regionId}`, playlist, startIndex: (regionId - 1) % playlist.length };
    }
    if (regionId <= 11) {
      const playlist = [...DUNGEON_BGMS];
      return { key: `explore:dungeon:${regionId}`, playlist, startIndex: (regionId - 5) % playlist.length };
    }
    const playlist = [...DEEP_DUNGEON_BGMS];
    return { key: `explore:deep:${regionId}`, playlist, startIndex: (regionId - 12) % playlist.length };
  }

  if (phase === 'travel') {
    if (isReturningToLodging) {
      return { key: 'travel:return', playlist: RETURN_PLAYLIST, startIndex: 0 };
    }
    const startIndex = regionId >= 13 ? 2 : regionId >= 7 ? 1 : 0;
    return { key: `travel:${regionId}`, playlist: SHIP_PLAYLIST, startIndex };
  }

  const playlist = regionId <= 4
    ? [...FIELD_BGMS]
    : regionId <= 11
      ? [...DUNGEON_BGMS]
      : [...DEEP_DUNGEON_BGMS];
  const offset = regionId <= 4 ? 0 : regionId <= 11 ? 4 : 11;
  return {
    key: `explore:fallback:${regionId}`,
    playlist,
    startIndex: Math.max(0, regionId - 1 - offset) % playlist.length,
  };
}
