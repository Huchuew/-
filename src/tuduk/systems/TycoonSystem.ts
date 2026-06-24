import type { GameSave } from '../types';
import { MAX_POTION_STOCK } from '../types';
import {
  addPotionStock, canAddPotionStock, getPotionStock, getPotionStockSpace,
} from './PotionInventory';
import { saveGame } from '../core/SaveManager';
import {
  CAMP_BUILDINGS, CAMP_BUILDING_MAP, CAMP_DUNGEON_BUILDINGS, CAMP_PRODUCTION_BUILDINGS,
  type CampBuildingDef, type CampBuildingId,
  formatInterval, formatIntervalSec, getBuildingIntervalMs, getBuildingLevel,
  getBuildingOutputAmount, getUpgradeCost, isBuildingUnlocked,
} from '../data/campBuildings';
import { MATERIAL_LABELS } from '../data/equipment';
import { INN_PASSIVE_GOLD_PER_HOUR, KITCHEN_SURPLUS_GOLD_PER_LEVEL, perItemCapAtLevel } from '../data/tycoonConfig';
import { addDungeonPrepStack, formatDungeonBuildingStatus } from './dungeonCampBonuses';
import { addMaterial } from './EquipmentSystem';
import { getWarehouseAutoSellRate, getWarehouseIncomeMult } from './WarehouseSystem';
import { ensureTycoon, getProductionSpeedMult } from './TycoonExpansionSystem';
import { isAtLodging } from './LodgingSystem';

/** 연구실 포션 — 숙소에서만 제조·지급 (원정 중에는 타이머만 누적) */
export function canProduceLabPotions(save: GameSave): boolean {
  return isAtLodging(save);
}

export interface CampState {
  lumber_millLevel: number;
  lumber_millLastTick: number;
  mineLevel: number;
  mineLastTick: number;
  labLevel: number;
  labLastTick: number;
  herbLevel: number;
  herbLastTick: number;
  smelterLevel: number;
  smelterLastTick: number;
  rare_mineLevel: number;
  rare_mineLastTick: number;
  clinicLevel: number;
  innLevel: number;
  kitchenLevel: number;
  warehouseLevel: number;
  guildLevel: number;
  marketLevel: number;
  trainingLevel: number;
  armoryLevel: number;
  libraryLevel: number;
  shrineLevel: number;
  watchtowerLevel: number;
  workshopLevel: number;
  springLevel: number;
  trainingLastTick: number;
  armoryLastTick: number;
  libraryLastTick: number;
  shrineLastTick: number;
  watchtowerLastTick: number;
  workshopLastTick: number;
  springLastTick: number;
  spirit_loomLevel: number;
  spirit_loomLastTick: number;
  legend_forgeLevel: number;
  legend_forgeLastTick: number;
  void_cauldronLevel: number;
  void_cauldronLastTick: number;
}

const TICK_CHECK_MS = 800;
const MAX_OFFLINE_MS = 12 * 3_600_000;

function defaultCamp(): CampState {
  const now = Date.now();
  return {
    lumber_millLevel: 0, lumber_millLastTick: now,
    mineLevel: 0, mineLastTick: now,
    labLevel: 0, labLastTick: now,
    herbLevel: 0, herbLastTick: now,
    smelterLevel: 0, smelterLastTick: now,
    rare_mineLevel: 0, rare_mineLastTick: now,
    clinicLevel: 0,
    innLevel: 0, kitchenLevel: 0, warehouseLevel: 0, guildLevel: 0, marketLevel: 0,
    trainingLevel: 0, armoryLevel: 0, libraryLevel: 0, shrineLevel: 0,
    watchtowerLevel: 0, workshopLevel: 0, springLevel: 0,
    trainingLastTick: now, armoryLastTick: now, libraryLastTick: now, shrineLastTick: now,
    watchtowerLastTick: now, workshopLastTick: now, springLastTick: now,
    spirit_loomLevel: 0, spirit_loomLastTick: now,
    legend_forgeLevel: 0, legend_forgeLastTick: now,
    void_cauldronLevel: 0, void_cauldronLastTick: now,
  };
}

