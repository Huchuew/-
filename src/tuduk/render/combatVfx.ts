import type { CombatSkillDef } from '../data/combatSkills';
import type { StatusVfxSpec } from '../data/statusEffectVfx';
import { preloadKeyedFrames } from '../assets/AssetLoader';
import { CHAR_MAP, charUsesMeleeDash, charUsesProjectile } from '../data/characters';
import { inferSkillDelivery, shouldAdvanceForDelivery, type SkillDelivery, type SkillDeliveryOpts } from '../systems/skillCharge';
import { resolveCombatProjectile, resolveMonsterProjectile, type ProjectileKind } from '../data/tinyRpgAnim';
import type { ElementType } from '../types';
import { MeleeEngageManager, type MeleeEngageVisual } from './meleeEngageVfx';
import { MAX_PROJECTILE_VFX, MAX_SLASH_VFX } from '../systems/combatPerf';

/** 공격 스트라이크 연출 길이(초) — 층·티어와 무관하게 10층 체감 속도 */
function partyStrikeDuration(
  isSkill: boolean,
  advance: boolean,
  skillCrit: boolean,
  delivery: string,
  tier: number,
): number {
  const t = Math.min(3, tier);
  const tierNudge = 1 + t * 0.01;
  if (delivery === 'projectile') {
    return (isSkill ? 0.36 : 0.32) * tierNudge;
  }
  if (advance) {
    return (isSkill ? 0.30 : skillCrit ? 0.26 : 0.24) * tierNudge;
  }
  return (isSkill ? 0.32 : skillCrit ? 0.28 : 0.26) * tierNudge;
}

export interface StrikeVfx {
  slot: number;
  elapsed: number;
  duration: number;
  crit: boolean;
  /** true = 근접 돌진, false = 제자리 공격(궁수·마법사 등) */
  advance: boolean;
  delivery?: SkillDelivery;
  isSkill?: boolean;
  attackKey?: string | null;
  skillElement?: ElementType;
  powerTier?: number;
}

export interface FlashVfx {
  elapsed: number;
  duration: number;
  crit?: boolean;
}

export interface StatusFlashVfx extends FlashVfx {
  color: string;
  glow: string;
  ring: StatusVfxSpec['ring'];
  particle?: string;
}

export interface ImpactSlash {
  x: number;
  y: number;
  angle: number;
  scale: number;
  life: number;
  crit: boolean;
  prestige?: number;
}

export interface EnemyStrikeVfx {
  elapsed: number;
  duration: number;
}

export interface ProjectileImpactPayload {
  hitX: number;
  hitY: number;
  crit: boolean;
  isSkill: boolean;
  tierBoost: number;
  prestigeLevel: number;
  advance: boolean;
  knock: number;
}

export interface ProjectileVfx {
  kind: ProjectileKind;
  sourceSide: 'party' | 'enemy';
  sourceSlot: number;
  charId?: string;
  attackKey?: string | null;
  targetKind: 'enemy' | 'ally';
  targetEnemySlot: number;
  targetPartySlot: number;
  flightFrames: string[];
  impactFrames: string[];
  elapsed: number;
  spawnDelay: number;
  flightDuration: number;
  impactDuration: number;
  crit: boolean;
  tier: number;
  element: ElementType;
  hitFired: boolean;
  impactPayload?: ProjectileImpactPayload;
}


export class CombatVfxManager {
  partyStrike: StrikeVfx | null = null;
  readonly melee = new MeleeEngageManager();
  /** 속파 시 슬래시·투사체·흔들림 최소화 */
  perfLite = false;
  /** 몬스터 시각 슬롯별 공격 모션 (0=선봉·적에 가장 가까움) */
  enemyStrikes: Record<number, EnemyStrikeVfx> = {};
  enemyHitFlashes: Record<number, FlashVfx> = {};
  enemyAttackFlashes: Record<number, FlashVfx> = {};
  partyFlash: (FlashVfx & { slot: number }) | null = null;
  enemyKnock = 0;
  slashes: ImpactSlash[] = [];
  projectiles: ProjectileVfx[] = [];
  screenShake = 0;
  healPulse: { slot: number; elapsed: number; duration: number } | null = null;
  healTargetFlashes: Record<number, FlashVfx> = {};
  healerCastFlash: (FlashVfx & { slot: number }) | null = null;
  shieldFlash: { slot: number; elapsed: number; duration: number } | null = null;
  partyStatusFlashes: Record<number, StatusFlashVfx> = {};
  enemyStatusFlashes: Record<number, StatusFlashVfx> = {};
  skillChargeSlots: Record<number, { ratio: number; color: string; label?: string; icon?: string }> = {};

