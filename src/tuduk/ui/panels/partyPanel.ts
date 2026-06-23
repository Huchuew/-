import type { CookType, EquipRole } from '../../types';
import type { GameSave } from '../../types';
import { MAX_PARTY_SIZE } from '../../types';
import { CHARACTERS, CHAR_MAP } from '../../data/characters';
import { getPartyCompositionHint } from '../../data/partyComposition';
import type { AdventureSystem } from '../../systems/AdventureSystem';
import {
  canStartExpedition, formatIncapHint, hasPartyIncapacitated,
} from '../../systems/CharacterStatusSystem';
import {
  canCook, getCookRecipes, getCookRemainingSec, hasChef,
} from '../../systems/CookSystem';
import { renderBondSynergyBlock } from './bondSynergyBlock';
import { formatPartySynergyFull, getCharTraitLabels } from '../../systems/partySynergy';
import { isPartyFullyHealed } from '../../systems/RestHealingSystem';
import {
  canAssignSupport, computeCharStats, formatBufferSummary, getBufferContributions,
  getPartyDps, getPartyDpsBreakdown, getRegionAvgDef, isSupportChar,
} from '../../systems/StatCalculator';
import { getCharCurrentHp } from '../../systems/RestHealingSystem';
import { getFormationDisplayOrder } from '../../systems/FormationSystem';
import { formatStatNum } from '../../utils/formatStat';

const ROLE_TAG: Record<EquipRole, string> = {
  tank: '탱커', dps: '딜러', healer: '힐러', bruiser: '브루저', support: '서포트',
};

export interface PartyPanelHost {
  panelDetails(summary: string, body: string): string;
  dpsPanelOpen: boolean;
  renderExpeditionRunStatus(save: GameSave, adv: AdventureSystem): string;
  renderFloorTravelControls(save: GameSave, adv: AdventureSystem): string;
  renderFormationBlock(save: GameSave): string;
}

export function renderPartyMemberCard(
  save: GameSave,
  c: typeof CHARACTERS[number],
  opts: { inParty: boolean; canRemove: boolean },
): string {
  const st = save.chars[c.id]!;
  const stats = computeCharStats(c, st, save);
  const isSupport = save.supportSlot === c.id;
  const role = ROLE_TAG[c.equipRole] ?? c.jobLabel;
  const traits = getCharTraitLabels(c.id).slice(0, 2).join(' · ');
  const canJoin = !opts.inParty && save.party.length < MAX_PARTY_SIZE && !isSupport;
  const canSupport = isSupportChar(c.id) && (isSupport || canAssignSupport(save, c.id));
  const actions = [
    opts.inParty && opts.canRemove
      ? `<button class="btn-sm danger" data-action="remove" data-id="${c.id}" type="button">파티 제외</button>`
      : '',
    !opts.inParty && canJoin
      ? `<button class="btn-sm gold" data-action="add" data-id="${c.id}" type="button">파티 합류</button>`
      : '',
    isSupportChar(c.id)
      ? `<button class="btn-sm support" data-action="support" data-id="${c.id}" type="button" ${canSupport ? '' : 'disabled'} title="${canSupport ? '' : '전투원 1명 이상 남아야 서포트 가능'}">${isSupport ? '서포트 해제' : '서포트'}</button>`
      : '',
  ].filter(Boolean).join('');
  const incap = formatIncapHint(save, c.id);
  return `
    <div class="party-member-card${opts.inParty ? ' party-member-card--active' : ''}"
      style="--member-color:${c.color};--member-accent:${c.accent}">
      <div class="party-member-portrait-wrap">
        <canvas class="party-member-portrait" data-char-id="${c.id}" width="76" height="76" aria-hidden="true"></canvas>
        ${opts.inParty ? '<span class="party-member-badge">출전</span>' : ''}
      </div>
      <div class="party-member-body">
        <div class="party-member-head">
          <div class="party-member-title">
            <strong class="party-member-name">${c.name}<span class="party-member-lv-inline"> Lv.${st.level}</span></strong>
            <span class="party-member-role">${c.jobLabel} · ${role}</span>
          </div>
        </div>
        <p class="party-member-desc">${c.desc}</p>
        ${traits ? `<p class="party-member-traits">${traits}</p>` : ''}
        <div class="party-member-stats">
          <span>⚔ ${stats.atk}</span>
          <span>🛡 ${stats.def}</span>
          <span data-party-hp="${c.id}">❤ ${Math.floor(getCharCurrentHp(save, c.id))}/${stats.hp}</span>
          <span>⚡ ${formatStatNum(stats.atkSpd)}</span>
        </div>
        ${incap ? `<p class="hint warn incap-timer" data-incap-timer="${c.id}">${incap}</p>` : ''}
        ${actions ? `<div class="party-member-actions">${actions}</div>` : ''}
      </div>
    </div>`;
}