export function ensureCamp(save: GameSave) {
  if (!save.camp) {
    save.camp = defaultCamp();
    return;
  }
  const c = save.camp as CampState & { lastTick?: number };
  if (c.lastTick != null && c.mineLastTick == null) {
    c.mineLastTick = c.lastTick;
    delete (c as { lastTick?: number }).lastTick;
  }
  if (c.mineLastTick == null) c.mineLastTick = Date.now();
  if (c.lumber_millLevel == null) c.lumber_millLevel = 0;
  if (c.lumber_millLastTick == null) c.lumber_millLastTick = Date.now();
  if (c.labLastTick == null) c.labLastTick = Date.now();
  if (c.herbLastTick == null) c.herbLastTick = Date.now();
  if (c.smelterLastTick == null) c.smelterLastTick = Date.now();
  if (c.labLevel == null) c.labLevel = 0;
  if (c.herbLevel == null) c.herbLevel = 0;
  if (c.smelterLevel == null) c.smelterLevel = 0;
  if (c.rare_mineLevel == null) c.rare_mineLevel = 0;
  if (c.rare_mineLastTick == null) c.rare_mineLastTick = Date.now();
  if (c.clinicLevel == null) c.clinicLevel = 0;
  if (c.innLevel == null) c.innLevel = 0;
  if (c.kitchenLevel == null) c.kitchenLevel = 0;
  if (c.warehouseLevel == null) c.warehouseLevel = 0;
  if (c.guildLevel == null) c.guildLevel = 0;
  if (c.marketLevel == null) c.marketLevel = 0;
  if (c.trainingLevel == null) c.trainingLevel = 0;
  if (c.armoryLevel == null) c.armoryLevel = 0;
  if (c.libraryLevel == null) c.libraryLevel = 0;
  if (c.shrineLevel == null) c.shrineLevel = 0;
  if (c.watchtowerLevel == null) c.watchtowerLevel = 0;
  if (c.workshopLevel == null) c.workshopLevel = 0;
  if (c.springLevel == null) c.springLevel = 0;
  if (c.trainingLastTick == null) c.trainingLastTick = Date.now();
  if (c.armoryLastTick == null) c.armoryLastTick = Date.now();
  if (c.libraryLastTick == null) c.libraryLastTick = Date.now();
  if (c.shrineLastTick == null) c.shrineLastTick = Date.now();
  if (c.watchtowerLastTick == null) c.watchtowerLastTick = Date.now();
  if (c.workshopLastTick == null) c.workshopLastTick = Date.now();
  if (c.springLastTick == null) c.springLastTick = Date.now();
  if (c.spirit_loomLevel == null) c.spirit_loomLevel = 0;
  if (c.spirit_loomLastTick == null) c.spirit_loomLastTick = Date.now();
  if (c.legend_forgeLevel == null) c.legend_forgeLevel = 0;
  if (c.legend_forgeLastTick == null) c.legend_forgeLastTick = Date.now();
  if (c.void_cauldronLevel == null) c.void_cauldronLevel = 0;
  if (c.void_cauldronLastTick == null) c.void_cauldronLastTick = Date.now();
}

export function getClinicLevel(save: GameSave): number {
  ensureCamp(save);
  return save.camp!.clinicLevel ?? 0;
}

function getLevelKey(id: CampBuildingId): keyof CampState {
  return `${id}Level` as keyof CampState;
}

function getTickKey(id: CampBuildingId): keyof CampState {
  return `${id}LastTick` as keyof CampState;
}

