import type { EncounterSlot } from '../types';

export interface BossPhaseEvent {
  message: string;
  color: string;
  phase: number;
}

/** HP 비율에 따른 보스 페이즈 — 반환 시 이벤트 메시지 */
export function checkBossPhase(slot: EncounterSlot, prevHpRatio: number): BossPhaseEvent | null {
  const { entity, def } = slot;
  if (!def.isBoss && !entity.id.includes('boss')) return null;
  const ratio = entity.hp / entity.maxHp;
  const phase = slot.bossPhase ?? 0;

  if (phase < 1 && ratio <= 0.7 && prevHpRatio > 0.7) {
    slot.bossPhase = 1;
    entity.atk = Math.floor(entity.atk * 1.15);
    entity.atkSpd *= 1.1;
    return { message: '⚔️ 2페이즈 — 공격 강화!', color: '#ffaa44', phase: 1 };
  }
  if (phase < 2 && ratio <= 0.4 && prevHpRatio > 0.4) {
    slot.bossPhase = 2;
    entity.atkSpd *= 1.15;
    return { message: '🌀 3페이즈 — 연속 공격!', color: '#ff8844', phase: 2 };
  }
  if (phase < 3 && ratio <= 0.15 && prevHpRatio > 0.15) {
    slot.bossPhase = 3;
    entity.enraged = true;
    entity.atk = Math.floor(entity.atk * 1.35);
    entity.atkSpd *= 1.2;
    if (entity.bossShield != null && entity.bossShield <= 0) {
      entity.bossShield = Math.floor(entity.maxHp * 0.05);
    }
    return { message: '💀 최종 분노 — 방패 재생!', color: '#ff4444', phase: 3 };
  }
  return null;
}

/** 보스 2페이즈 이상 시 추가 몹 소환 여부 */
export function shouldSummonAdds(slot: EncounterSlot): boolean {
  return (slot.bossPhase ?? 0) >= 2 && slot.entity.hp > 0;
}
