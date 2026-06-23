import type { CombatEntity, GameSave, MonsterDef, TimedCombatEffect } from '../types';
import { CHAR_MAP } from '../data/characters';
import { regionDebuffScale, DEBUFF_DOT_DMG_MULT, MONSTER_DEBUFF_PROC_MULT } from '../data/combatBalance';
import { persistPartyModifier, removePersistedModifier } from './partyExpeditionMods';

export const MONSTER_DEBUFF_DEFS = {
  weakness: {
    id: 'weakness',
    name: '약화',
    icon: '⬇️',
    kind: 'debuff' as const,
    duration: 24,
    atkMult: 0.82,
    desc: '공격력 18% 감소',
  },
  armor_break: {
    id: 'armor_break',
    name: '방어파괴',
    icon: '🛡️',
    kind: 'debuff' as const,
    duration: 30,
    defMult: 0.78,
    desc: '방어력 22% 감소',
  },
  slow: {
    id: 'slow',
    name: '둔화',
    icon: '🐌',
    kind: 'debuff' as const,
    duration: 21,
    spdMult: 0.72,
    desc: '공격속도 28% 감소',
  },
  poison: {
    id: 'poison',
    name: '중독',
    icon: '☠️',
    kind: 'debuff' as const,
    duration: 27,
    damagePerTick: 0,
    tickInterval: 1.2,
    desc: '지속 독 피해',
  },
  curse: {
    id: 'curse',
    name: '저주',
    icon: '💀',
    kind: 'debuff' as const,
    duration: 20,
    atkMult: 0.9,
    defMult: 0.88,
    desc: '공격·방어 동시 감소',
  },
  bleed: {
    id: 'bleed',
    name: '출혈',
    icon: '🩸',
    kind: 'debuff' as const,
    duration: 24,
    damagePerTick: 0,
    tickInterval: 1.0,
    desc: '지속 출혈 피해',
  },
  shock: {
    id: 'shock',
    name: '마비',
    icon: '⚡',
    kind: 'debuff' as const,
    duration: 16,
    spdMult: 0.58,
    atkMult: 0.88,
    desc: '공속·공격 급감',
  },
  silence: {
    id: 'silence',
    name: '침묵',
    icon: '🔇',
    kind: 'debuff' as const,
    duration: 22,
    atkMult: 0.76,
    spdMult: 0.85,
    desc: '스킬·마법 약화',
  },
} as const;

type DebuffId = keyof typeof MONSTER_DEBUFF_DEFS;

/** 캐릭터별 맞춤 디버프 — 역할·직업 차별화 */
const CHAR_DEBUFF_POOL: Record<string, DebuffId[]> = {
  mujang: ['armor_break', 'bleed', 'curse'],
  seoyoung: ['armor_break', 'slow', 'curse'],
  teso: ['curse', 'shock', 'armor_break'],
  horangi: ['bleed', 'slow', 'weakness'],
  hyesung: ['shock', 'bleed', 'weakness'],
  isanim: ['slow', 'weakness', 'silence'],
  sanjeok: ['bleed', 'armor_break', 'curse'],
  sodia: ['poison', 'slow', 'weakness'],
  jimjimi: ['armor_break', 'slow', 'shock'],
  danjong: ['curse', 'armor_break', 'slow'],
  hyeoni: ['silence', 'poison', 'curse'],
  pocket: ['armor_break', 'bleed', 'slow'],
  huchu: ['silence', 'weakness', 'shock'],
  dung: ['slow', 'bleed', 'weakness'],
  ujang: ['bleed', 'slow', 'weakness'],
  lesford: ['armor_break', 'bleed', 'slow'],
  ampa: ['bleed', 'curse', 'weakness'],
  cutie: ['poison', 'curse', 'bleed'],
  yujin: ['silence', 'curse', 'poison'],
  hidden: ['poison', 'weakness', 'slow'],
};

function ensureMods(entity: CombatEntity): TimedCombatEffect[] {
  if (!entity.combatModifiers) entity.combatModifiers = [];
  return entity.combatModifiers;
}

/** 동일 id·kind 중복 엔트리 제거 (HUD 이중 표기 방지) */
function dedupeCombatModifiers(
  list: TimedCombatEffect[],
  id: string,
  kind: 'buff' | 'debuff',
  keep?: TimedCombatEffect,
) {
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i]!;
    if (m.id === id && m.kind === kind && m !== keep) list.splice(i, 1);
  }
}

