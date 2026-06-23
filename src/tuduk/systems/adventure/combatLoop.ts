import type { AdventurePhase, CombatEntity, GameSave } from '../../types';
import { markEntityKnockdown } from '../../data/tinyRpgAnim';
import { syncCombatHp } from '../CombatSystem';
import { tickCombatModifiers } from '../monsterDebuffs';
import {
  mergeExpeditionModifiers, syncEntityModifiersToSave, tickExpeditionModifiers,
} from '../partyExpeditionMods';
import { getCharDieFrameCount, tickEntityDieAnim } from '../../data/tinyRpgAnim';

export function isActiveCombatPhase(phase: AdventurePhase): boolean {
  return phase === 'combat' || phase === 'boss';
}

export function isCombatBlockedPhase(phase: AdventurePhase): boolean {
  return phase === 'combat' || phase === 'boss' || phase === 'encounter';
}

export interface CombatModifierSink {
  onDamageTaken(charId: string, amount: number): void;
  onFloatText(x: number, y: number, text: string, color: string): void;
}

/** 파티 디버프·도트 틱 (전투 중) */
export function tickPartyCombatModifiers(
  party: CombatEntity[],
  save: GameSave,
  dt: number,
  sink: CombatModifierSink,
): void {
  for (const p of party) {
    if (p.hp <= 0) continue;
    const prevHp = p.hp;
    for (const ev of tickCombatModifiers(p, dt)) {
      sink.onDamageTaken(p.id, ev.damage);
      sink.onFloatText(0.28, 0.5, ev.text, '#aa66cc');
    }
    markEntityKnockdown(p, prevHp);
    syncEntityModifiersToSave(save, p);
  }
  syncCombatHp(save, party);
}

/** 원정 중 디버프 틱 (이동·전투 공통) */
export function tickExpeditionCombatModifiers(
  save: GameSave,
  party: CombatEntity[],
  partyIds: string[],
  dt: number,
  inCombat: boolean,
  sink: CombatModifierSink,
): void {
  for (const ev of tickExpeditionModifiers(save, partyIds, dt, inCombat)) {
    sink.onDamageTaken(ev.charId, ev.damage);
    sink.onFloatText(0.28, 0.62, ev.text, '#aa66cc');
  }
}

export function applySaveHpToParty(party: CombatEntity[], save: GameSave): void {
  if (!party.length) return;
  for (const p of party) {
    const saved = save.combatHp?.[p.id];
    if (saved != null) p.hp = Math.min(saved, p.maxHp);
  }
}

export function mergePartyExpeditionModifiers(party: CombatEntity[], save: GameSave): void {
  for (const p of party) mergeExpeditionModifiers(save, p);
}

export function tickPartyDeathAnims(party: CombatEntity[], dt: number): void {
  for (const p of party) {
    if (p.hp > 0) continue;
    tickEntityDieAnim(p, dt, getCharDieFrameCount(p.id));
  }
}
