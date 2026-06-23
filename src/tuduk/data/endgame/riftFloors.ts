import type { ElementType } from '../../types';

export interface RiftFloorDef {
  floor: number;
  name: string;
  zone: '폐역' | '거울' | '심연';
  element: ElementType;
  /** 클리어 필요 파티 DPS (지역 방어 기준) */
  requiredDps: number;
  gold: number;
  voidShards: number;
  riftCrystals: number;
  relicId?: string;
}

const ZONE_NAMES: Record<RiftFloorDef['zone'], string[]> = {
  '폐역': ['잊힌 승강장', '유령 플랫폼', '끊긴 선로', '폐허 대합실', '침묵의 환승구'],
  '거울': ['반전 거울', '이중 선로', '그림자 환승', '역전 플랫폼', '왜곡 대기실'],
  '심연': ['균열 심층', '공허 통로', '차원 붕괴지', '실험 구역', '후추랩 코어'],
};

function zoneForFloor(f: number): RiftFloorDef['zone'] {
  if (f <= 20) return '폐역';
  if (f <= 40) return '거울';
  return '심연';
}

const ELEMENT_CYCLE: ElementType[] = ['fire', 'water', 'thunder', 'poison', 'none'];

export const RIFT_MAX_FLOOR = 50;
export const RIFT_DAILY_KEYS = 6;

export const RIFT_FLOORS: RiftFloorDef[] = Array.from({ length: RIFT_MAX_FLOOR }, (_, i) => {
  const floor = i + 1;
  const zone = zoneForFloor(floor);
  const names = ZONE_NAMES[zone];
  const name = `${names[i % names.length]} ${Math.floor(i / names.length) + 1}층`;
  const baseDps = 120 + floor * floor * 2.8 + floor * 45;
  return {
    floor,
    name,
    zone,
    element: ELEMENT_CYCLE[i % ELEMENT_CYCLE.length]!,
    requiredDps: Math.floor(baseDps),
    gold: Math.floor(800 + floor * 420 + floor * floor * 12),
    voidShards: 1 + Math.floor(floor / 5),
    riftCrystals: floor % 10 === 0 ? 2 : floor % 5 === 0 ? 1 : 0,
    relicId: floor % 5 === 0 ? `relic_rift_${floor}` : undefined,
  };
});

export function getRiftFloor(floor: number): RiftFloorDef | null {
  return RIFT_FLOORS[floor - 1] ?? null;
}
