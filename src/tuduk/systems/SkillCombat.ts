import type { CharState, CombatEntity, ElementType, GameSave, GaugeType, MonsterDef, StatusEffect } from '../types';
import type { CombatSkillDef } from '../data/combatSkills';
import { getActiveSkills } from '../data/combatSkills';
import { DOT_INTERVAL, ELEMENT_COLOR, ELEMENT_ICON, getElementDamageMult } from '../data/elemental';
import {
  BOSS_ARMOR_PEN, BOSS_MIN_ATK_DAMAGE_PCT, getBossPartyTargetDef, TOUCH_SKILL_DMG_MULT,
  regionMonsterArmorPen, regionPartyDefMult, regionTrashMinDmgPct,
  BUFF_SKILL_DURATION_SEC, BLOCK_BUFF_DURATION_SEC, SUPPORT_SKILL_PROC_MULT,
  HEAL_SKILL_PROC_MULT, HEAL_SKILL_PCT_MULT, HEAL_ULTIMATE_PCT_MULT, SKILL_HEAL_MAX_PCT,
} from '../data/combatBalance';
import { getPrestigeSkillCombatMult } from '../data/prestigeJobBalance';
import { applyDamageToEnemy, partyAttack, type AttackResult } from './CombatSystem';
import { calcDamage, calcMagicDamage } from './StatCalculator';
import { applyPartyBuff, getStatMults } from './monsterDebuffs';
import { isCombatSilenced } from './combatSkillEffects';
import { isHealerChar } from '../data/characters';
import {
  applyCombatCleanse,
  applyCombatHeal,
  canHealerProcNow,
  getHealerPrestigeBonuses,
  markHealerProc,
  partyNeedsHeal,
  type CleanseTargetDetail,
  type HealTargetDetail,
} from './HealerCombat';

export interface BuffApplyDetail {
  charId: string;
  charName: string;
  atkPct?: number;
  defPct?: number;
  spdPct?: number;
}

export interface SkillStrikeResult extends AttackResult {
  skill?: CombatSkillDef;
  skillDamage: number;
  dotApplied?: StatusEffect;
  isUltimate?: boolean;
  ultimateLabel?: string;
  healAmount?: number;
  isHeal?: boolean;
  healDetails?: HealTargetDetail[];
  buffDetails?: BuffApplyDetail[];
  cleanseDetails?: CleanseTargetDetail[];
  isCleanse?: boolean;
}

const ULTIMATE_ELEMENT: Record<string, ElementType> = {
  huchu: 'fire', yujin: 'thunder', seoyoung: 'thunder', teso: 'fire',
  hyesung: 'thunder', hyeoni: 'poison', sodia: 'poison', danjong: 'poison',
  cutie: 'poison', hidden: 'fire', horangi: 'fire', ampa: 'fire',
};

const SKILL_PITY_THRESHOLD = 7;
const HEALER_SKILL_PITY_THRESHOLD = 5;

function pickHealerPitySkill(supportSkills: CombatSkillDef[]): CombatSkillDef | null {
  const healFirst = supportSkills.filter(s => s.skillKind === 'heal' || s.skillKind === 'cleanse');
  return healFirst[0] ?? supportSkills[0] ?? null;
}

/** 힐러 궁극기 — 파티 회복 (딜 궁극기 대신 HP 낮을 때) */
export function resolveHealerUltimateStrike(
  healer: CombatEntity,
  party: CombatEntity[],
  gaugeType: GaugeType,
  prestige = 0,
): SkillStrikeResult {
  const healPct = gaugeType === 'mana' ? 0.18 * HEAL_ULTIMATE_PCT_MULT : 0.14 * HEAL_ULTIMATE_PCT_MULT;
  const ultScale = 1.12;
  const { total, details } = applyCombatHeal(party, healPct, ultScale, healer.id, undefined, prestige);
  const label = gaugeType === 'mana' ? '대치유의 기도' : '응급 수혈';
  return {
    damage: 0,
    isCrit: false,
    attackerId: healer.id,
    targetId: healer.id,
    isAoe: false,
    skillDamage: 0,
    isUltimate: true,
    ultimateLabel: label,
    healAmount: total,
    healDetails: details,
    isHeal: true,
  };
}