  update(dt: number) {
    this.melee.update(dt);
    if (this.partyStrike) {
      this.partyStrike.elapsed += dt;
      if (this.partyStrike.elapsed >= this.partyStrike.duration) this.partyStrike = null;
    }
    for (const key of Object.keys(this.enemyStrikes)) {
      const slot = Number(key);
      const v = this.enemyStrikes[slot]!;
      v.elapsed += dt;
      if (v.elapsed >= v.duration) delete this.enemyStrikes[slot];
    }
    for (const key of Object.keys(this.enemyAttackFlashes)) {
      const slot = Number(key);
      const v = this.enemyAttackFlashes[slot]!;
      v.elapsed += dt;
      if (v.elapsed >= v.duration) delete this.enemyAttackFlashes[slot];
    }
    for (const key of Object.keys(this.enemyHitFlashes)) {
      const slot = Number(key);
      const v = this.enemyHitFlashes[slot]!;
      v.elapsed += dt;
      if (v.elapsed >= v.duration) delete this.enemyHitFlashes[slot];
    }
    if (this.partyFlash) {
      this.partyFlash.elapsed += dt;
      if (this.partyFlash.elapsed >= this.partyFlash.duration) this.partyFlash = null;
    }
    this.enemyKnock = Math.max(0, this.enemyKnock - dt * 50);
    this.screenShake = Math.max(0, this.screenShake - dt * 2.8);
    if (this.healPulse) {
      this.healPulse.elapsed += dt;
      if (this.healPulse.elapsed >= this.healPulse.duration) this.healPulse = null;
    }
    for (const key of Object.keys(this.healTargetFlashes)) {
      const slot = Number(key);
      const v = this.healTargetFlashes[slot]!;
      v.elapsed += dt;
      if (v.elapsed >= v.duration) delete this.healTargetFlashes[slot];
    }
    if (this.healerCastFlash) {
      this.healerCastFlash.elapsed += dt;
      if (this.healerCastFlash.elapsed >= this.healerCastFlash.duration) this.healerCastFlash = null;
    }
    if (this.shieldFlash) {
      this.shieldFlash.elapsed += dt;
      if (this.shieldFlash.elapsed >= this.shieldFlash.duration) this.shieldFlash = null;
    }
    for (const key of Object.keys(this.partyStatusFlashes)) {
      const slot = Number(key);
      const v = this.partyStatusFlashes[slot]!;
      v.elapsed += dt;
      if (v.elapsed >= v.duration) delete this.partyStatusFlashes[slot];
    }
    for (const key of Object.keys(this.enemyStatusFlashes)) {
      const slot = Number(key);
      const v = this.enemyStatusFlashes[slot]!;
      v.elapsed += dt;
      if (v.elapsed >= v.duration) delete this.enemyStatusFlashes[slot];
    }
    this.slashes = this.slashes.filter(s => {
      s.life -= dt;
      return s.life > 0;
    });
    this.projectiles = this.projectiles.filter(p => {
      p.elapsed += dt;
      if (!p.hitFired && p.elapsed >= p.spawnDelay + p.flightDuration) {
        p.hitFired = true;
        this.applyProjectileImpact(p);
      }
      return p.elapsed < p.spawnDelay + p.flightDuration + p.impactDuration;
    });
  }

  getEnemyHitFlash(visualSlot: number): number {
    return this.getFlashAlpha(this.enemyHitFlashes[visualSlot] ?? null);
  }