export function getBuildingProgress(save: GameSave, id: CampBuildingId): {
  level: number;
  intervalMs: number;
  progress: number;
  ready: boolean;
  remainingMs: number;
} {
  ensureCamp(save);
  const def = CAMP_BUILDING_MAP[id];
  const level = getBuildingLevel(save, id);
  if (!defHasCycle(def) || level <= 0) {
    return { level, intervalMs: 0, progress: 0, ready: false, remainingMs: 0 };
  }
  const baseInterval = getBuildingIntervalMs(def, level);
  const speedMult = getProductionSpeedMult(save, id);
  const intervalMs = Math.max(def.minIntervalMs ?? 60_000, Math.floor(baseInterval / speedMult));
  const camp = save.camp!;
  const lastTick = camp[getTickKey(id)] as number;
  const elapsed = Date.now() - lastTick;
  const progress = Math.min(1, elapsed / intervalMs);
  const ready = elapsed >= intervalMs;
  const remainingMs = ready ? 0 : Math.max(0, intervalMs - elapsed);
  return { level, intervalMs, progress, ready, remainingMs };
}

export function canUpgradeBuilding(save: GameSave, id: CampBuildingId): {
  ok: boolean; cost: number; reason?: string;
} {
  ensureCamp(save);
  const def = CAMP_BUILDING_MAP[id];
  if (!isBuildingUnlocked(save, id)) {
    return { ok: false, cost: 0, reason: `${def.unlockRegion}지역 해금 필요` };
  }
  const lv = getBuildingLevel(save, id);
  const cost = getUpgradeCost(def, lv);
  if (lv >= def.maxLevel) return { ok: false, cost, reason: '최대 레벨' };
  if (save.gold < cost) return { ok: false, cost, reason: `골드 ${cost.toLocaleString()} 필요` };
  return { ok: true, cost };
}

export function upgradeBuilding(save: GameSave, id: CampBuildingId): boolean {
  const check = canUpgradeBuilding(save, id);
  if (!check.ok) return false;
  ensureCamp(save);
  save.gold -= check.cost;
  const def = CAMP_BUILDING_MAP[id];
  const camp = save.camp!;
  const key = getLevelKey(id);
  (camp[key] as number) += 1;
  if (defHasCycle(def) && (camp[key] as number) === 1) {
    (camp[getTickKey(id)] as number) = Date.now();
  }
  saveGame(save);
  return true;
}

function defHasCycle(def: CampBuildingDef): boolean {
  return def.kind === 'production' || def.kind === 'dungeon';
}

function defIsProduction(id: CampBuildingId): boolean {
  return CAMP_BUILDING_MAP[id].kind === 'production';
}

export function hasCampMaterials(save: GameSave, consume?: Record<string, number>): boolean {
  if (!consume) return true;
  return Object.entries(consume).every(([k, n]) => (save.materials[k] ?? 0) >= n);
}

function hasMaterials(save: GameSave, consume?: Record<string, number>): boolean {
  return hasCampMaterials(save, consume);
}

/** 소모 재료 부족으로 생산이 멈춘 상태 */
export function isBuildingPausedForMaterials(save: GameSave, id: CampBuildingId): boolean {
  const def = CAMP_BUILDING_MAP[id];
  if (def.kind !== 'production' || getBuildingLevel(save, id) <= 0) return false;
  if (!def.consume) return false;
  return !hasCampMaterials(save, def.consume);
}

function spendMaterials(save: GameSave, consume?: Record<string, number>): boolean {
  if (!consume) return true;
  if (!hasMaterials(save, consume)) return false;
  for (const [k, n] of Object.entries(consume)) {
    save.materials[k] = (save.materials[k] ?? 0) - n;
    if (save.materials[k]! <= 0) delete save.materials[k];
  }
  return true;
}

function getProduceAmount(def: CampBuildingDef, level: number): number {
  return getBuildingOutputAmount(def, level);
}

