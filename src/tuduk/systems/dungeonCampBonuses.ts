import type { CampBuildingDef, CampBuildingId } from '../data/campBuildings';
import { CAMP_DUNGEON_BUILDINGS, getBuildingLevel } from '../data/campBuildings';
import type { CombatEntity, GameSave } from '../types';
import { formatInterval, formatIntervalSec } from '../data/campBuildings';

/** 충전 1회당 다음 원정 보너스 (Lv.1 기준, 레벨↑ 시 소폭 증가) */
const STACK_BONUS: Record<CampBuildingId, Partial<DungeonCampBonuses>> = {
  training: { atkMult: 0.055 },
  armory: { defMult: 0.042 },
  library: { expMult: 0.072 },
  shrine: { goldMult: 0.085 },
  watchtower: { critBonus: 0.015 },
  workshop: { matDropMult: 0.11 },
  /** 치유 샘 — 대폭 너프: 스택당 최대 HP 0.25%만 회복 */
  spring: { waveHealPct: 0.0025 },
  mine: {}, rare_mine: {}, lab: {}, herb: {}, smelter: {}, clinic: {}, inn: {}, kitchen: {}, warehouse: {}, guild: {},
};

const STACK_LABEL: Record<CampBuildingId, string> = {
  training: '⚔️ ATK',
  armory: '🛡 DEF',
  library: '📚 EXP',
  shrine: '🪙 골드',
  watchtower: '🎯 치명',
  workshop: '📦 재료',
  spring: '💧 웨이브 HP',
  mine: '', rare_mine: '', lab: '', herb: '', smelter: '', clinic: '', inn: '', kitchen: '', warehouse: '', guild: '',
};

export const DUNGEON_CAMP_BUILDING_IDS = CAMP_DUNGEON_BUILDINGS.map(b => b.id);

export interface DungeonCampBonuses {
  atkMult: number;
  defMult: number;
  expMult: number;
  goldMult: number;
  critBonus: number;
  matDropMult: number;
  waveHealPct: number;
}

const EMPTY_BONUSES = (): DungeonCampBonuses => ({
  atkMult: 1,
  defMult: 1,
  expMult: 1,
  goldMult: 1,
  critBonus: 0,
  matDropMult: 1,
  waveHealPct: 0,
});

export function ensureDungeonPrep(save: GameSave) {
  if (!save.dungeonPrepStacks) save.dungeonPrepStacks = {};
}

export function getDungeonMaxStacks(level: number): number {
  if (level <= 0) return 0;
  return Math.min(3, 1 + Math.floor(level / 3));
}

function levelScale(level: number): number {
  return 1 + Math.max(0, level - 1) * 0.045;
}

function stackContribution(id: CampBuildingId, level: number, stacks: number): Partial<DungeonCampBonuses> {
  const base = STACK_BONUS[id];
  if (!base || stacks <= 0 || level <= 0) return {};
  const scale = levelScale(level) * stacks;
  const out: Partial<DungeonCampBonuses> = {};
  if (base.atkMult) out.atkMult = base.atkMult * scale;
  if (base.defMult) out.defMult = base.defMult * scale;
  if (base.expMult) out.expMult = base.expMult * scale;
  if (base.goldMult) out.goldMult = base.goldMult * scale;
  if (base.critBonus) out.critBonus = base.critBonus * scale;
  if (base.matDropMult) out.matDropMult = base.matDropMult * scale;
  if (base.waveHealPct) out.waveHealPct = base.waveHealPct * scale;
  return out;
}

function mergeBonuses(parts: Partial<DungeonCampBonuses>[]): DungeonCampBonuses {
  const b = EMPTY_BONUSES();
  for (const p of parts) {
    if (p.atkMult) b.atkMult += p.atkMult;
    if (p.defMult) b.defMult += p.defMult;
    if (p.expMult) b.expMult += p.expMult;
    if (p.goldMult) b.goldMult += p.goldMult;
    if (p.critBonus) b.critBonus += p.critBonus;
    if (p.matDropMult) b.matDropMult += p.matDropMult;
    if (p.waveHealPct) b.waveHealPct += p.waveHealPct;
  }
  return b;
}

