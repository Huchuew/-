import type { CharDef, CharState, GameSave, PartyDpsEntry } from '../types';
import { CHAR_MAP } from '../data/characters';
import { CHAR_TRAITS } from '../data/traitSynergy';
import { GROWTH_NODES } from '../data/growthTrees';
import { getEquipStats } from './EquipmentSystem';
import { computeEquipSynergy } from './equipmentSynergy';
import { getCookBuffMult } from './CookSystem';
import { getDungeonCampBonuses } from './dungeonCampBonuses';
import { getActiveShopBattleBuffs } from './LodgingShopSystem';
import { getCodexAtkBonus } from './CodexSystem';
import { getAgilityAtkBonus, getAgilityLevel, getAgilitySpdBonus } from './AgilitySystem';
import { getRegionMonsters } from '../data/monsters';
import {
  COMBAT_HP_SCALE, MIN_DAMAGE_ATK_PCT, MONSTER_DEF_MULT, PLAYER_ATK_SPD_GLOBAL_MULT,
  TOUCH_DMG_MULT, TOUCH_HIT_RATIO, TOUCH_MAX_CONTRIBUTORS, regionMonsterDefScale,
  regionPlayerAtkSpdMult,
} from '../data/combatBalance';
import { getAscensionMult, getRelicBonuses } from './EndgameSystem';
import { ROLE_LEVEL_GROWTH, ROLE_STAT_SHAPE, getDpsSurvivalCushion } from '../data/roleBalance';
import { getStarterLateGrowthBonus, getStarterPaceAtkMult } from '../data/starterBalance';
import { computePartySynergy } from './partySynergy';
import { computeRosterBonuses } from '../data/rosterPassives';
import { getPrestigeStatMult } from '../data/prestigeJobBalance';
import { getAugmentMods } from './AugmentSystem';

export interface ComputedStats {
  hp: number;
  atk: number;
  def: number;
  mdef: number;
  atkSpd: number;
  critRate: number;
  critMult: number;
  aoe: boolean;
  aoeBonus: number;
  pierce: boolean;
  berserk: boolean;
}

const BASE_BUFF = { atk: 0.12, spd: 0.06, crit: 0.08, exp: 0.15 };

function bufferIds(save: GameSave): string[] {
  const ids = [...save.party];
  if (save.supportSlot && save.owned.includes(save.supportSlot) && !ids.includes(save.supportSlot)) {
    ids.push(save.supportSlot);
  }
  return ids;
}

function nodeBuffs(charId: string, state: CharState) {
  const b = { atk: 0, spd: 0, crit: 0, exp: 0 };
  for (const nid of state.unlockedNodes) {
    const n = GROWTH_NODES.find(x => x.id === nid);
    if (!n) continue;
    b.atk += n.buffAtk ?? 0;
    b.spd += n.buffSpd ?? 0;
    b.crit += n.buffCrit ?? 0;
    b.exp += n.buffExp ?? 0;
  }
  return b;
}

