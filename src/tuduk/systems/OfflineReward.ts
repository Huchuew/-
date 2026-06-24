import type { GameSave } from '../types';
import { earlyProgressGoldMult } from '../data/economyBalance';
import { getPartyDps } from './StatCalculator';
import { getChefOfflineBonus } from './CookSystem';
import { getEndgameExpMult } from './EndgameSystem';
import { accelerateBossPacing } from './floorPacing';
import { getCharExpMultiplier } from './RebirthMarkSystem';
import { getRegionMonsters } from '../data/monsters';

const MAX_OFFLINE_MS = 12 * 60 * 60 * 1000;
const MIN_OFFLINE_MS = 60_000;

export interface OfflineResult {
  gold: number;
  exp: number;
  hours: number;
  /** 보스 대기 가속(초) */
  bossPaceSec: number;
  /** 도감 자동 발견 몬스터 수 */
  codexDiscoveries: number;
}

export function calcOfflineReward(save: GameSave): OfflineResult {
  const lastOnline = Number.isFinite(save.lastOnline) && save.lastOnline > 0
    ? save.lastOnline
    : Date.now();
  const elapsed = Math.min(Math.max(0, Date.now() - lastOnline), MAX_OFFLINE_MS);
  if (elapsed < MIN_OFFLINE_MS) {
    return { gold: 0, exp: 0, hours: 0, bossPaceSec: 0, codexDiscoveries: 0 };
  }

  const hours = elapsed / 3_600_000;
  const dps = Math.max(0, getPartyDps(save) || 0);
  const chefBonus = getChefOfflineBonus(save);
  const expMult = getEndgameExpMult(save);
  const progressMult = earlyProgressGoldMult(save.maxRegion ?? 1);
  const region = save.maxRegion ?? 1;

  const exp = Math.floor(dps * hours * 68 * chefBonus * expMult);
  const goldPerHour = Math.max(60, Math.floor(dps * 12 + region * 35));
  const goldRaw = Math.floor(goldPerHour * hours * chefBonus * progressMult);
  const goldCap = Math.floor(goldPerHour * 12);
  const gold = Math.min(goldRaw, goldCap);

  const bossPaceSec = Math.floor(Math.min(hours * 360, 45 * 60) * (0.35 + region * 0.02));
  const codexDiscoveries = Math.min(
    getRegionMonsters(region).length,
    Math.floor(hours * (0.8 + region * 0.05)),
  );

  return {
    gold, exp, hours: Math.round(hours * 10) / 10,
    bossPaceSec, codexDiscoveries,
  };
}

function applyOfflineCodex(save: GameSave, regionId: number, count: number) {
  if (count <= 0) return;
  if (!save.codex) save.codex = {};
  const mons = getRegionMonsters(regionId);
  let added = 0;
  for (const m of mons) {
    if (added >= count) break;
    if (!save.codex[m.id]?.discovered) {
      save.codex[m.id] = { kills: 0, discovered: true };
      added++;
    }
  }
}

export function applyOfflineReward(save: GameSave): OfflineResult {
  const reward = calcOfflineReward(save);
  if (reward.exp <= 0 && reward.gold <= 0 && reward.bossPaceSec <= 0 && reward.codexDiscoveries <= 0) {
    return reward;
  }

  // 중복 수령 방지 — 보상 지급 직전 시각 고정 (멀티탭·저장 실패 대비)
  save.lastOnline = Date.now();

  if (reward.exp > 0) {
    const perCharBase = Math.floor(reward.exp / Math.max(1, save.party.length));
    for (const id of save.party) {
      const st = save.chars[id];
      if (st) st.exp += Math.floor(perCharBase * getCharExpMultiplier(save, id));
    }
  }
  if (reward.gold > 0) {
    save.gold += reward.gold;
    save.stats.totalGold += reward.gold;
  }
  if (reward.bossPaceSec > 0 && save.inExpedition) {
    accelerateBossPacing(save, save.currentRegion, reward.bossPaceSec);
  } else if (reward.bossPaceSec > 0) {
    accelerateBossPacing(save, save.maxRegion ?? 1, Math.floor(reward.bossPaceSec * 0.5));
  }
  if (reward.codexDiscoveries > 0) {
    applyOfflineCodex(save, save.maxRegion ?? 1, reward.codexDiscoveries);
  }
  return reward;
}