  private fireEnemyHit(
    enemySlot: number,
    hitX: number,
    hitY: number,
    crit: boolean,
    isSkill: boolean,
    tier: number,
    tierBoost: number,
    prestigeLevel: number,
    advance: boolean,
    knockOverride?: number,
  ) {
    const flashDur = (crit ? 0.22 : 0.14) + tier * 0.012;
    this.enemyHitFlashes[enemySlot] = { elapsed: 0, duration: flashDur, crit };
    if (this.perfLite && !isSkill && !crit) return;

    const knockBase = knockOverride ?? (advance ? (crit ? 18 : 9) : (crit ? 8 : 3));
    this.enemyKnock = knockBase * tierBoost;
    if (this.perfLite && !isSkill) return;

    const slashScale = (isSkill ? 1.55 : (crit ? 1.35 : 1)) * tierBoost;
    const slashLife = (isSkill ? 0.28 : (crit ? 0.22 : 0.16)) + tier * 0.015;
    if (this.slashes.length >= MAX_SLASH_VFX) this.slashes.shift();
    this.slashes.push({
      x: hitX, y: hitY,
      angle: advance ? -0.35 + Math.random() * 0.2 : -0.1 + Math.random() * 0.15,
      scale: slashScale,
      life: slashLife,
      crit,
      prestige: prestigeLevel,
    });
  }

  private applyProjectileImpact(p: ProjectileVfx) {
    if (p.sourceSide === 'party' && p.targetKind === 'enemy' && p.impactPayload) {
      const pl = p.impactPayload;
      this.fireEnemyHit(
        p.targetEnemySlot, pl.hitX, pl.hitY, pl.crit, pl.isSkill,
        p.tier, pl.tierBoost, pl.prestigeLevel, pl.advance, pl.knock,
      );
    } else if (p.sourceSide === 'enemy' && p.targetKind === 'ally') {
      this.partyFlash = { slot: p.targetPartySlot, elapsed: 0, duration: 0.22 };
    } else if (p.sourceSide === 'party' && p.targetKind === 'ally' && p.kind === 'heal') {
      this.healTargetFlashes[p.targetPartySlot] = { elapsed: 0, duration: 0.75, crit: false };
    }
  }

  private projectileSpawnDelay(kind: ProjectileKind, charId?: string): number {
    if (kind === 'arrow') return charId === 'dung' || charId === 'sodia' ? 0.10 : 0.10;
    if (kind === 'heal') return 0.08;
    return 0.14;
  }

  private pushProjectile(
    def: NonNullable<ReturnType<typeof resolveCombatProjectile>>,
    opts: {
      sourceSide: 'party' | 'enemy';
      sourceSlot: number;
      targetKind: 'enemy' | 'ally';
      targetEnemySlot: number;
      targetPartySlot: number;
      crit: boolean;
      tier: number;
      element: ElementType;
      charId?: string;
      attackKey?: string | null;
      impactPayload?: ProjectileImpactPayload;
    },
  ) {
    if (this.perfLite && this.projectiles.length >= MAX_PROJECTILE_VFX) return;
    const flight = def.kind === 'arrow' ? 0.32
      : def.kind === 'heal' ? 0.28
        : 0.36 + opts.tier * 0.02;
    const impact = def.impactFrames.length
      ? Math.max(0.18, def.impactFrames.length / 14)
      : def.kind === 'arrow' ? 0.04 : 0.06;
    this.projectiles.push({
      kind: def.kind,
      sourceSide: opts.sourceSide,
      sourceSlot: opts.sourceSlot,
      charId: opts.charId,
      attackKey: opts.attackKey ?? null,
      targetKind: opts.targetKind,
      targetEnemySlot: opts.targetEnemySlot,
      targetPartySlot: opts.targetPartySlot,
      flightFrames: def.flightFrames,
      impactFrames: def.impactFrames,
      elapsed: 0,
      spawnDelay: this.projectileSpawnDelay(def.kind, opts.charId),
      flightDuration: flight,
      impactDuration: impact,
      crit: opts.crit,
      tier: opts.tier,
      element: opts.element,
      hitFired: false,
      impactPayload: opts.impactPayload,
    });
  }

  private resolveProjectileDef(
    charId: string,
    element: ElementType,
    motionKey?: string | null,
  ) {
    const direct = resolveCombatProjectile(charId, element, { motionKey });
    if (direct) return direct;
    const job = CHAR_MAP[charId]?.job;
    if (job === 'archer') {
      return resolveCombatProjectile('dung', element, { motionKey });
    }
    if (job === 'mage') {
      return resolveCombatProjectile('huchu', element, { motionKey });
    }
    if (job === 'lancer') {
      return resolveCombatProjectile('dung', element, { motionKey });
    }
    return null;
  }

