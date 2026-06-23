import type { GameSave } from '../../types';
import {
  buildAugmentImpact, buildPartyAugmentSummary, getAugmentClaimedFloor,
} from '../../systems/augmentImpact';
import {
  formatAugmentTier, getPendingAugmentFloors, getPickedAugments,
} from '../../systems/AugmentSystem';
import { getActiveGame } from '../../Game';
import { canGemAugmentRerollAll, GEM_COST } from '../../systems/GemShop';
import { CATEGORY_LABEL } from '../../data/augments';

const ROLE_LABEL: Record<string, string> = {
  tank: '탱커', dps: '딜러', healer: '힐러', bruiser: '브루저', support: '서포트',
};

function renderMetaAggregate(save: GameSave): string {
  const picked = getPickedAugments(save);
  const metaSet = new Set<string>();
  for (const def of picked) {
    const impact = buildAugmentImpact(save, def.id);
    impact.metaLines.forEach(l => metaSet.add(l));
  }
  if (!metaSet.size) return '';
  const items = [...metaSet].map(l => `<li>${l}</li>`).join('');
  return `<section class="augment-collection-section">
    <h3 class="augment-section-title">모험단 공통</h3>
    <p class="hint">전투 외 포션·골드·캠프 등 모든 원정에 적용</p>
    <ul class="augment-meta-list">${items}</ul>
  </section>`;
}

function renderAugmentOwnedCard(save: GameSave, augmentId: string): string {
  const picked = getPickedAugments(save);
  const def = picked.find(d => d.id === augmentId);
  if (!def) return '';

  const impact = buildAugmentImpact(save, augmentId);
  const floor = getAugmentClaimedFloor(save, augmentId);
  const floorLabel = floor != null ? `${floor}층` : '층 미기록';

  const metaBlock = impact.metaLines.length
    ? `<div class="augment-impact-block">
        <span class="augment-impact-label">모험단</span>
        <ul>${impact.metaLines.map(l => `<li>${l}</li>`).join('')}</ul>
      </div>` : '';

  const partyBlock = impact.partyCombatLines.length
    ? `<div class="augment-impact-block">
        <span class="augment-impact-label">파티 전투</span>
        <ul>${impact.partyCombatLines.map(l => `<li>${l}</li>`).join('')}</ul>
      </div>` : '';

  const partyChars = impact.chars.filter(c => c.inParty);
  const benchChars = impact.chars.filter(c => !c.inParty && c.active);

  const charRows = partyChars.map(c => `
    <li class="augment-char-row ${c.active ? 'active' : 'muted'}">
      <div class="augment-char-head">
        <strong>${c.name}</strong>
        <span class="augment-char-role">${ROLE_LABEL[c.role] ?? c.role}</span>
        ${c.active ? '<em class="augment-char-badge">적용</em>' : '<em class="augment-char-badge muted">미적용</em>'}
      </div>
      <p>${c.lines.join(' · ')}</p>
      ${c.inactiveReason && !c.active ? `<p class="hint warn">${c.inactiveReason}</p>` : ''}
    </li>`).join('');

  const benchNote = benchChars.length
    ? `<p class="hint">대기 ${benchChars.length}명 — 전투 증강은 출전 파티에만 적용됩니다</p>` : '';

  const conditionWarn = !impact.conditionMet && impact.conditionHint
    ? `<p class="augment-card-warn">⚠️ 현재 파티: ${impact.conditionHint}</p>` : '';

  return `<article class="augment-owned-card augment-card--${def.tier}" data-augment-owned="${def.id}">
    <button type="button" class="augment-owned-head" data-augment-toggle="${def.id}">
      <span class="augment-card-icon">${def.icon}</span>
      <div class="augment-owned-title">
        <em class="augment-tier augment-tier--${def.tier}">${formatAugmentTier(def.tier)}</em>
        <strong>${def.name}</strong>
        <span class="augment-owned-meta">${CATEGORY_LABEL[def.category]} · ${floorLabel}</span>
      </div>
      <span class="augment-owned-chevron" aria-hidden="true">▾</span>
    </button>
    <div class="augment-owned-body" hidden>
      <p class="augment-card-desc">${def.desc}</p>
      ${conditionWarn}
      ${metaBlock}
      ${partyBlock}
      <div class="augment-impact-block">
        <span class="augment-impact-label">캐릭터별</span>
        <ul class="augment-char-list">${charRows}</ul>
        ${benchNote}
      </div>
    </div>
  </article>`;
}