function produceOne(save: GameSave, id: CampBuildingId): boolean {
  const def = CAMP_BUILDING_MAP[id];
  const level = getBuildingLevel(save, id);
  if (level <= 0 || def.kind !== 'production') return false;
  if (def.produce === 'potion' && !canAddPotionStock(save)) return false;
  if (!hasMaterials(save, def.consume)) return false;
  if (!spendMaterials(save, def.consume)) return false;
  const amount = getProduceAmount(def, level);
  if (def.produce === 'potion') {
    addPotionStock(save, Math.min(amount, getPotionStockSpace(save)));
  } else if (def.produce) {
    addMaterial(save, def.produce, amount);
    if (id === 'mine' && level >= 4) {
      addMaterial(save, 'rare_ore', Math.max(1, Math.floor(level / 6)));
    }
  }
  return true;
}

/** 용광로 레벨당 장비 강화 마력 가루 1개 감소 (최대 4) */
export function getSmelterEnhanceDiscount(save: GameSave): number {
  const lv = getBuildingLevel(save, 'smelter');
  return Math.min(3, Math.floor(lv / 4));
}

function tickDungeonPrepCycles(save: GameSave, produced: Record<string, number>): boolean {
  ensureCamp(save);
  const camp = save.camp!;
  let changed = false;

  for (const def of CAMP_DUNGEON_BUILDINGS) {
    const id = def.id;
    produced[id] = produced[id] ?? 0;
    const level = getBuildingLevel(save, id);
    if (level <= 0) continue;
    const tickKey = getTickKey(id);
    let lastTick = camp[tickKey] as number;
    const elapsed = Math.min(Date.now() - lastTick, MAX_OFFLINE_MS);
    const baseInterval = getBuildingIntervalMs(def, level);
    const speedMult = getProductionSpeedMult(save, id);
    const interval = Math.max(def.minIntervalMs ?? 60_000, Math.floor(baseInterval / speedMult));
    const cycles = Math.floor(elapsed / interval);
    if (cycles <= 0) continue;

    let completed = 0;
    for (let i = 0; i < cycles; i++) {
      if (!addDungeonPrepStack(save, id)) break;
      completed++;
    }

    if (completed > 0) {
      lastTick += completed * interval;
      camp[tickKey] = lastTick;
      produced[id] = completed;
      changed = true;
    }
  }

  return changed;
}

/** 온·오프라인 캠프 생산·던전 준비 틱 */
export function tickCampProduction(save: GameSave): Record<string, number> {
  ensureCamp(save);
  const produced: Record<string, number> = {};
  const camp = save.camp!;
  let changed = false;

  for (const def of CAMP_PRODUCTION_BUILDINGS) {
    const id = def.id;
    produced[id] = 0;
    const level = getBuildingLevel(save, id);
    if (level <= 0) continue;
    if (def.produce === 'potion' && !canProduceLabPotions(save)) continue;
    const tickKey = getTickKey(id);
    let lastTick = camp[tickKey] as number;
    const elapsed = Math.min(Date.now() - lastTick, MAX_OFFLINE_MS);
    const baseInterval = getBuildingIntervalMs(def, level);
    const speedMult = getProductionSpeedMult(save, id);
    const interval = Math.max(def.minIntervalMs ?? 60_000, Math.floor(baseInterval / speedMult));
    let cycles = Math.floor(elapsed / interval);
    if (cycles <= 0) continue;

    if (def.produce === 'potion') {
      cycles = Math.min(cycles, getPotionStockSpace(save));
    }

    for (let i = 0; i < cycles; i++) {
      if (!produceOne(save, id)) break;
      produced[id]++;
    }

    if (produced[id] > 0) {
      lastTick += produced[id]! * interval;
      camp[tickKey] = lastTick;
      changed = true;
    }
  }

  if (tickDungeonPrepCycles(save, produced)) changed = true;

  if (changed) saveGame(save);
  return produced;
}

export function getCampSummary(save: GameSave): string {
  ensureCamp(save);
  const active = CAMP_BUILDINGS.filter(b => getBuildingLevel(save, b.id) > 0);
  if (!active.length) return '시설 미건설';
  return active.map(b => `${b.icon}${getBuildingLevel(save, b.id)}`).join(' · ');
}