  onPartyAttack(
    slot: number,
    crit: boolean,
    hitX: number,
    hitY: number,
    advance: boolean,
    skill?: CombatSkillDef | null,
    attackKey?: string | null,
    charId?: string,
    powerTier = 0,
    prestigeLevel = 0,
    meleeOpts?: { enemyUid?: string; motionPool?: string[] },
    targetEnemySlot = 0,
    deliveryOpts?: SkillDeliveryOpts,
  ) {
    const isSkill = !!skill;
    const skillCrit = crit || isSkill;
    const tier = Math.max(0, Math.min(6, powerTier));
    const prestigeBoost = 1 + Math.min(2, prestigeLevel) * 0.12;
    const tierBoost = (1 + tier * 0.1) * prestigeBoost;
    const isSupportSkill = skill?.skillKind === 'heal' || skill?.skillKind === 'buff'
      || skill?.skillKind === 'cleanse';
    const meleeAttached = !!charId && this.melee.isAttached(slot);
    const delivery = charId
      ? (skill
        ? inferSkillDelivery(charId, skill, {
          ...deliveryOpts,
          meleeAttached,
          meleeEngageStarted: this.melee.hasEngagement(slot),
        })
        : (charUsesProjectile(charId) ? 'projectile' : 'instant'))
      : 'instant';
    if (delivery === 'projectile') advance = false;
    const isProjectileOffense = !isSupportSkill && delivery === 'projectile';

    const useMeleeEngage = advance && charId && charUsesMeleeDash(charId) && meleeOpts?.enemyUid
      && delivery === 'melee';
    if (useMeleeEngage) {
      this.melee.triggerAttack(
        slot,
        charId,
        meleeOpts.enemyUid!,
        attackKey ?? null,
        meleeOpts.motionPool ?? ['attack01'],
        isSkill,
      );
    } else if (delivery === 'projectile') {
      let duration = partyStrikeDuration(isSkill, false, skillCrit, 'projectile', tier);
      const element = skill?.element ?? (charId === 'huchu' ? 'fire' : 'none');
      const defPreview = charId ? this.resolveProjectileDef(charId, element, attackKey) : null;
      if (defPreview) {
        const spawn = this.projectileSpawnDelay(defPreview.kind, charId);
        const flight = defPreview.kind === 'arrow' ? 0.32 : 0.36 + tier * 0.02;
        duration = Math.max(duration, spawn + flight + 0.06);
      }
      this.partyStrike = {
        slot,
        elapsed: 0,
        duration,
        crit: skillCrit,
        advance: false,
        delivery: 'projectile',
        isSkill,
        attackKey: attackKey ?? null,
        skillElement: skill?.element,
        powerTier: tier,
      };
    } else if (advance || !charId || !charUsesProjectile(charId)) {
      const duration = partyStrikeDuration(isSkill, advance, skillCrit, delivery, tier);

      this.partyStrike = {
        slot,
        elapsed: 0,
        duration,
        crit: skillCrit,
        advance,
        delivery,
        isSkill,
        attackKey: attackKey ?? null,
        skillElement: skill?.element,
        powerTier: tier,
      };
    } else {
      let duration = partyStrikeDuration(isSkill, false, skillCrit, 'projectile', tier);
      this.partyStrike = {
        slot,
        elapsed: 0,
        duration,
        crit: skillCrit,
        advance: false,
        delivery: 'projectile',
        isSkill,
        attackKey: attackKey ?? null,
        skillElement: skill?.element,
        powerTier: tier,
      };
    }

    if (!isSupportSkill) {
      const knockBase = advance ? (skillCrit ? 18 : 9) : (skillCrit ? 8 : 3);
      if (isProjectileOffense && charId) {
        const element = skill?.element ?? (charId === 'huchu' ? 'fire' : 'none');
        const def = this.resolveProjectileDef(charId, element, attackKey);
        if (def) {
          if (!this.perfLite) preloadKeyedFrames([...def.flightFrames, ...def.impactFrames]);
          this.pushProjectile(def, {
            sourceSide: 'party',
            sourceSlot: slot,
            targetKind: 'enemy',
            targetEnemySlot,
            targetPartySlot: slot,
            crit: skillCrit,
            tier,
            element,
            charId,
            attackKey: attackKey ?? null,
            impactPayload: {
              hitX, hitY, crit: skillCrit, isSkill, tierBoost, prestigeLevel, advance,
              knock: knockBase * tierBoost,
            },
          });
        }
      } else {
        this.fireEnemyHit(
          targetEnemySlot, hitX, hitY, skillCrit, isSkill, tier, tierBoost, prestigeLevel, advance,
        );
      }
    }
  }

