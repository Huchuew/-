/**
 * 근접 교전 VFX — 돌진 → 적에게 붙어 연속 공격 → 웨이브 종료 시에만 복귀
 */
import { charUsesMeleeDash } from '../data/characters';

const APPROACH_SEC = 0.52;
const RETREAT_SEC = 0.42;
const SWING_NORMAL_SEC = 0.78;
const SWING_SKILL_SEC = 0.98;

/** SFX 타이밍 연동용 */
export const MELEE_APPROACH_SEC = APPROACH_SEC;
export const MELEE_SWING_NORMAL_SEC = SWING_NORMAL_SEC;
export const MELEE_SWING_SKILL_SEC = SWING_SKILL_SEC;
export const MELEE_SWING_HIT_RATIO = 0.36;

export type MeleePhase = 'approach' | 'engaged' | 'swing' | 'retreat';

export interface PendingMeleeSwing {
  attackKey: string | null;
  isSkill: boolean;
}

export interface MeleeEngageState {
  charId: string;
  enemyUid: string;
  phase: MeleePhase;
  phaseElapsed: number;
  engageT: number;
  swingKey: string | null;
  swingElapsed: number;
  swingDuration: number;
  motionPool: string[];
  cycleIndex: number;
  pendingSwing: PendingMeleeSwing | null;
}

export interface MeleeEngageVisual {
  offsetX: number;
  swingProg: number;
  attackKey: string | null;
  meleeEngaged: boolean;
  isSwinging: boolean;
  dashSlot: number | null;
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeIn(t: number): number {
  return t ** 2;
}

function pickPoolKey(pool: string[], cycle: number, override: string | null): string | null {
  if (override && pool.includes(override)) return override;
  if (!pool.length) return override;
  return pool[cycle % pool.length] ?? pool[0] ?? null;
}

export class MeleeEngageManager {
  private engage: Record<number, MeleeEngageState> = {};

  clear() {
    this.engage = {};
  }

  /** 웨이브 종료 — 전원 후퇴 */
  retreatAll() {
    for (const key of Object.keys(this.engage)) {
      const slot = Number(key);
      const e = this.engage[slot]!;
      if (e.phase === 'retreat') continue;
      e.phase = 'retreat';
      e.phaseElapsed = 0;
      e.pendingSwing = null;
    }
  }

  /** 적 처치 — 웨이브 내 잔존 적이 있으면 붙은 채 유지 */
  handoffDeadEnemy(deadUid: string) {
    for (const key of Object.keys(this.engage)) {
      const slot = Number(key);
      const e = this.engage[slot]!;
      if (e.enemyUid !== deadUid) continue;
      e.enemyUid = '';
      e.phase = 'engaged';
      e.phaseElapsed = 0;
      e.engageT = 1;
      e.pendingSwing = null;
      e.swingKey = null;
      e.swingElapsed = 0;
    }
  }

  /** @deprecated 웨이브 종료 시 retreatAll 사용 */
  releaseOnEnemy(enemyUid: string) {
    for (const key of Object.keys(this.engage)) {
      const slot = Number(key);
      const e = this.engage[slot]!;
      if (e.enemyUid !== enemyUid && e.enemyUid !== '') continue;
      if (e.phase === 'retreat') continue;
      e.phase = 'retreat';
      e.phaseElapsed = 0;
      e.pendingSwing = null;
    }
  }

  /** 근접 공격 1히트 — 교전 상태 갱신 */
  triggerAttack(
    slot: number,
    charId: string,
    enemyUid: string,
    attackKey: string | null,
    motionPool: string[],
    isSkill: boolean,
  ) {
    if (!charUsesMeleeDash(charId)) return;

    let e = this.engage[slot];
    const swing: PendingMeleeSwing = { attackKey, isSkill };

    if (e && e.enemyUid !== enemyUid) {
      e.enemyUid = enemyUid;
      e.charId = charId;
      e.motionPool = motionPool.length ? motionPool : e.motionPool;
      if (e.phase === 'retreat') {
        e.phase = 'engaged';
        e.phaseElapsed = 0;
        e.engageT = 1;
      }
      if (e.phase === 'approach') {
        e.pendingSwing = swing;
        return;
      }
      if (e.phase === 'engaged') {
        this.startSwing(e, swing);
        return;
      }
      if (e.phase === 'swing') {
        e.pendingSwing = swing;
        return;
      }
    }

    if (!e) {
      this.engage[slot] = {
        charId,
        enemyUid,
        phase: 'approach',
        phaseElapsed: 0,
        engageT: 0,
        swingKey: null,
        swingElapsed: 0,
        swingDuration: SWING_NORMAL_SEC,
        motionPool: motionPool.length ? motionPool : ['attack01'],
        cycleIndex: 0,
        pendingSwing: swing,
      };
      return;
    }

    e.charId = charId;
    e.enemyUid = enemyUid;
    e.motionPool = motionPool.length ? motionPool : e.motionPool;

    if (e.phase === 'approach') {
      e.pendingSwing = swing;
      return;
    }
    if (e.phase === 'retreat') {
      this.engage[slot] = {
        charId,
        enemyUid,
        phase: 'approach',
        phaseElapsed: 0,
        engageT: Math.max(0, e.engageT * 0.15),
        swingKey: null,
        swingElapsed: 0,
        swingDuration: SWING_NORMAL_SEC,
        motionPool: motionPool.length ? motionPool : ['attack01'],
        cycleIndex: 0,
        pendingSwing: swing,
      };
      return;
    }

    this.startSwing(e, swing);
  }