function renderPartySummary(save: GameSave): string {
  const rows = buildPartyAugmentSummary(save);
  if (!rows.length) return '';

  const body = rows.map(r => {
    if (!r.effects.length) {
      return `<li class="augment-summary-char muted">
        <strong>${r.name}</strong>
        <span>적용 중인 전투 증강 없음</span>
      </li>`;
    }
    const augLines = r.effects.map(e => `
      <div class="augment-summary-aug">
        <span>${e.icon} ${e.augmentName}</span>
        <small>${e.lines.join(' · ')}</small>
      </div>`).join('');
    return `<li class="augment-summary-char">
      <strong>${r.name}</strong>
      ${augLines}
    </li>`;
  }).join('');

  return `<section class="augment-collection-section">
    <h3 class="augment-section-title">출전 파티 합산</h3>
    <p class="hint">현재 파티 기준으로 실제 적용되는 전투 증강</p>
    <ul class="augment-summary-list">${body}</ul>
  </section>`;
}

/** 강해지기 — 증강 탭 */
export function renderAugmentCollectionPanel(save: GameSave): string {
  const picked = getPickedAugments(save);
  const pending = getPendingAugmentFloors(save);
  const claimedCount = save.augments?.claimedFloors?.length ?? 0;
  const maxFloors = 18;

  const pendingBanner = pending.length
    ? `<div class="augment-retro-banner">
        <div>
          <strong>🎁 소급 증강 ${pending.length}개 대기</strong>
          <p class="hint">클리어한 층: ${pending.join(', ')}층</p>
        </div>
        <button type="button" class="btn-sm gold" id="retro-augment-btn">선택하기</button>
      </div>`
    : '';

  if (!picked.length && !pending.length) {
    return `<div class="augment-collection-empty">
      <p class="augment-empty-icon">✨</p>
      <strong>아직 획득한 증강이 없습니다</strong>
      <p class="hint">각 층 보스를 처음 클리어하면 3개 중 1개를 영구 획득합니다</p>
      <p class="hint">진행: ${claimedCount} / ${maxFloors}층</p>
    </div>`;
  }

  if (!picked.length) {
    return `${pendingBanner}<div class="augment-collection-empty compact">
      <p class="hint">위 버튼으로 층별 증강을 선택하세요</p>
    </div>`;
  }

  const ordered = [...picked].sort((a, b) => {
    const fa = getAugmentClaimedFloor(save, a.id) ?? 999;
    const fb = getAugmentClaimedFloor(save, b.id) ?? 999;
    return fa - fb;
  });

  const cards = ordered.map(d => renderAugmentOwnedCard(save, d.id)).join('');
  const canReroll = canGemAugmentRerollAll(save);
  const rerollBlock = picked.length
    ? `<div class="augment-reroll-bar">
        <div>
          <strong>🔄 전체 증강 다시돌리기</strong>
          <p class="hint">보유 ${picked.length}개 초기화 · 층별 3택1 재선택</p>
        </div>
        <button type="button" class="btn-sm ${canReroll ? 'support' : ''}" id="augment-reroll-all-btn"
          ${canReroll ? '' : 'disabled'}>💎${GEM_COST.augmentRerollAll}</button>
      </div>`
    : '';

  return `<div class="augment-collection">
    ${pendingBanner}
    ${rerollBlock}
    <div class="augment-collection-hero">
      <strong>✨ 증강 도감</strong>
      <p class="hint">${picked.length}개 보유 · ${claimedCount}/${maxFloors}층 클리어</p>
    </div>
    ${renderMetaAggregate(save)}
    ${renderPartySummary(save)}
    <section class="augment-collection-section">
      <h3 class="augment-section-title">획득 목록</h3>
      <div class="augment-owned-list">${cards}</div>
    </section>
  </div>`;
}

export function bindAugmentCollectionPanel(panelEl: HTMLElement): void {
  const retroBtn = panelEl.querySelector('#retro-augment-btn');
  if (retroBtn) {
    retroBtn.addEventListener('click', () => {
      getActiveGame()?.startRetroactiveAugmentPicks();
    });
  }

  const rerollBtn = panelEl.querySelector('#augment-reroll-all-btn');
  if (rerollBtn) {
    rerollBtn.addEventListener('click', () => {
      getActiveGame()?.rerollAllAugmentsWithGems();
    });
  }

  panelEl.querySelectorAll('[data-augment-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.augmentToggle!;
      const card = panelEl.querySelector(`[data-augment-owned="${id}"]`);
      const body = card?.querySelector('.augment-owned-body') as HTMLElement | null;
      const chevron = card?.querySelector('.augment-owned-chevron');
      if (!body) return;
      const open = body.hidden;
      panelEl.querySelectorAll('.augment-owned-body').forEach(el => { (el as HTMLElement).hidden = true; });
      panelEl.querySelectorAll('.augment-owned-chevron').forEach(el => { el.textContent = '▾'; });
      panelEl.querySelectorAll('.augment-owned-card').forEach(el => el.classList.remove('open'));
      if (open) {
        body.hidden = false;
        if (chevron) chevron.textContent = '▴';
        card?.classList.add('open');
      }
    });
  });
}
