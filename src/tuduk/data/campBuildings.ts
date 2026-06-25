import type { GameSave } from '../types';
import { getWarehouseUpgradeCost } from './tycoonConfig';

export type CampBuildingId =
  | 'lumber_mill' | 'mine' | 'rare_mine' | 'lab' | 'herb' | 'smelter' | 'clinic'
  | 'spirit_loom' | 'legend_forge' | 'void_cauldron'
  | 'inn' | 'kitchen' | 'warehouse' | 'guild'
  | 'training' | 'armory' | 'library' | 'shrine' | 'watchtower' | 'workshop' | 'spring';
export type CampBuildingKind = 'production' | 'buff' | 'dungeon';

export interface CampBuildingDef {
  id: CampBuildingId;
  name: string;
  icon: string;
  desc: string;
  kind: CampBuildingKind;
  unlockRegion: number;
  baseIntervalMs?: number;
  minIntervalMs?: number;
  maxLevel: number;
  baseCost: number;
  costMult: number;
  /** 던전 원정 보너스 — 캠프 「던전」 탭 */
  dungeonBonus?: boolean;
  produce?: 'wood_chip' | 'iron_ore' | 'potion' | 'healing_herb' | 'magic_dust' | 'rare_ore'
    | 'spirit_thread' | 'legend_scale' | 'void_shard';
  produceAmount?: number;
  /** 생산 1회당 소모 재료 */
  consume?: Record<string, number>;
}