export function formatBuildingStatus(save: GameSave, id: CampBuildingId): string {
  ensureTycoon(save);
  const def = CAMP_BUILDING_MAP[id];
  const prog = getBuildingProgress(save, id);
  if (prog.level <= 0) return '미건설';
  if (def.kind === 'buff') {
    if (def.id === 'clinic') return `류아 치료술 Lv.${prog.level} (휴식 회복 대폭↑)`;
    if (def.id === 'inn') {
      const base = Math.floor(INN_PASSIVE_GOLD_PER_HOUR * prog.level);
      return `패시브 🪙${base.toLocaleString()}/h · 팁 +${Math.round(prog.level * 9)}%`;
    }
    if (def.id === 'kitchen') {
      const base = Math.floor(KITCHEN_SURPLUS_GOLD_PER_LEVEL * prog.level);
      return `패시브 🪙${base.toLocaleString()}/h · 요리 지속 +${Math.round(prog.level * 6)}%`;
    }
    if (def.id === 'warehouse') {
      const cap = perItemCapAtLevel(prog.level);
      const sellPct = Math.round(getWarehouseAutoSellRate(save) * 100);
      return `품목당 ${cap.toLocaleString()}개 · 패시브·수입 +${Math.round((getWarehouseIncomeMult(save) - 1) * 100)}% · 자동매각 ${sellPct}%`;
    }
    if (def.id === 'guild') return `파견 슬롯 ${1 + Math.floor(prog.level / 4)} · 던전 재료 수집`;
    return `Lv.${prog.level} 효과 적용 중`;
  }
  if (def.kind === 'dungeon') {
    return formatDungeonBuildingStatus(save, id, prog);
  }
  const interval = formatInterval(prog.intervalMs);
  const consumeHint = def.consume
    ? Object.entries(def.consume).map(([k, n]) => `${MATERIAL_LABELS[k] ?? k}×${n}`).join('+')
    : '';
  if (def.id === 'lab' && !canProduceLabPotions(save)) {
    const camp = save.camp!;
    const lastTick = camp.labLastTick ?? Date.now();
    const backlog = prog.intervalMs > 0 ? Math.floor((Date.now() - lastTick) / prog.intervalMs) : 0;
    const space = getPotionStockSpace(save);
    if (backlog >= 1 && space > 0) {
      const pending = Math.min(backlog, space);
      return `⏸ 원정 중 — 숙소 도착 시 💊 ${pending}개+ 제조 예정`;
    }
    return '⏸ 원정 중 — 숙소 도착 시 제조 재개';
  }
  if (def.consume && !hasMaterials(save, def.consume)) {
    return `⏸ 재료부족으로 일시중단${consumeHint ? ` · 필요: ${consumeHint}` : ''}`;
  }
  if (prog.ready) {
    const out = def.produce === 'potion' ? '포션' : MATERIAL_LABELS[def.produce ?? ''] ?? def.produce;
    return `✨ 생산 완료! ${out}${consumeHint ? ` · 소모 ${consumeHint}` : ''}`;
  }
  return `${formatIntervalSec(prog.remainingMs)} 후 생산${consumeHint ? ` · ${consumeHint}` : ''}`;
}

// Legacy exports
export function mineUpgradeCost(level: number): number {
  return getUpgradeCost(CAMP_BUILDING_MAP.mine, level);
}

export function mineIronPerHour(level: number): number {
  if (level <= 0) return 0;
  const interval = getBuildingIntervalMs(CAMP_BUILDING_MAP.mine, level);
  return Math.floor(3_600_000 / interval);
}

export function canUpgradeMine(save: GameSave) {
  return canUpgradeBuilding(save, 'mine');
}

export function upgradeMine(save: GameSave): boolean {
  return upgradeBuilding(save, 'mine');
}