  onPartyHit(slot: number) {
    this.partyFlash = { slot, elapsed: 0, duration: 0.2 };
  }

  onMonsterAttack(visualSlot: number, monId?: string, targetPartySlot = 0) {
    this.enemyStrikes[visualSlot] = { elapsed: 0, duration: 0.32 };
    this.enemyAttackFlashes[visualSlot] = { elapsed: 0, duration: 0.14 };
    if (monId) {
      const def = resolveMonsterProjectile(monId);
      if (def) {
        preloadKeyedFrames(def.flightFrames);
        this.pushProjectile(def, {
          sourceSide: 'enemy',
          sourceSlot: visualSlot,
          targetKind: 'ally',
          targetEnemySlot: 0,
          targetPartySlot,
          crit: false,
          tier: 0,
          element: 'none',
        });
      }
    }
  }

  getEnemyStrikeProgress(visualSlot = 0): number {
    const v = this.enemyStrikes[visualSlot];
    if (!v) return 0;
    return Math.min(1, v.elapsed / v.duration);
  }

  getEnemyAttackFlash(visualSlot: number): number {
    return this.getFlashAlpha(this.enemyAttackFlashes[visualSlot] ?? null);
  }

  /** 몬스터가 파티 쪽으로 살짝 전진 */
  getEnemyStrikeOffset(progress: number, distance: number): number {
    if (progress <= 0) return 0;
    if (progress < 0.45) {
      const t = progress / 0.45;
      return -distance * (1 - (1 - t) ** 3);
    }
    const t = (progress - 0.45) / 0.55;
    return -distance * (1 - t) ** 2;
  }

  getMeleeEnemyUid(slot: number): string | null {
    return this.melee.getEnemyUid(slot);
  }

  getMeleeVisual(slot: number, dashMaxDist: number): MeleeEngageVisual | null {
    return this.melee.getVisual(slot, dashMaxDist);
  }

  isMeleeAttached(slot: number): boolean {
    return this.melee.isAttached(slot);
  }

  hasMeleeEngagement(slot: number): boolean {
    return this.melee.hasEngagement(slot);
  }

  releaseMeleeOnEnemy(enemyUid: string) {
    this.melee.releaseOnEnemy(enemyUid);
  }

  handoffMeleeDeadEnemy(deadUid: string) {
    this.melee.handoffDeadEnemy(deadUid);
  }

  retreatAllMelee() {
    this.melee.retreatAll();
  }

  clearMeleeEngage() {
    this.melee.clear();
  }

  setSkillChargeSlot(
    slot: number,
    ratio: number,
    color: string,
    meta?: { label?: string; icon?: string },
  ) {
    if (ratio <= 0.001) {
      delete this.skillChargeSlots[slot];
      return;
    }
    this.skillChargeSlots[slot] = { ratio, color, ...meta };
  }

  getSkillChargeSlot(slot: number) {
    return this.skillChargeSlots[slot];
  }

  clearSkillChargeSlots() {
    this.skillChargeSlots = {};
  }

  getStrikeProgress(): number {
    if (!this.partyStrike) return 0;
    return Math.min(1, this.partyStrike.elapsed / this.partyStrike.duration);
  }

  /** 원거리 공격 — 제자리 사격 (전진 lean 없음) */
  getRangedAttackLean(_slot: number, _spriteW: number): number {
    return 0;
  }

  /** 투사체 발사 타이밍의 공격 진행도 (0~1) */
  getProjectileReleaseProg(slot: number, spawnDelay: number): number {
    const strike = this.partyStrike;
    if (!strike || strike.slot !== slot) return 0.52;
    const dur = Math.max(0.12, strike.duration);
    const atSpawn = Math.min(1, spawnDelay / dur);
    let prog = 0.22 + atSpawn * 0.58;
    const key = strike.attackKey ?? '';
    if (key.includes('03') || key.includes('3')) prog = Math.min(1, prog + 0.1);
    return prog;
  }

  /** 0→전진→복귀 (근접만) */
  getStrikeOffset(progress: number, distance: number): number {
    if (!this.partyStrike?.advance) return 0;
    if (progress <= 0) return 0;
    if (progress < 0.42) {
      const t = progress / 0.42;
      return distance * (1 - (1 - t) ** 3);
    }
    const t = (progress - 0.42) / 0.58;
    return distance * (1 - t) ** 2;
  }

