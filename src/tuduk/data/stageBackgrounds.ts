/** 스테이지별 배경 PNG — 순서 고정, 20번 이후 1번으로 순환 */
export interface StageBackgroundDef {
  stage: number;
  file: string;
  name: string;
}

export const STAGE_BACKGROUNDS: StageBackgroundDef[] = [
  { stage: 1, file: 'assets/backgrounds/01_grassland_castle.png', name: '초원 성' },
  { stage: 2, file: 'assets/backgrounds/02_forest.png', name: '숲' },
  { stage: 3, file: 'assets/backgrounds/03_autumn_ruins.png', name: '가을 유적' },
  { stage: 4, file: 'assets/backgrounds/04_snow_mountains.png', name: '설산' },
  { stage: 5, file: 'assets/backgrounds/05_desert_arch.png', name: '사막' },
  { stage: 6, file: 'assets/backgrounds/06_crystal_cave.png', name: '수정 동굴' },
  { stage: 7, file: 'assets/backgrounds/07_volcano.png', name: '화산' },
  { stage: 8, file: 'assets/backgrounds/08_beach_shipwreck.png', name: '해변' },
  { stage: 9, file: 'assets/backgrounds/09_ancient_ruins.png', name: '고대 유적' },
  { stage: 10, file: 'assets/backgrounds/10_graveyard.png', name: '묘지' },
  { stage: 11, file: 'assets/backgrounds/11_windmill_village.png', name: '풍차 마을' },
  { stage: 12, file: 'assets/backgrounds/12_enchanted_forest.png', name: '마법 숲' },
  { stage: 13, file: 'assets/backgrounds/13_overgrown_ruins.png', name: '덩굴 유적' },
  { stage: 14, file: 'assets/backgrounds/14_castle_hall.png', name: '성 내부' },
  { stage: 15, file: 'assets/backgrounds/15_village_night.png', name: '밤 마을' },
  { stage: 16, file: 'assets/backgrounds/16_seaside_port.png', name: '항구' },
  { stage: 17, file: 'assets/backgrounds/17_bone_desert.png', name: '뼈 사막' },
  { stage: 18, file: 'assets/backgrounds/18_swamp.png', name: '늪지' },
  { stage: 19, file: 'assets/backgrounds/19_ice_cave.png', name: '얼음 동굴' },
  { stage: 20, file: 'assets/backgrounds/20_floating_islands.png', name: '하늘섬' },
];

export { backgroundIndexForRegion } from './regionVisuals';

export function stageBackgroundPaths(): string[] {
  return STAGE_BACKGROUNDS.map(b => b.file);
}
