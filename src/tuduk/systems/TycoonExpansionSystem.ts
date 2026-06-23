import type { GameSave, TycoonSettlement, TycoonState } from '../types';
import { CAMP_BUILDING_MAP, getBuildingLevel } from '../data/campBuildings';
import { CHAR_MAP } from '../data/characters';
import { MATERIAL_LABELS } from '../data/equipment';
import { earlyProgressGoldMult, LODGING_INCOME_MAT_FLOOR } from '../data/economyBalance';
import { onContractDelivered, onDispatchClaimed } from './OnboardingSystem';
import {
  CAMP_ZONE_MAP, CAMP_ZONES, CONTRACT_MAT_POOL,
  DISPATCH_BASE_MINUTES, DISPATCH_GUILD_SPEED_PER_LEVEL, DISPATCH_REGIONS,
  DISPATCH_YIELD_RATIO, INN_PASSIVE_GOLD_PER_HOUR, KITCHEN_SURPLUS_GOLD_PER_LEVEL,
  REMODEL_MAX_TIER, REMODEL_PROD_BONUS_PER_TIER, REMODEL_SELL_BONUS_PER_TIER,
  STAFF_PROD_BONUS_PER_LEVEL, STAFF_WAGE_PER_HOUR, SUPPLY_BOOST_DURATION_MS,
  SUPPLY_BOOST_MAX_MULT, TYCOON_EVENTS, WAREHOUSE_PASSIVE_GOLD_PER_LEVEL,
} from '../data/tycoonConfig';
import { formatInterval, getBuildingOutputAmount, type CampBuildingId } from '../data/campBuildings';
import { scaleSellGold } from './VendorSystem';
import { addMaterial } from './EquipmentSystem';
import {
  enforceWarehouseCap,
  getPerItemWarehouseCap,
  getTotalMaterialCount,
  getWarehouseCapacity,
  getWarehouseFullness,
  getWarehouseIncomeMult,
} from './WarehouseSystem';
import { getPartyDps, getRegionAvgDef } from './StatCalculator';
import { ensureCamp } from './TycoonSystem';
import { saveGame } from '../core/SaveManager';