export function computeBonusesFromPrepStacks(save: GameSave): DungeonCampBonuses {
  ensureDungeonPrep(save);
  const parts: Partial<DungeonCampBonuses>[] = [];
  for (const def of CAMP_DUNGEON_BUILDINGS) {
    const lv = getBuildingLevel(save, def.id);
    const stacks = save.dungeonPrepStacks![def.id] ?? 0;
    if (stacks > 0) parts.push(stackContribution(def.id, lv, stacks));
  }
  return mergeBonuses(parts);
}

/** 원정 중 적용 중인 스냅샷 (없으면 대기 충전 합산) */
export function getDungeonCampBonuses(save: GameSave): DungeonCampBonuses {
  if (save.inExpedition && save.expeditionDungeonBuffs) {
    return save.expeditionDungeonBuffs;
  }
  return computeBonusesFromPrepStacks(save);
}

export function getDungeonPrepStacks(save: GameSave, id: CampBuildingId): number {
  ensureDungeonPrep(save);
  return save.dungeonPrepStacks![id] ?? 0;
}

export function addDungeonPrepStack(save: GameSave, id: CampBuildingId): boolean {
  const lv = getBuildingLevel(save, id);
  if (lv <= 0) return false;
  ensureDungeonPrep(save);
  const max = getDungeonMaxStacks(lv);
  const cur = save.dungeonPrepStacks![id] ?? 0;
  if (cur >= max) return false;
  save.dungeonPrepStacks![id] = cur + 1;
  return true;
}

/** 출발 시 충전 → 원정 버프 스냅샷, 충전 소모 */
export function consumeDungeonPrepForRun(save: GameSave): DungeonCampBonuses {
  const bonuses = computeBonusesFromPrepStacks(save);
  save.expeditionDungeonBuffs = bonuses;
  save.dungeonPrepStacks = {};
  return bonuses;
}

export function clearExpeditionDungeonBuffs(save: GameSave) {
  save.expeditionDungeonBuffs = undefined;
}

export function hasAnyDungeonCampBonus(save: GameSave): boolean {
  ensureDungeonPrep(save);
  if (save.inExpedition && save.expeditionDungeonBuffs) {
    const b = save.expeditionDungeonBuffs;
    return b.atkMult > 1 || b.defMult > 1 || b.expMult > 1 || b.goldMult > 1
      || b.critBonus > 0 || b.matDropMult > 1 || b.waveHealPct > 0;
  }
  return DUNGEON_CAMP_BUILDING_IDS.some(id => (save.dungeonPrepStacks![id] ?? 0) > 0);
}

function formatBonusPart(b: DungeonCampBonuses): string[] {
  const parts: string[] = [];
  if (b.atkMult > 1) parts.push(`⚔️ ATK +${Math.round((b.atkMult - 1) * 100)}%`);
  if (b.defMult > 1) parts.push(`🛡 DEF +${Math.round((b.defMult - 1) * 100)}%`);
  if (b.expMult > 1) parts.push(`📚 EXP +${Math.round((b.expMult - 1) * 100)}%`);
  if (b.goldMult > 1) parts.push(`🪙 골드 +${Math.round((b.goldMult - 1) * 100)}%`);
  if (b.critBonus > 0) parts.push(`🎯 치명 +${Math.round(b.critBonus * 100)}%p`);
  if (b.matDropMult > 1) parts.push(`📦 재료 +${Math.round((b.matDropMult - 1) * 100)}%`);
  if (b.waveHealPct > 0) parts.push(`💧 웨이브 +${Math.round(b.waveHealPct * 100)}% HP`);
  return parts;
}

export function formatDungeonBonusSummary(save: GameSave): string {
  const b = getDungeonCampBonuses(save);
  const parts = formatBonusPart(b);
  if (parts.length) {
    const prefix = save.inExpedition ? '원정 적용 중' : '다음 원정 예정';
    return `${prefix} · ${parts.join(' · ')}`;
  }
  const charging = DUNGEON_CAMP_BUILDING_IDS.filter(id => getBuildingLevel(save, id) > 0);
  if (charging.length) {
    return '훈련·준비 게이지 충전 중 — 찰 때마다 다음 원정 버프 적립 (최대 3충전)';
  }
  return '던전 시설 미건설 — ⚔️던전 탭에서 건설';
}

