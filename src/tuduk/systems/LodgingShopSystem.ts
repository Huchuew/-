import type { BattleBuffEntry, GameSave, ShopBattleBuffKind } from '../types';
import { MATERIAL_LABELS } from '../data/equipment';
import { addPotionStock } from './PotionInventory';
import { SHOP_POTION_GOLD } from '../data/economyPricing';
import { earlyProgressGoldMult } from '../data/economyBalance';
import { onShopBuy } from './OnboardingSystem';
import { canReceivePotion } from './VendorSystem';
import { addMaterial } from './EquipmentSystem';
import {
  getMaterialSpace, isWarehouseAutoSellEnabled,
} from './WarehouseSystem';

export type ShopProductId =
  | 'potion'
  | 'battle_elixir'
  | 'trail_rations'
  | 'spirit_stew'
  | 'guard_broth'
  | 'vitality_pill'
  | 'swift_tonic'
  | 'focus_draught'
  | 'lucky_crate';

export interface ShopProduct {
  id: ShopProductId;
  icon: string;
  name: string;
  desc: string;
  basePrice: number;
  unlockRegion: number;
  dailyLimit?: number;
  /** true면 층·초반 보정 없이 basePrice 그대로 */
  fixedPrice?: boolean;
}

export const SHOP_ROTATE_MS = 30 * 60 * 1000;
const SHOP_ROTATE_MIN = 2;
const SHOP_ROTATE_MAX = 4;

/** 상점 진열 풀 — 30분마다 2~4종 랜덤 */
const SHOP_ROTATION_POOL: ShopProductId[] = [
  'potion', 'trail_rations', 'battle_elixir', 'spirit_stew',
  'guard_broth', 'vitality_pill', 'swift_tonic', 'focus_draught', 'lucky_crate',
];

const PRODUCTS: ShopProduct[] = [
  {
    id: 'potion', icon: '💊', name: '회복 포션',
    desc: '숙소 창고 +1 · 원정 시 최대 3개만 휴대',
    basePrice: SHOP_POTION_GOLD, unlockRegion: 1, fixedPrice: true,
  },
  {
    id: 'trail_rations', icon: '🍱', name: '행군 도시락',
    desc: '다음 원정 10분간 공격력 +6%',
    basePrice: 780, unlockRegion: 2, dailyLimit: 3,
  },
  {
    id: 'battle_elixir', icon: '⚗️', name: '전투 비약',
    desc: '다음 원정 15분간 공격력 +14%',
    basePrice: 1850, unlockRegion: 5, dailyLimit: 2,
  },
  {
    id: 'spirit_stew', icon: '🥘', name: '용사 스튜',
    desc: '다음 원정 12분간 공격력 +10%',
    basePrice: 1420, unlockRegion: 3, dailyLimit: 3,
  },
  {
    id: 'guard_broth', icon: '🍲', name: '수호 탕',
    desc: '다음 원정 12분간 방어력 +10%',
    basePrice: 1280, unlockRegion: 4, dailyLimit: 3,
  },
  {
    id: 'vitality_pill', icon: '💚', name: '활력 환',
    desc: '다음 원정 15분간 체력 +12%',
    basePrice: 2100, unlockRegion: 6, dailyLimit: 2,
  },
  {
    id: 'swift_tonic', icon: '⚡', name: '신속 토닉',
    desc: '다음 원정 10분간 공격속도 +8%',
    basePrice: 1650, unlockRegion: 7, dailyLimit: 2,
  },
  {
    id: 'focus_draught', icon: '🎯', name: '집중 묘약',
    desc: '다음 원정 12분간 치명타 +6%p',
    basePrice: 1980, unlockRegion: 8, dailyLimit: 2,
  },
  {
    id: 'lucky_crate', icon: '🎁', name: '행운의 재료 상자',
    desc: '전 재료 랜덤 3~5종 — 희귀 재료는 층 해금 후 등장',
    basePrice: 3400, unlockRegion: 4, dailyLimit: 5,
  },
];

