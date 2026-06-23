import type { ElementType } from '../types';
import type { CombatSkillDef } from '../data/combatSkills';
import { charUsesMeleeDash, charUsesProjectile } from '../data/characters';
import { ELEMENT_COLOR } from '../data/elemental';

export type SkillDelivery = 'instant' | 'melee' | 'projectile';

export interface SkillChargeVisual {
  charId: string;
  skillName: string;
  element: ElementType;
  delivery: SkillDelivery;
  elapsed: number;
  duration: number;
  ratio: number;
}

export interface SkillDeliveryOpts {
  /** 근접 교전 중(붙은 뒤) — 원거리 스킬을 근접으로 강제 */
  meleeAttached?: boolean;
  /** 돌진·교전 시작됨 — 원거리 선봉 차단 */
  meleeEngageStarted?: boolean;
  /** 이번 웨이브 원거리 선봉 이미 사용 */
  warriorRangedUsed?: boolean;
}

function isRangedMotionKey(motionKey?: string | null): boolean {
  return motionKey === 'attack02' || motionKey === 'attack03'
    || motionKey === 'attack2' || motionKey === 'attack3';
}

/** 근접형 캐릭 원거리 선봉 후보 (스킬 1회만) */
function warriorSkillLooksRanged(skill: CombatSkillDef): boolean {
  if (skill.delivery === 'projectile') return true;
  if (skill.animTier < 2) return false;
  return isRangedMotionKey(skill.motionKey ?? null);
}

export function inferSkillDelivery(
  charId: string,
  skill: CombatSkillDef,
  opts?: SkillDeliveryOpts,
): SkillDelivery {
  const attached = !!opts?.meleeAttached;
  const engageStarted = !!opts?.meleeEngageStarted;
  const rangedUsed = !!opts?.warriorRangedUsed;

  if (charUsesMeleeDash(charId)) {
    if (attached && (skill.skillKind === 'damage' || skill.skillKind === 'block')) {
      return 'melee';
    }
    if (skill.skillKind === 'damage' || skill.skillKind === 'block') {
      if (skill.delivery === 'melee') return 'melee';
      if (!engageStarted && !rangedUsed && warriorSkillLooksRanged(skill)) {
        return 'projectile';
      }
      return 'melee';
    }
  }

  if (skill.delivery) return skill.delivery;

  if (skill.skillKind === 'damage') {
    if (charUsesProjectile(charId)) return 'projectile';
    if (charUsesMeleeDash(charId)) return 'melee';
  }
  if (skill.skillKind === 'heal' || skill.skillKind === 'buff') {
    if (charUsesProjectile(charId) && skill.animTier >= 3) return 'projectile';
  }
  return 'instant';
}

/** 돌진(전진) 여부 — 원거리는 후방 제자리 공격 */
export function shouldAdvanceForDelivery(charId: string, delivery: SkillDelivery): boolean {
  return charUsesMeleeDash(charId) && delivery === 'melee';
}

export function getSupportSkillCastDuration(skill: CombatSkillDef): number {
  const tier = skill.animTier ?? 1;
  return Math.min(5, Math.max(3, 2.8 + tier * 0.65));
}

export function isSupportSkillKind(kind: CombatSkillDef['skillKind']): boolean {
  return kind === 'buff' || kind === 'heal' || kind === 'cleanse' || kind === 'block';
}

export function getSkillChargeDuration(
  charId: string,
  skill: CombatSkillDef,
  isUltimate = false,
  opts?: SkillDeliveryOpts,
): number {
  if (isSupportSkillKind(skill.skillKind)) return getSupportSkillCastDuration(skill);
  if (skill.chargeSec != null) return skill.chargeSec;
  const delivery = inferSkillDelivery(charId, skill, opts);
  if (delivery === 'instant') return 0;
  if (isUltimate) return delivery === 'projectile' ? 0.62 : 0.5;
  if (skill.animTier >= 3) return delivery === 'projectile' ? 0.52 : 0.42;
  if (skill.animTier >= 2) return delivery === 'projectile' ? 0.36 : 0.3;
  return 0;
}

export function shouldSkillCharge(charId: string, skill: CombatSkillDef | null | undefined, isUltimate = false): boolean {
  if (!skill) return false;
  if (isSupportSkillKind(skill.skillKind)) return true;
  if (skill.skillKind === 'block' || skill.skillKind === 'cleanse') return true;
  if (isUltimate) return skill.animTier >= 2 || inferSkillDelivery(charId, skill) !== 'instant';
  if (skill.skillKind === 'damage') return skill.animTier >= 2;
  if (skill.skillKind === 'heal' || skill.skillKind === 'buff') return true;
  return false;
}

export function skillChargeBarColor(el: ElementType): string {
  if (el !== 'none') return ELEMENT_COLOR[el];
  return '#c8d4ff';
}
