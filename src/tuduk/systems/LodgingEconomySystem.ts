import type { BagItem, GameSave } from '../types';
import { GRADE_ORDER } from '../data/equipGrades';
import { RECIPE_MAP } from '../data/equipment';
import { MATERIAL_LABELS } from '../data/equipment';
import { earlyProgressGoldMult } from '../data/economyBalance';
import {
  onBountyClaimed, onErrandCompleted, onRestTipClaimed,
} from './OnboardingSystem';
import { scaleSellGold } from './VendorSystem';
import { getInnRestTipMult } from './TycoonExpansionSystem';

const HUNT_BOUNTY_STEP = 50;
const HUNT_BOUNTY_GOLD = 220;

const ERRAND_POOL: { mat: string; qty: number; reward: number }[] = [
  { mat: 'iron_ore', qty: 6, reward: 220 },
  { mat: 'wood_chip', qty: 8, reward: 180 },
  { mat: 'slime_gel', qty: 5, reward: 260 },
  { mat: 'healing_herb', qty: 4, reward: 300 },
  { mat: 'beast_fang', qty: 3, reward: 340 },
  { mat: 'magic_dust', qty: 2, reward: 420 },
  { mat: 'shadow_wing', qty: 2, reward: 480 },
];

function todayKey(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function ensureLodgingEconomy(save: GameSave, now = Date.now()): void {
  if (!save.lodgingEconomy) {
    save.lodgingEconomy = {
      huntBountyAt: 0,
      pendingKillGold: 0,
      pendingKillCount: 0,
      errandDay: '',
      errandMat: 'iron_ore',
      errandQty: 6,
      errandReward: 220,
      errandDone: false,
    };
  }
  if (save.lodgingEconomy.pendingKillGold == null) save.lodgingEconomy.pendingKillGold = 0;
  if (save.lodgingEconomy.pendingKillCount == null) save.lodgingEconomy.pendingKillCount = 0;
  const day = todayKey(now);
  if (save.lodgingEconomy.errandDay !== day) {
    const pick = ERRAND_POOL[Math.floor(Math.random() * ERRAND_POOL.length)]!;
    save.lodgingEconomy.errandDay = day;
    save.lodgingEconomy.errandMat = pick.mat;
    save.lodgingEconomy.errandQty = pick.qty;
    save.lodgingEconomy.errandReward = Math.floor(
      pick.reward * earlyProgressGoldMult(save.maxRegion ?? 1),
    );
    save.lodgingEconomy.errandDone = false;
  }
}

export function getPawnGold(item: BagItem): number {
  const gradeIdx = Math.max(0, GRADE_ORDER.indexOf(item.grade));
  const base = 45 + gradeIdx * 38;
  const levelBonus = item.level * 22;
  return scaleSellGold(base + levelBonus);
}

export function pawnEquipment(save: GameSave, uid: string): number {
  const idx = save.bag.findIndex(b => b.uid === uid);
  if (idx < 0) return 0;
  const item = save.bag[idx]!;

  for (const cid of save.owned) {
    const st = save.chars[cid];
    if (!st) continue;
    for (const slot of Object.keys(st.equipped)) {
      if (st.equipped[slot as keyof typeof st.equipped] === uid) return 0;
    }
  }

  const gold = getPawnGold(item);
  save.bag.splice(idx, 1);
  save.gold += gold;
  save.stats.totalGold += gold;
  return gold;
}

export function getClaimableHuntBounty(save: GameSave): { kills: number; gold: number } {
  ensureLodgingEconomy(save);
  const since = save.lodgingEconomy!.huntBountyAt;
  const kills = Math.max(0, save.stats.totalKills - since);
  const steps = Math.floor(kills / HUNT_BOUNTY_STEP);
  const mult = earlyProgressGoldMult(save.maxRegion ?? 1);
  return {
    kills: steps * HUNT_BOUNTY_STEP,
    gold: Math.floor(steps * scaleSellGold(HUNT_BOUNTY_GOLD) * mult),
  };
}

export function claimHuntBounty(save: GameSave): number {
  const { kills, gold } = getClaimableHuntBounty(save);
  if (gold <= 0 || kills <= 0) return 0;
  save.lodgingEconomy!.huntBountyAt += kills;
  save.gold += gold;
  save.stats.totalGold += gold;
  onBountyClaimed(save);
  return gold;
}

export function getDailyErrand(save: GameSave) {
  ensureLodgingEconomy(save);
  const e = save.lodgingEconomy!;
  return {
    mat: e.errandMat,
    label: MATERIAL_LABELS[e.errandMat] ?? e.errandMat,
    qty: e.errandQty,
    reward: scaleSellGold(e.errandReward),
    done: e.errandDone,
    have: save.materials[e.errandMat] ?? 0,
  };
}

export function canCompleteDailyErrand(save: GameSave): boolean {
  const e = getDailyErrand(save);
  return !e.done && e.have >= e.qty;
}

export function completeDailyErrand(save: GameSave): number {
  if (!canCompleteDailyErrand(save)) return 0;
  const e = getDailyErrand(save);
  save.materials[e.mat] = (save.materials[e.mat] ?? 0) - e.qty;
  if (save.materials[e.mat]! <= 0) delete save.materials[e.mat];
  save.lodgingEconomy!.errandDone = true;
  save.gold += e.reward;
  save.stats.totalGold += e.reward;
  onErrandCompleted(save);
  return e.reward;
}

/** 휴식 중 류아가 손님을 맞이해 받는 팁 (1회 수령) */
export function getRestTipGold(save: GameSave): number {
  const clinic = save.camp?.clinicLevel ?? 0;
  const party = save.party.length;
  const mult = earlyProgressGoldMult(save.maxRegion ?? 1);
  return Math.floor(
    scaleSellGold(35 + party * 18 + clinic * 8) * getInnRestTipMult(save) * mult,
  );
}

export function getRestTipDailyLimit(save: GameSave): number {
  return (save.maxRegion ?? 1) <= 8 ? 2 : 1;
}

export function getRestTipClaimsToday(save: GameSave): number {
  ensureLodgingEconomy(save);
  const e = save.lodgingEconomy!;
  const day = todayKey();
  if (e.restTipDay !== day) return 0;
  return e.restTipCount ?? 0;
}

export function canClaimRestTip(save: GameSave, resting: boolean): boolean {
  ensureLodgingEconomy(save);
  if (!resting) return false;
  const day = todayKey();
  const e = save.lodgingEconomy!;
  const limit = getRestTipDailyLimit(save);
  if (e.restTipDay !== day) return true;
  return (e.restTipCount ?? 0) < limit;
}

export function claimRestTip(save: GameSave, resting: boolean): number {
  if (!canClaimRestTip(save, resting)) return 0;
  const gold = getRestTipGold(save);
  const day = todayKey();
  const e = save.lodgingEconomy!;
  if (e.restTipDay !== day) {
    e.restTipDay = day;
    e.restTipCount = 0;
  }
  e.restTipCount = (e.restTipCount ?? 0) + 1;
  save.gold += gold;
  save.stats.totalGold += gold;
  onRestTipClaimed(save);
  return gold;
}

/** 원정·전투 사냥 골드 — HUD에 바로 반영 */
export function creditPendingHuntGold(save: GameSave, gold: number, _kills = 0): void {
  if (gold <= 0) return;
  ensureLodgingEconomy(save);
  save.gold += gold;
  save.stats.totalGold += gold;
}

export function getPendingHuntGold(save: GameSave): { gold: number; kills: number; perKill: number } {
  ensureLodgingEconomy(save);
  const e = save.lodgingEconomy!;
  const gold = e.pendingKillGold ?? 0;
  const kills = e.pendingKillCount ?? 0;
  return { gold, kills, perKill: kills > 0 ? Math.floor(gold / kills) : 0 };
}

export function claimPendingHuntGold(save: GameSave): number {
  const { gold } = getPendingHuntGold(save);
  if (gold <= 0) return 0;
  save.lodgingEconomy!.pendingKillGold = 0;
  save.lodgingEconomy!.pendingKillCount = 0;
  save.gold += gold;
  save.stats.totalGold += gold;
  return gold;
}

export function getPawnableItems(save: GameSave): { uid: string; label: string; gold: number }[] {
  const equipped = new Set<string>();
  for (const cid of save.owned) {
    const st = save.chars[cid];
    if (!st) continue;
    for (const uid of Object.values(st.equipped)) {
      if (uid) equipped.add(uid);
    }
  }
  return save.bag
    .filter(b => !equipped.has(b.uid))
    .map(b => {
      const r = RECIPE_MAP[b.id];
      return {
        uid: b.uid,
        label: r?.name ?? b.id,
        gold: getPawnGold(b),
      };
    })
    .sort((a, b) => b.gold - a.gold);
}