export function formatDungeonStackLabel(id: CampBuildingId, level: number, stacks: number): string {
  const contrib = stackContribution(id, level, 1);
  const label = STACK_LABEL[id];
  if (contrib.atkMult) return `${label} +${Math.round(contrib.atkMult * 100)}%/충전`;
  if (contrib.defMult) return `${label} +${Math.round(contrib.defMult * 100)}%/충전`;
  if (contrib.expMult) return `${label} +${Math.round(contrib.expMult * 100)}%/충전`;
  if (contrib.goldMult) return `${label} +${Math.round(contrib.goldMult * 100)}%/충전`;
  if (contrib.critBonus) return `${label} +${Math.round(contrib.critBonus * 100)}%p/충전`;
  if (contrib.matDropMult) return `${label} +${Math.round(contrib.matDropMult * 100)}%/충전`;
  if (contrib.waveHealPct) return `${label} +${Math.round(contrib.waveHealPct * 100)}%/충전`;
  return `${label}/충전`;
}

export function formatDungeonBuildingStatus(
  save: GameSave,
  id: CampBuildingId,
  prog?: { progress: number; ready: boolean; remainingMs: number; intervalMs: number },
): string {
  const lv = getBuildingLevel(save, id);
  if (lv <= 0) return '미건설';
  const stacks = getDungeonPrepStacks(save, id);
  const max = getDungeonMaxStacks(lv);
  const chargeLabel = formatDungeonStackLabel(id, lv, 1);
  if (prog?.ready) {
    return stacks >= max
      ? `✨ 준비 완료 · ${chargeLabel} (${stacks}/${max} 만충)`
      : `✨ 훈련 완료! 다음 원정 버프 적립 (${stacks}/${max})`;
  }
  if (stacks > 0) {
    const total = stackContribution(id, lv, stacks);
    let effect = '';
    if (total.atkMult) effect = `ATK +${Math.round(total.atkMult * 100)}%`;
    else if (total.defMult) effect = `DEF +${Math.round(total.defMult * 100)}%`;
    else if (total.expMult) effect = `EXP +${Math.round(total.expMult * 100)}%`;
    else if (total.goldMult) effect = `골드 +${Math.round(total.goldMult * 100)}%`;
    else if (total.critBonus) effect = `치명 +${Math.round(total.critBonus * 100)}%p`;
    else if (total.matDropMult) effect = `재료 +${Math.round(total.matDropMult * 100)}%`;
    else if (total.waveHealPct) effect = `웨이브 HP +${Math.round(total.waveHealPct * 100)}%`;
    const remain = prog ? formatIntervalSec(prog.remainingMs) : '';
    return `다음 원정 ${effect} · ${stacks}/${max}충전 · ${remain} 후 +1`;
  }
  if (prog) {
    return `${formatIntervalSec(prog.remainingMs)} 후 ${chargeLabel} (${stacks}/${max})`;
  }
  return chargeLabel;
}

export function formatDungeonCycleHint(def: CampBuildingDef, level: number, intervalMs: number): string {
  const charge = formatDungeonStackLabel(def.id, level, 1);
  return `${charge} · ${formatInterval(intervalMs)} 주기 · 최대 ${getDungeonMaxStacks(level)}충전`;
}

/** 웨이브 종료 시 치유 샘 (원정 스냅샷만) */
export function applyDungeonCampWaveHeal(save: GameSave, party: CombatEntity[]): boolean {
  const pct = getDungeonCampBonuses(save).waveHealPct;
  if (pct <= 0 || !party.length) return false;
  let healed = false;
  for (const p of party) {
    if (p.hp <= 0) continue;
    const gain = Math.max(1, Math.floor(p.maxHp * pct));
    const next = Math.min(p.maxHp, p.hp + gain);
    if (next > p.hp) {
      p.hp = next;
      healed = true;
    }
  }
  if (healed && save.combatHp) {
    for (const p of party) save.combatHp[p.id] = p.hp;
  }
  return healed;
}