export function computeCharStats(def: CharDef, state: CharState, save?: GameSave, hpRatio = 1): ComputedStats {
  const growth = ROLE_LEVEL_GROWTH[def.equipRole];
  const shape = ROLE_STAT_SHAPE[def.equipRole];
  const lv = state.level - 1;
  let atk = (def.baseAtk + lv * growth.atk) * shape.atk;
  let defense = (def.baseDef + lv * growth.def) * shape.def;
  let hp = (def.baseHp + lv * growth.hp) * shape.hp;

  const maxRegion = save?.maxRegion ?? 1;
  const late = getStarterLateGrowthBonus(def, state.level, maxRegion);
  atk += late.atk;
  defense += late.def;
  hp += late.hp;
  let atkSpd = def.atkSpd;
  let critRate = def.critRate;
  let critMult = def.critMult;
  let aoeBonus = 0;

  for (const nid of state.unlockedNodes) {
    const node = GROWTH_NODES.find(n => n.id === nid);
    if (!node) continue;
    const nodeMult = node.branchTier === 3 ? 2.05
      : node.branchGroup ? 1.55 : 1.4;
    atk += (node.atk ?? 0) * nodeMult;
    defense += (node.def ?? 0) * nodeMult;
    hp += (node.hp ?? 0) * nodeMult;
    atkSpd += (node.atkSpd ?? 0) * nodeMult * 0.38;
    critRate += (node.crit ?? 0) * nodeMult;
    aoeBonus += (node.aoeBonus ?? 0) * nodeMult;
  }

  const skillNodes = state.unlockedNodes.filter(id => !id.includes('_pr_')).length;
  const skillPower = 1 + skillNodes * 0.055;
  atk *= skillPower;

  const prestigeMult = getPrestigeStatMult(state.prestige);
  atk *= prestigeMult.atk;
  hp *= prestigeMult.hp;
  defense *= prestigeMult.def;
  atkSpd *= prestigeMult.atkSpd;

  const eq = save ? getEquipStats(save, state.id) : { atk: 0, def: 0, hp: 0, atkSpd: 0, crit: 0 };
  atk += eq.atk;
  defense += eq.def;
  hp += eq.hp;
  atkSpd += eq.atkSpd;
  const agiLv = getAgilityLevel(state);
  atk += getAgilityAtkBonus(agiLv);
  atkSpd += getAgilitySpdBonus(agiLv);
  critRate += eq.crit;

  if (save) {
    const syn = computeEquipSynergy(save, state.id);
    atk = Math.floor(atk * syn.atkMult);
    defense = Math.floor(defense * syn.defMult);
    hp = Math.floor(hp * syn.hpMult);
    atkSpd *= syn.spdMult > 1 ? 1 + (syn.spdMult - 1) * 0.38 : syn.spdMult;
    critRate += syn.critBonus;
  }

  if (save) {
    const partySyn = computePartySynergy(save);
    const aug = getAugmentMods(save);
    partySyn.atkMult *= aug.traitSynergyMult;
    partySyn.defMult *= aug.traitSynergyMult;
    partySyn.hpMult *= aug.traitSynergyMult;
    const roles = new Set(save.party.map(id => CHAR_MAP[id]?.equipRole).filter(Boolean));
    const hasTriangle = roles.has('tank') && roles.has('healer')
      && (roles.has('dps') || roles.has('bruiser'));
    if (hasTriangle && (aug.trianglePartyAtk || aug.trianglePartyDef || aug.trianglePartyHp)) {
      partySyn.atkMult *= 1 + aug.trianglePartyAtk;
      partySyn.defMult *= 1 + aug.trianglePartyDef;
      partySyn.hpMult *= 1 + aug.trianglePartyHp;
    }
    const traitCount = new Set(save.party.flatMap(id => CHAR_TRAITS[id] ?? [])).size;
    if (traitCount >= 4 && aug.traitQuadBonus) {
      partySyn.atkMult *= 1 + aug.traitQuadBonus;
      partySyn.defMult *= 1 + aug.traitQuadBonus;
      partySyn.hpMult *= 1 + aug.traitQuadBonus;
    }
    const roster = computeRosterBonuses(save.owned);
    atk = Math.floor(atk * partySyn.atkMult * roster.atk);
    defense = Math.floor(defense * partySyn.defMult * roster.def);
    hp = Math.floor(hp * partySyn.hpMult * roster.hp);
    atkSpd *= 1 + (partySyn.atkSpdMult - 1) * 0.42;
    atkSpd *= 1 + (roster.spd - 1) * 0.42;
    critRate += partySyn.critBonus + roster.crit;

    const codex = getCodexAtkBonus(save);
    const relic = getRelicBonuses(save);
    const asc = getAscensionMult(save, def.id);
    atk = Math.floor(atk * (1 + codex) * (1 + relic.atk) * asc);
    hp = Math.floor(hp * (1 + relic.hp) * asc);
    defense = Math.floor(defense * (1 + relic.def) * asc);
    atkSpd *= 1 + relic.spd * 0.35;
    critRate = Math.min(0.8, critRate + relic.crit);

    const starterId = save.starterCharId ?? save.party[0];
    if (def.id === starterId) {
      atk = Math.floor(atk * getStarterPaceAtkMult(save));
    }
    const starterRole = starterId ? CHAR_MAP[starterId]?.equipRole : undefined;
    if (starterRole === 'healer' && save.party.length >= 3
      && (def.equipRole === 'dps' || def.equipRole === 'bruiser')) {
      atk = Math.floor(atk * 1.08);
    }

    const region = save.currentRegion ?? save.maxRegion ?? 1;
    const dpsCushion = getDpsSurvivalCushion(region, def.equipRole);
    defense = Math.floor(defense * dpsCushion.def);
    hp = Math.floor(hp * dpsCushion.hp);

    if (def.equipRole === 'tank') {
      defense = Math.floor(defense * aug.tankDefMult);
      hp = Math.floor(hp * aug.tankHpMult);
    }
    if (def.equipRole === 'dps' || def.equipRole === 'bruiser') {
      atk = Math.floor(atk * aug.dpsAtkMult);
      atkSpd *= aug.dpsAtkSpdMult;
      critRate = Math.min(0.8, critRate + aug.dpsCritBonus);
    }
    if (aug.supportPartyAtk) atk = Math.floor(atk * (1 + aug.supportPartyAtk));
  }

  if (def.berserk && hpRatio < 1) {
    const missing = 1 - hpRatio;
    atk *= 1 + missing * 1.5;
    atkSpd *= 1 + missing * 0.35;
  }

  if (save) {
    atkSpd *= regionPlayerAtkSpdMult(save.currentRegion ?? save.maxRegion ?? 1);
    atkSpd *= PLAYER_ATK_SPD_GLOBAL_MULT;
  }

  return {
    hp: Math.floor(hp * COMBAT_HP_SCALE),
    atk: Math.floor(atk * (1 + aoeBonus * 0.5)),
    def: Math.floor(defense),
    mdef: def.baseMdef + state.level * 2,
    atkSpd,
    critRate: Math.min(0.8, critRate),
    critMult,
    aoe: def.aoe,
    aoeBonus,
    pierce: def.pierce,
    berserk: def.berserk,
  };
}