/** 행운 상자 — 전 재료 풀 (층 해금으로 희귀 재료 추가) */
const LUCKY_CRATE_POOL = [
  { mat: 'iron_ore', qty: [3, 8], minRegion: 1 },
  { mat: 'wood_chip', qty: [3, 7], minRegion: 1 },
  { mat: 'slime_gel', qty: [2, 6], minRegion: 1 },
  { mat: 'healing_herb', qty: [2, 5], minRegion: 1 },
  { mat: 'shadow_wing', qty: [1, 2], minRegion: 2 },
  { mat: 'beast_fang', qty: [1, 3], minRegion: 5 },
  { mat: 'magic_dust', qty: [1, 3], minRegion: 4 },
  { mat: 'rare_ore', qty: [1, 3], minRegion: 6 },
  { mat: 'spirit_thread', qty: [1, 2], minRegion: 9 },
  { mat: 'legend_scale', qty: [1, 2], minRegion: 10 },
  { mat: 'void_shard', qty: [1, 1], minRegion: 12 },
  { mat: 'rift_crystal', qty: [1, 1], minRegion: 15 },
] as const;

function shufflePick<T>(pool: T[], count: number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, count);
}

function eligibleShopPool(save: GameSave): ShopProductId[] {
  const maxR = save.maxRegion ?? 1;
  return SHOP_ROTATION_POOL.filter(id => {
    const p = PRODUCTS.find(x => x.id === id);
    return p && maxR >= p.unlockRegion;
  });
}

function rollShopProducts(save: GameSave): ShopProductId[] {
  const pool = eligibleShopPool(save);
  if (!pool.length) return [];
  const maxCount = Math.min(pool.length, SHOP_ROTATE_MAX);
  const minCount = Math.min(pool.length, SHOP_ROTATE_MIN);
  const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
  return shufflePick(pool, count);
}

function checkLuckyCrateSpace(save: GameSave): { ok: boolean; reason?: string } {
  if (isWarehouseAutoSellEnabled(save)) return { ok: true };
  const hasAny = LUCKY_CRATE_POOL.some(entry => getMaterialSpace(save, entry.mat) > 0);
  if (hasAny) return { ok: true };
  return { ok: false, reason: '모든 재료 만석 — 창고 여유 필요' };
}

