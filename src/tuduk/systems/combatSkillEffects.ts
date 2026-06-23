import { SKILL_DEBUFF_PROC_MULT } from '../data/combatBalance';
import type { CombatEntity, ElementType } from '../types';
import type { CombatSkillDef } from '../data/combatSkills';
import { applyMonsterDebuff, MONSTER_DEBUFF_DEFS } from './monsterDebuffs';

type DebuffId = keyof typeof MONSTER_DEBUFF_DEFS;

const ELEMENT_DEBUFF: Partial<Record<ElementType, DebuffId>> = {
  fire: 'weakness',
  thunder: 'shock',
  water: 'slow',
  poison: 'poison',
};

/** 스킬 적중 시 적에게 디버프 부여 (파티 → 몬스터) */
export function tryApplySkillDebuffToEnemy(
  enemy: CombatEntity,
  skill: CombatSkillDef,
  attackerName: string,
  regionId: number,
): { name: string; icon: string; debuffId: DebuffId } | null {
  if (skill.skillKind !== 'damage' && skill.skillKind !== 'block') return null;
  const base = skill.animTier >= 3 ? 0.55 : skill.animTier >= 2 ? 0.38 : 0.22;
  const chance = base * SKILL_DEBUFF_PROC_MULT;
  if (Math.random() > chance) return null;

  const debuffId: DebuffId = ELEMENT_DEBUFF[skill.element]
    ?? (skill.skillKind === 'block' ? 'armor_break' : 'weakness');
  const applied = applyMonsterDebuff(enemy, debuffId, skill.name || attackerName, 1, regionId);
  return { name: applied.name, icon: applied.icon, debuffId };
}

export function isCombatSilenced(entity: CombatEntity): boolean {
  return entity.combatModifiers?.some(m => m.id === 'silence' && m.kind === 'debuff') ?? false;
}

/** 방패 스킬 피해 경감 배율 (다음 몇 초간) */
export function getBlockDamageReduction(entity: CombatEntity): number {
  let mult = 1;
  for (const m of entity.combatModifiers ?? []) {
    if (m.kind !== 'buff' || !m.id.startsWith('block_')) continue;
    if (m.defMult && m.defMult > 1) {
      mult *= 1 / m.defMult;
    }
  }
  return Math.max(0.35, mult);
}
