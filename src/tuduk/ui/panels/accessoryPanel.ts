import type { GameSave } from '../../types';
import {
  GRADE_COLOR, GRADE_LABEL, RECIPE_MAP,
  getEnhanceStatPreview, getMaxEnhanceForGrade,
} from '../../data/equipment';
import { ACCESSORY_DROP_RATE, LEGENDARY_ACCESSORY_DROP_RATE } from '../../data/universalAccessories';
import { getRegionDropHint, getTotalAccessoryCount } from '../../systems/CodexSystem';
import {
  formatAccessoryCompareTag,
  getAccessoryBagView,
  getEquippedAccessoryScore,
  groupAccessoriesBySlot,
} from '../../systems/AccessoryBagSystem';
import { canEnhance, enhanceCost } from '../../systems/EquipmentSystem';

const ACCESSORY_SLOTS = ['ring', 'necklace', 'relic'] as const;
type AccessorySlot = typeof ACCESSORY_SLOTS[number];
const SLOT_LABEL: Record<AccessorySlot, string> = { ring: '반지', necklace: '목걸이', relic: '유물' };
const SLOT_ICON: Record<AccessorySlot, string> = { ring: '💍', necklace: '📿', relic: '✦' };

function gradeShort(grade: string): string {
  return (GRADE_LABEL[grade as keyof typeof GRADE_LABEL] ?? grade).split('·')[0]!.trim();
}

function renderAccessoryRow(
  item: { uid: string; id: string; grade: string; level: number },
  charId: string,
  equippedScore: number,
): string {
  const r = RECIPE_MAP[item.id]!;
  const tag = formatAccessoryCompareTag(item as never, r, equippedScore);
  const color = GRADE_COLOR[item.grade as keyof typeof GRADE_COLOR];
  const title = tag === 'up' ? '착용보다 강함' : tag === 'down' ? '착용보다 약함' : '착용과 비슷';
  return `<button type="button" class="acc-row acc-row--${tag}"
    data-equip-acc="${item.uid}" data-char="${charId}" title="${title}">
    <span class="acc-row-grade" style="--acc-grade:${color}">${gradeShort(item.grade)}</span>
    <span class="acc-row-name">${r.name}</span>
    <span class="acc-row-lv">+${item.level}</span>
  </button>`;
}

function renderEquippedSlot(
  save: GameSave,
  charId: string,
  slot: AccessorySlot,
  formatMats: (m: Record<string, number>) => string,
  formatShortage: (save: GameSave, gold?: number, mats?: Record<string, number>) => string,
): string {
  const uid = save.chars[charId]?.equipped[slot];
  const item = uid ? save.bag.find(b => b.uid === uid) : null;
  const r = item ? RECIPE_MAP[item.id] : null;
  if (!item || !r) {
    return `<div class="acc-equipped-row acc-equipped-row--empty">
      <span class="acc-equipped-icon">${SLOT_ICON[slot]}</span>
      <div class="acc-equipped-body">
        <span class="acc-equipped-label">${SLOT_LABEL[slot]}</span>
        <span class="acc-equipped-sub">미장착</span>
      </div>
    </div>`;
  }
  const maxLv = getMaxEnhanceForGrade(item.grade);
  const cost = enhanceCost(save, item.level, item.grade);
  const ok = canEnhance(save, item.uid);
  const curStats = getEnhanceStatPreview(r, item.level);
  const accShortage = item.level < maxLv && !ok ? formatShortage(save, cost.gold, cost.mats) : '';
  const color = GRADE_COLOR[item.grade];
  return `<details class="acc-equipped-row acc-equipped-row--filled" open>
    <summary class="acc-equipped-summary">
      <span class="acc-equipped-icon">${SLOT_ICON[slot]}</span>
      <div class="acc-equipped-body">
        <span class="acc-equipped-label">${SLOT_LABEL[slot]}</span>
        <span class="acc-equipped-name">${r.name}</span>
      </div>
      <span class="acc-equipped-badge" style="--acc-grade:${color}">${gradeShort(item.grade)} +${item.level}</span>
    </summary>
    <div class="acc-equipped-detail">
      <p class="acc-equipped-stat">ATK+${curStats.atk} · DEF+${curStats.def} · HP+${curStats.hp}</p>
      ${item.level < maxLv
        ? `<p class="acc-equipped-cost">🪙${cost.gold.toLocaleString()} · ${formatMats(cost.mats)}</p>
           ${accShortage}
           <div class="acc-equipped-actions">
             <button type="button" class="btn-sm gold" data-enhance="${item.uid}" ${ok ? '' : 'disabled'}>강화</button>
             <button type="button" class="btn-sm" data-unequip-acc="${slot}" data-char="${charId}">해제</button>
           </div>`
        : `<p class="hint acc-equipped-max">MAX</p>
           <button type="button" class="btn-sm" data-unequip-acc="${slot}" data-char="${charId}">해제</button>`}
    </div>
  </details>`;
}