function todayKey(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function ensureShopDaily(save: GameSave, now = Date.now()): void {
  if (!save.lodgingEconomy) return;
  const day = todayKey(now);
  if (save.lodgingEconomy.shopDay !== day) {
    save.lodgingEconomy.shopDay = day;
    save.lodgingEconomy.shopBought = {};
  }
  if (!save.lodgingEconomy.shopBought) save.lodgingEconomy.shopBought = {};
}

export function ensureShopRotation(save: GameSave, now = Date.now()): void {
  ensureShopDaily(save, now);
  if (!save.lodgingEconomy) return;
  const maxR = save.maxRegion ?? 1;
  const ids = save.lodgingEconomy.shopProductIds ?? [];
  const valid = ids.filter(id => {
    const p = PRODUCTS.find(x => x.id === id);
    return p && maxR >= p.unlockRegion;
  });
  const elapsed = now - (save.lodgingEconomy.shopRotatedAt ?? 0);
  const needsRotate = !valid.length
    || elapsed >= SHOP_ROTATE_MS
    || valid.length !== ids.length;
  if (needsRotate) {
    save.lodgingEconomy.shopProductIds = rollShopProducts(save);
    save.lodgingEconomy.shopRotatedAt = now;
    save.lodgingEconomy.shopBought = {};
  } else {
    save.lodgingEconomy.shopProductIds = valid;
  }
}

export function getShopRotateRemainingSec(save: GameSave, now = Date.now()): number {
  ensureShopRotation(save, now);
  const left = SHOP_ROTATE_MS - (now - (save.lodgingEconomy?.shopRotatedAt ?? now));
  return Math.max(0, Math.ceil(left / 1000));
}

export function getShopPrice(save: GameSave, base: number, fixed = false): number {
  if (fixed) return base;
  const region = save.maxRegion ?? 1;
  const whLv = save.camp?.warehouseLevel ?? 0;
  const warehouseTax = 1 + whLv * 0.0025;
  return Math.max(
    base,
    Math.floor(base * (0.98 + region * 0.16) * warehouseTax / Math.max(1, earlyProgressGoldMult(region) * 0.88)),
  );
}

export interface ShopProductView extends ShopProduct {
  price: number;
  canBuy: boolean;
  reason?: string;
  boughtToday?: number;
  /** 재료 상품 — 주 재료 키 (UI 보유량 표시) */
  stockMat?: string;
  stockQty?: number;
}

export function getShopProducts(save: GameSave): ShopProductView[] {
  ensureShopRotation(save);
  const maxR = save.maxRegion ?? 1;
  const bought = save.lodgingEconomy?.shopBought ?? {};
  const activeIds = new Set(save.lodgingEconomy?.shopProductIds ?? []);

  return PRODUCTS.filter(p => activeIds.has(p.id)).map(p => {
    const price = getShopPrice(save, p.basePrice, p.fixedPrice);
    let canBuy = maxR >= p.unlockRegion && save.gold >= price;
    let reason: string | undefined;
    const boughtToday = bought[p.id] ?? 0;

    if (maxR < p.unlockRegion) {
      canBuy = false;
      reason = `${p.unlockRegion}층 해금`;
    } else if (p.dailyLimit != null && boughtToday >= p.dailyLimit) {
      canBuy = false;
      reason = '오늘 한도 소진';
    } else if (p.id === 'potion' && !canReceivePotion(save)) {
      canBuy = false;
      reason = '포션 최대 보유';
    } else if (p.id === 'lucky_crate') {
      const space = checkLuckyCrateSpace(save);
      if (!space.ok) {
        canBuy = false;
        reason = space.reason;
      }
    } else if (save.gold < price) {
      canBuy = false;
      reason = '골드 부족';
    }

    return {
      ...p,
      price,
      canBuy,
      reason,
      boughtToday: p.dailyLimit ? boughtToday : undefined,
    };
  });
}

function rollLuckyCrate(save: GameSave): string {
  const maxR = save.maxRegion ?? 1;
  const pool = LUCKY_CRATE_POOL.filter(e => maxR >= e.minRegion);
  if (!pool.length) return '재료 없음';
  const picks = 3 + Math.floor(Math.random() * 3);
  const lines: string[] = [];
  for (let i = 0; i < picks; i++) {
    const entry = pool[Math.floor(Math.random() * pool.length)]!;
    const qty = entry.qty[0] + Math.floor(Math.random() * (entry.qty[1] - entry.qty[0] + 1));
    addMaterial(save, entry.mat, qty);
    lines.push(`${MATERIAL_LABELS[entry.mat] ?? entry.mat}×${qty}`);
  }
  return lines.join(', ');
}

interface BuffMeta {
  icon: string;
  name: string;
  atkPct?: number;
  defPct?: number;
  hpPct?: number;
  spdPct?: number;
  critPct?: number;
}

const BUFF_META: Record<ShopBattleBuffKind, BuffMeta> = {
  trail_rations: { icon: '🍱', name: '행군 도시락', atkPct: 6 },
  battle_elixir: { icon: '⚗️', name: '전투 비약', atkPct: 14 },
  spirit_stew: { icon: '🥘', name: '용사 스튜', atkPct: 10 },
  guard_broth: { icon: '🍲', name: '수호 탕', defPct: 10 },
  vitality_pill: { icon: '💚', name: '활력 환', hpPct: 12 },
  swift_tonic: { icon: '⚡', name: '신속 토닉', spdPct: 8 },
  focus_draught: { icon: '🎯', name: '집중 묘약', critPct: 6 },
};

const BUFF_DURATION_MS: Record<ShopBattleBuffKind, number> = {
  trail_rations: 10 * 60_000,
  battle_elixir: 15 * 60_000,
  spirit_stew: 12 * 60_000,
  guard_broth: 12 * 60_000,
  vitality_pill: 15 * 60_000,
  swift_tonic: 10 * 60_000,
  focus_draught: 12 * 60_000,
};

const BUFF_STAT_VALUES: Record<ShopBattleBuffKind, Partial<Pick<BattleBuffEntry, 'atk' | 'def' | 'hp' | 'spd' | 'crit'>>> = {
  trail_rations: { atk: 0.06 },
  battle_elixir: { atk: 0.14 },
  spirit_stew: { atk: 0.10 },
  guard_broth: { def: 0.10 },
  vitality_pill: { hp: 0.12 },
  swift_tonic: { spd: 0.08 },
  focus_draught: { crit: 0.06 },
};

export interface ActiveShopBattleBuff {
  kind: ShopBattleBuffKind;
  icon: string;
  name: string;
  atkPct: number;
  defPct: number;
  hpPct: number;
  spdPct: number;
  critPct: number;
  remainSec: number;
  /** 1=방금 먹음 ~ 0=만료 직전 */
  remainRatio: number;
  startedAt: number;
  desc: string;
}

function inferBuffKind(atkBonus?: number): ShopBattleBuffKind {
  if ((atkBonus ?? 0) >= 0.12) return 'battle_elixir';
  return 'trail_rations';
}

function buffDesc(meta: BuffMeta): string {
  const parts: string[] = [];
  if (meta.atkPct) parts.push(`공격 +${meta.atkPct}%`);
  if (meta.defPct) parts.push(`방어 +${meta.defPct}%`);
  if (meta.hpPct) parts.push(`체력 +${meta.hpPct}%`);
  if (meta.spdPct) parts.push(`공속 +${meta.spdPct}%`);
  if (meta.critPct) parts.push(`치명 +${meta.critPct}%p`);
  return parts.join(' · ') || '버프';
}

function syncLegacyBattleBuffFields(save: GameSave, list: BattleBuffEntry[]) {
  if (!list.length) {
    save.battleBuffUntil = undefined;
    save.battleBuffAtk = undefined;
    save.battleBuffKind = undefined;
    save.battleBuffDurationMs = undefined;
    return;
  }
  const latest = list.reduce((a, b) => (b.until > a.until ? b : a));
  save.battleBuffKind = latest.kind;
  save.battleBuffAtk = latest.atk;
  save.battleBuffDurationMs = latest.durationMs;
  save.battleBuffUntil = latest.until;
}

/** 만료 제거 + 레거시 단일 버프 마이그레이션 */
export function reconcileBattleBuffs(save: GameSave, now = Date.now()): BattleBuffEntry[] {
  if (!save.battleBuffs) save.battleBuffs = [];

  if (save.battleBuffUntil && save.battleBuffUntil > now) {
    const kind = save.battleBuffKind ?? inferBuffKind(save.battleBuffAtk);
    const stats = BUFF_STAT_VALUES[kind] ?? { atk: save.battleBuffAtk };
    const durationMs = save.battleBuffDurationMs ?? BUFF_DURATION_MS[kind];
    const legacy: BattleBuffEntry = {
      kind,
      ...stats,
      until: save.battleBuffUntil,
      durationMs,
    };
    const exists = save.battleBuffs.some(
      b => b.kind === legacy.kind && Math.abs(b.until - legacy.until) < 1000,
    );
    if (!exists) save.battleBuffs.push(legacy);
  }

  save.battleBuffs = save.battleBuffs.filter(b => b.until > now);
  syncLegacyBattleBuffFields(save, save.battleBuffs);
  return save.battleBuffs;
}

function applyBattleBuff(save: GameSave, kind: ShopBattleBuffKind) {
  const now = Date.now();
  const list = reconcileBattleBuffs(save, now);
  const stats = BUFF_STAT_VALUES[kind]!;
  const durationMs = BUFF_DURATION_MS[kind];
  const entry: BattleBuffEntry = { kind, ...stats, until: now + durationMs, durationMs };
  const idx = list.findIndex(b => b.kind === kind);
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  save.battleBuffs = list;
  syncLegacyBattleBuffFields(save, list);
}

function entryToActive(entry: BattleBuffEntry, now: number): ActiveShopBattleBuff {
  const meta = BUFF_META[entry.kind];
  const remainMs = entry.until - now;
  return {
    kind: entry.kind,
    icon: meta.icon,
    name: meta.name,
    atkPct: Math.round((entry.atk ?? 0) * 100),
    defPct: Math.round((entry.def ?? 0) * 100),
    hpPct: Math.round((entry.hp ?? 0) * 100),
    spdPct: Math.round((entry.spd ?? 0) * 100),
    critPct: Math.round((entry.crit ?? 0) * 100),
    remainSec: Math.max(0, Math.ceil(remainMs / 1000)),
    remainRatio: Math.max(0, Math.min(1, remainMs / Math.max(1, entry.durationMs))),
    startedAt: entry.until - entry.durationMs,
    desc: buffDesc(meta),
  };
}

export function getActiveShopBattleBuffs(save: GameSave, now = Date.now()): ActiveShopBattleBuff[] {
  return reconcileBattleBuffs(save, now)
    .map(entry => entryToActive(entry, now))
    .sort((a, b) => a.startedAt - b.startedAt);
}

/** @deprecated getActiveShopBattleBuffs 사용 */
export function getActiveShopBattleBuff(save: GameSave, now = Date.now()): ActiveShopBattleBuff | null {
  const buffs = getActiveShopBattleBuffs(save, now);
  return buffs[0] ?? null;
}

/** 허브 — 하루 1개 할인 (포션·영약) */
const HUB_DAILY_DEAL_POOL: ShopProductId[] = [
  'potion', 'trail_rations', 'battle_elixir', 'spirit_stew',
  'guard_broth', 'vitality_pill', 'swift_tonic', 'focus_draught',
];
const HUB_DAILY_DISCOUNT = 0.28;

function hubDealHash(day: string): number {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = ((h << 5) - h + day.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function ensureHubSpecialDay(save: GameSave, now = Date.now()): void {
  if (!save.lodgingEconomy) save.lodgingEconomy = { huntBountyAt: 0, errandDay: '', errandMat: '', errandQty: 0, errandReward: 0, errandDone: false };
  const day = todayKey(now);
  if (save.lodgingEconomy.hubSpecialDay !== day) {
    save.lodgingEconomy.hubSpecialDay = day;
    save.lodgingEconomy.hubSpecialBought = false;
  }
}

export interface HubDailyDealView {
  id: ShopProductId;
  icon: string;
  name: string;
  desc: string;
  price: number;
  regularPrice: number;
  discountPct: number;
  canBuy: boolean;
  bought: boolean;
  reason?: string;
}

export function getHubDailyDeal(save: GameSave, now = Date.now()): HubDailyDealView | null {
  ensureHubSpecialDay(save, now);
  const maxR = save.maxRegion ?? 1;
  const pool = HUB_DAILY_DEAL_POOL.filter(id => {
    const p = PRODUCTS.find(x => x.id === id);
    return p && maxR >= p.unlockRegion;
  });
  if (!pool.length) return null;
  const day = save.lodgingEconomy!.hubSpecialDay!;
  const product = PRODUCTS.find(p => p.id === pool[hubDealHash(day) % pool.length]!)!;
  const regularPrice = getShopPrice(save, product.basePrice, product.fixedPrice);
  const price = Math.max(1, Math.floor(regularPrice * (1 - HUB_DAILY_DISCOUNT)));
  const bought = !!save.lodgingEconomy!.hubSpecialBought;
  let canBuy = !bought && save.gold >= price;
  let reason: string | undefined;
  if (bought) {
    canBuy = false;
  } else if (product.id === 'potion' && !canReceivePotion(save)) {
    canBuy = false;
    reason = '포션 최대 보유';
  } else if (save.gold < price) {
    canBuy = false;
    reason = '골드 부족';
  }
  return {
    id: product.id,
    icon: product.icon,
    name: product.name,
    desc: product.desc,
    price,
    regularPrice,
    discountPct: HUB_DAILY_DISCOUNT,
    canBuy,
    bought,
    reason,
  };
}

function applyShopProductEffect(save: GameSave, id: ShopProductId): { ok: boolean; message: string } {
  switch (id) {
    case 'potion':
      addPotionStock(save, 1);
      return { ok: true, message: '💊 창고 포션 +1' };
    case 'trail_rations':
      applyBattleBuff(save, 'trail_rations');
      return { ok: true, message: '🍱 행군 도시락 — 공격 +6% (10분)' };
    case 'battle_elixir':
      applyBattleBuff(save, 'battle_elixir');
      return { ok: true, message: '⚗️ 전투 비약 — 공격 +14% (15분)' };
    case 'spirit_stew':
      applyBattleBuff(save, 'spirit_stew');
      return { ok: true, message: '🥘 용사 스튜 — 공격 +10% (12분)' };
    case 'guard_broth':
      applyBattleBuff(save, 'guard_broth');
      return { ok: true, message: '🍲 수호 탕 — 방어 +10% (12분)' };
    case 'vitality_pill':
      applyBattleBuff(save, 'vitality_pill');
      return { ok: true, message: '💚 활력 환 — 체력 +12% (15분)' };
    case 'swift_tonic':
      applyBattleBuff(save, 'swift_tonic');
      return { ok: true, message: '⚡ 신속 토닉 — 공속 +8% (10분)' };
    case 'focus_draught':
      applyBattleBuff(save, 'focus_draught');
      return { ok: true, message: '🎯 집중 묘약 — 치명 +6%p (12분)' };
    default:
      return { ok: false, message: '구매 실패' };
  }
}

export function buyHubDailyDeal(save: GameSave, now = Date.now()): { ok: boolean; message: string } {
  const deal = getHubDailyDeal(save, now);
  if (!deal) return { ok: false, message: '오늘 특가 없음' };
  if (deal.bought) return { ok: false, message: '오늘 특가 이미 구매함' };
  if (!deal.canBuy) return { ok: false, message: deal.reason ?? '구매 불가' };
  save.gold -= deal.price;
  onShopBuy(save);
  save.lodgingEconomy!.hubSpecialBought = true;
  return applyShopProductEffect(save, deal.id);
}

export function buyShopProduct(save: GameSave, id: ShopProductId): { ok: boolean; message: string } {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return { ok: false, message: '알 수 없는 상품' };

  const view = getShopProducts(save).find(p => p.id === id);
  if (!view?.canBuy) return { ok: false, message: view?.reason ?? '구매 불가' };

  if (id === 'lucky_crate') {
    const space = checkLuckyCrateSpace(save);
    if (!space.ok) return { ok: false, message: space.reason ?? '창고 만석' };
  }

  save.gold -= view.price;
  onShopBuy(save);
  ensureShopDaily(save);
  if (product.dailyLimit != null) {
    save.lodgingEconomy!.shopBought![id] = (save.lodgingEconomy!.shopBought![id] ?? 0) + 1;
  }

  switch (id) {
    case 'lucky_crate': {
      const loot = rollLuckyCrate(save);
      return { ok: true, message: `🎁 ${loot}` };
    }
    default:
      return applyShopProductEffect(save, id);
  }
}
