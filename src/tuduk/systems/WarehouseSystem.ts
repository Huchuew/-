import type { GameSave } from '../types';
import { MATERIAL_LABELS } from '../data/equipment';
import { getBuildingLevel } from '../data/campBuildings';
import {
  AUTO_SELL_RATE,
  perItemCapAtLevel,
  REMODEL_SELL_BONUS_PER_TIER,
  TYCOON_EVENTS,
  WAREHOUSE_BASE_PER_ITEM,
} from '../data/tycoonConfig';
import { JUNK_SELL_PRICES, scaleSellGold } from './VendorSystem';

type WarehouseAlertFn = (msg: string) => void;

let alertHandler: WarehouseAlertFn | null = null;
const alertCooldown = new Map<string, number>();
const ALERT_COOLDOWN_MS = 9_000;

export function setWarehouseAlertHandler(fn: WarehouseAlertFn | null): void {
  alertHandler = fn;
}

export function getPerItemWarehouseCap(save: GameSave): number {
  const lv = getBuildingLevel(save, 'warehouse');
  return perItemCapAtLevel(lv);
}

/** @deprecated — 품목당 한도 (호환용 이름) */
export function getWarehouseCapacity(save: GameSave): number {
  return getPerItemWarehouseCap(save);
}

export function getTotalMaterialCount(save: GameSave): number {
  return Object.values(save.materials).reduce((a, b) => a + b, 0);
}

export function getMaterialCount(save: GameSave, mat: string): number {
  return save.materials[mat] ?? 0;
}

export function getMaterialSpace(save: GameSave, mat: string): number {
  const cap = getPerItemWarehouseCap(save);
  return Math.max(0, cap - getMaterialCount(save, mat));
}

export type MaterialCapFill = '' | 'mat-near-full' | 'mat-full';

/** UI — 보유/품목당 한도 (가방·상점 공용) */
export function getMaterialCapDisplay(save: GameSave, mat: string): {
  qty: number;
  cap: number;
  fillClass: MaterialCapFill;
} {
  const cap = getPerItemWarehouseCap(save);
  const qty = getMaterialCount(save, mat);
  const fillClass: MaterialCapFill = qty >= cap
    ? 'mat-full'
    : qty >= cap * 0.85
      ? 'mat-near-full'
      : '';
  return { qty, cap, fillClass };
}

export function formatMaterialCapLabel(save: GameSave, mat: string): string {
  const { qty, cap } = getMaterialCapDisplay(save, mat);
  return `${qty}/${cap}`;
}

export function isWarehouseAutoSellEnabled(save: GameSave): boolean {
  return (save.tycoon?.autoSellOverflow ?? true) && getBuildingLevel(save, 'warehouse') > 0;
}

export function getWarehouseAutoSellRate(save: GameSave): number {
  const lv = getBuildingLevel(save, 'warehouse');
  if (lv <= 0) return AUTO_SELL_RATE;
  return Math.min(0.94, AUTO_SELL_RATE + lv * 0.0022 + Math.floor(lv / 25) * 0.018);
}

/** 창고 Lv — 여관·식당 패시브 수입 보너스 */
export function getWarehouseIncomeMult(save: GameSave): number {
  const lv = getBuildingLevel(save, 'warehouse');
  if (lv <= 0) return 1;
  return 1 + lv * 0.007 + Math.floor(lv / 20) * 0.045 + Math.floor(lv / 50) * 0.08;
}

export interface WarehouseFullness {
  perItemCap: number;
  totalKinds: number;
  fullKinds: number;
  nearFullKinds: number;
  maxFillPct: number;
  fullestKey?: string;
  fullestQty: number;
}

export function getWarehouseFullness(save: GameSave): WarehouseFullness {
  const perItemCap = getPerItemWarehouseCap(save);
  const entries = Object.entries(save.materials).filter(([, n]) => n > 0);
  let fullKinds = 0;
  let nearFullKinds = 0;
  let maxFillPct = 0;
  let fullestKey: string | undefined;
  let fullestQty = 0;
  for (const [key, qty] of entries) {
    const pct = perItemCap > 0 ? qty / perItemCap : 0;
    if (qty >= perItemCap) fullKinds++;
    if (pct >= 0.85) nearFullKinds++;
    if (pct > maxFillPct) {
      maxFillPct = pct;
      fullestKey = key;
      fullestQty = qty;
    }
  }
  return {
    perItemCap,
    totalKinds: entries.length,
    fullKinds,
    nearFullKinds,
    maxFillPct: Math.min(100, Math.round(maxFillPct * 100)),
    fullestKey,
    fullestQty,
  };
}

export function formatWarehousePanelStats(save: GameSave): {
  totalQty: number;
  perItemCap: number;
  totalKinds: number;
  fullKinds: number;
  maxFillPct: number;
  fullestLabel: string;
} {
  const fullness = getWarehouseFullness(save);
  const fullestLabel = fullness.fullestKey
    ? `${MATERIAL_LABELS[fullness.fullestKey] ?? fullness.fullestKey} ${fullness.fullestQty}/${fullness.perItemCap}`
    : '—';
  return {
    totalQty: getTotalMaterialCount(save),
    perItemCap: fullness.perItemCap,
    totalKinds: fullness.totalKinds,
    fullKinds: fullness.fullKinds,
    maxFillPct: fullness.maxFillPct,
    fullestLabel,
  };
}