  private startSwing(e: MeleeEngageState, swing: PendingMeleeSwing) {
    const key = pickPoolKey(e.motionPool, e.cycleIndex, swing.attackKey);
    e.cycleIndex += 1;
    e.phase = 'swing';
    e.phaseElapsed = 0;
    e.swingKey = key;
    e.swingElapsed = 0;
    e.swingDuration = swing.isSkill ? SWING_SKILL_SEC : SWING_NORMAL_SEC;
    e.pendingSwing = null;
    e.engageT = 1;
  }

  update(dt: number) {
    for (const key of Object.keys(this.engage)) {
      const slot = Number(key);
      const e = this.engage[slot]!;
      e.phaseElapsed += dt;

      switch (e.phase) {
        case 'approach': {
          const t = Math.min(1, e.phaseElapsed / APPROACH_SEC);
          e.engageT = easeOut(t);
          if (e.phaseElapsed >= APPROACH_SEC) {
            e.phase = 'engaged';
            e.phaseElapsed = 0;
            e.engageT = 1;
            if (e.pendingSwing) this.startSwing(e, e.pendingSwing);
          }
          break;
        }
        case 'swing': {
          e.swingElapsed += dt;
          if (e.swingElapsed >= e.swingDuration) {
            e.phase = 'engaged';
            e.phaseElapsed = 0;
            e.swingElapsed = 0;
            if (e.pendingSwing) this.startSwing(e, e.pendingSwing);
          }
          break;
        }
        case 'engaged':
          e.engageT = 1;
          break;
        case 'retreat': {
          const t = Math.min(1, e.phaseElapsed / RETREAT_SEC);
          e.engageT = 1 - easeIn(t);
          if (e.phaseElapsed >= RETREAT_SEC) {
            delete this.engage[slot];
          }
          break;
        }
      }
    }
  }

  getEnemyUid(slot: number): string | null {
    const uid = this.engage[slot]?.enemyUid;
    return uid || null;
  }

  getVisual(slot: number, dashMaxDist: number): MeleeEngageVisual | null {
    const e = this.engage[slot];
    if (!e || e.engageT <= 0.01) return null;

    const isSwinging = e.phase === 'swing';
    const swingProg = isSwinging
      ? Math.min(1, e.swingElapsed / Math.max(0.01, e.swingDuration))
      : 0;
    const engaged = e.phase === 'engaged' || e.phase === 'swing';

    return {
      offsetX: Math.round(e.engageT * dashMaxDist),
      swingProg,
      attackKey: isSwinging
        ? e.swingKey
        : (e.phase === 'engaged' ? (e.motionPool[e.cycleIndex % e.motionPool.length] ?? 'attack01') : null),
      meleeEngaged: engaged,
      isSwinging,
      dashSlot: e.phase !== 'retreat' ? slot : null,
    };
  }

  isEngagedOnEnemy(slot: number, enemyUid: string): boolean {
    const e = this.engage[slot];
    return !!e && e.enemyUid === enemyUid && (e.phase === 'engaged' || e.phase === 'swing');
  }

  /** 적에게 붙은 상태(교전·스윙) — 원거리 스킬 차단용 */
  isAttached(slot: number): boolean {
    const e = this.engage[slot];
    return !!e && (e.phase === 'engaged' || e.phase === 'swing');
  }

  /** 돌진·교전 중(후퇴 제외) — 원거리 선봉 차단용 */
  hasEngagement(slot: number): boolean {
    const e = this.engage[slot];
    return !!e && e.phase !== 'retreat';
  }
}