function todayKey(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function weekKey(now = Date.now()): string {
  const d = new Date(now);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.floor((d.getTime() - jan1.getTime()) / (7 * 24 * 3_600_000));
  return `${d.getFullYear()}-W${week}`;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function defaultTycoon(): TycoonState {
  return {
    marketDay: '',
    marketMods: {},
    autoSellOverflow: true,
    autoManage: true,
    zones: [],
    staff: {},
    dispatch: null,
    contractWeek: '',
    contractMat: 'iron_ore',
    contractQty: 12,
    contractDelivered: 0,
    contractReward: 220,
    contractRep: 0,
    activeEvent: null,
    remodelTier: 0,
    lastInnTick: Date.now(),
    lastStaffWageTick: Date.now(),
    pendingGold: 0,
    pendingMats: {},
  };
}

/** 필드만 보장 — rollDailyMarket/rollWeeklyContract에서 재귀 호출 방지 */
function ensureTycoonState(save: GameSave): TycoonState {
  if (!save.tycoon) save.tycoon = defaultTycoon();
  const t = save.tycoon;
  if (!t.marketMods) t.marketMods = {};
  if (!t.zones) t.zones = [];
  if (!t.staff) t.staff = {};
  if (t.lastInnTick == null) t.lastInnTick = Date.now();
  if (t.lastStaffWageTick == null) t.lastStaffWageTick = Date.now();
  if (t.contractRep == null) t.contractRep = 0;
  if (t.remodelTier == null) t.remodelTier = 0;
  if (t.pendingGold == null) t.pendingGold = 0;
  if (!t.pendingMats) t.pendingMats = {};
  if (t.autoManage == null) t.autoManage = true;
  if (t.autoSellOverflow == null) t.autoSellOverflow = true;
  if (t.staffSuspended == null) t.staffSuspended = false;
  if (t.supplyBoostMult == null) t.supplyBoostMult = 1;
  if (t.supplyBoostUntil == null) t.supplyBoostUntil = 0;
  return t;
}

export function formatMaterialSummary(mats: Record<string, number>, maxItems = 4): string {
  const entries = Object.entries(mats).filter(([, n]) => n > 0);
  if (!entries.length) return '';
  const parts = entries.slice(0, maxItems).map(([k, n]) => `${MATERIAL_LABELS[k] ?? k}×${n}`);
  const extra = entries.length - maxItems;
  return extra > 0 ? `${parts.join(' · ')} 외 ${extra}종` : parts.join(' · ');
}

export function getSupplyBoostMult(save: GameSave): number {
  const t = ensureTycoonState(save);
  if (!t.supplyBoostUntil || t.supplyBoostUntil <= Date.now()) return 1;
  return Math.max(1, t.supplyBoostMult ?? 1);
}

export function getSupplyBoostRemainMin(save: GameSave): number {
  const t = ensureTycoonState(save);
  if (!t.supplyBoostUntil || t.supplyBoostUntil <= Date.now()) return 0;
  return Math.ceil((t.supplyBoostUntil - Date.now()) / 60_000);
}

function getZoneIncomeBonus(save: GameSave, buildingId: CampBuildingId): number {
  let bonus = 0;
  for (const zid of ensureTycoonState(save).zones) {
    const z = CAMP_ZONE_MAP[zid];
    if (z?.bonuses[buildingId]) bonus += z.bonuses[buildingId]!;
  }
  return bonus;
}

export interface TycoonIncomeRates {
  innGoldPerHour: number;
  kitchenGoldPerHour: number;
  warehouseGoldPerHour: number;
  warehouseCap: number;
  matUsed: number;
  warehouseFullKinds: number;
  matIncomePct: number;
  supplyBoostPct: number;
  supplyBoostMin: number;
  pendingGold: number;
  pendingMatLabel: string;
  remodelTier: number;
  activeEventLabel: string;
}

export function getTycoonIncomeRates(save: GameSave): TycoonIncomeRates {
  ensureTycoon(save);
  const t = save.tycoon!;
  const innLv = getBuildingLevel(save, 'inn');
  const kitchenLv = getBuildingLevel(save, 'kitchen');
  const matMult = getMatIncomeMult(save);
  const supplyMult = getSupplyBoostMult(save);
  const eventMult = getEventIncomeMult(save);
  const early = earlyProgressGoldMult(save.maxRegion ?? 1);
  const innZone = 1 + getZoneIncomeBonus(save, 'inn');
  const kitchenZone = 1 + getZoneIncomeBonus(save, 'kitchen');
  const whMult = getWarehouseIncomeMult(save);
  const whLv = getBuildingLevel(save, 'warehouse');
  const ev = t.activeEvent;
  const innGold = Math.floor(
    INN_PASSIVE_GOLD_PER_HOUR * innLv * matMult * early * supplyMult * innZone * eventMult * whMult,
  );
  const kitchenGold = Math.floor(
    KITCHEN_SURPLUS_GOLD_PER_LEVEL * kitchenLv * matMult * supplyMult * kitchenZone * eventMult * whMult,
  );
  const warehouseGold = Math.floor(
    WAREHOUSE_PASSIVE_GOLD_PER_LEVEL * whLv * matMult * early * supplyMult * eventMult,
  );
  const matTotal = getTotalMaterialCount(save);
  const fullness = getWarehouseFullness(save);
  const pendingMatLabel = formatMaterialSummary(t.pendingMats);
  let activeEventLabel = '';
  if (ev && ev.until > Date.now()) {
    const remain = Math.ceil((ev.until - Date.now()) / 60_000);
    activeEventLabel = `${ev.label} · ${remain}분`;
  }
  return {
    innGoldPerHour: innGold,
    kitchenGoldPerHour: kitchenGold,
    warehouseGoldPerHour: warehouseGold,
    warehouseCap: getPerItemWarehouseCap(save),
    matUsed: matTotal,
    warehouseFullKinds: fullness.fullKinds,
    matIncomePct: Math.min(100, Math.floor(matTotal / LODGING_INCOME_MAT_FLOOR * 100)),
    supplyBoostPct: Math.round((supplyMult - 1) * 100),
    supplyBoostMin: getSupplyBoostRemainMin(save),
    pendingGold: t.pendingGold,
    pendingMatLabel,
    remodelTier: t.remodelTier,
    activeEventLabel,
  };
}

/** 원정 복귀 — 던전 재료·처치로 공급 부스트 + 캐러밴 골드 */
export function applyExpeditionSupplyLink(
  save: GameSave,
  runMats: Record<string, number>,
  kills: number,
  deepestFloor: number,
): { caravanGold: number; boostPct: number } {
  ensureTycoon(save);
  const t = save.tycoon!;
  const matQty = Object.values(runMats).reduce((a, b) => a + b, 0);
  const boostFromMats = Math.min(0.35, matQty * 0.018);
  const boostFromKills = Math.min(0.25, kills * 0.004);
  const boostFromFloor = Math.min(0.15, deepestFloor * 0.008);
  const boostMult = Math.min(SUPPLY_BOOST_MAX_MULT, 1 + boostFromMats + boostFromKills + boostFromFloor);
  t.supplyBoostMult = boostMult;
  t.supplyBoostUntil = Date.now() + SUPPLY_BOOST_DURATION_MS;

  const caravanGold = Math.floor(
    (80 + deepestFloor * 22 + kills * 6 + matQty * 4)
    * earlyProgressGoldMult(save.maxRegion ?? 1)
    * (1 + t.remodelTier * 0.08),
  );
  if (caravanGold > 0) {
    t.pendingGold += caravanGold;
  }
  return { caravanGold, boostPct: Math.round((boostMult - 1) * 100) };
}

function bankGold(save: GameSave, amount: number, inExpedition: boolean): void {
  if (amount <= 0) return;
  if (inExpedition) {
    ensureTycoonState(save).pendingGold += amount;
  } else {
    save.gold += amount;
    save.stats.totalGold += amount;
  }
}

function bankMaterial(save: GameSave, key: string, qty: number, inExpedition: boolean): void {
  if (qty <= 0) return;
  if (inExpedition) {
    const t = ensureTycoonState(save);
    t.pendingMats[key] = (t.pendingMats[key] ?? 0) + qty;
  } else {
    addMaterial(save, key, qty);
    enforceWarehouseCap(save);
  }
}

export function getPendingTycoonSummary(save: GameSave): { gold: number; matQty: number } {
  ensureTycoonState(save);
  const t = save.tycoon!;
  const matQty = Object.values(t.pendingMats).reduce((a, b) => a + b, 0);
  return { gold: t.pendingGold, matQty };
}

export function claimTycoonSettlement(save: GameSave): TycoonSettlement {
  ensureTycoonState(save);
  const t = save.tycoon!;
  const boostPct = getSupplyBoostRemainMin(save) > 0
    ? Math.round(((t.supplyBoostMult ?? 1) - 1) * 100) : 0;
  const result: TycoonSettlement = {
    gold: t.pendingGold,
    mats: { ...t.pendingMats },
    dispatchMats: {},
    supplyBoostPct: boostPct > 0 ? boostPct : undefined,
  };
  if (result.gold > 0) {
    save.gold += result.gold;
    save.stats.totalGold += result.gold;
  }
  for (const [k, n] of Object.entries(result.mats)) {
    if (n > 0) addMaterial(save, k, n);
  }
  t.pendingGold = 0;
  t.pendingMats = {};
  enforceWarehouseCap(save);
  return result;
}

export function formatSettlementMessage(s: TycoonSettlement): string {
  const parts: string[] = [];
  if (s.caravanGold && s.caravanGold > 0) {
    parts.push(`🐪캐러밴 +${s.caravanGold.toLocaleString()}G`);
  }
  const tycoonGold = s.gold - (s.caravanGold ?? 0);
  if (tycoonGold > 0) parts.push(`🏠숙소 +${tycoonGold.toLocaleString()}G`);
  else if (s.gold > 0) parts.push(`🪙+${s.gold.toLocaleString()}G`);
  const matLabel = formatMaterialSummary(s.mats);
  if (matLabel) parts.push(`📦${matLabel}`);
  if (s.supplyBoostPct && s.supplyBoostPct > 0) {
    parts.push(`⚡공급부스트 +${s.supplyBoostPct}%`);
  }
  return parts.length ? `타이쿤 정산 · ${parts.join(' · ')}` : '';
}

export function ensureTycoon(save: GameSave): TycoonState {
  const t = ensureTycoonState(save);
  if (t.dispatch) reconcileDispatchTiming(save, t.dispatch);
  rollWeeklyContract(save);
  return t;
}

export function rollWeeklyContract(save: GameSave, now = Date.now()): void {
  const t = ensureTycoonState(save);
  const wk = weekKey(now);
  if (t.contractWeek === wk) return;
  t.contractWeek = wk;
  const maxR = save.maxRegion ?? 1;
  const eligible = CONTRACT_MAT_POOL.filter(p => {
    if (p.mat === 'spirit_thread') return maxR >= 9;
    if (p.mat === 'void_shard') return maxR >= 12;
    return true;
  });
  const pick = eligible[hashSeed(wk) % eligible.length]!;
  const repMult = 1 + t.contractRep * 0.04;
  const regionMult = 1 + (maxR - 1) * 0.06;
  t.contractMat = pick.mat;
  t.contractQty = Math.ceil(pick.baseQty * regionMult * (1 + t.contractRep * 0.08));
  t.contractDelivered = 0;
  t.contractReward = Math.floor(pick.baseReward * regionMult * repMult);
}

export function getMarketMultiplier(save: GameSave, matKey: string): number {
  ensureTycoon(save);
  const remodel = 1 + save.tycoon!.remodelTier * REMODEL_SELL_BONUS_PER_TIER;
  let eventMult = 1;
  const ev = save.tycoon!.activeEvent;
  if (ev && ev.until > Date.now()) {
    if (ev.id === 'caravan' && matKey === 'iron_ore') eventMult = 1.7;
    if (ev.id === 'herb_fest' && matKey === 'healing_herb') eventMult = 1.6;
  }
  return remodel * eventMult;
}

export function getZoneProductionBonus(save: GameSave, buildingId: CampBuildingId): number {
  ensureTycoon(save);
  let bonus = 0;
  for (const zid of save.tycoon!.zones) {
    const z = CAMP_ZONE_MAP[zid];
    if (z?.bonuses[buildingId]) bonus += z.bonuses[buildingId]!;
  }
  return bonus;
}

export function getStaffProductionBonus(save: GameSave, buildingId: CampBuildingId): number {
  ensureTycoon(save);
  if (save.tycoon!.staffSuspended) return 0;
  const charId = save.tycoon!.staff[buildingId];
  if (!charId) return 0;
  const st = save.chars[charId];
  if (!st) return 0;
  return STAFF_PROD_BONUS_PER_LEVEL * Math.max(1, Math.floor(st.level / 5));
}

export function getRemodelProductionMult(save: GameSave): number {
  return 1 + ensureTycoon(save).remodelTier * REMODEL_PROD_BONUS_PER_TIER;
}

export function getRemodelSellMult(save: GameSave): number {
  return 1 + ensureTycoon(save).remodelTier * REMODEL_SELL_BONUS_PER_TIER;
}

export function getProductionSpeedMult(save: GameSave, buildingId: CampBuildingId): number {
  let mult = getRemodelProductionMult(save);
  mult *= 1 + getZoneProductionBonus(save, buildingId);
  mult *= 1 + getStaffProductionBonus(save, buildingId);
  const ev = ensureTycoon(save).activeEvent;
  if (ev && ev.until > Date.now() && ev.id === 'mine_boom' && buildingId === 'mine') {
    mult *= 2.2;
  }
  mult *= getSupplyBoostMult(save);
  // 연구실: 타 시설 대비 가속 보너스 상한 (포션 주기 최소 12분 유지)
  if (buildingId === 'lab') mult = Math.min(mult, 1.22);
  return mult;
}

export function canUnlockZone(save: GameSave, zoneId: string): { ok: boolean; reason?: string; cost: number } {
  const z = CAMP_ZONE_MAP[zoneId];
  if (!z) return { ok: false, reason: '알 수 없는 구역', cost: 0 };
  ensureTycoon(save);
  if (save.tycoon!.zones.includes(zoneId)) return { ok: false, reason: '이미 해금', cost: z.cost };
  if ((save.maxRegion ?? 1) < z.unlockRegion) {
    return { ok: false, reason: `${z.unlockRegion}층 해금 필요`, cost: z.cost };
  }
  if (save.gold < z.cost) return { ok: false, reason: `골드 ${z.cost.toLocaleString()} 필요`, cost: z.cost };
  return { ok: true, cost: z.cost };
}

export function unlockZone(save: GameSave, zoneId: string): boolean {
  const check = canUnlockZone(save, zoneId);
  if (!check.ok) return false;
  save.gold -= check.cost;
  ensureTycoon(save).zones.push(zoneId);
  saveGame(save);
  return true;
}

export function assignStaff(save: GameSave, buildingId: CampBuildingId, charId: string | null): boolean {
  ensureTycoon(save);
  const t = save.tycoon!;
  if (charId) {
    if (!save.owned.includes(charId)) return false;
    for (const [bid, cid] of Object.entries(t.staff)) {
      if (cid === charId && bid !== buildingId) return false;
    }
    if (getBuildingLevel(save, buildingId) <= 0) return false;
    t.staff[buildingId] = charId;
  } else {
    delete t.staff[buildingId];
  }
  saveGame(save);
  return true;
}

export function getStaffWagePerHour(save: GameSave): number {
  ensureTycoon(save);
  let total = 0;
  for (const charId of Object.values(save.tycoon!.staff)) {
    if (!charId) continue;
    const lv = save.chars[charId]?.level ?? 1;
    total += STAFF_WAGE_PER_HOUR + lv * 8;
  }
  return total;
}

function tickStaffWages(save: GameSave, dtSec: number): void {
  const t = ensureTycoon(save);
  const wagePerSec = getStaffWagePerHour(save) / 3600;
  if (wagePerSec <= 0) {
    t.staffSuspended = false;
    return;
  }
  const cost = Math.max(1, Math.floor(wagePerSec * dtSec));
  if (save.gold < cost) {
    t.staffSuspended = true;
    return;
  }
  save.gold -= cost;
  t.staffSuspended = false;
}

function getMatIncomeMult(save: GameSave): number {
  return Math.min(1, getTotalMaterialCount(save) / LODGING_INCOME_MAT_FLOOR);
}

function lodgingIncomeMult(save: GameSave): number {
  return getMatIncomeMult(save) * getSupplyBoostMult(save) * getWarehouseIncomeMult(save);
}

function getEventIncomeMult(save: GameSave): number {
  const ev = ensureTycoonState(save).activeEvent;
  if (!ev || ev.until <= Date.now()) return 1;
  if (ev.id === 'feast') return 1.8;
  return 1;
}

export function tickInnPassiveGold(save: GameSave, dtSec: number, inExpedition: boolean): number {
  const innLv = getBuildingLevel(save, 'inn');
  if (innLv <= 0) return 0;
  const goldPerSec = (INN_PASSIVE_GOLD_PER_HOUR * innLv) / 3600
    * lodgingIncomeMult(save) * earlyProgressGoldMult(save.maxRegion ?? 1)
    * (1 + getZoneIncomeBonus(save, 'inn')) * getEventIncomeMult(save);
  const gold = Math.floor(goldPerSec * dtSec);
  bankGold(save, gold, inExpedition);
  return gold;
}

export function getInnRestTipMult(save: GameSave): number {
  const lv = getBuildingLevel(save, 'inn');
  let mult = 1 + lv * 0.09;
  const ev = ensureTycoon(save).activeEvent;
  if (ev && ev.until > Date.now() && ev.id === 'rush') mult *= 2.2;
  return mult * getSupplyBoostMult(save);
}

export function getKitchenCookDurationMult(save: GameSave): number {
  const lv = getBuildingLevel(save, 'kitchen');
  return 1 + lv * 0.05;
}

export function tickKitchenSurplus(save: GameSave, dtSec: number, inExpedition: boolean): number {
  const lv = getBuildingLevel(save, 'kitchen');
  if (lv <= 0) return 0;
  const goldPerSec = (KITCHEN_SURPLUS_GOLD_PER_LEVEL * lv) / 3600
    * lodgingIncomeMult(save) * (1 + getZoneIncomeBonus(save, 'kitchen')) * getEventIncomeMult(save);
  const gold = Math.floor(goldPerSec * dtSec);
  bankGold(save, gold, inExpedition);
  return gold;
}

export function tickWarehousePassiveGold(save: GameSave, dtSec: number, inExpedition: boolean): number {
  const lv = getBuildingLevel(save, 'warehouse');
  if (lv <= 0) return 0;
  const goldPerSec = (WAREHOUSE_PASSIVE_GOLD_PER_LEVEL * lv) / 3600
    * lodgingIncomeMult(save) * earlyProgressGoldMult(save.maxRegion ?? 1) * getEventIncomeMult(save);
  const gold = Math.floor(goldPerSec * dtSec);
  bankGold(save, gold, inExpedition);
  return gold;
}

export function getDispatchSlots(save: GameSave): number {
  const lv = getBuildingLevel(save, 'guild');
  if (lv <= 0) return 0;
  return 1 + Math.floor(lv / 4);
}

export function getAvailableDispatchRegions(save: GameSave) {
  const maxR = save.maxRegion ?? 1;
  return DISPATCH_REGIONS.filter(d => d.regionId <= maxR);
}

export function getDispatchDurationMs(regionId: number, guildLevel = 0): number {
  const baseMin = DISPATCH_BASE_MINUTES + (19 - regionId) * 2.8;
  const speedMult = 1 + guildLevel * DISPATCH_GUILD_SPEED_PER_LEVEL;
  return Math.max(8 * 60_000, Math.floor((baseMin * 60_000) / speedMult));
}

export function formatDispatchDuration(regionId: number, guildLevel: number): string {
  return formatInterval(getDispatchDurationMs(regionId, guildLevel));
}

export function formatDispatchRemainSec(sec: number): string {
  if (sec <= 0) return '완료!';
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.ceil((sec % 3600) / 60);
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  if (sec >= 60) return `${Math.ceil(sec / 60)}분`;
  return `${sec}초`;
}

/** 구세이브·밸런스 변경 후에도 진행률이 음수가 되지 않도록 고정 */
function reconcileDispatchTiming(save: GameSave, d: NonNullable<TycoonState['dispatch']>): void {
  const guildLv = getBuildingLevel(save, 'guild');
  const remain = Math.max(0, d.endsAt - Date.now());
  if (d.durationMs != null && d.durationMs > 0 && d.startedAt != null) {
    if (d.durationMs < remain) {
      d.durationMs = remain;
      d.startedAt = d.endsAt - d.durationMs;
    }
    return;
  }
  d.durationMs = Math.max(remain, getDispatchDurationMs(d.regionId, guildLv));
  d.startedAt = d.endsAt - d.durationMs;
}

export function calcDispatchYield(save: GameSave, regionId: number, _mat: string, baseQty: number): number {
  const dps = getPartyDps(save, getRegionAvgDef(regionId));
  const guildLv = getBuildingLevel(save, 'guild');
  const dpsMult = 1 + Math.min(3.8, dps / 480);
  const guildMult = 1 + guildLv * 0.11;
  const repMult = 1 + ensureTycoon(save).contractRep * 0.045;
  const zoneMult = save.tycoon!.zones.includes('caravan') ? 1.18 : 1;
  const supplyMult = getSupplyBoostMult(save);
  return Math.max(1, Math.floor(
    baseQty * DISPATCH_YIELD_RATIO * dpsMult * guildMult * repMult * zoneMult * supplyMult,
  ));
}

export function startDispatch(save: GameSave, regionId: number, heroIds: string[]): boolean {
  if (getBuildingLevel(save, 'guild') <= 0) return false;
  ensureTycoon(save);
  if (save.tycoon!.dispatch) return false;
  const def = DISPATCH_REGIONS.find(d => d.regionId === regionId);
  if (!def || regionId > (save.maxRegion ?? 1)) return false;
  const slots = getDispatchSlots(save);
  const heroes = heroIds.filter(id => save.owned.includes(id)).slice(0, slots);
  if (!heroes.length) return false;
  const now = Date.now();
  const guildLv = getBuildingLevel(save, 'guild');
  const durationMs = getDispatchDurationMs(regionId, guildLv);
  save.tycoon!.dispatch = {
    regionId,
    matKey: def.mat,
    qty: calcDispatchYield(save, regionId, def.mat, def.baseQty),
    startedAt: now,
    durationMs,
    endsAt: now + durationMs,
    heroes,
  };
  saveGame(save);
  return true;
}

export function claimDispatch(save: GameSave, inExpedition = false): { mat: string; qty: number } | null {
  ensureTycoon(save);
  const d = save.tycoon!.dispatch;
  if (!d || Date.now() < d.endsAt) return null;
  bankMaterial(save, d.matKey, d.qty, inExpedition);
  save.tycoon!.dispatch = null;
  onDispatchClaimed(save);
  saveGame(save);
  return { mat: d.matKey, qty: d.qty };
}

function tryAutoDispatch(save: GameSave): void {
  const t = ensureTycoonState(save);
  if (!t.autoManage || t.dispatch) return;
  if (getBuildingLevel(save, 'guild') <= 0) return;
  const regions = getAvailableDispatchRegions(save);
  if (!regions.length) return;
  const best = regions[regions.length - 1]!;
  const slots = getDispatchSlots(save);
  const heroes = save.owned.slice(0, slots);
  if (!heroes.length) return;
  startDispatch(save, best.regionId, heroes);
}

function tryAutoClaimDispatch(save: GameSave, inExpedition: boolean): void {
  const t = ensureTycoonState(save);
  if (!t.autoManage || !t.dispatch) return;
  if (Date.now() >= t.dispatch.endsAt) claimDispatch(save, inExpedition);
}

export function getDispatchProgress(save: GameSave): { pct: number; remainSec: number; active: boolean } {
  ensureTycoon(save);
  const d = save.tycoon!.dispatch;
  if (!d) return { pct: 0, remainSec: 0, active: false };
  reconcileDispatchTiming(save, d);
  const remain = Math.max(0, d.endsAt - Date.now());
  const total = Math.max(1, d.durationMs ?? remain);
  const elapsed = Math.max(0, total - remain);
  const pct = Math.min(1, Math.max(0, elapsed / total));
  return { pct, remainSec: Math.ceil(remain / 1000), active: true };
}

export function deliverContract(save: GameSave, amount = 1): number {
  ensureTycoon(save);
  const t = save.tycoon!;
  const need = t.contractQty - t.contractDelivered;
  if (need <= 0) return 0;
  const have = save.materials[t.contractMat] ?? 0;
  const deliver = Math.min(amount, have, need);
  if (deliver <= 0) return 0;
  onContractDelivered(save);
  save.materials[t.contractMat] = have - deliver;
  if (save.materials[t.contractMat]! <= 0) delete save.materials[t.contractMat];
  t.contractDelivered += deliver;
  if (t.contractDelivered >= t.contractQty) {
    const reward = scaleSellGold(t.contractReward);
    save.gold += reward;
    save.stats.totalGold += reward;
    t.contractRep = Math.min(20, t.contractRep + 1);
    t.contractDelivered = 0;
    rollWeeklyContract(save);
    saveGame(save);
    return reward;
  }
  saveGame(save);
  return 0;
}

export function deliverContractAll(save: GameSave): number {
  let total = 0;
  for (let i = 0; i < 50; i++) {
    const g = deliverContract(save, 99);
    if (g <= 0) break;
    total += g;
  }
  return total;
}

export function canRemodel(save: GameSave): { ok: boolean; reason?: string; cost: number } {
  const tier = ensureTycoon(save).remodelTier;
  if (tier >= REMODEL_MAX_TIER) return { ok: false, reason: '최대 리모델링', cost: 0 };
  if ((save.maxRegion ?? 1) < 10) return { ok: false, reason: '10층 이상 필요', cost: 0 };
  const cost = Math.floor(25000 * Math.pow(2.2, tier));
  if (save.gold < cost) return { ok: false, reason: `골드 ${cost.toLocaleString()} 필요`, cost };
  const core = ['mine', 'herb', 'lab'] as CampBuildingId[];
  if (!core.every(id => getBuildingLevel(save, id) >= 3)) {
    return { ok: false, reason: '채광·약초·연구실 Lv.3+ 필요', cost };
  }
  return { ok: true, cost };
}

export function remodelLodging(save: GameSave): boolean {
  const check = canRemodel(save);
  if (!check.ok) return false;
  ensureCamp(save);
  ensureTycoon(save);
  save.gold -= check.cost;
  const preservedWarehouse = save.camp?.warehouseLevel ?? 0;
  if (save.camp) {
    save.camp.innLevel = 0;
    save.camp.kitchenLevel = 0;
    save.camp.guildLevel = 0;
    save.camp.warehouseLevel = preservedWarehouse;
  }
  save.tycoon!.remodelTier += 1;
  save.tycoon!.staff = {};
  saveGame(save);
  return true;
}

export function tryRollTycoonEvent(save: GameSave, atLodging: boolean): void {
  if (!atLodging) return;
  ensureTycoon(save);
  const t = save.tycoon!;
  if (t.activeEvent && t.activeEvent.until > Date.now()) return;
  if (Math.random() > 0.012) return;
  const totalW = TYCOON_EVENTS.reduce((a, e) => a + e.weight, 0);
  let roll = Math.random() * totalW;
  for (const ev of TYCOON_EVENTS) {
    roll -= ev.weight;
    if (roll <= 0) {
      t.activeEvent = { id: ev.id, until: Date.now() + ev.durationMs, label: ev.label };
      return;
    }
  }
}

export function tickTycoon(save: GameSave, dtSec: number, atLodging: boolean, inExpedition: boolean): void {
  ensureTycoon(save);
  ensureCamp(save);
  let changed = false;

  const accrueWhileAway = inExpedition || !atLodging;

  if (tickInnPassiveGold(save, dtSec, accrueWhileAway) > 0) changed = true;
  if (tickKitchenSurplus(save, dtSec, accrueWhileAway) > 0) changed = true;
  if (tickWarehousePassiveGold(save, dtSec, accrueWhileAway) > 0) changed = true;

  if (atLodging && !inExpedition) {
    tickStaffWages(save, dtSec);
    tryRollTycoonEvent(save, true);
  }

  tryAutoClaimDispatch(save, accrueWhileAway);
  if (atLodging && !inExpedition) tryAutoDispatch(save);

  const t = save.tycoon!;
  if (t.activeEvent && t.activeEvent.until <= Date.now()) {
    t.activeEvent = null;
    changed = true;
  }

  if (enforceWarehouseCap(save) > 0) changed = true;

  if (changed) saveGame(save);
}

export function getTycoonSummary(save: GameSave): string {
  ensureTycoon(save);
  const parts: string[] = [];
  if (save.tycoon!.zones.length) parts.push(`구역 ${save.tycoon!.zones.length}`);
  if (save.tycoon!.dispatch) parts.push('파견중');
  if (save.tycoon!.remodelTier > 0) parts.push(`리모델 T${save.tycoon!.remodelTier}`);
  return parts.length ? parts.join(' · ') : '';
}

export {
  enforceWarehouseCap,
  getTotalMaterialCount,
  getWarehouseCapacity,
} from './WarehouseSystem';