export function resolveUltimateStrike(
  attacker: CombatEntity,
  target: CombatEntity,
  gaugeType: GaugeType,
): SkillStrikeResult {
  const element = gaugeType === 'mana'
    ? (ULTIMATE_ELEMENT[attacker.id] ?? 'thunder')
    : (attacker.id === 'ampa' || attacker.id === 'horangi' ? 'fire' : 'none');
  const mult = gaugeType === 'mana' ? 3.6 : 3.1;
  const isCrit = Math.random() < Math.min(0.85, attacker.critRate + 0.22);
  let dmg = Math.floor(attacker.atk * mult);
  if (isCrit) dmg = Math.floor(dmg * attacker.critMult * 1.08);
  const targetDef = getEnemyEffectiveDef(target);
  dmg = calcDamage(dmg, targetDef, attacker.pierce);
  if (element !== 'none' && target.element) {
    dmg = Math.floor(dmg * getElementDamageMult(element, target.element));
  }
  const label = gaugeType === 'mana' ? '필살 마법' : '필살기';

  let dotApplied: StatusEffect | undefined;
  if (element !== 'none') {
    dotApplied = {
      element,
      damagePerTick: Math.max(1, Math.floor(attacker.atk * 0.18)),
      ticksLeft: gaugeType === 'mana' ? 7 : 5,
      interval: DOT_INTERVAL * 0.85,
      elapsed: 0,
      sourceName: label,
    };
    applyStatusEffect(target, dotApplied);
  }

  return {
    damage: dmg,
    isCrit,
    attackerId: attacker.id,
    targetId: target.id,
    isAoe: attacker.aoe && dmg > 0,
    skillDamage: dmg,
    isUltimate: true,
    ultimateLabel: label,
    dotApplied,
  };
}

function getEnemyEffectiveDef(target: CombatEntity): number {
  const base = target.id.includes('boss') ? getBossPartyTargetDef(target.def) : target.def;
  const { defMult } = getStatMults(target);
  return Math.max(0, Math.floor(base * defMult));
}

function ensureEffects(entity: CombatEntity) {
  if (!entity.statusEffects) entity.statusEffects = [];
  return entity.statusEffects;
}

export function applyStatusEffect(
  target: CombatEntity,
  effect: Omit<StatusEffect, 'elapsed'>,
): StatusEffect {
  const list = ensureEffects(target);
  const existing = list.find(e => e.element === effect.element && e.sourceName === effect.sourceName);
  if (existing) {
    existing.damagePerTick = Math.max(existing.damagePerTick, effect.damagePerTick);
    existing.ticksLeft = Math.max(existing.ticksLeft, effect.ticksLeft);
    existing.interval = effect.interval;
    return existing;
  }
  const full: StatusEffect = { ...effect, elapsed: 0 };
  list.push(full);
  return full;
}

export function buildSkillDot(attacker: CombatEntity, skill: CombatSkillDef): StatusEffect | undefined {
  if (!skill.dotPct || !skill.dotTicks || skill.element === 'none') return undefined;
  const tierBonus = skill.animTier >= 3 ? 1.35 : skill.animTier >= 2 ? 1.15 : 1;
  return {
    element: skill.element,
    damagePerTick: Math.max(1, Math.floor(attacker.atk * skill.dotPct * tierBonus)),
    ticksLeft: skill.dotTicks + (skill.animTier >= 3 ? 3 : skill.animTier >= 2 ? 2 : 1),
    interval: DOT_INTERVAL,
    elapsed: 0,
    sourceName: skill.name,
    sourceCharId: attacker.id,
  };
}

