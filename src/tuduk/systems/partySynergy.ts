import type { GameSave } from '../types';
import { CHAR_MAP } from '../data/characters';
import { getRoleCompositionBonus } from '../data/roleBalance';
import {
  CHAR_TRAITS, computeBondBonuses, computeTraitSynergyFromSave,
  getCharTraitLabels, formatTraitSynergyDetail, TRAIT_DEFS,
} from '../data/traitSynergy';

export interface PartySynergyBonus {
  atkMult: number;
  defMult: number;
  hpMult: number;
  atkSpdMult: number;
  critBonus: number;
  healMult: number;
  lines: string[];
  traitHud: string;
}

export function computePartySynergy(save: GameSave): PartySynergyBonus {
  const partyIds = save.party.filter(id => CHAR_MAP[id]);
  const traits = computeTraitSynergyFromSave(save);
  const bonds = computeBondBonuses(partyIds);

  const bonus: PartySynergyBonus = {
    atkMult: traits.atkMult + bonds.atk,
    defMult: traits.defMult + bonds.def,
    hpMult: traits.hpMult + bonds.hp,
    atkSpdMult: traits.atkSpdMult + bonds.atkSpd,
    critBonus: traits.critBonus + bonds.crit,
    healMult: traits.healMult + bonds.heal,
    lines: [...traits.lines, ...bonds.lines.map(l => `✨ ${l}`)],
    traitHud: traits.active.length
      ? traits.active.slice(0, 5).map(a => `${a.def.icon}${a.def.name}(${a.count})`).join(' · ')
      : '',
  };

  const roleBonus = getRoleCompositionBonus(save);
  bonus.atkMult *= roleBonus.atkMult;
  bonus.defMult *= roleBonus.defMult;
  bonus.hpMult *= roleBonus.hpMult;
  bonus.lines.push(...roleBonus.lines);

  return bonus;
}

export function formatPartySynergy(save: GameSave): string {
  const b = computePartySynergy(save);
  if (b.traitHud) return b.traitHud;
  if (b.lines.length === 0) return '특성 시너지 없음 — 조합을 맞춰보세요';
  return b.lines.slice(0, 4).join(' · ');
}

export function formatPartySynergyFull(save: GameSave): string {
  const b = computePartySynergy(save);
  if (!b.lines.length) return '활성 시너지 없음';
  return b.lines.join(' · ');
}

export function getSynergyCharTip(charId: string): string | null {
  const labels = getCharTraitLabels(charId);
  if (!labels.length) return null;
  return `특성: ${labels.join(', ')}`;
}

export { formatTraitSynergyDetail, getCharTraitLabels, CHAR_TRAITS, TRAIT_DEFS };
