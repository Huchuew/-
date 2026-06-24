import type { CampBuildingId } from './campBuildings';

/** 던전이 메인 — 파견은 보조 수입 (업그레이드·평판으로 체감 상승) */
export const DISPATCH_YIELD_RATIO = 0.52;
export const DISPATCH_MAX_OFFLINE_MS = 8 * 3_600_000;
/** 파견 기본 소요(분) — 길드 레벨로 가속 */
export const DISPATCH_BASE_MINUTES = 38;
export const DISPATCH_GUILD_SPEED_PER_LEVEL = 0.09;

/** 품목당 기본 보관 한도 (창고 미건설) */
export const WAREHOUSE_BASE_PER_ITEM = 100;
export const WAREHOUSE_MAX_BUILDING_LEVEL = 100;

/** @deprecated — 품목당 한도로 변경됨 */
export const WAREHOUSE_BASE_CAP = WAREHOUSE_BASE_PER_ITEM;
/** @deprecated */
export const WAREHOUSE_CAP_PER_LEVEL = 0;

/**
 * 품목당 보관 한도 — Lv가 올라갈수록 증가폭이 커지는 가속 곡선
 * Lv0: 100 · Lv10: ~325 · Lv50: ~1,365 · Lv100: ~3,200
 */
export function perItemCapAtLevel(warehouseLv: number): number {
  if (warehouseLv <= 0) return WAREHOUSE_BASE_PER_ITEM;
  const lv = warehouseLv;
  return Math.floor(
    WAREHOUSE_BASE_PER_ITEM * (1 + lv * 0.14 + Math.pow(lv / 10, 1.28) * 0.85),
  );
}

/** @deprecated — perItemCapAtLevel 사용 */
export function warehouseCapAtLevel(lv: number): number {
  return perItemCapAtLevel(lv);
}

export function getWarehouseUpgradeCost(level: number): number {
  const lv = Math.max(0, level);
  let cost = Math.floor(3800 * Math.pow(1.76, lv));
  if (lv >= 12) cost = Math.floor(cost * (1 + (lv - 12) * 0.016));
  if (lv >= 28) cost = Math.floor(cost * (1 + (lv - 28) * 0.026));
  if (lv >= 50) cost = Math.floor(cost * (1 + (lv - 50) * 0.034));
  if (lv >= 75) cost = Math.floor(cost * (1 + (lv - 75) * 0.028));
  return cost;
}

export function formatWarehouseCapacityHint(lv: number): string {
  const cap = perItemCapAtLevel(lv);
  if (lv <= 0) {
    return `품목당 ${WAREHOUSE_BASE_PER_ITEM}개 (기본) · Lv.1 건설 → 품목당 ${perItemCapAtLevel(1)}개`;
  }
  if (lv >= WAREHOUSE_MAX_BUILDING_LEVEL) {
    return `품목당 ${cap.toLocaleString()}개 (최대 Lv.${WAREHOUSE_MAX_BUILDING_LEVEL})`;
  }
  const next = perItemCapAtLevel(lv + 1);
  return `품목당 ${cap.toLocaleString()}개 · Lv.${lv + 1} → ${next.toLocaleString()}개 (+${next - cap})`;
}

export const AUTO_SELL_RATE = 0.72;

export const STAFF_WAGE_PER_HOUR = 48;
export const STAFF_PROD_BONUS_PER_LEVEL = 0.06;

export const INN_PASSIVE_GOLD_PER_HOUR = 115;
export const KITCHEN_COOK_DURATION_BONUS = 0.07;
export const KITCHEN_SURPLUS_GOLD_PER_LEVEL = 52;
/** 창고 Lv당 직접 패시브 골드 (/h) */
export const WAREHOUSE_PASSIVE_GOLD_PER_LEVEL = 58;

export const REMODEL_MAX_TIER = 5;
export const REMODEL_SELL_BONUS_PER_TIER = 0.05;
export const REMODEL_PROD_BONUS_PER_TIER = 0.05;

/** 원정 복귀 시 공급 부스트 지속(ms) */
export const SUPPLY_BOOST_DURATION_MS = 45 * 60_000;
export const SUPPLY_BOOST_MAX_MULT = 1.55;

export interface CampZoneDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  unlockRegion: number;
  cost: number;
  bonuses: Partial<Record<CampBuildingId, number>>;
}