function rollFromPool(skills: CombatSkillDef[], rateMult = 1, prestige = 0): CombatSkillDef | null {
  const healBon = getHealerPrestigeBonuses(prestige);
  for (const skill of skills) {
    let kindMult = 1;
    if (skill.skillKind === 'heal') kindMult = HEAL_SKILL_PROC_MULT * healBon.procMult;
    else if (skill.skillKind === 'cleanse') kindMult = SUPPORT_SKILL_PROC_MULT * 0.75;
    else if (skill.skillKind === 'buff') kindMult = SUPPORT_SKILL_PROC_MULT;
    else if (skill.skillKind === 'block') kindMult = SUPPORT_SKILL_PROC_MULT * 1.1;
    if (Math.random() < Math.min(0.48, skill.procRate * rateMult * kindMult)) return skill;
  }
  return null;
}

export function rollSkillProc(
  unlockedNodes: string[],
  charId?: string,
  attacker?: CombatEntity,
  pityCounter = 0,
  party?: CombatEntity[],
  charState?: CharState,
): { skill: CombatSkillDef | null; pityReset: boolean } {
  if (attacker && isCombatSilenced(attacker)) {
    return { skill: null, pityReset: false };
  }
  const skills = getActiveSkills(unlockedNodes, charId);
  if (skills.length === 0) return { skill: null, pityReset: false };

  const isHealer = charId ? isHealerChar(charId) : false;
  const needHeal = isHealer && party?.length ? partyNeedsHeal(party) : false;
  const prestige = charState?.prestige ?? 0;
  const healBon = getHealerPrestigeBonuses(prestige);

  const damageSkills = skills.filter(s => s.skillKind === 'damage' || s.skillKind === 'block');
  const supportSkills = skills.filter(s =>
    s.skillKind === 'heal' || s.skillKind === 'buff' || s.skillKind === 'cleanse');

  const pityThreshold = isHealer
    ? Math.max(3, HEALER_SKILL_PITY_THRESHOLD - healBon.pityReduction)
    : SKILL_PITY_THRESHOLD;
  if (pityCounter >= pityThreshold) {
    if (isHealer && supportSkills.length) {
      const pick = pickHealerPitySkill(supportSkills);
      if (pick) return { skill: pick, pityReset: true };
    }
    if (damageSkills.length) {
      return { skill: damageSkills[0]!, pityReset: true };
    }
  }

  if (isHealer && charState) {
    const onHealCd = !canHealerProcNow(charState);
    const supMult = needHeal && !onHealCd
      ? 0.92 * healBon.procMult
      : SUPPORT_SKILL_PROC_MULT * 0.85;
    const supRoll = rollFromPool(
      supportSkills.filter(s => s.skillKind !== 'heal' || !onHealCd),
      supMult,
      prestige,
    );
    if (supRoll) {
      if (supRoll.skillKind === 'heal') markHealerProc(charState);
      return { skill: supRoll, pityReset: true };
    }
    if (!needHeal && damageSkills.length) {
      const dmgRoll = rollFromPool(damageSkills, 0.92);
      if (dmgRoll) return { skill: dmgRoll, pityReset: true };
    }
    return { skill: null, pityReset: false };
  }

  const dmgRoll = rollFromPool(damageSkills, 1.22);
  if (dmgRoll) return { skill: dmgRoll, pityReset: true };

  const supRoll = rollFromPool(supportSkills, SUPPORT_SKILL_PROC_MULT);
  if (supRoll) return { skill: supRoll, pityReset: true };

  return { skill: null, pityReset: false };
}

export interface PartyStrikeOpts {
  healMult?: number;
  comboCritBonus?: number;
  /** true면 버프·힐·정화·방어는 시전 완료 시 적용 */
  deferSupport?: boolean;
}

