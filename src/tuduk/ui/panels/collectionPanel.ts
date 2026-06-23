import type { GameSave } from '../../types';
import { MAX_POTION_STOCK, EXPEDITION_POTION_CARRY } from '../../types';
import { getPotionStock } from '../../systems/PotionInventory';
import { ACHIEVEMENTS } from '../../data/achievements';
import {
  canClaimAchievement, countClaimableAchievements,
  isAchievementClaimed, isAchievementMet,
} from '../../systems/AchievementSystem';
import { GRADE_COLOR, GRADE_LABEL, MATERIAL_LABELS, RECIPE_MAP, getEnhanceStatPreview } from '../../data/equipment';
import { getVisibleBagItems } from '../../systems/EquipmentSystem';
import {
  getTotalMaterialCount, getWarehouseCapacity,
} from '../../systems/TycoonExpansionSystem';
import type { PanelHost } from './PanelHost';

export function renderCollectionPanel(host: PanelHost, save: GameSave): void {
  const claimable = countClaimableAchievements(save);
  const achieveLabel = claimable ? `🏆 업적 ✨${claimable}` : '🏆 업적';
  const nav = host.subTabs(host.collectionSub, [
    { id: 'bag', label: '🎒 가방' },
    { id: 'achieve', label: achieveLabel },
  ]);
  if (host.collectionSub === 'bag') renderBag(host, save, nav);
  else renderAchieve(host, save, nav);
}

function renderBag(host: PanelHost, save: GameSave, prefix = ''): void {
  const visible = getVisibleBagItems(save);
  const items = visible.length
    ? visible.map(i => {
      const r = RECIPE_MAP[i.id];
      const cur = r ? getEnhanceStatPreview(r, i.level) : null;
      const statHint = cur && (cur.atk || cur.def || cur.hp)
        ? ` · ATK+${cur.atk} DEF+${cur.def} HP+${cur.hp}`
        : '';
      return `<div class="bag-item" style="border-color:${GRADE_COLOR[i.grade]}">
        <span>+${i.level} [${GRADE_LABEL[i.grade]}] ${r?.name ?? i.id}${statHint}</span>
        <button class="btn-sm" data-dismantle="${i.uid}">분해</button>
      </div>`;
    }).join('')
    : '<p class="empty">비어있음 — 착용 중인 장비는 목록에서 숨겨집니다</p>';
  const whCap = getWarehouseCapacity(save);
  const whUsed = getTotalMaterialCount(save);
  const matRows = Object.entries(save.materials).length
    ? Object.entries(save.materials).map(([k, v]) => {
      const capHint = v >= whCap ? ' mat-full' : v >= whCap * 0.85 ? ' mat-near-full' : '';
      return `<div class="bag-item${capHint}">${MATERIAL_LABELS[k] ?? k} ×${v} <span class="mat-cap">${v}/${whCap}</span></div>`;
    }).join('')
    : '<p class="empty">재료 없음 — 던전·캠프에서 수집</p>';
  const potionN = getPotionStock(save);
  host.panelEl.innerHTML = `${prefix}
    <h3>🎒 가방</h3>
    <p class="hint">장비 보관 목록 · <b>착용 중(본인·타인)은 표시 안 됨</b> · 재료는 품목당 한도</p>
    <div class="bag-status-strip">
      <span>💊 창고 ${potionN}/${MAX_POTION_STOCK}</span>
      <span>📦 품목당 ${whCap} · 총 ${whUsed}</span>
      <span>💎 ${save.gems}</span>
    </div>
    <p class="hint">원정 출발 시 창고에서 최대 ${EXPEDITION_POTION_CARRY}개만 휴대 · 연구실은 숙소 도착 시 지급</p>
    <h4>장비</h4>${items}<h4>재료 (품목당 ${whCap}개)</h4>${matRows}`;
  /* [data-dismantle] — bindStablePanelActions 위임 */
}

function renderAchieve(host: PanelHost, save: GameSave, prefix = ''): void {
  const claimable = countClaimableAchievements(save);
  const claimedN = save.achievements.length;
  const rows = ACHIEVEMENTS.map(a => {
    const met = isAchievementMet(save, a.id);
    const claimed = isAchievementClaimed(save, a.id);
    const ready = canClaimAchievement(save, a.id);
    if (!met && !claimed) {
      return `<div class="achieve-row achieve-hidden">
        <strong>???</strong><p>???</p><span>???</span>
      </div>`;
    }
    const rewardTxt = claimed
      ? '✅ 수령 완료'
      : `🪙${a.reward.toLocaleString()}${a.gemReward ? ` 💎${a.gemReward}` : ''}`;
    const claimBtn = ready
      ? `<button type="button" class="btn-sm gold achieve-claim-btn" data-claim-achieve="${a.id}">🎁 보상 수령</button>`
      : '';
    return `<div class="achieve-row ${claimed ? 'done' : ready ? 'ready' : ''}">
      <strong>${a.name}</strong>
      <p>${a.desc}</p>
      <span class="achieve-reward">${rewardTxt}</span>
      ${claimBtn}
    </div>`;
  }).join('');
  host.panelEl.innerHTML = `${prefix}
    <div class="panel-header">
      <h3>🏆 업적</h3>
      <span class="badge">${claimedN}/${ACHIEVEMENTS.length}${claimable ? ` · ✨${claimable}` : ''}</span>
    </div>
    <p class="hint">달성 후 직접 와서 보상을 수령하세요. 미달성 업적은 ??? 로 표시됩니다.</p>
    <div class="achieve-list">${rows}</div>`;
  /* [data-claim-achieve] — bindStablePanelActions 위임 */
}
