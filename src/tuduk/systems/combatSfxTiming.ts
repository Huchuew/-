import { charUsesMeleeDash, charUsesProjectile } from '../data/characters';
import {
  MELEE_APPROACH_SEC, MELEE_SWING_HIT_RATIO, MELEE_SWING_NORMAL_SEC, MELEE_SWING_SKILL_SEC,
} from '../render/meleeEngageVfx';

export interface PartyAttackSfxTiming {
  /** 스윙·시전 SE (ms) */
  swingMs: number;
  /** 타격·피격 SE (ms) */
  hitMs: number;
}

export interface PartyAttackSfxTimingOpts {
  charId: string;
  isSkill: boolean;
  isUltimate: boolean;
  powerTier: number;
  useMeleeEngage: boolean;
  alreadyEngaged: boolean;
}

function computeProjectileSfxTiming(charId: string, tier: number): PartyAttackSfxTiming {
  const isArrow = charId === 'dung' || charId === 'sodia';
  const spawnSec = isArrow ? 0.10 : 0.14;
  const flightSec = isArrow ? 0.32 : 0.36 + tier * 0.02;
  const hitMs = Math.round((spawnSec + flightSec) * 1000);
  return { swingMs: Math.max(0, Math.round(spawnSec * 1000) - 20), hitMs };
}

/** 공격 모션 타격 프레임에 맞춘 SE 지연 */
export function computePartyAttackSfxTiming(opts: PartyAttackSfxTimingOpts): PartyAttackSfxTiming {
  const tier = Math.max(0, Math.min(6, opts.powerTier));
  const tierScale = 1 + tier * 0.04;

  if (opts.isUltimate) {
    const hitMs = Math.round(300 + tier * 15);
    return { swingMs: 30, hitMs };
  }

  if (opts.useMeleeEngage && charUsesMeleeDash(opts.charId)) {
    const swingSec = (opts.isSkill ? MELEE_SWING_SKILL_SEC : MELEE_SWING_NORMAL_SEC) * tierScale;
    const approachSec = opts.alreadyEngaged ? 0 : MELEE_APPROACH_SEC;
    const hitMs = Math.round((approachSec + swingSec * MELEE_SWING_HIT_RATIO) * 1000);
    return { swingMs: Math.max(0, hitMs - 60), hitMs };
  }

  if (charUsesProjectile(opts.charId)) {
    return computeProjectileSfxTiming(opts.charId, tier);
  }

  const isSkill = opts.isSkill;
  const advance = charUsesMeleeDash(opts.charId);
  const strikeSec = (isSkill
    ? (advance ? 0.46 : 0.52)
    : (advance ? (0.30) : 0.40)) * tierScale;
  const hitMs = Math.round(strikeSec * 1000 * (advance ? 0.38 : 0.48));
  return { swingMs: Math.max(0, hitMs - 50), hitMs };
}

/** 몬스터 궁수 투사체 착탄 */
export function computeMonsterProjectileSfxDelayMs(): number {
  return Math.round((0.10 + 0.32) * 1000);
}

/** 몬ster 공격 모션 — 전진 정점(45%) */
export function computeMonsterAttackSfxDelayMs(monId?: string): number {
  if (monId === 'archer_mob' || monId === 'bat_rare') {
    return computeMonsterProjectileSfxDelayMs();
  }
  return Math.round(0.32 * 0.42 * 1000);
}

export function computeMonsterHurtSfxDelayMs(monId?: string): number {
  return computeMonsterAttackSfxDelayMs(monId) + 45;
}
