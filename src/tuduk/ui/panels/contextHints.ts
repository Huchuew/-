import type { GameSave } from '../../types';
import type { AdventureSystem } from '../../systems/AdventureSystem';
import { getNextPlayerAction, type NextPlayerAction } from '../../systems/playerGuide';
import { getPotionStock } from '../../systems/PotionInventory';
import { MAX_POTION_STOCK } from '../../types';
import { getCharCurrentHp, getCharMaxHp } from '../../systems/RestHealingSystem';
import { isWorldNavUnlocked } from '../../systems/uiUnlock';

export function getPartyHealPercent(save: GameSave): number {
  if (!save.party.length) return 100;
  let sum = 0;
  for (const id of save.party) {
    const max = getCharMaxHp(save, id);
    sum += max > 0 ? (getCharCurrentHp(save, id) / max) * 100 : 100;
  }
  return Math.round(sum / save.party.length);
}

export function renderNextActionCard(save: GameSave, adv: AdventureSystem): string {
  const action = getNextPlayerAction(save, adv.isInExpedition() ? save.currentRegion : save.maxRegion ?? 1);
  const tab = action.tab ?? 'party';
  const townSub = action.townSub ?? '';
  const growthSub = action.growthSub ?? '';
  return `<div class="next-action-card">
    <div class="next-action-main">
      <span class="next-action-icon">${action.icon}</span>
      <div class="next-action-body">
        <span class="next-action-kicker">지금 할 일</span>
        <strong class="next-action-label">${action.label}</strong>
        <p class="next-action-detail">${action.detail}</p>
      </div>
    </div>
    <button type="button" class="btn-sm gold next-action-go"
      data-next-go="1"
      data-next-tab="${tab}"
      ${townSub ? `data-next-town-sub="${townSub}"` : ''}
      ${growthSub ? `data-next-growth-sub="${growthSub}"` : ''}
      ${action.equipCharId ? `data-next-equip-char="${action.equipCharId}"` : ''}
      ${action.equipCategory ? `data-next-equip-cat="${action.equipCategory}"` : ''}>
      바로 가기 →
    </button>
  </div>`;
}

export function renderTownStatusStrip(save: GameSave): string {
  const potions = getPotionStock(save);
  return `<div class="town-status-strip">
    <span class="town-stat-pill town-stat-gold">🪙 ${save.gold.toLocaleString()}</span>
    <span class="town-stat-pill">💊 ${potions}/${MAX_POTION_STOCK}</span>
    <span class="town-stat-pill">🏔️ 최고 ${save.maxRegion ?? 1}층</span>
  </div>`;
}

export function renderTownFlowHint(save: GameSave, adv: AdventureSystem): string {
  if (!adv.isAtLodging()) {
    return `<p class="town-flow-banner expedition">⚔️ 원정 중 — 던전 패널에서 층·보스 진행도를 확인하세요</p>`;
  }
  if (isWorldNavUnlocked(save)) {
    return `<p class="town-flow-banner economy">💡 <b>경제</b> 던전 📦재료 수집 → 숙소 판매·캠프 가공이 🪙골드의 본류 · 처치 골드는 소량 보너스</p>`;
  }
  return '';
}

export function renderPanelGuide(title: string, body: string): string {
  return `<div class="panel-guide-card">
    <strong>${title}</strong>
    <p>${body}</p>
  </div>`;
}

export type { NextPlayerAction };