/** 상점 비약·도시락 등 스탯 배율 — 동종 버프는 합산 */
export function getBattleShopBuffMults(save: GameSave): {
  atk: number; def: number; hp: number; spd: number; crit: number;
} {
  const buffs = getActiveShopBattleBuffs(save);
  if (!buffs.length) return { atk: 1, def: 1, hp: 1, spd: 1, crit: 0 };
  return {
    atk: 1 + buffs.reduce((s, b) => s + b.atkPct / 100, 0),
    def: 1 + buffs.reduce((s, b) => s + b.defPct / 100, 0),
    hp: 1 + buffs.reduce((s, b) => s + b.hpPct / 100, 0),
    spd: 1 + buffs.reduce((s, b) => s + b.spdPct / 100, 0),
    crit: buffs.reduce((s, b) => s + b.critPct / 100, 0),
  };
}

/** 상점 비약·도시락 공격 배율 (1.20 = +20%) — 동시 적용 시 합산 */
export function getBattleShopBuffAtk(save: GameSave): number {
  return getBattleShopBuffMults(save).atk;
}

export function computePartyBuffers(save: GameSave) {
  const roster = computeRosterBonuses(save.owned);
  const mult = { atk: 1, spd: 1, crit: 1, exp: roster.exp, gold: roster.gold };
  for (const id of bufferIds(save)) {
    const def = CHAR_MAP[id];
    const st = save.chars[id];
    if (!def?.bufferType || !st) continue;
    const nb = nodeBuffs(id, st);
    switch (def.bufferType) {
      case 'atk': mult.atk += BASE_BUFF.atk + nb.atk; break;
      case 'spd': mult.spd += BASE_BUFF.spd + nb.spd; break;
      case 'crit': mult.crit += BASE_BUFF.crit + nb.crit; break;
      case 'exp': mult.exp += BASE_BUFF.exp + nb.exp; break;
    }
  }
  const dungeonCamp = getDungeonCampBonuses(save);
  mult.exp *= dungeonCamp.expMult;
  mult.gold *= dungeonCamp.goldMult;
  return mult;
}

