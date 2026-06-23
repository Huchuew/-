import type { GameSave, MonsterDef } from '../types';
import { CHAR_MAP } from '../data/characters';
import { MATERIAL_LABELS } from '../data/equipment';
import { getActivePartyIds, ROSTER_PASSIVE_MAP } from '../data/rosterPassives';
import { addMaterial } from './EquipmentSystem';
import { creditPendingHuntGold } from './LodgingEconomySystem';
import { isCharIncapacitated } from './CharacterStatusSystem';
import { persistPartyModifier } from './partyExpeditionMods';
import { getCharMaxHp } from './RestHealingSystem';

export interface RosterProcResult {
  charId: string;
  charName: string;
  procName: string;
  text: string;
  color: string;
  goldBonus?: number;
  expBonus?: number;
  healBonus?: number;
}

function applyBuffProc(
  save: GameSave,
  charId: string,
  procId: string,
  procName: string,
  sourceName: string,
  duration: number,
  mult: { atkMult?: number; defMult?: number; spdMult?: number },
  desc: string,
) {
  for (const pid of save.party) {
    persistPartyModifier(save, pid, {
      id: `${procId}_${charId}`,
      name: procName,
      kind: 'buff',
      icon: '✨',
      duration,
      elapsed: 0,
      desc,
      sourceName,
      ...mult,
    });
  }
}

export function tryRosterProcsOnKill(
  save: GameSave,
  mon: MonsterDef,
  baseGold: number,
  baseExp: number,
): RosterProcResult[] {
  const active = getActivePartyIds(save);
  const results: RosterProcResult[] = [];

  for (const charId of save.owned) {
    if (!active.has(charId)) continue;
    const passive = ROSTER_PASSIVE_MAP[charId];
    const proc = passive?.partyProc;
    if (!proc || Math.random() >= proc.chance) continue;

    const charName = CHAR_MAP[charId]?.name ?? charId;
    const power = proc.power ?? 0.1;
    const duration = proc.duration ?? 5;

    switch (proc.kind) {
      case 'healParty': {
        let healTotal = 0;
        for (const pid of save.party) {
          if (isCharIncapacitated(save, pid)) continue;
          const max = getCharMaxHp(save, pid);
          const prev = save.combatHp[pid] ?? max;
          if (prev <= 0) continue;
          const heal = Math.max(1, Math.floor(max * power));
          save.combatHp[pid] = Math.min(max, prev + heal);
          healTotal += save.combatHp[pid]! - prev;
        }
        results.push({
          charId, charName, procName: proc.name,
          text: `${proc.name}!`, color: '#88ffaa',
          healBonus: healTotal,
        });
        break;
      }
      case 'goldBurst': {
        const bonus = Math.max(1, Math.floor(baseGold * power));
        creditPendingHuntGold(save, bonus);
        results.push({
          charId, charName, procName: proc.name,
          text: `+${bonus}🪙`, color: '#ffdd66', goldBonus: bonus,
        });
        break;
      }
      case 'expBurst': {
        const bonus = Math.max(1, Math.floor(baseExp * power));
        results.push({
          charId, charName, procName: proc.name,
          text: `EXP+${bonus}`, color: '#aaddff', expBonus: bonus,
        });
        break;
      }
      case 'atkBuff':
        applyBuffProc(save, charId, proc.id, proc.name, charName, duration,
          { atkMult: 1 + power }, proc.desc);
        results.push({ charId, charName, procName: proc.name, text: proc.name, color: '#ffaa66' });
        break;
      case 'spdBuff':
        applyBuffProc(save, charId, proc.id, proc.name, charName, duration,
          { spdMult: 1 + power }, proc.desc);
        results.push({ charId, charName, procName: proc.name, text: proc.name, color: '#88ccff' });
        break;
      case 'critBuff':
        applyBuffProc(save, charId, proc.id, proc.name, charName, duration,
          { atkMult: 1 + power * 0.5, spdMult: 1 + power * 0.3 }, proc.desc);
        results.push({ charId, charName, procName: proc.name, text: proc.name, color: '#ff88dd' });
        break;
      case 'shieldPulse':
        applyBuffProc(save, charId, proc.id, proc.name, charName, duration,
          { defMult: 1 + power }, proc.desc);
        results.push({ charId, charName, procName: proc.name, text: proc.name, color: '#aaccff' });
        break;
      case 'gemDrop':
        save.gems += 1;
        results.push({ charId, charName, procName: proc.name, text: '💎+1', color: '#e8a8ff' });
        break;
      case 'materialDrop': {
        const mats = ['iron_ore', 'wood_chip', 'magic_dust'];
        const mat = mats[Math.floor(Math.random() * mats.length)]!;
        addMaterial(save, mat, 1);
        results.push({
          charId, charName, procName: proc.name,
          text: MATERIAL_LABELS[mat] ?? mat, color: '#ccff88',
        });
        break;
      }
      default:
        break;
    }
    void mon;
  }
  return results;
}

export function tryRosterProcsOnHit(save: GameSave): RosterProcResult[] {
  const active = getActivePartyIds(save);
  const results: RosterProcResult[] = [];
  for (const charId of save.owned) {
    if (!active.has(charId)) continue;
    const proc = ROSTER_PASSIVE_MAP[charId]?.partyProc;
    if (!proc || proc.kind !== 'shieldPulse') continue;
    if (Math.random() >= proc.chance * 0.35) continue;
    const charName = CHAR_MAP[charId]?.name ?? charId;
    const power = proc.power ?? 0.15;
    const duration = proc.duration ?? 5;
    applyBuffProc(save, charId, `${proc.id}_hit`, proc.name, charName, duration,
      { defMult: 1 + power }, proc.desc);
    results.push({
      charId, charName, procName: proc.name,
      text: `${proc.name}`, color: '#aaccff',
    });
  }
  return results;
}
