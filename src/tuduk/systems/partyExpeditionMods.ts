import type { CombatEntity, GameSave, TimedCombatEffect } from '../types';
import { getCharMaxHp } from './RestHealingSystem';
import { tickCombatModifiers } from './monsterDebuffs';

export function ensureExpeditionState(save: GameSave) {
  if (!save.expeditionModifiers) save.expeditionModifiers = {};
  if (!save.expeditionBossGate) save.expeditionBossGate = {};
}

export function clearExpeditionRunState(save: GameSave) {
  save.expeditionModifiers = {};
  save.expeditionBossGate = {};
}

export function isEpicClearedForFloor(save: GameSave, regionId: number): boolean {
  return !!save.expeditionBossGate?.[regionId]?.epicCleared;
}

export function markEpicCleared(save: GameSave, regionId: number) {
  ensureExpeditionState(save);
  save.expeditionBossGate![regionId] = { epicCleared: true };
}

export function getPersistedModifiers(save: GameSave, charId: string): TimedCombatEffect[] {
  ensureExpeditionState(save);
  return save.expeditionModifiers![charId] ?? [];
}

export function removePersistedModifier(
  save: GameSave,
  charId: string,
  modId: string,
  kind: 'buff' | 'debuff',
) {
  ensureExpeditionState(save);
  const list = save.expeditionModifiers![charId];
  if (!list?.length) return;
  save.expeditionModifiers![charId] = list.filter(m => !(m.id === modId && m.kind === kind));
  if (!save.expeditionModifiers![charId]!.length) delete save.expeditionModifiers![charId];
}

export function persistPartyModifier(save: GameSave, charId: string, effect: TimedCombatEffect) {
  ensureExpeditionState(save);
  const list = [...(save.expeditionModifiers![charId] ?? [])];
  const existing = list.find(m => m.id === effect.id && m.kind === effect.kind);
  if (existing) {
    existing.duration = Math.max(existing.duration, effect.duration);
    existing.elapsed = 0;
    existing.atkMult = effect.atkMult ?? existing.atkMult;
    existing.defMult = effect.defMult ?? existing.defMult;
    existing.spdMult = effect.spdMult ?? existing.spdMult;
    existing.damagePerTick = effect.damagePerTick ?? existing.damagePerTick;
    existing.tickInterval = effect.tickInterval ?? existing.tickInterval;
    existing.desc = effect.desc;
    existing.sourceName = effect.sourceName;
    if (!existing.appliedAt) existing.appliedAt = Date.now();
  } else {
    list.push({ ...effect, elapsed: effect.elapsed ?? 0, appliedAt: effect.appliedAt ?? Date.now() });
  }
  save.expeditionModifiers![charId] = list.filter((m, i, arr) =>
    arr.findIndex(x => x.id === m.id && x.kind === m.kind) === i,
  );
}

export function cloneModifiers(mods: TimedCombatEffect[]): TimedCombatEffect[] {
  return mods.map(m => ({ ...m, tickElapsed: m.tickElapsed ?? 0 }));
}

export function mergeExpeditionModifiers(save: GameSave, entity: CombatEntity) {
  const persisted = getPersistedModifiers(save, entity.id);
  if (!persisted.length) return;
  entity.combatModifiers = cloneModifiers(persisted);
}

export function syncEntityModifiersToSave(save: GameSave, entity: CombatEntity) {
  if (!entity.combatModifiers?.length) {
    if (save.expeditionModifiers?.[entity.id]) {
      save.expeditionModifiers[entity.id] = save.expeditionModifiers[entity.id]!
        .filter(m => m.elapsed < m.duration);
      if (!save.expeditionModifiers[entity.id]!.length) {
        delete save.expeditionModifiers[entity.id];
      }
    }
    return;
  }
  ensureExpeditionState(save);
  save.expeditionModifiers![entity.id] = entity.combatModifiers.map(m => ({ ...m }));
}

export interface ExpeditionModTickEvent {
  charId: string;
  damage: number;
  text: string;
}

/** 이동·루트 구간 — 디버프 도트·패널티 완화 */
export const FIELD_DEBUFF_MULT = 0.48;

/** 요리 버프 시 원정 디버프 1건 완화 */
export function softenExpeditionDebuffsOnCook(save: GameSave) {
  ensureExpeditionState(save);
  for (const id of save.party) {
    const mods = save.expeditionModifiers![id];
    if (!mods?.length) continue;
    mods.shift();
    if (!mods.length) delete save.expeditionModifiers![id];
  }
}

/** 원정 중(전투·이동) 지속 — 전투 종료해도 시간 만료까지 유지 */
export function tickExpeditionModifiers(
  save: GameSave,
  partyIds: string[],
  dt: number,
  inCombat = false,
): ExpeditionModTickEvent[] {
  const events: ExpeditionModTickEvent[] = [];
  ensureExpeditionState(save);

  for (const id of partyIds) {
    const mods = getPersistedModifiers(save, id);
    if (!mods.length) continue;

    const maxHp = getCharMaxHp(save, id);
    const proxy: CombatEntity = {
      id,
      name: id,
      hp: save.combatHp?.[id] ?? maxHp,
      maxHp,
      atk: 1,
      def: 1,
      mdef: 1,
      atkSpd: 1,
      critRate: 0,
      critMult: 1,
      color: '#fff',
      attackTimer: 0,
      isPlayer: true,
      aoe: false,
      aoeBonus: 0,
      pierce: false,
      berserk: false,
      combatModifiers: cloneModifiers(mods),
    };

    const fieldMult = inCombat ? 1 : FIELD_DEBUFF_MULT;
    for (const ev of tickCombatModifiers(proxy, dt)) {
      const dmg = Math.max(0, Math.floor(ev.damage * fieldMult));
      if (dmg > 0) {
        events.push({ charId: id, damage: dmg, text: ev.text });
      }
    }

    if (proxy.combatModifiers?.length) {
      save.expeditionModifiers![id] = proxy.combatModifiers;
    } else {
      delete save.expeditionModifiers![id];
    }

    if (save.combatHp && proxy.hp !== save.combatHp[id]) {
      save.combatHp[id] = Math.max(0, proxy.hp);
    }
  }

  return events;
}

export function getExpeditionModRemainingSec(save: GameSave, charId: string): number {
  const mods = getPersistedModifiers(save, charId);
  if (!mods.length) return 0;
  return Math.max(0, ...mods.map(m => Math.ceil(m.duration - m.elapsed)));
}