function pickDebuffForTarget(targetId: string, monDef: MonsterDef, isElite: boolean, regionId: number): DebuffId {
  const role = CHAR_MAP[targetId]?.equipRole;
  const biased = CHAR_DEBUFF_POOL[targetId];
  if (biased?.length && Math.random() < 0.72) {
    return biased[Math.floor(Math.random() * biased.length)]!;
  }

  const pool: DebuffId[] = monDef.isBoss
    ? ['curse', 'armor_break', 'bleed', 'poison', 'shock']
    : isElite
      ? ['armor_break', 'bleed', 'slow', 'shock']
      : regionId >= 11
        ? ['weakness', 'slow', 'poison', 'bleed']
        : ['weakness', 'slow', 'poison'];

  if (role === 'healer' && Math.random() < 0.45) return 'silence';
  if (role === 'tank' && Math.random() < 0.4) return 'armor_break';
  if ((role === 'dps' || role === 'bruiser') && Math.random() < 0.35) return 'bleed';

  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function applyMonsterDebuff(
  target: CombatEntity,
  debuffId: DebuffId,
  sourceName: string,
  atkScale = 1,
  regionId = 1,
  save?: GameSave,
): TimedCombatEffect {
  const def = MONSTER_DEBUFF_DEFS[debuffId];
  const list = ensureMods(target);
  const existing = list.find(m => m.id === def.id && m.kind === 'debuff');
  const rScale = regionDebuffScale(regionId);
  const dotDmg = (debuffId === 'poison' || debuffId === 'bleed')
    ? Math.max(1, Math.floor(atkScale * (debuffId === 'bleed' ? 0.09 : 0.07) * rScale * DEBUFF_DOT_DMG_MULT))
    : undefined;

  const d = def as {
    atkMult?: number; defMult?: number; spdMult?: number; tickInterval?: number;
  };
  const curseAtk = debuffId === 'curse' ? Math.max(0.78, 0.9 - (rScale - 1) * 0.05) : d.atkMult;
  const curseDef = debuffId === 'curse' ? Math.max(0.75, 0.88 - (rScale - 1) * 0.05) : d.defMult;
  const durBonus = regionId >= 11 ? Math.min(3, (regionId - 10) * 0.45) : 0;

  const effect: TimedCombatEffect = {
    id: def.id,
    name: def.name,
    kind: 'debuff',
    icon: def.icon,
    duration: def.duration + durBonus,
    elapsed: 0,
    appliedAt: Date.now(),
    atkMult: curseAtk,
    defMult: curseDef,
    spdMult: d.spdMult,
    damagePerTick: dotDmg,
    tickInterval: Math.max(0.8, (d.tickInterval ?? 1.2) - (regionId >= 10 ? (regionId - 9) * 0.04 : 0)),
    tickElapsed: 0,
    desc: def.desc,
    sourceName,
  };

  if (existing) {
    existing.duration = Math.max(existing.duration, effect.duration);
    existing.elapsed = 0;
    if (dotDmg) existing.damagePerTick = Math.max(existing.damagePerTick ?? 0, dotDmg);
    existing.atkMult = effect.atkMult ?? existing.atkMult;
    existing.defMult = effect.defMult ?? existing.defMult;
    existing.spdMult = effect.spdMult ?? existing.spdMult;
    existing.tickInterval = effect.tickInterval ?? existing.tickInterval;
    existing.sourceName = sourceName;
    if (!existing.appliedAt) existing.appliedAt = Date.now();
    dedupeCombatModifiers(list, def.id, 'debuff', existing);
    if (save && target.isPlayer) persistPartyModifier(save, target.id, existing);
    return existing;
  }
  dedupeCombatModifiers(list, def.id, 'debuff');
  list.push(effect);
  if (save && target.isPlayer) persistPartyModifier(save, target.id, effect);
  return effect;
}

export function applyPartyBuff(
  target: CombatEntity,
  buff: {
    id: string;
    name: string;
    icon: string;
    duration: number;
    atkMult?: number;
    defMult?: number;
    spdMult?: number;
    desc: string;
    sourceName: string;
  },
  save?: GameSave,
): TimedCombatEffect {
  const list = ensureMods(target);
  const existing = list.find(m => m.id === buff.id && m.kind === 'buff');
  const effect: TimedCombatEffect = {
    ...buff,
    kind: 'buff',
    elapsed: 0,
    appliedAt: Date.now(),
    tickElapsed: 0,
  };
  if (existing) {
    existing.duration = Math.max(existing.duration, effect.duration);
    existing.elapsed = 0;
    existing.atkMult = effect.atkMult ?? existing.atkMult;
    existing.defMult = effect.defMult ?? existing.defMult;
    existing.spdMult = effect.spdMult ?? existing.spdMult;
    dedupeCombatModifiers(list, buff.id, 'buff', existing);
    if (save && target.isPlayer) persistPartyModifier(save, target.id, existing);
    return existing;
  }
  dedupeCombatModifiers(list, buff.id, 'buff');
  list.push(effect);
  if (save && target.isPlayer) persistPartyModifier(save, target.id, effect);
  return effect;
}

export function maybeApplyMonsterDebuff(
  attacker: CombatEntity,
  target: CombatEntity,
  monDef: MonsterDef,
  isElite: boolean,
  regionId = 1,
  save?: GameSave,
): TimedCombatEffect | null {
  const pick = rollMonsterDebuffAttempt(target, monDef, isElite, regionId);
  if (!pick) return null;
  return applyMonsterDebuff(target, pick, monDef.name, attacker.atk, regionId, save);
}

/** 디버프 시전 판정만 */
export function rollMonsterDebuffAttempt(
  target: CombatEntity,
  monDef: MonsterDef,
  isElite: boolean,
  regionId = 1,
): DebuffId | null {
  let baseChance = monDef.isBoss ? 0.28 : isElite ? 0.24 : 0.12;
  if (regionId >= 11) baseChance += Math.min(0.12, (regionId - 10) * 0.018);
  const chance = Math.min(0.62, baseChance * MONSTER_DEBUFF_PROC_MULT);
  if (Math.random() > chance) return null;
  return pickDebuffForTarget(target.id, monDef, isElite, regionId);
}

export function applyMonsterDebuffById(
  target: CombatEntity,
  debuffId: DebuffId,
  sourceName: string,
  atkScale: number,
  regionId: number,
  save?: GameSave,
): TimedCombatEffect {
  return applyMonsterDebuff(target, debuffId, sourceName, atkScale, regionId, save)!;
}

export function getStatMults(entity: CombatEntity) {
  let atkMult = 1;
  let defMult = 1;
  let spdMult = 1;
  for (const m of entity.combatModifiers ?? []) {
    if (m.atkMult) atkMult *= m.atkMult;
    if (m.defMult) defMult *= m.defMult;
    if (m.spdMult) spdMult *= m.spdMult;
  }
  return { atkMult, defMult, spdMult };
}

export function tickCombatModifiers(entity: CombatEntity, dt: number): { damage: number; text: string }[] {
  const events: { damage: number; text: string }[] = [];
  if (!entity.combatModifiers?.length || entity.hp <= 0) return events;

  for (const mod of [...entity.combatModifiers]) {
    mod.elapsed += dt;
    if (mod.damagePerTick && mod.tickInterval) {
      mod.tickElapsed = (mod.tickElapsed ?? 0) + dt;
      while (mod.tickElapsed >= mod.tickInterval && entity.hp > 0) {
        mod.tickElapsed -= mod.tickInterval;
        const dmg = Math.max(1, mod.damagePerTick);
        entity.hp = Math.max(0, entity.hp - dmg);
        events.push({ damage: dmg, text: `${mod.icon}${mod.name} -${dmg}` });
      }
    }
    if (mod.elapsed >= mod.duration) {
      entity.combatModifiers = entity.combatModifiers!.filter(x => x !== mod);
    }
  }
  return events;
}

/** 전투 중 디버프·도트 제거 (힐러 정화) */
export function cleanseCombatDebuffs(
  entity: CombatEntity,
  maxRemovals: number,
  clearDots: boolean,
  save?: GameSave,
): string[] {
  const removed: string[] = [];
  if (maxRemovals <= 0) return removed;

  const mods = entity.combatModifiers ?? [];
  for (let i = mods.length - 1; i >= 0 && removed.length < maxRemovals; i--) {
    const m = mods[i]!;
    if (m.kind !== 'debuff') continue;
    removed.push(m.name);
    mods.splice(i, 1);
    if (save && entity.isPlayer) {
      removePersistedModifier(save, entity.id, m.id, 'debuff');
    }
  }

  if (clearDots && entity.statusEffects?.length) {
    const dot = entity.statusEffects.pop();
    if (dot) removed.push(`${dot.sourceName} 도트`);
  }

  if (save && entity.isPlayer && removed.length) {
    entity.combatModifiers = mods;
  }
  return removed;
}