export const CAMP_ZONES: CampZoneDef[] = [
  {
    id: 'forest', name: '약초 숲', icon: '🌲', unlockRegion: 6, cost: 3500,
    desc: '약초원·목제소 생산 +12%',
    bonuses: { herb: 0.12, lumber_mill: 0.12 },
  },
  {
    id: 'quarry', name: '심층 광맥', icon: '⛰️', unlockRegion: 9, cost: 9500,
    desc: '채광장·용광로 +10%',
    bonuses: { mine: 0.10, smelter: 0.10 },
  },
  {
    id: 'research', name: '연구 단지', icon: '🔭', unlockRegion: 12, cost: 16500,
    desc: '연구실 생산 +14%',
    bonuses: { lab: 0.14 },
  },
  {
    id: 'caravan', name: '상단 거점', icon: '🐪', unlockRegion: 15, cost: 26000,
    desc: '여관·주방 수입 +16% · 파견 수확 +12%',
    bonuses: { inn: 0.16, kitchen: 0.16 },
  },
];

export const CAMP_ZONE_MAP = Object.fromEntries(CAMP_ZONES.map(z => [z.id, z]));

export interface DispatchRegionDef {
  regionId: number;
  mat: string;
  baseQty: number;
  label: string;
}

export const DISPATCH_REGIONS: DispatchRegionDef[] = [
  { regionId: 1, mat: 'wood_chip', baseQty: 12, label: '초원 채집' },
  { regionId: 3, mat: 'iron_ore', baseQty: 10, label: '광맥 탐사' },
  { regionId: 5, mat: 'slime_gel', baseQty: 10, label: '슬라임 사냥' },
  { regionId: 7, mat: 'healing_herb', baseQty: 8, label: '약초 수확' },
  { regionId: 9, mat: 'beast_fang', baseQty: 7, label: '야수 토벌' },
  { regionId: 11, mat: 'magic_dust', baseQty: 6, label: '마력 수집' },
  { regionId: 10, mat: 'spirit_thread', baseQty: 4, label: '정령 실 채집' },
  { regionId: 13, mat: 'shadow_wing', baseQty: 5, label: '그림자 사냥' },
  { regionId: 15, mat: 'spirit_thread', baseQty: 7, label: '영혼 채집' },
  { regionId: 12, mat: 'legend_scale', baseQty: 2, label: '전설 재료' },
];

export const CONTRACT_MAT_POOL = [
  { mat: 'iron_ore', baseQty: 12, baseReward: 720 },
  { mat: 'wood_chip', baseQty: 15, baseReward: 620 },
  { mat: 'slime_gel', baseQty: 10, baseReward: 840 },
  { mat: 'healing_herb', baseQty: 8, baseReward: 980 },
  { mat: 'beast_fang', baseQty: 6, baseReward: 1180 },
  { mat: 'magic_dust', baseQty: 5, baseReward: 1450 },
  { mat: 'spirit_thread', baseQty: 3, baseReward: 1680 },
  { mat: 'void_shard', baseQty: 1, baseReward: 2200 },
];

export interface TycoonEventDef {
  id: string;
  label: string;
  desc: string;
  durationMs: number;
  weight: number;
}

export const TYCOON_EVENTS: TycoonEventDef[] = [
  { id: 'caravan', label: '🐪 상인 캐러밴', desc: '철광석 시세 +70% · 25분', durationMs: 25 * 60_000, weight: 3 },
  { id: 'rush', label: '⚔️ 모험가 붐', desc: '휴식 팁 2.2배 · 18분', durationMs: 18 * 60_000, weight: 3 },
  { id: 'herb_fest', label: '🌿 약초 축제', desc: '약초 시세 +60% · 20분', durationMs: 20 * 60_000, weight: 2 },
  { id: 'mine_boom', label: '⛏️ 광맥 발견', desc: '채광장 2.2배속 · 15분', durationMs: 15 * 60_000, weight: 2 },
  { id: 'feast', label: '🍳 만찬의 밤', desc: '여관·주방 수입 1.8배 · 20분', durationMs: 20 * 60_000, weight: 2 },
];

export const STAFF_ASSIGNABLE: CampBuildingId[] = [
  'mine', 'herb', 'lab', 'smelter', 'inn', 'kitchen', 'guild',
  'training', 'library', 'workshop',
];
