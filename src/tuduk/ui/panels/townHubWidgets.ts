import type { GameSave } from '../../types';
import { getUnreadMailCount, formatMailSummary } from '../../systems/PlayerMessageSystem';
import type { ElementType, EquipRole } from '../../types';
import { CHAR_MAP } from '../../data/characters';
import { RECIPE_MAP } from '../../data/equipment';
import { ELEMENT_ICON, ELEMENT_LABEL } from '../../data/elemental';
import { computeTraitSynergyFromSave } from '../../data/traitSynergy';
import { buildLeaderboardLocalView } from '../../systems/LeaderboardSystem';
import { getHubDailyDeal } from '../../systems/LodgingShopSystem';
import { getActiveExpeditionHighlight } from '../../systems/expeditionHighlight';

const ROLE_ICON: Record<EquipRole, string> = {
  tank: '🛡️',
  dps: '⚔️',
  healer: '💚',
  bruiser: '🪓',
  support: '✨',
};

const ROLE_LABEL: Record<EquipRole, string> = {
  tank: '탱커',
  dps: '딜러',
  healer: '힐러',
  bruiser: '브루저',
  support: '서포트',
};

function partySynergyChips(save: GameSave): string {
  const elCounts = new Map<ElementType, number>();
  const roleCounts = new Map<EquipRole, number>();

  for (const id of save.party) {
    const def = CHAR_MAP[id];
    if (!def) continue;
    roleCounts.set(def.equipRole, (roleCounts.get(def.equipRole) ?? 0) + 1);
    const st = save.chars[id];
    if (!st) continue;
    for (const uid of Object.values(st.equipped)) {
      if (!uid) continue;
      const item = save.bag.find(b => b.uid === uid);
      const el = item ? RECIPE_MAP[item.id]?.element : undefined;
      if (el && el !== 'none') {
        elCounts.set(el, (elCounts.get(el) ?? 0) + 1);
      }
    }
  }

  const chips: { icon: string; label: string; count: number }[] = [];
  for (const [el, count] of elCounts) {
    chips.push({ icon: ELEMENT_ICON[el], label: ELEMENT_LABEL[el], count });
  }
  if (!chips.length) {
    const traits = computeTraitSynergyFromSave(save);
    for (const a of traits.active) {
      chips.push({ icon: a.def.icon, label: a.def.name, count: a.count });
    }
  }
  for (const [role, count] of roleCounts) {
    chips.push({ icon: ROLE_ICON[role], label: ROLE_LABEL[role], count });
  }
  chips.sort((a, b) => b.count - a.count);
  const top = chips.slice(0, 3);
  if (!top.length) return '<span class="town-hub-chip town-hub-chip--muted">파티를 꾸려보세요</span>';
  return top.map(c =>
    `<span class="town-hub-chip" title="${c.label}">${c.icon} ${c.label} ${c.count}</span>`,
  ).join('');
}

function renderLeaderboardStrip(save: GameSave): string {
  const local = buildLeaderboardLocalView(save);
  return `<button type="button" class="town-hub-line town-hub-line--leaderboard" data-town-sub="leaderboard">
    <span class="town-hub-line-icon" aria-hidden="true">🏆</span>
    <span class="town-hub-line-copy">잭펍 랭킹 · 주간 <strong>${local.playerScore.toLocaleString()} SP</strong> · ${local.daysLeftLabel}</span>
    <span class="town-hub-line-chev" aria-hidden="true">›</span>
  </button>`;
}

function renderDailyDeal(save: GameSave): string {
  const deal = getHubDailyDeal(save);
  if (!deal) return '';
  const pct = Math.round(deal.discountPct * 100);
  const btn = deal.bought
    ? '<span class="town-hub-deal-done">구매 완료</span>'
    : `<button type="button" class="btn-sm gold" data-hub-special-buy ${deal.canBuy ? '' : 'disabled'}>구매</button>`;
  const reason = !deal.bought && !deal.canBuy && deal.reason
    ? `<span class="hint">${deal.reason}</span>` : '';
  return `<div class="town-hub-line town-hub-line--deal">
    <span class="town-hub-line-icon" aria-hidden="true">✨</span>
    <div class="town-hub-deal-main">
      <div class="town-hub-deal-title">
        <strong>오늘의 특가</strong>
        <span class="town-hub-deal-item">${deal.icon} ${deal.name}</span>
        <em class="town-hub-deal-off">${pct}% OFF</em>
      </div>
      <div class="town-hub-deal-price">
        <s>🪙${deal.regularPrice.toLocaleString()}</s>
        <strong>🪙${deal.price.toLocaleString()}</strong>
        ${reason}
      </div>
    </div>
    <div class="town-hub-deal-action">${btn}</div>
  </div>`;
}

function renderSynergyStrip(save: GameSave): string {
  return `<div class="town-hub-line town-hub-line--synergy">
    <span class="town-hub-line-icon" aria-hidden="true">⚔️</span>
    <div class="town-hub-synergy-chips">${partySynergyChips(save)}</div>
  </div>`;
}

function renderExpeditionHighlight(save: GameSave): string {
  const h = getActiveExpeditionHighlight(save);
  if (!h) return '';
  const tone = h.kind === 'defeat' ? 'defeat' : 'return';
  const title = h.kind === 'defeat' ? '전멸 귀환' : '이번 원정';
  return `<div class="town-hub-highlight town-hub-highlight--${tone}">
    <div class="town-hub-highlight-body">
      <strong>${title}</strong>
      <span>재료 ${h.matQty.toLocaleString()}개 · 골드 +${h.goldEarned.toLocaleString()}</span>
    </div>
    <button type="button" class="town-hub-highlight-dismiss" data-dismiss-expedition-highlight aria-label="닫기">×</button>
  </div>`;
}

function renderMailStrip(save: GameSave): string {
  const unread = getUnreadMailCount(save);
  if (!unread) return '';
  const preview = formatMailSummary(save);
  return `<div class="town-mail-strip">
    <span class="town-mail-icon">📬</span>
    <div class="town-mail-body">
      <strong>모험 우편 ${unread}통</strong>
      <small>${preview ?? '격파 알림'}</small>
    </div>
  </div>`;
}

/** 마을 허브 — 랭킹·특가·시너지·귀환 */
export function renderTownHubWidgets(save: GameSave, atLodging: boolean): string {
  const parts: string[] = [];
  parts.push(renderMailStrip(save));
  parts.push(renderLeaderboardStrip(save));
  parts.push(renderSynergyStrip(save));
  if (atLodging) {
    const highlight = renderExpeditionHighlight(save);
    if (highlight) parts.unshift(highlight);
    const deal = renderDailyDeal(save);
    if (deal) parts.push(deal);
  }
  return `<div class="town-hub-widgets">${parts.join('')}</div>`;
}