export function resolvePartyStrike(
  attacker: CombatEntity,
  target: CombatEntity,
  charState: CharState,
  party?: CombatEntity[],
  opts?: PartyStrikeOpts,
  save?: GameSave,
  pityCounter = 0,
): SkillStrikeResult & { skillPityInc: boolean } {
  const base = partyAttack(attacker, target);
  const { skill, pityReset } = rollSkillProc(
    charState.unlockedNodes, charState.id, attacker, pityCounter, party, charState,
  );
  if (!skill) {
    return { ...base, skillDamage: 0, skillPityInc: true };
  }

  const healerSupportTurn = isHealerChar(charState.id)
    && (skill.skillKind === 'heal' || skill.skillKind === 'cleanse' || skill.skillKind === 'buff');
  const noBasicHit = healerSupportTurn ? { ...base, damage: 0, isCrit: false } : base;

  if (skill.skillKind === 'buff' && party?.length) {
    const targets = skill.buffParty ? party : party.filter(p => p.id === attacker.id);
    const buffDetails: BuffApplyDetail[] = [];
    for (const ally of targets) {
      if (ally.hp <= 0) continue;
      buffDetails.push({
        charId: ally.id,
        charName: ally.name,
        atkPct: skill.buffAtkMult ? Math.round((skill.buffAtkMult - 1) * 100) : undefined,
        defPct: skill.buffDefMult ? Math.round((skill.buffDefMult - 1) * 100) : undefined,
        spdPct: skill.buffSpdMult ? Math.round((skill.buffSpdMult - 1) * 100) : undefined,
      });
      if (!opts?.deferSupport) {
        applyPartyBuff(ally, {
          id: `skill_${skill.nodeId}`,
          name: skill.name,
          icon: '✨',
          duration: skill.buffDuration ?? BUFF_SKILL_DURATION_SEC,
          atkMult: skill.buffAtkMult,
          defMult: skill.buffDefMult,
          spdMult: skill.buffSpdMult,
          desc: skill.name,
          sourceName: attacker.name,
        }, save);
      }
    }
    return { ...noBasicHit, skill, skillDamage: 0, buffDetails, skillPityInc: pityReset };
  }

  if (skill.skillKind === 'cleanse' && party?.length) {
    const cleanseDetails = opts?.deferSupport
      ? []
      : applyCombatCleanse(
        party,
        skill.cleanseCount ?? 1,
        skill.cleanseDots ?? true,
        save,
      );
    return {
      ...noBasicHit,
      skill,
      skillDamage: 0,
      isCleanse: true,
      cleanseDetails,
      skillPityInc: pityReset,
    };
  }

  if (skill.skillKind === 'heal' && party?.length) {
    if (opts?.deferSupport) {
      return {
        ...noBasicHit,
        skill,
        skillDamage: 0,
        isHeal: true,
        healAmount: 0,
        skillPityInc: pityReset,
      };
    }
    const healScale = opts?.healMult ?? 1;
    const healPct = Math.min(
      SKILL_HEAL_MAX_PCT * 1.12,
      (skill.healPct ?? 0.08) * HEAL_SKILL_PCT_MULT,
    );
    const { total, details } = applyCombatHeal(
      party, healPct, healScale, attacker.id, undefined, charState.prestige ?? 0,
    );
    return {
      ...noBasicHit,
      skill,
      skillDamage: 0,
      healAmount: total,
      healDetails: details,
      isHeal: true,
      skillPityInc: pityReset,
    };
  }

  if (skill.skillKind === 'block') {
    if (!opts?.deferSupport) {
      applyPartyBuff(attacker, {
        id: `block_${skill.nodeId}`,
        name: skill.name,
        icon: '🛡',
        duration: BLOCK_BUFF_DURATION_SEC,
        defMult: 1 + (skill.blockPct ?? 0.35),
        desc: '방패 막기',
        sourceName: attacker.name,
      }, save);
    }
  }

  let skillDmg = Math.floor(attacker.atk * skill.damageMult);
  if (skill.animTier >= 2) skillDmg = Math.floor(skillDmg * 1.22);
  if (skill.animTier >= 3) skillDmg = Math.floor(skillDmg * 1.38);
  skillDmg = Math.floor(skillDmg * getPrestigeSkillCombatMult(charState.prestige ?? 0));
  if (skill.skillKind === 'block') {
    skillDmg = Math.floor(skillDmg * 1.05);
  }
  const critRate = Math.min(0.85, attacker.critRate + (opts?.comboCritBonus ?? 0));
  const skillCrit = Math.random() < critRate;
  if (skillCrit || base.isCrit) skillDmg = Math.floor(skillDmg * attacker.critMult);
  skillDmg = calcDamage(skillDmg, getEnemyEffectiveDef(target), attacker.pierce);
  if (skill.element !== 'none' && target.element) {
    skillDmg = Math.floor(skillDmg * getElementDamageMult(skill.element, target.element));
  }

  const dot = skill.skillKind === 'damage' || skill.skillKind === 'block'
    ? buildSkillDot(attacker, skill) : undefined;
  if (dot) applyStatusEffect(target, dot);

  return {
    ...base,
    damage: base.damage + skillDmg,
    isCrit: base.isCrit || skillCrit,
    skill,
    skillDamage: skillDmg,
    dotApplied: dot,
    skillPityInc: pityReset,
  };
}

