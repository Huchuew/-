import type { GameSave } from '../../types';
import { ACHIEVEMENTS } from '../../data/achievements';
import {
  canClaimAchievement, claimAchievement, countClaimableAchievements,
  isAchievementClaimed, isAchievementMet,
} from '../../systems/AchievementSystem';
import { isMilestoneAchievement } from '../../data/milestoneAchievements';
import { GRADE_COLOR, RECIPE_MAP } from '../../data/equipment';
import { MATERIAL_TIER_GROUPS, sumTierMaterials } from '../../data/materialTiers';
import { dismantleItem, getVisibleBagItems } from '../../systems/EquipmentSystem';
import { saveGame } from '../../core/SaveManager';
import { getTotalMaterialCount, getWarehouseCapacity } from '../../systems/TycoonExpansionSystem';
import { MAX_POTION_STOCK, EXPEDITION_POTION_CARRY } from '../../types';
import { getPotionStock } from '../../systems/PotionInventory';
import { bindTap } from '../../utils/bindTap';
import { audio } from '../../core/AudioManager';
import type { PanelHost } from './PanelHost';

export function renderMilestoneAchievements(host: PanelHost, save: GameSave): string {
  const milestones = ACHIEVEMENTS.filter(a => isMilestoneAchievement(a.id));
  const claimable = countClaimableAchievements(save);
  const rows = milestones.map(a => {
    const met = isAchievementMet(save, a.id);
    const claimed = isAchievementClaimed(save, a.id);
    const ready = canClaimAchievement(save, a.id);
    if (!met && !claimed) {
      return `<div class="achieve-row achieve-hidden compact">
        <strong>???</strong><p>진행 중인 목표</p>
      </div>`;
    }
    const claimBtn = ready
      ? `<button type="button" class="btn-sm gold achieve-claim-btn" data-claim-achieve="${a.id}">수령</button>`
      : claimed ? '<span class="hint">✓</span>' : '';
    return `<div class="achieve-row compact ${claimed ? 'done' : ready ? 'ready' : ''}">
      <div class="achieve-row-main">
        <strong>${a.name}</strong>
        <p>${a.desc}</p>
      </div>
      <span class="achieve-reward">🪙${a.reward.toLocaleString()}${a.gemReward ? ` 💎${a.gemReward}` : ''}</span>
      ${claimBtn}
    </div>`;
  }).join('');

  return `
    <section class="records-section">
      <h4>🏆 주요 업적</h4>
      <span class="hint">나머지 업적은 달성 시 자동 수령되거나 전체 목록에서 확인할 수 있어요${claimable ? ` · 대기 ${claimable}건` : ''}</span>
      <div class="achieve-list compact-list">${rows}</div>
    </section>`;
}

export function bindMilestoneClaims(host: PanelHost) {
  host.panelEl.querySelectorAll('[data-claim-achieve]').forEach(btn => {
    bindTap(btn, () => {
      const s = host.getSave();
      const id = (btn as HTMLElement).dataset.claimAchieve!;
      const res = claimAchievement(s, id);
      if (res.ok) {
        audio.playGold();
        host.showToast(res.message);
        host.onRefresh();
        host.render();
      } else audio.playFail();
    });
  });
}

export function renderCompactBag(save: GameSave): string {
  const visible = getVisibleBagItems(save);
  const whCap = getWarehouseCapacity(save);
  const potionN = getPotionStock(save);
  const items = visible.length
    ? visible.slice(0, 12).map(i => {
      const r = RECIPE_MAP[i.id];
      return `<div class="bag-item compact" style="border-color:${GRADE_COLOR[i.grade]}">
        <span>+${i.level} ${r?.name ?? i.id}</span>
      </div>`;
    }).join('') + (visible.length > 12 ? `<p class="hint">외 ${visible.length - 12}개…</p>` : '')
    : '<p class="hint empty">비어 있음</p>';

  const tierRows = MATERIAL_TIER_GROUPS.map(g => {
    const n = sumTierMaterials(save.materials, g.keys);
    if (n <= 0) return '';
    return `<span class="mat-tier-chip mat-tier-${g.id}">${g.icon} ${g.label} <b>${n}</b></span>`;
  }).filter(Boolean).join('') || '<p class="hint empty">재료 없음</p>';

  return `
    <section class="records-section">
      <h4>🎒 보관함</h4>
      <div class="bag-status-strip">
        <span>💊 ${potionN}/${MAX_POTION_STOCK}</span>
        <span>📦 품목당 ${whCap}</span>
        <span>총 ${getTotalMaterialCount(save)}</span>
      </div>
      <div class="mat-tier-row">${tierRows}</div>
      <details class="records-details">
        <summary>장비 상세 (${visible.length})</summary>
        ${items}
      </details>
    </section>`;
}

export function bindBagDismantle(host: PanelHost) {
  host.panelEl.querySelectorAll('[data-dismantle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = host.getSave();
      if (dismantleItem(s, (btn as HTMLElement).dataset.dismantle!)) {
        audio.playGold();
        saveGame(s);
        host.onRefresh();
        host.render();
      } else audio.playFail();
    });
  });
}