  getFlashAlpha(vfx: FlashVfx | null): number {
    if (!vfx) return 0;
    const p = vfx.elapsed / vfx.duration;
    if (p >= 1) return 0;
    const peak = vfx.crit ? 0.9 : 0.7;
    return peak * (1 - p) ** 1.6;
  }

  onCritShake() {
    if (this.perfLite) return;
    this.screenShake = Math.max(this.screenShake, 0.42);
  }

  onHealPulse(slot: number) {
    this.healPulse = { slot, elapsed: 0, duration: 0.55 };
  }

  onCombatHeal(healerSlot: number, targetSlots: number[], healerCharId?: string) {
    this.healPulse = { slot: healerSlot, elapsed: 0, duration: 0.65 };
    this.healerCastFlash = { slot: healerSlot, elapsed: 0, duration: 0.75 };
    const slots = targetSlots.length ? targetSlots : [healerSlot];
    for (const slot of slots) {
      this.healTargetFlashes[slot] = { elapsed: 0, duration: 0.9, crit: false };
    }
    if (healerCharId === 'yujin') {
      const def = resolveCombatProjectile('yujin', 'none', { heal: true });
      if (def) {
        preloadKeyedFrames(def.flightFrames);
        for (const tSlot of slots) {
          this.pushProjectile(def, {
            sourceSide: 'party',
            sourceSlot: healerSlot,
            targetKind: 'ally',
            targetEnemySlot: 0,
            targetPartySlot: tSlot,
            crit: false,
            tier: 0,
            element: 'none',
            charId: 'yujin',
          });
        }
      }
    }
  }

  onShieldFlash(slot: number) {
    this.shieldFlash = { slot, elapsed: 0, duration: 0.5 };
  }

  onPartyStatusFlash(slot: number, spec: StatusVfxSpec) {
    this.partyStatusFlashes[slot] = {
      elapsed: 0,
      duration: spec.duration,
      color: spec.color,
      glow: spec.glow,
      ring: spec.ring,
      particle: spec.particle,
    };
  }

  onEnemyStatusFlash(slot: number, spec: StatusVfxSpec) {
    this.enemyStatusFlashes[slot] = {
      elapsed: 0,
      duration: spec.duration,
      color: spec.color,
      glow: spec.glow,
      ring: spec.ring,
      particle: spec.particle,
    };
  }

  getPartyStatusFlash(slot: number): StatusFlashVfx | null {
    const v = this.partyStatusFlashes[slot];
    if (!v) return null;
    if (v.elapsed >= v.duration) return null;
    return v;
  }

  getEnemyStatusFlash(slot: number): StatusFlashVfx | null {
    const v = this.enemyStatusFlashes[slot];
    if (!v) return null;
    if (v.elapsed >= v.duration) return null;
    return v;
  }

  getStatusFlashAlpha(v: StatusFlashVfx | null): number {
    if (!v) return 0;
    const p = v.elapsed / v.duration;
    if (p >= 1) return 0;
    if (v.ring === 'debuff_shock') return 0.95 * (1 - p) ** 1.1;
    if (v.ring === 'debuff_dot') return 0.88 * (1 - p) ** 1.35;
    return 0.82 * (1 - p) ** 1.25;
  }

  getShieldFlash(slot: number): number {
    if (!this.shieldFlash || this.shieldFlash.slot !== slot) return 0;
    const p = this.shieldFlash.elapsed / this.shieldFlash.duration;
    if (p >= 1) return 0;
    return 0.9 * (1 - p) ** 1.2;
  }

  getHealTargetFlash(slot: number): number {
    const v = this.healTargetFlashes[slot];
    if (!v) return 0;
    return this.getFlashAlpha(v);
  }

  getHealerCastFlash(slot: number): number {
    if (!this.healerCastFlash || this.healerCastFlash.slot !== slot) return 0;
    const p = this.healerCastFlash.elapsed / this.healerCastFlash.duration;
    if (p >= 1) return 0;
    return 0.85 * (1 - p) ** 1.4;
  }

  getHealPulseFlash(slot: number): number {
    if (!this.healPulse || this.healPulse.slot !== slot) return 0;
    const p = this.healPulse.elapsed / this.healPulse.duration;
    if (p >= 1) return 0;
    return 0.75 * (1 - p) ** 1.5;
  }
}
