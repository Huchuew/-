import type { GameSave, MonsterDef } from '../types';
import { BOSS_CODEX_THRESHOLD_FLOOR1 } from '../data/economyBalance';
import { getRegionBoss, getRegionMonsters } from '../data/monsters';
import { getRegionAffix } from '../data/regionAffixes';
import { isBossGateReady } from './floorPacing';
import { isLateGameFloor } from '../data/lateGameBalance';
import { isEpicClearedForFloor } from './partyExpeditionMods';
import { getDailyBonusBossMult } from './dailyBonus';

/** 구 원정목표(균형) 기준 보스 등장 배율 */
const BOSS_RATE_BASE_MULT = 0.72;

function applyBossRateMult(rate: number): number {
  return Math.min(0.98, rate * BOSS_RATE_BASE_MULT);
}

/** 보스 등장에 필요한 도감 완성 비율 (1층만 50%) */
export function getBossCodexThreshold(regionId: number): number {
  return regionId === 1 ? BOSS_CODEX_THRESHOLD_FLOOR1 : 1;
}

export const BOSS_BASE_RATE = 0.08;
export const BOSS_PITY_STEP = 0.04;
export const BOSS_MAX_RATE = 0.38;
export const BOSS_PITY_GUARANTEE = 14;

/** 이미 클리어한 층 — 보스 등장 (시간 게이트 통과 후 서서히 상승) */
export const BOSS_CLEARED_BASE = 0.12;
export const BOSS_CLEARED_KILL_STEP = 0.06;
export const BOSS_CLEARED_MAX = 0.42;

export function isRegionCleared(save: GameSave, regionId: number): boolean {
  if (save.badges.includes(regionId)) return true;
  return regionId < (save.maxRegion ?? 1);
}

export function getBossSpawnRate(save: GameSave, regionId: number, codexPct: number): number {
  let rate: number;
  if (isRegionCleared(save, regionId)) {
    if (!isBossGateReady(save, regionId, codexPct)) return 0;
    const kills = save.bossPity?.[regionId] ?? 0;
    rate = Math.min(BOSS_CLEARED_MAX, BOSS_CLEARED_BASE + kills * BOSS_CLEARED_KILL_STEP);
  } else if (!isBossGateReady(save, regionId, codexPct)) {
    return 0;
  } else {
    const pity = save.bossPity?.[regionId] ?? 0;
    if (pity >= BOSS_PITY_GUARANTEE) return applyBossRateMult(1) * getDailyBonusBossMult(save);
    rate = Math.min(BOSS_MAX_RATE, BOSS_BASE_RATE + pity * BOSS_PITY_STEP);
  }
  return applyBossRateMult(rate) * getDailyBonusBossMult(save);
}

export function onClearedRegionMobKilled(save: GameSave, regionId: number, mon: MonsterDef): void {
  if (mon.isBoss || mon.isRare) return;
  if (!isRegionCleared(save, regionId)) return;
  if (!save.bossPity) save.bossPity = {};
  save.bossPity[regionId] = (save.bossPity[regionId] ?? 0) + 1;
}

export function resetClearedBossKillCounter(save: GameSave, regionId: number): void {
  if (save.bossPity?.[regionId] != null) delete save.bossPity[regionId];
}

const ELITE_REGION_MIN = 4;
const ELITE_REGION_MAX = 18;

function eliteSpawnChance(regionId: number): number {
  if (regionId < ELITE_REGION_MIN) return 0;
  if (regionId <= 8) return 0.08;
  if (regionId <= 14) return 0.14;
  return 0.18;
}

/** 재도전 시 에픽 도전 확률 (첫 클리어 시 필수) */
function optionalEpicChance(regionId: number): number {
  if (!isLateGameFloor(regionId)) return 0;
  return Math.min(0.38, 0.18 + (regionId - 10) * 0.03);
}

export interface EncounterPlan {
  monsters: MonsterDef[];
  isBoss: boolean;
  isElite: boolean;
  /** 10층+ 보스 직전 에픹 몬스터 */
  isEpic: boolean;
  spawnCount: number;
}