export const CAMP_BUILDINGS: CampBuildingDef[] = [
  {
    id: 'lumber_mill', name: '목제소', icon: '🪵', kind: 'production',
    desc: '목재 자동 가공 — 연구실·용광로 재료 (채광장보다 빠르게 해금)',
    unlockRegion: 2, baseIntervalMs: 5 * 60_000, minIntervalMs: 40_000,
    maxLevel: 12, baseCost: 1400, costMult: 2.65,
    produce: 'wood_chip', produceAmount: 8,
  },
  {
    id: 'mine', name: '채광장', icon: '⛏️', kind: 'production',
    desc: '철광석 + 희귀 광석 자동 채굴 — Lv↑일수록 희귀 광석 비율↑',
    unlockRegion: 3, baseIntervalMs: 8 * 60_000, minIntervalMs: 50_000,
    maxLevel: 12, baseCost: 2400, costMult: 2.85,
    produce: 'iron_ore', produceAmount: 7,
  },
  {
    id: 'rare_mine', name: '심층 채굴구', icon: '💎', kind: 'production',
    desc: '철광석을 소모해 희귀 광석 정제 — 장비·전직 핵심 재료',
    unlockRegion: 8, baseIntervalMs: 16 * 60_000, minIntervalMs: 100_000,
    maxLevel: 12, baseCost: 8500, costMult: 3.05,
    produce: 'rare_ore', produceAmount: 4,
    consume: { iron_ore: 5 },
  },
  {
    id: 'herb', name: '약초원', icon: '🌿', kind: 'production',
    desc: '치유 약초 재배 · 연구실·성장에 필수',
    unlockRegion: 6, baseIntervalMs: 11 * 60_000, minIntervalMs: 90_000,
    maxLevel: 12, baseCost: 6200, costMult: 3.0,
    produce: 'healing_herb', produceAmount: 7,
  },
  {
    id: 'lab', name: '연구실', icon: '🔬', kind: 'production',
    desc: '치유 약초·목재를 소모해 HP 포션(+20,000) 자동 제조 — 숙소에서만 지급, 원정 중 누적분은 귀환 시 일괄 수령',
    unlockRegion: 9, baseIntervalMs: 36 * 60_000, minIntervalMs: 10 * 60_000,
    maxLevel: 12, baseCost: 7500, costMult: 3.0,
    produce: 'potion', produceAmount: 2,
    consume: { healing_herb: 1, wood_chip: 1 },
  },
  {
    id: 'smelter', name: '마력 용광로', icon: '✨', kind: 'production',
    desc: '철광석·목재를 태워 마력 가루 정제 (장비 강화 재료)',
    unlockRegion: 9, baseIntervalMs: 22 * 60_000, minIntervalMs: 3 * 60_000,
    maxLevel: 12, baseCost: 11500, costMult: 3.1,
    produce: 'magic_dust', produceAmount: 7,
    consume: { iron_ore: 4, wood_chip: 2 },
  },
  {
    id: 'spirit_loom', name: '성역 방직소', icon: '🧵', kind: 'production',
    desc: '희귀 광석·슬라임 젤리로 정령 실 방직 — 고급 성장·장비 재료',
    unlockRegion: 12, baseIntervalMs: 114 * 60_000, minIntervalMs: 33 * 60_000,
    maxLevel: 10, baseCost: 16_500, costMult: 3.15,
    produce: 'spirit_thread', produceAmount: 2,
    consume: { rare_ore: 3, slime_gel: 2 },
  },
  {
    id: 'legend_forge', name: '전설 비늘 정제소', icon: '🐉', kind: 'production',
    desc: '희귀 광석·마력 가루를 녹여 전설 비늘 정제 — 느리지만 확실한 파밍',
    unlockRegion: 14, baseIntervalMs: 126 * 60_000, minIntervalMs: 36 * 60_000,
    maxLevel: 10, baseCost: 22_000, costMult: 3.2,
    produce: 'legend_scale', produceAmount: 1,
    consume: { rare_ore: 6, magic_dust: 4 },
  },
  {
    id: 'void_cauldron', name: '공허 가마솥', icon: '🌑', kind: 'production',
    desc: '전설 비늘·약초로 공허 파편 추출 — 야탑·각성 재료',
    unlockRegion: 16, baseIntervalMs: 150 * 60_000, minIntervalMs: 45 * 60_000,
    maxLevel: 8, baseCost: 38_500, costMult: 3.25,
    produce: 'void_shard', produceAmount: 1,
    consume: { legend_scale: 1, healing_herb: 3 },
  },
  {
    id: 'clinic', name: '류아의 치료술', icon: '💗', kind: 'buff',
    desc: '숙소 휴식 시 HP 회복 속도가 빨라집니다',
    unlockRegion: 15,
    maxLevel: 10, baseCost: 18500, costMult: 3.35,
  },
  {
    id: 'warehouse', name: '창고', icon: '📦', kind: 'buff',
    desc: '재료 품목당 보관 한도 — Lv↑마다 대폭 확장 · 자동매각·숙소 수입 보너스',
    unlockRegion: 4, maxLevel: 100, baseCost: 3600, costMult: 2.85,
  },
  {
    id: 'inn', name: '여관 객실', icon: '🛏️', kind: 'buff',
    desc: '숙박료 패시브 골드 (시간당) · 휴식 팁 보너스 — 대기·오프라인에도 수입',
    unlockRegion: 5, maxLevel: 12, baseCost: 4200, costMult: 2.95,
  },
  {
    id: 'kitchen', name: '식당', icon: '🍳', kind: 'buff',
    desc: '음식 판매 패시브 골드 (시간당) · 요리 버프 지속시간 증가',
    unlockRegion: 7, maxLevel: 10, baseCost: 5800, costMult: 3.05,
  },
  {
    id: 'guild', name: '모험 길드', icon: '⚔️', kind: 'buff',
    desc: '용사 파견 — 던전 재료를 오프라인 수집 (직접 사냥보다 느림)',
    unlockRegion: 8, maxLevel: 12, baseCost: 7800, costMult: 3.15,
  },
  {
    id: 'training', name: '검술장', icon: '⚔️', kind: 'dungeon', dungeonBonus: true,
    desc: '훈련 게이지 충전 → 다음 원정 ATK 보너스 적립 (출발 시 1회 소모)',
    unlockRegion: 2, baseIntervalMs: 16 * 60_000, minIntervalMs: 4 * 60_000,
    maxLevel: 10, baseCost: 2000, costMult: 2.72,
  },
  {
    id: 'armory', name: '무기고', icon: '🛡️', kind: 'dungeon', dungeonBonus: true,
    desc: '정비 게이지 → 다음 원정 DEF 보너스 충전',
    unlockRegion: 4, baseIntervalMs: 18 * 60_000, minIntervalMs: 4 * 60_000 + 30_000,
    maxLevel: 10, baseCost: 3600, costMult: 2.82,
  },
  {
    id: 'library', name: '고서각', icon: '📚', kind: 'dungeon', dungeonBonus: true,
    desc: '연구 게이지 → 다음 원정 EXP 보너스 충전',
    unlockRegion: 6, baseIntervalMs: 19 * 60_000, minIntervalMs: 5 * 60_000,
    maxLevel: 10, baseCost: 5200, costMult: 2.88,
  },
  {
    id: 'shrine', name: '행운 사당', icon: '🎋', kind: 'dungeon', dungeonBonus: true,
    desc: '기도 게이지 → 다음 원정 골드 보너스 충전',
    unlockRegion: 8, baseIntervalMs: 21 * 60_000, minIntervalMs: 5 * 60_000 + 30_000,
    maxLevel: 8, baseCost: 7000, costMult: 2.92,
  },
  {
    id: 'watchtower', name: '감시탑', icon: '🎯', kind: 'dungeon', dungeonBonus: true,
    desc: '정찰 게이지 → 다음 원정 치명타 보너스 충전',
    unlockRegion: 10, baseIntervalMs: 23 * 60_000, minIntervalMs: 6 * 60_000,
    maxLevel: 10, baseCost: 9000, costMult: 2.96,
  },
  {
    id: 'workshop', name: '재료 공방', icon: '🔧', kind: 'dungeon', dungeonBonus: true,
    desc: '가공 게이지 → 다음 원정 재료 드롭 보너스 충전',
    unlockRegion: 12, baseIntervalMs: 26 * 60_000, minIntervalMs: 6 * 60_000 + 30_000,
    maxLevel: 8, baseCost: 11200, costMult: 3.0,
  },
  {
    id: 'spring', name: '치유 샘', icon: '💧', kind: 'dungeon', dungeonBonus: true,
    desc: '샘 충전 → 다음 원정 웨이브 클리어 HP 소량 회복 (충전당 0.25%)',
    unlockRegion: 14, baseIntervalMs: 30 * 60_000, minIntervalMs: 7 * 60_000,
    maxLevel: 8, baseCost: 14000, costMult: 3.05,
  },
];