export function calcDamage(rawAtk: number, targetDef: number, pierce = false): number {
  if (rawAtk <= 0) return 0;
  const effectiveDef = pierce ? Math.floor(targetDef * 0.5) : targetDef;
  const mitigated = Math.max(0, rawAtk - effectiveDef);
  const minDmg = Math.max(1, Math.floor(rawAtk * MIN_DAMAGE_ATK_PCT));
  return Math.max(minDmg, mitigated);
}

export function calcMagicDamage(rawAtk: number, targetMdef: number): number {
  if (rawAtk <= 0) return 0;
  const mitigated = Math.max(0, rawAtk - targetMdef);
  const minDmg = Math.max(1, Math.floor(rawAtk * MIN_DAMAGE_ATK_PCT));
  return Math.max(minDmg, mitigated);
}

export function getRegionAvgDef(regionId: number): number {
  const normals = getRegionMonsters(regionId).filter(m => !m.isBoss && !m.isRare);
  if (!normals.length) return Math.floor(8 + regionId * 4);
  const avgBase = normals.reduce((sum, m) => sum + m.def, 0) / normals.length;
  return Math.floor(avgBase * regionMonsterDefScale(regionId) * MONSTER_DEF_MULT);
}

export function getPartyDpsBreakdown(save: GameSave, targetDef?: number): PartyDpsEntry[] {
  const def = targetDef ?? getRegionAvgDef(save.currentRegion);
  const buffers = computePartyBuffers(save);
  const cook = getCookBuffMult(save);
  const entries: PartyDpsEntry[] = [];

  for (const id of save.party) {
    const cdef = CHAR_MAP[id];
    const state = save.chars[id];
    if (!cdef || !state) continue;
    const hpRatio = save.combatHp[id] != null
      ? save.combatHp[id] / Math.max(1, computeCharStats(cdef, state, save).hp) : 1;
    const s = computeCharStats(cdef, state, save, Math.min(1, hpRatio));
    const partyCrit = (buffers.crit - 1) * 0.05;
    const critRate = Math.min(0.8, s.critRate + partyCrit);
    const critMult = 1 + critRate * (s.critMult - 1);
    const shop = getBattleShopBuffMults(save);
    const atk = Math.floor(s.atk * buffers.atk * shop.atk * cook.atk);
    const dmgPerHit = Math.max(1, calcDamage(atk, def, s.pierce));
    const spd = s.atkSpd * buffers.spd * cook.spd * shop.spd;
    const dps = Math.floor(dmgPerHit * critMult * spd);
    entries.push({
      id, name: cdef.name, jobLabel: cdef.jobLabel, color: cdef.color,
      atk, dmgPerHit, atkSpd: spd, dps, share: 0,
    });
  }

  const total = entries.reduce((sum, e) => sum + e.dps, 0) || 1;
  for (const e of entries) e.share = Math.round(e.dps / total * 100);
  return entries;
}

export function getPartyDps(save: GameSave, targetDef?: number): number {
  return getPartyDpsBreakdown(save, targetDef).reduce((sum, e) => sum + e.dps, 0);
}

export function getPartyTouchDamage(save: GameSave, targetDef = 0): number {
  const buffers = computePartyBuffers(save);
  const cook = getCookBuffMult(save);
  const hits: number[] = [];

  for (const id of save.party) {
    const def = CHAR_MAP[id];
    const state = save.chars[id];
    if (!def || !state) continue;
    const hpRatio = save.combatHp[id] != null
      ? save.combatHp[id] / Math.max(1, computeCharStats(def, state, save).hp) : 1;
    if (hpRatio <= 0) continue;
    const s = computeCharStats(def, state, save, Math.min(1, hpRatio));
    const shop = getBattleShopBuffMults(save);
    const atk = Math.floor(s.atk * buffers.atk * shop.atk * cook.atk);
    const hit = calcDamage(atk, targetDef, s.pierce);
    hits.push(Math.max(1, Math.floor(hit * TOUCH_HIT_RATIO)));
  }

  if (hits.length === 0) return 1;

  hits.sort((a, b) => b - a);
  const weights = [0.62, 0.28];
  let total = 0;
  for (let i = 0; i < Math.min(TOUCH_MAX_CONTRIBUTORS, hits.length); i++) {
    total += hits[i]! * (weights[i] ?? 0.15);
  }
  return Math.max(1, Math.floor(total * TOUCH_DMG_MULT));
}

