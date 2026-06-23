import type { GameSave } from '../../types';
import { CHAR_MAP } from '../../data/characters';
import { getActiveBonds, getBondPartyBonusSummary } from '../../data/traitSynergy';

export function renderBondSynergyBlock(save: GameSave): string {
  const partyIds = save.party.filter(id => CHAR_MAP[id]);
  if (!partyIds.length) return '';

  const active = getActiveBonds(partyIds);
  if (!active.length) return '';

  const bonusBits = getBondPartyBonusSummary(partyIds);

  const activeHtml = active.map(b => `<li class="bond-row bond-row--active">
      <span class="bond-icon">${b.icon}</span>
      <span class="bond-copy">
        <strong>${b.name}</strong>
        <span class="bond-members">${b.members}</span>
        <span class="bond-effect">${b.effect}</span>
      </span>
    </li>`).join('');

  return `<section class="bond-synergy-block" aria-label="인연 시너지">
    <header class="bond-synergy-head">
      <strong>🤝 인연 시너지</strong>
      ${bonusBits.length ? `<span class="bond-bonus-pill">${bonusBits.join(' · ')}</span>` : ''}
    </header>
    <ul class="bond-list">${activeHtml}</ul>
  </section>`;
}