export function renderPartyPanel(
  host: PartyPanelHost,
  save: GameSave,
  adv: AdventureSystem,
): string {
  const regionDef = getRegionAvgDef(save.currentRegion);
  const inCombat = adv.isInExpedition()
    && (adv.phase === 'combat' || adv.phase === 'boss')
    && adv.encounterSlots.some(s => s.entity.hp > 0);
  const primaryAggro = inCombat ? adv.getAggroSnapshots()[0] : null;
  const aggroByChar = new Map(primaryAggro?.rows.map(r => [r.charId, r.pct]) ?? []);
  const aggroTarget = primaryAggro?.enemyName;
  const inExpedition = adv.isInExpedition();
  const returning = adv.isReturningToLodging;
  const atLodging = adv.isAtLodging();
  const showRunStrip = inExpedition || returning;
  const expCheck = canStartExpedition(save);

  const dpsById = new Map(getPartyDpsBreakdown(save, regionDef).map(e => [e.id, e]));
  const dpsRows = getFormationDisplayOrder(save)
    .map(id => dpsById.get(id))
    .filter((e): e is NonNullable<typeof e> => !!e)
    .map(e => {
    const aggroPct = aggroByChar.get(e.id);
    const aggroLine = inCombat && aggroPct != null
      ? `<span class="dps-aggro">🎯 어그로 ${aggroPct}%</span>`
      : '';
    const rs = adv.getCharRunStats(e.id);
    const runLine = inExpedition
      ? `<span class="dps-run-stats">
          <span class="dps-run-dealt">⚔ ${rs.damageDealt.toLocaleString()}</span>
          <span class="dps-run-heal">💚 ${rs.healDone.toLocaleString()}</span>
          <span class="dps-run-taken">🛡 ${rs.damageTaken.toLocaleString()}</span>
        </span>`
      : '';
    return `<div class="dps-row">
      <span class="dps-name" style="color:${e.color}">${e.name}</span>
      <span class="dps-job">${e.jobLabel}</span>
      <span class="dps-val">${e.dps} DPS</span>
      <span class="dps-detail">${e.dmgPerHit}데미지 × ${formatStatNum(e.atkSpd)}/초</span>
      ${aggroLine}
      ${runLine}
      <div class="dps-bar"><div class="dps-fill" style="width:${e.share}%;background:${e.color}"></div></div>
      <span class="dps-share">${e.share}%</span>
    </div>`;
  }).join('');

  const regionDps = getPartyDps(save, regionDef);
  const cookSec = getCookRemainingSec(save);
  const cookRecipes = getCookRecipes(save).filter(r => r.unlocked);
  const buffSummary = formatBufferSummary(save);
  const buffRows = getBufferContributions(save).map(b => `
    <div class="buff-row">
      <span class="buff-name">${b.name}</span>
      <span class="buff-effect">${b.detail}</span>
    </div>`).join('');

  const partyIds = save.party.filter(id => save.owned.includes(id));
  const benchIds = save.owned.filter(id => !save.party.includes(id));
  const canRemoveFromParty = save.party.length > 1;
  const partyCards = partyIds
    .map(id => CHAR_MAP[id])
    .filter(Boolean)
    .map(c => renderPartyMemberCard(save, c!, { inParty: true, canRemove: canRemoveFromParty }))
    .join('');
  const benchCards = benchIds
    .map(id => CHAR_MAP[id])
    .filter(Boolean)
    .map(c => renderPartyMemberCard(save, c!, { inParty: false, canRemove: false }))
    .join('');

  return `
    ${showRunStrip
    ? host.renderExpeditionRunStatus(save, adv)
    : `<div class="panel-header">
      <h3>모험단</h3>
      <span class="badge">${save.party.length}/${MAX_PARTY_SIZE} · DPS ${regionDps}</span>
    </div>`}
    ${inExpedition ? host.renderFloorTravelControls(save, adv) : ''}
    ${atLodging ? `
      <div class="party-dungeon-entry">
        <button class="btn-primary expedition-btn" id="party-start-expedition" type="button"
          ${expCheck.ok ? '' : 'disabled'}>던전 입장</button>
        ${!expCheck.ok
    ? `<p class="hint warn" ${hasPartyIncapacitated(save) ? 'id="party-expedition-incap"' : ''}>${expCheck.reason}</p>`
    : ''}
        ${!isPartyFullyHealed(save) ? `<p class="hint warn">HP 미회복 — 회복 후 출발 권장</p>` : ''}
      </div>` : ''}
    ${save.party.length ? host.renderFormationBlock(save) : ''}
    ${save.party.length ? `
      <div class="dps-breakdown ${host.dpsPanelOpen ? 'open' : 'closed'}">
        <button class="dps-toggle" id="dps-toggle" type="button" aria-expanded="${host.dpsPanelOpen}">
          <span>⚔️ 공격대 기여도 <span class="dps-sub">${inCombat && aggroTarget
    ? `vs ${aggroTarget} · 방어 ~${regionDef}`
    : `방어 ~${regionDef}`}</span></span>
          <span class="dps-arrow">${host.dpsPanelOpen ? '▼' : '▶'}</span>
        </button>
        <div class="dps-body">${dpsRows || '<p class="hint">편성된 전투원이 없습니다.</p>'}</div>
      </div>` : ''}
    ${buffSummary ? `<div class="buff-panel">
      <p class="buff-title">파티 버프 <span class="buff-total">${buffSummary}</span></p>
      ${buffRows ? `<div class="buff-list">${buffRows}</div>` : ''}
    </div>` : ''}
    ${renderBondSynergyBlock(save)}
    ${host.panelDetails('조합 상세', `<p class="hint">${formatPartySynergyFull(save)}</p><p class="hint party-comp-hint">💡 ${getPartyCompositionHint(save)}</p>`)}
    ${!inCombat ? `
    <section class="party-roster-section">
      <h4 class="party-roster-title">⚔️ 출전 모험가</h4>
      <div class="party-member-list">${partyCards || '<p class="hint">파티가 비어 있습니다.</p>'}</div>
    </section>
    ${benchCards ? `
    <section class="party-roster-section party-roster-section--bench">
      <h4 class="party-roster-title">대기 동료</h4>
      <div class="party-member-list party-member-list--bench">${benchCards}</div>
    </section>` : ''}` : ''}
    ${hasChef(save) ? `
      <div class="cook-panel">
        <h4>🍳 요리 ${cookSec > 0 ? `· 버프 ${cookSec}초 남음` : ''}</h4>
        <div class="cook-btns">${cookRecipes.map(r => `
          <button class="btn-sm" data-cook="${r.type}" ${canCook(save, r.type as CookType) ? '' : 'disabled'}>
            ${r.label} (🪙${r.gold})
          </button>`).join('')}
        </div>
      </div>` : ''}`;
}