export function expToLevel(level: number): number {
  return Math.floor(44 * level * (1 + level * 0.072));
}

export function goldLevelUpCost(level: number): number {
  const lv = Math.max(1, level);
  let base = Math.floor(340 * lv + 36 * lv * lv);
  if (lv <= 30) base = Math.floor(base * 0.82);
  else if (lv <= 50) base = Math.floor(base * 0.92);
  if (lv <= 50) return base;
  if (lv <= 100) return Math.floor(base * 0.84);
  return Math.floor(base * 0.7);
}

/** 빠른 레벨업 — 골드만 소모 */
export function levelUpMaterialCost(_level: number): Record<string, number> {
  return {};
}

export function isSupportChar(charId: string): boolean {
  const def = CHAR_MAP[charId];
  return def?.job === 'chef';
}

/** 서포트 지정 시 파티에 전투원 1명 이상 남아야 함 */
export function canAssignSupport(save: GameSave, charId: string): boolean {
  if (!isSupportChar(charId)) return false;
  if (save.supportSlot === charId) return true;
  const partyAfter = save.party.filter(p => p !== charId);
  return partyAfter.length >= 1;
}

export interface BufferContribution {
  charId: string;
  name: string;
  effect: string;
  detail: string;
}

const BUFFER_LABELS: Record<string, { effect: string; base: number }> = {
  atk: { effect: '공격력', base: BASE_BUFF.atk },
  spd: { effect: '공격 속도', base: BASE_BUFF.spd },
  crit: { effect: '치명타', base: BASE_BUFF.crit },
  exp: { effect: '경험치', base: BASE_BUFF.exp },
};

export function getBufferContributions(save: GameSave): BufferContribution[] {
  const out: BufferContribution[] = [];
  for (const id of bufferIds(save)) {
    const def = CHAR_MAP[id];
    const st = save.chars[id];
    if (!def?.bufferType || !st) continue;
    const nb = nodeBuffs(id, st);
    const meta = BUFFER_LABELS[def.bufferType]!;
    const extra = nb[def.bufferType] ?? 0;
    const pct = Math.round((meta.base + extra) * 100);
    const slot = save.supportSlot === id ? '서포트' : '파티';
    out.push({
      charId: id,
      name: def.name,
      effect: meta.effect,
      detail: `${slot} · ${meta.effect} +${pct}%`,
    });
  }
  return out;
}

export function formatBufferSummary(save: GameSave): string {
  const b = computePartyBuffers(save);
  const shop = getBattleShopBuffAtk(save);
  const cook = getCookBuffMult(save);
  const camp = getDungeonCampBonuses(save);
  const parts: string[] = [];
  if (b.atk > 1.001) parts.push(`[영구] ⚔️+${Math.round((b.atk - 1) * 100)}%`);
  if (b.spd > 1.001) parts.push(`💨+${Math.round((b.spd - 1) * 100)}%`);
  if (cook.atk > 1.001) parts.push(`[일시] 🍳+${Math.round((cook.atk - 1) * 100)}%`);
  if (shop > 1.001) parts.push(`[일시] 🍱+${Math.round((shop - 1) * 100)}%`);
  if (camp.atkMult > 1.001) parts.push(`[원정] ⛏️+${Math.round((camp.atkMult - 1) * 100)}%`);
  if (b.exp > 1.001) parts.push(`📈+${Math.round((b.exp - 1) * 100)}%`);
  return parts.length ? parts.join(' · ') : '';
}