/** 시전 완료 후 버프·힐·정화·방어 실제 적용 */
export function applyPartyStrikeSupport(
  res: SkillStrikeResult,
  attacker: CombatEntity,
  party: CombatEntity[],
  save?: GameSave,
  opts?: PartyStrikeOpts,
): void {
  const skill = res.skill;
  if (!skill) return;

  if (skill.skillKind === 'buff' && party.length) {
    const targets = skill.buffParty ? party : party.filter(p => p.id === attacker.id);
    for (const ally of targets) {
      if (ally.hp <= 0) continue;
      applyPartyBuff(ally, {
        id: `skill_${skill.nodeId}`,
        name: skill.name,
        icon: '✨',
        duration: skill.buffDuration ?? 10,
        atkMult: skill.buffAtkMult,
        defMult: skill.buffDefMult,
        spdMult: skill.buffSpdMult,
        desc: skill.name,
        sourceName: attacker.name,
      }, save);
    }
    return;
  }

  if (skill.skillKind === 'cleanse' && party.length) {
    applyCombatCleanse(party, skill.cleanseCount ?? 1, skill.cleanseDots ?? true, save);
    return;
  }

  if (skill.skillKind === 'heal' && party.length) {
    const healScale = opts?.healMult ?? 1;
    const healPct = Math.min(
      SKILL_HEAL_MAX_PCT * 1.12,
      (skill.healPct ?? 0.08) * HEAL_SKILL_PCT_MULT,
    );
    const prestige = save?.chars[attacker.id]?.prestige ?? 0;
    applyCombatHeal(party, healPct, healScale, attacker.id, undefined, prestige);
    return;
  }

  if (skill.skillKind === 'block') {
    applyPartyBuff(attacker, {
      id: `block_${skill.nodeId}`,
      name: skill.name,
      icon: '🛡',
      duration: 5,
      defMult: 1 + (skill.blockPct ?? 0.35),
      desc: '방패 막기',
      sourceName: attacker.name,
    }, save);
  }
}

export interface DotTickEvent {
  targetName: string;
  damage: number;
  text: string;
  color: string;
  isEnemy: boolean;
  element: import('../types').ElementType;
  sourceCharId?: string;
}

export function tickStatusEffects(
  entity: CombatEntity,
  dt: number,
  isEnemy: boolean,
): DotTickEvent[] {
  const events: DotTickEvent[] = [];
  if (!entity.statusEffects?.length || entity.hp <= 0) return events;

  for (const eff of [...entity.statusEffects]) {
    eff.elapsed += dt;
    if (eff.elapsed < eff.interval) continue;
    eff.elapsed = 0;
    if (eff.ticksLeft <= 0) continue;

    const dmg = Math.max(1, eff.damagePerTick);
    entity.hp = Math.max(0, entity.hp - dmg);
    eff.ticksLeft--;

    const icon = ELEMENT_ICON[eff.element];
    events.push({
      targetName: entity.name,
      damage: dmg,
      text: `${icon}${eff.sourceName} -${dmg}`,
      color: ELEMENT_COLOR[eff.element],
      isEnemy,
      element: eff.element,
      sourceCharId: eff.sourceCharId,
    });

    if (eff.ticksLeft <= 0) {
      entity.statusEffects = entity.statusEffects!.filter(e => e !== eff);
    }
  }
  return events;
}

