/** 19~50층 심층 아크 — 고정 affix + 보스 변형명 */
export interface DeepFloorArc {
  from: number;
  to: number;
  name: string;
  lore: string;
  affixId: string;
  bossVariant: string;
}

export const DEEP_FLOOR_ARCS: DeepFloorArc[] = [
  {
    from: 19, to: 23, name: '잠복 구간',
    lore: '폐역 통로에서 독안개가 피어오릅니다.',
    affixId: 'poison_mist', bossVariant: '맹독',
  },
  {
    from: 24, to: 28, name: '철의 회랑',
    lore: '벽면이 금속처럼 굳어 방어가 두꺼워집니다.',
    affixId: 'iron_wall', bossVariant: '강화',
  },
  {
    from: 29, to: 33, name: '혼란의 심층',
    lore: '어그로가 튀는 전장 — 대열 유지가 생명입니다.',
    affixId: 'aggro_chaos', bossVariant: '흉폭',
  },
  {
    from: 34, to: 38, name: '떼의 심연',
    lore: '몬스터 떼가 몰려옵니다. 광역 대비!',
    affixId: 'swarm', bossVariant: '군집',
  },
  {
    from: 39, to: 43, name: '속성 봉인층',
    lore: '약점 보너스가 봉인됩니다. 순수 화력이 필요합니다.',
    affixId: 'element_lock', bossVariant: '봉인',
  },
  {
    from: 44, to: 50, name: '종말의 심연',
    lore: '심연의 맥동 — 회복이 어렵고 디버프가 강화됩니다.',
    affixId: 'abyss_pulse', bossVariant: '심연',
  },
];

export function getDeepFloorArc(regionId: number): DeepFloorArc | null {
  if (regionId < 19) return null;
  return DEEP_FLOOR_ARCS.find(a => regionId >= a.from && regionId <= a.to) ?? null;
}

export function formatDeepArcBossName(baseName: string, regionId: number): string {
  const arc = getDeepFloorArc(regionId);
  if (!arc) return baseName;
  return `${arc.bossVariant} ${baseName}`;
}