export function renderAccessoryPanel(
  save: GameSave,
  charId: string,
  showAll: boolean,
  formatMats: (m: Record<string, number>) => string,
  formatShortage: (save: GameSave, gold?: number, mats?: Record<string, number>) => string,
): string {
  const region = save.maxRegion ?? 1;
  const dropPct = Math.round(ACCESSORY_DROP_RATE * 1000) / 10;
  const legPct = Math.round(LEGENDARY_ACCESSORY_DROP_RATE * 10000) / 100;
  const hint = getRegionDropHint(save, region);
  const view = getAccessoryBagView(save, charId, showAll);
  const groups = groupAccessoriesBySlot(view.items);

  const equipped = ACCESSORY_SLOTS
    .map(slot => renderEquippedSlot(save, charId, slot, formatMats, formatShortage))
    .join('');

  const vaultSections = ACCESSORY_SLOTS.map(slot => {
    const eqScore = getEquippedAccessoryScore(save, charId, slot);
    const items = groups[slot];
    const rows = items.length
      ? items.map(i => renderAccessoryRow(i, charId, eqScore)).join('')
      : '<p class="acc-vault-empty">없음</p>';
    return `<section class="acc-vault-section">
      <header class="acc-vault-section-head">
        <span class="acc-vault-section-icon">${SLOT_ICON[slot]}</span>
        <span class="acc-vault-section-title">${SLOT_LABEL[slot]}</span>
        <span class="acc-vault-section-count">${items.length}</span>
      </header>
      <div class="acc-vault-rows">${rows}</div>
    </section>`;
  }).join('');

  const hiddenNote = view.hidden > 0
    ? `<span class="acc-vault-hidden">${view.hidden}개 숨김</span>`
    : '';

  const salvageBtn = view.junkCount > 0
    ? `<button type="button" class="btn-sm gold acc-salvage-btn" data-accessory-salvage-junk>
        회수 ${view.junkCount} · 🪙${view.junkGoldEst.toLocaleString()}
      </button>`
    : '';

  const toggleLabel = showAll ? '추천만' : '전체';

  return `
    <div class="acc-panel">
      <p class="hint acc-panel-meta">💍 ${getTotalAccessoryCount()}종 · ${dropPct}% · 전설 ${legPct}% · ${hint}</p>
      <section class="acc-equipped-block">
        <h4 class="acc-block-title">착용</h4>
        <div class="acc-equipped-list">${equipped}</div>
      </section>
      <section class="acc-vault-block">
        <div class="acc-vault-toolbar">
          <div class="acc-vault-toolbar-left">
            <h4 class="acc-block-title">가방</h4>
            <span class="acc-vault-summary">${view.items.length}/${view.total}${hiddenNote}</span>
          </div>
          <div class="acc-vault-actions">
            ${salvageBtn}
            <button type="button" class="btn-sm support acc-toggle-btn" data-accessory-toggle-bag>${toggleLabel}</button>
          </div>
        </div>
        <div class="acc-vault-sections">${vaultSections}</div>
      </section>
    </div>`;
}