function getSellMarketMult(save: GameSave, matKey: string): number {
  const remodel = 1 + (save.tycoon?.remodelTier ?? 0) * REMODEL_SELL_BONUS_PER_TIER;
  let eventMult = 1;
  const ev = save.tycoon?.activeEvent;
  if (ev && ev.until > Date.now()) {
    if (ev.id === 'caravan' && matKey === 'iron_ore') eventMult = 1.7;
    if (ev.id === 'herb_fest' && matKey === 'healing_herb') eventMult = 1.6;
  }
  return remodel * eventMult;
}

function sellMaterialQty(save: GameSave, mat: string, qty: number): number {
  if (qty <= 0) return 0;
  const rate = getWarehouseAutoSellRate(save);
  const unit = Math.floor(
    scaleSellGold(JUNK_SELL_PRICES[mat] ?? 1) * getSellMarketMult(save, mat) * rate,
  );
  const gold = qty * unit;
  if (gold > 0) {
    save.gold += gold;
    save.stats.totalGold += gold;
  }
  return gold;
}

function notifyOverflow(mat: string, lost: number): void {
  if (lost <= 0 || !alertHandler) return;
  const now = Date.now();
  const last = alertCooldown.get(mat) ?? 0;
  if (now - last < ALERT_COOLDOWN_MS) return;
  alertCooldown.set(mat, now);
  const label = MATERIAL_LABELS[mat] ?? mat;
  alertHandler(`📦 ${label} 창고 가득 — ${lost}개 놓침`);
}

export interface AddMaterialResult {
  added: number;
  lost: number;
  sold: number;
  soldGold: number;
}

/** 재료 추가 — 품목당 한도 적용, 초과분 자동매각 또는 유실 알림 */
export function addMaterialCapped(save: GameSave, mat: string, amount: number): AddMaterialResult {
  const empty: AddMaterialResult = { added: 0, lost: 0, sold: 0, soldGold: 0 };
  if (amount <= 0) return empty;

  const cap = getPerItemWarehouseCap(save);
  const current = getMaterialCount(save, mat);
  const space = Math.max(0, cap - current);
  const toStore = Math.min(amount, space);
  const overflow = amount - toStore;

  if (toStore > 0) {
    save.materials[mat] = current + toStore;
  }

  let lost = 0;
  let sold = 0;
  let soldGold = 0;
  if (overflow > 0) {
    if (isWarehouseAutoSellEnabled(save)) {
      sold = overflow;
      soldGold = sellMaterialQty(save, mat, overflow);
    } else {
      lost = overflow;
      notifyOverflow(mat, lost);
    }
  }

  return { added: toStore, lost, sold, soldGold };
}

/** 창고 초과분 품목별 자동 매각 */
export function enforceWarehouseCap(save: GameSave): number {
  if (!isWarehouseAutoSellEnabled(save)) return 0;
  const cap = getPerItemWarehouseCap(save);
  let totalGold = 0;
  for (const [key, qty] of Object.entries(save.materials)) {
    if (qty <= cap) continue;
    const excess = qty - cap;
    save.materials[key] = cap;
    totalGold += sellMaterialQty(save, key, excess);
  }
  return totalGold;
}

export function formatWarehousePanelDetail(
  lv: number,
  save: GameSave,
  autoSell: boolean,
): { headline: string; nextLine: string; explain: string } {
  const stats = formatWarehousePanelStats(save);
  const { totalQty, perItemCap: cap, totalKinds, fullKinds, maxFillPct, fullestLabel } = stats;

  const headline = lv <= 0
    ? `📦 품목당 ${WAREHOUSE_BASE_PER_ITEM}개 · 총 ${totalQty}개 보유 (창고 미건설)`
    : `📦 품목당 ${cap.toLocaleString()}개 · ${totalKinds}종 · 만석 ${fullKinds}종`;

  const nextLine = lv >= 100
    ? `최대 레벨 · 품목당 ${cap.toLocaleString()}개 · 가장 많음: ${fullestLabel}`
    : lv <= 0
      ? `Lv.1 건설 → 품목당 ${perItemCapAtLevel(1)}개 · 자동매각·패시브 보너스 해금`
      : `Lv.${lv + 1} → 품목당 ${perItemCapAtLevel(lv + 1).toLocaleString()}개 (+${perItemCapAtLevel(lv + 1) - cap}) · ${maxFillPct}%`;

  const explain = '재료는 <b>종류마다</b> 보관 한도가 있습니다. '
    + (lv > 0 && autoSell
      ? '한도 초과분은 자동 저가 매각됩니다. '
      : lv > 0
        ? '한도 초과 시 추가 적립이 막히고 잔잔한 알림이 뜹니다. '
        : '창고 건설 시 Lv마다 한도·자동매각·숙소 수입이 크게 오릅니다. ')
    + `가장 많은 품목: ${fullestLabel}`;

  return { headline, nextLine, explain };
}

export { WAREHOUSE_BASE_PER_ITEM };