/** 지역·어픽스에 따른 동시 출현 수 */
export function rollSpawnCount(regionId: number, isBoss: boolean, affixSpawnBonus = 0): number {
  if (isBoss) return 1;
  const bonus = affixSpawnBonus;
  const r = Math.random();
  if (regionId <= 3) {
    if (r < 0.14 + bonus) return 2;
    return 1;
  }
  if (regionId <= 8) {
    if (r < 0.16 + bonus) return 3;
    if (r < 0.48 + bonus) return 2;
    return 1;
  }
  if (regionId <= 14) {
    if (r < 0.18 + bonus) return 4;
    if (r < 0.38 + bonus) return 3;
    if (r < 0.68 + bonus) return 2;
    return 1;
  }
  if (r < 0.10 + bonus) return 5;
  if (r < 0.26 + bonus) return 4;
  if (r < 0.52 + bonus) return 3;
  if (r < 0.78 + bonus) return 2;
  return 1;
}

/** 다중 출현 시 개체당 스탯 보정 — 군집 페널티 완화 (체감 난이도 유지) */
export function groupScaleMult(count: number, regionId = 1): number {
  if (count <= 1) return 1;
  if (regionId >= 10) return 0.95 + 0.12 / count;
  if (regionId <= 4) return 0.96 + 0.10 / count;
  return 0.90 + 0.16 / count;
}

export function planEncounter(save: GameSave, regionId: number, codexPct: number): EncounterPlan | null {
  const normals = getRegionMonsters(regionId);
  const affix = getRegionAffix(regionId);
  const roll = Math.random();
  let primary: MonsterDef | undefined;
  let isBoss = false;

  const rares = normals.filter(m => m.isRare);
  for (const r of rares) {
    if (roll < r.rareChance) { primary = r; break; }
  }

  if (!primary) {
    const cleared = isRegionCleared(save, regionId);
    const bossRate = getBossSpawnRate(save, regionId, codexPct);
    const rollBoss = bossRate > 0 && Math.random() < bossRate;
    if (rollBoss) {
      const boss = getRegionBoss(regionId);
      if (boss) {
        primary = boss;
        isBoss = true;
        if (cleared) resetClearedBossKillCounter(save, regionId);
        else if (save.bossPity?.[regionId]) delete save.bossPity[regionId];
      }
    } else if (bossRate > 0 && !cleared) {
      if (!save.bossPity) save.bossPity = {};
      save.bossPity[regionId] = (save.bossPity[regionId] ?? 0) + 1;
    }
    if (!primary && normals.length > 0) {
      primary = normals[Math.floor(Math.random() * normals.length)];
    }
  }

  if (!primary) return null;

  let isEpic = false;
  const bossGateReady = isBossGateReady(save, regionId, codexPct);
  const firstClearAttempt = !save.badges.includes(regionId);
  const needEpicGate = isLateGameFloor(regionId) && !isEpicClearedForFloor(save, regionId);

  const rollEpic = (mandatory: boolean) => {
    isBoss = false;
    isEpic = true;
    if (normals.length > 0) {
      primary = normals[Math.floor(Math.random() * normals.length)]!;
    }
    void mandatory;
  };

  if (isBoss && needEpicGate && firstClearAttempt) {
    rollEpic(true);
  } else if (isBoss && needEpicGate && Math.random() < optionalEpicChance(regionId)) {
    rollEpic(false);
  } else if (!isBoss && !primary.isRare && bossGateReady && needEpicGate
    && firstClearAttempt && Math.random() < 0.38) {
    isEpic = true;
  } else if (!isBoss && !primary.isRare && bossGateReady && needEpicGate
    && Math.random() < optionalEpicChance(regionId) * 0.65) {
    isEpic = true;
  }

  if (!primary) return null;
  const lead = primary;

  const eliteChance = eliteSpawnChance(regionId);
  const isElite = !isBoss && !isEpic && !lead.isRare && eliteChance > 0
    && Math.random() < eliteChance;

  const spawnCount = rollSpawnCount(regionId, isBoss || isEpic, affix.spawnBonus);
  const monsters: MonsterDef[] = [lead];
  const pool = normals.filter(m => !m.isRare && m.id !== lead.id);
  for (let i = 1; i < spawnCount; i++) {
    if (pool.length > 0) {
      monsters.push(pool[Math.floor(Math.random() * pool.length)]!);
    } else if (normals.length > 0) {
      monsters.push(normals[Math.floor(Math.random() * normals.length)]!);
    }
  }

  return { monsters, isBoss, isElite, isEpic, spawnCount: monsters.length };
}
