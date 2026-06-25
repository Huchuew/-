import type { AdventurePhase } from '../types';
import { assetUrl } from '../assets/AssetLoader';
import { getSpireDepthProfile } from './endgame/spireDepth';

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
  isInSpireRun?: boolean;
  spireFloor?: number;
}

const FIELD_BGMS = ['Field1.ogg', 'Field2.ogg', 'Field3.ogg', 'Field4.ogg'] as const;
const DUNGEON_BGMS = [
  'Dungeon1.ogg', 'Dungeon2.ogg', 'Dungeon3.ogg', 'Dungeon4.ogg',
  'Dungeon5.ogg', 'Dungeon6.ogg', 'Dungeon7.ogg',
] as const;
const DEEP_DUNGEON_BGMS = ['Dungeon4.ogg', 'Dungeon5.ogg', 'Dungeon6.ogg', 'Dungeon7.ogg'] as const;
const SPIRE_BGMS = ['Dungeon5.ogg', 'Dungeon6.ogg', 'Dungeon7.ogg', 'Scene8.ogg'] as const;
const SPIRE_VOID_BGMS = ['Scene8.ogg', 'Scene7.ogg'] as const;

export interface BgmSession {
  /** 같은 key면 곡 유지 — 층·탭마다 바꾸지 않음 */
  key: string;
  playlist: RmmzBgmName[];
  startIndex: number;
}

const IN_REGION_PHASES = new Set<AdventurePhase>(['walk', 'encounter', 'combat', 'loot']);

export const LODGING_BGM: RmmzBgmName = 'Town3.ogg';

const LODGING_PLAYLIST: RmmzBgmName[] = ['Town3.ogg', 'Town1.ogg', 'Town2.ogg', 'Town4.ogg'];
const DEFEAT_PLAYLIST: RmmzBgmName[] = ['Scene6.ogg', 'Scene7.ogg', 'Scene8.ogg'];
const RETURN_PLAYLIST: RmmzBgmName[] = ['Scene3.ogg', 'Scene1.ogg', 'Scene2.ogg'];
const BOSS_PLAYLIST: RmmzBgmName[] = ['Battle6.ogg', 'Battle7.ogg', 'Battle8.ogg'];

function exploreSession(regionId: number): BgmSession {
  if (regionId <= 4) {
    return { key: 'explore:field', playlist: [...FIELD_BGMS], startIndex: 0 };
  }
  if (regionId <= 11) {
    return { key: 'explore:dungeon', playlist: [...DUNGEON_BGMS], startIndex: 0 };
  }
  return { key: 'explore:deep', playlist: [...DEEP_DUNGEON_BGMS], startIndex: 0 };
}

/** 전환 우선순위 — 높을수록 즉시 교체 */
export function bgmSessionPriority(key: string): number {
  if (key === 'defeat') return 30;
  if (key === 'boss') return 25;
  if (key === 'lodging') return 20;
  if (key === 'travel:return') return 18;
  if (key.startsWith('explore:')) return 10;
  if (key.startsWith('spire:')) return 12;
  return 5;
}

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

  if (input.isInSpireRun) {
    const floor = input.spireFloor ?? 1;
    const depth = getSpireDepthProfile(floor);
    if (depth.bgmVolume <= 0.04) return null;
    const playlist = depth.tier === 'void' || depth.tier === 'abyss'
      ? [...SPIRE_VOID_BGMS]
      : [...SPIRE_BGMS];
    return { key: `spire:${depth.tier}`, playlist, startIndex: Math.min(playlist.length - 1, Math.floor(floor / 8)) };
  }

  if (phase === 'boss' || isBossFight) {
    const startIndex = regionId <= 5 ? 0 : regionId <= 11 ? 1 : 2;
    return { key: 'boss', playlist: BOSS_PLAYLIST, startIndex };
  }

  if (phase === 'travel' && isReturningToLodging) {
    return { key: 'travel:return', playlist: RETURN_PLAYLIST, startIndex: 0 };
  }

  if (IN_REGION_PHASES.has(phase) || phase === 'travel') {
    return exploreSession(regionId);
  }

  return exploreSession(regionId);
}