export const CAMP_PRODUCTION_BUILDINGS = CAMP_BUILDINGS.filter(b => b.kind === 'production');
export const CAMP_DUNGEON_BUILDINGS = CAMP_BUILDINGS.filter(b => b.kind === 'dungeon');

export const CAMP_BUILDING_MAP = Object.fromEntries(
  CAMP_BUILDINGS.map(b => [b.id, b]),
) as Record<CampBuildingId, CampBuildingDef>;

export function getBuildingLevel(save: GameSave, id: CampBuildingId): number {
  const camp = save.camp;
  if (!camp) return 0;
  switch (id) {
    case 'lumber_mill': return camp.lumber_millLevel ?? 0;
    case 'mine': return camp.mineLevel ?? 0;
    case 'rare_mine': return camp.rare_mineLevel ?? 0;
    case 'lab': return camp.labLevel ?? 0;
    case 'herb': return camp.herbLevel ?? 0;
    case 'smelter': return camp.smelterLevel ?? 0;
    case 'clinic': return camp.clinicLevel ?? 0;
    case 'inn': return camp.innLevel ?? 0;
    case 'kitchen': return camp.kitchenLevel ?? 0;
    case 'warehouse': return camp.warehouseLevel ?? 0;
    case 'guild': return camp.guildLevel ?? 0;
    case 'training': return camp.trainingLevel ?? 0;
    case 'armory': return camp.armoryLevel ?? 0;
    case 'library': return camp.libraryLevel ?? 0;
    case 'shrine': return camp.shrineLevel ?? 0;
    case 'watchtower': return camp.watchtowerLevel ?? 0;
    case 'workshop': return camp.workshopLevel ?? 0;
    case 'spring': return camp.springLevel ?? 0;
    case 'spirit_loom': return camp.spirit_loomLevel ?? 0;
    case 'legend_forge': return camp.legend_forgeLevel ?? 0;
    case 'void_cauldron': return camp.void_cauldronLevel ?? 0;
  }
}

export function isBuildingUnlocked(save: GameSave, id: CampBuildingId): boolean {
  const def = CAMP_BUILDING_MAP[id];
  return (save.maxRegion ?? 1) >= def.unlockRegion;
}

export function getBuildingIntervalMs(def: CampBuildingDef, level: number): number {
  if (!def.baseIntervalMs || !def.minIntervalMs) return 0;
  if (level <= 0) return def.baseIntervalMs;
  // 연구실: 포션은 소모품 — 레벨·보너스로 주기가 과하게 줄지 않도록 완만한 곡선
  const decay = def.id === 'lab' ? 0.96 : 0.90;
  const reduction = Math.pow(decay, level - 1);
  return Math.max(def.minIntervalMs, Math.floor(def.baseIntervalMs * reduction));
}

/** 레벨당 생산량 (표시·예측용) */
export function getBuildingOutputAmount(def: CampBuildingDef, level: number): number {
  if (level <= 0) return 0;
  const base = def.produceAmount ?? 1;
  if (def.id === 'lumber_mill') return base + Math.floor(level / 2);
  if (def.id === 'herb') return base + Math.floor(level / 4);
  if (def.id === 'smelter') return base + Math.floor(level / 3);
  if (def.id === 'mine') return base + Math.floor(level / 2);
  if (def.id === 'rare_mine') return base + Math.floor(level / 3);
  if (def.id === 'lab') return base + Math.floor(level / 4);
  if (def.id === 'spirit_loom') return base + Math.floor(level / 4);
  if (def.id === 'legend_forge') return base + Math.floor(level / 5);
  if (def.id === 'void_cauldron') return base + Math.floor(level / 6);
  return base;
}

export function getUpgradeCost(def: CampBuildingDef, level: number): number {
  if (def.id === 'warehouse') return getWarehouseUpgradeCost(level);
  return Math.floor(def.baseCost * Math.pow(def.costMult, level));
}

export function formatInterval(ms: number): string {
  const min = Math.ceil(ms / 60_000);
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  return `${min}분`;
}

export function formatIntervalSec(ms: number): string {
  if (ms <= 0) return '완료!';
  const sec = Math.ceil(ms / 1000);
  if (sec >= 3600) return `${Math.floor(sec / 3600)}시간 ${Math.ceil((sec % 3600) / 60)}분`;
  if (sec >= 60) return `${Math.floor(sec / 60)}분 ${sec % 60}초`;
  return `${sec}초`;
}