export function maybeApplyMonsterElement(
  monster: CombatEntity,
  target: CombatEntity,
  monDef: MonsterDef,
): StatusEffect | null {
  const el = monDef.element;
  if (!el || el === 'none') return null;
  const chance = monDef.isBoss ? 0.32 : 0.16;
  if (Math.random() > chance) return null;

  const dotPct = monDef.isBoss ? 0.1 : 0.06;
  const ticks = monDef.isBoss ? 5 : 4;
  const effect: Omit<StatusEffect, 'elapsed'> = {
    element: el,
    damagePerTick: Math.max(1, Math.floor(monster.atk * dotPct)),
    ticksLeft: ticks,
    interval: DOT_INTERVAL,
    sourceName: monDef.name,
  };
  return applyStatusEffect(target, effect);
}

export function applySkillTouchProc(
  save: GameSave,
  attacker: CombatEntity,
  enemy: CombatEntity,
  charId: string,
): SkillStrikeResult | null {
  const st = save.chars[charId];
  if (!st) return null;
  const { skill } = rollSkillProc(st.unlockedNodes, charId, attacker, 0);
  if (!skill || skill.skillKind === 'heal' || skill.skillKind === 'buff' || skill.skillKind === 'cleanse') return null;

  let skillDmg = Math.floor(attacker.atk * skill.damageMult * TOUCH_SKILL_DMG_MULT * 1.35);
  skillDmg = calcDamage(skillDmg, getEnemyEffectiveDef(enemy), attacker.pierce);
  const actual = applyDamageToEnemy(enemy, skillDmg);
  const dot = buildSkillDot(attacker, skill);
  if (dot) applyStatusEffect(enemy, dot);

  return {
    damage: actual,
    isCrit: false,
    attackerId: charId,
    targetId: enemy.id,
    isAoe: false,
    skill,
    skillDamage: actual,
    dotApplied: dot,
  };
}

export function getMonsterElementDamageBonus(element: ElementType | undefined, targetDef: number): number {
  if (!element || element === 'none') return 0;
  return Math.floor(targetDef * 0.05);
}

export function calcMonsterStrikeDamage(
  attacker: CombatEntity,
  target: CombatEntity,
  element?: ElementType,
  regionId = 1,
): number {
  const isBoss = attacker.id.includes('boss');
  const { defMult } = getStatMults(target);
  const pen = isBoss
    ? BOSS_ARMOR_PEN
    : regionMonsterArmorPen(regionId);
  const defScale = isBoss ? 1 : regionPartyDefMult(regionId);
  const effDef = Math.max(1, Math.floor(target.def * defMult * defScale * (1 - pen)));
  const effMdef = Math.max(1, Math.floor(target.mdef * defMult * defScale * (1 - pen)));
  const bonus = getMonsterElementDamageBonus(element, effDef);
  const raw = attacker.atk + bonus;
  let dmg = attacker.isMagic
    ? calcMagicDamage(raw, effMdef)
    : calcDamage(raw, effDef);
  if (isBoss) {
    dmg = Math.max(dmg, Math.floor(attacker.atk * BOSS_MIN_ATK_DAMAGE_PCT));
  } else {
    const trashMin = regionTrashMinDmgPct(regionId);
    if (trashMin > 0) {
      dmg = Math.max(dmg, Math.floor(attacker.atk * trashMin));
    } else {
      dmg = Math.max(1, dmg);
    }
  }
  return dmg;
}
