/** 18개 바이옴 — 지역 순서와 1:1 매칭, 18 이후 1로 순환 */
export type BiomeId =
  | 'Grassland' | 'Forest' | 'AutumnRuins' | 'SnowMountain' | 'Desert' | 'CrystalDungeon'
  | 'Volcano' | 'Beach' | 'AncientRuins' | 'Graveyard' | 'VillageNight' | 'CastleHall'
  | 'Swamp' | 'IceCave' | 'FloatingIsland' | 'SkyTemple' | 'AirshipPort' | 'SteampunkCity';

export type AtmosphereType =
  | 'grassland' | 'forest' | 'snow' | 'desert' | 'volcano' | 'beach'
  | 'graveyard' | 'swamp' | 'floating' | 'none';

export type LayerKind = 'far' | 'middle' | 'front';

export interface BiomeDef {
  id: BiomeId;
  regionId: number;
  label: string;
  atmosphere: AtmosphereType;
}

export const BIOME_CYCLE: BiomeDef[] = [
  { id: 'Grassland', regionId: 1, label: '초원', atmosphere: 'grassland' },
  { id: 'Forest', regionId: 2, label: '숲', atmosphere: 'forest' },
  { id: 'AutumnRuins', regionId: 3, label: '가을 유적', atmosphere: 'none' },
  { id: 'SnowMountain', regionId: 4, label: '설산', atmosphere: 'snow' },
  { id: 'Desert', regionId: 5, label: '사막', atmosphere: 'desert' },
  { id: 'CrystalDungeon', regionId: 6, label: '수정 동굴', atmosphere: 'none' },
  { id: 'Volcano', regionId: 7, label: '화산', atmosphere: 'volcano' },
  { id: 'Beach', regionId: 8, label: '해변', atmosphere: 'beach' },
  { id: 'AncientRuins', regionId: 9, label: '고대 유적', atmosphere: 'none' },
  { id: 'Volcano', regionId: 10, label: '화산', atmosphere: 'volcano' },
  { id: 'VillageNight', regionId: 11, label: '불타는 마을', atmosphere: 'volcano' },
  { id: 'CastleHall', regionId: 12, label: '하늘 성', atmosphere: 'floating' },
  { id: 'Swamp', regionId: 13, label: '늪지', atmosphere: 'swamp' },
  { id: 'IceCave', regionId: 14, label: '얼음 동굴', atmosphere: 'snow' },
  { id: 'FloatingIsland', regionId: 15, label: '부유 섬', atmosphere: 'floating' },
  { id: 'SkyTemple', regionId: 16, label: '하늘 사원', atmosphere: 'floating' },
  { id: 'AirshipPort', regionId: 17, label: '비행선 항구', atmosphere: 'none' },
  { id: 'Graveyard', regionId: 18, label: '묘지', atmosphere: 'graveyard' },
];

export const PARALLAX_SPEED = { far: 0.2, middle: 0.5, front: 1.0 } as const;

const LAYER_FILES: LayerKind[] = ['far', 'middle', 'front'];

/** 레이어 PNG 경로 후보 (폴더형 / 플랫형) */
export function biomeLayerPathCandidates(biomeId: BiomeId, layer: LayerKind): string[] {
  const base = 'assets/backgrounds';
  return [
    `${base}/${biomeId}/${layer}.png`,
    `${base}/${biomeId}_${layer}.png`,
    `${base}/${biomeId}/${layer.charAt(0).toUpperCase() + layer.slice(1)}.png`,
    `${base}/${biomeId}/layer_${layer}.png`,
  ];
}

export function allBiomeAssetPaths(): string[] {
  const paths = new Set<string>();
  for (const b of BIOME_CYCLE) {
    for (const layer of LAYER_FILES) {
      for (const p of biomeLayerPathCandidates(b.id, layer)) paths.add(p);
    }
  }
  return [...paths];
}

export function biomeForRegion(regionId: number): BiomeDef {
  const idx = (Math.max(1, regionId) - 1) % BIOME_CYCLE.length;
  return BIOME_CYCLE[idx]!;
}

export function nextBiome(biome: BiomeDef): BiomeDef {
  const idx = BIOME_CYCLE.findIndex(b => b.id === biome.id);
  return BIOME_CYCLE[(idx + 1) % BIOME_CYCLE.length]!;
}

export function prevBiome(biome: BiomeDef): BiomeDef {
  const idx = BIOME_CYCLE.findIndex(b => b.id === biome.id);
  return BIOME_CYCLE[(idx - 1 + BIOME_CYCLE.length) % BIOME_CYCLE.length]!;
}
