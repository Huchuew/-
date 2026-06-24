import type { GameSave } from '../types';
import { REGIONS } from '../data/regions';
import { AUGMENT_MAP, CATEGORY_LABEL } from '../data/augments';
import {
  buildAugmentPreview, formatAugmentTier, type AugmentPickState,
} from '../systems/AugmentSystem';
import { bindTap } from '../utils/bindTap';

function renderAugmentCard(save: GameSave, id: string, floorId: number): string {
  const def = AUGMENT_MAP[id];
  if (!def) return '';
  const preview = buildAugmentPreview(save, id);
  const charRows = preview.chars.map(c => `
    <li class="augment-preview-char ${c.active ? 'active' : 'muted'}">
      <strong>${c.name}</strong>
      <span>${c.lines.join(' · ')}</span>
    </li>`).join('');

  return `<article class="augment-card augment-card--${def.tier}" data-augment-id="${id}">
    <header class="augment-card-head">
      <span class="augment-card-icon" aria-hidden="true">${def.icon}</span>
      <div class="augment-card-title">
        <em class="augment-tier augment-tier--${def.tier}">${formatAugmentTier(def.tier)}</em>
        <strong>${def.name}</strong>
        <span class="augment-cat">${CATEGORY_LABEL[def.category]}</span>
      </div>
    </header>
    <p class="augment-card-desc">${def.desc}</p>
    ${!preview.conditionMet && preview.conditionHint
      ? `<p class="augment-card-warn">⚠️ ${preview.conditionHint}</p>` : ''}
    <div class="augment-card-detail" hidden>
      <p class="augment-detail-label">파티 영향</p>
      <ul class="augment-preview-list">${charRows}</ul>
    </div>
    <div class="augment-card-actions">
      <button type="button" class="augment-detail-btn" data-augment-detail="${id}">상세보기</button>
      <button type="button" class="augment-pick-btn" data-augment-pick="${id}">선택</button>
    </div>
  </article>`;
}

/** 층별 첫 클리어 — 증강 선택 (전체 화면 차단) */
export function showAugmentPickModal(
  root: HTMLElement,
  save: GameSave,
  pick: AugmentPickState,
  onPick: (augmentId: string) => void,
): void {
  root.querySelector('#augment-pick-modal')?.remove();

  const region = REGIONS.find(r => r.id === pick.floorId);
  const cards = pick.choiceIds.map(id => renderAugmentCard(save, id, pick.floorId)).join('');
  const retro = !!pick.retroactive;
  const kicker = retro
    ? pick.reroll
      ? `🔄 ${pick.floorId}층 증강 리롤`
      : `🎁 ${pick.floorId}층 증강 (소급)`
    : `🎉 ${pick.floorId}층 최초 클리어`;
  const sub = retro
    ? `${region?.name ?? ''} · 영구 적용${pick.queueRemaining != null && pick.queueRemaining > 0
      ? ` · 남은 층 ${pick.queueRemaining}개` : ''}`
    : `${region?.name ?? ''} · 영구 적용 · 층당 1회`;
  const footHint = retro
    ? '모든 층 증강을 고를 때까지 이 창이 이어집니다'
    : '선택 전까지 던전이 일시 정지됩니다';

  const overlay = document.createElement('div');
  overlay.id = 'augment-pick-modal';
  overlay.className = 'augment-pick-modal';
  overlay.innerHTML = `
    <div class="augment-pick-scene" aria-hidden="true">
      <div class="augment-pick-bg"></div>
      <div class="augment-pick-rays"></div>
      <div class="augment-pick-glow"></div>
      <div class="augment-pick-ring"></div>
      <div class="augment-pick-dust">
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
      </div>
    </div>
    <div class="augment-pick-vignette" aria-hidden="true"></div>
    <div class="augment-pick-panel" role="dialog" aria-modal="true" aria-labelledby="augment-pick-title">
      <header class="augment-pick-head">
        <p class="augment-pick-kicker">${kicker}</p>
        <h2 id="augment-pick-title">증강을 선택하세요</h2>
        <p class="augment-pick-sub">${sub}</p>
      </header>
      <div class="augment-pick-body">
        <div class="augment-pick-list">${cards}</div>
      </div>
      <footer class="augment-pick-foot">
        <p class="hint">${footHint}</p>
      </footer>
    </div>`;

  overlay.addEventListener('click', e => {
    e.stopPropagation();
  });

  overlay.querySelectorAll('[data-augment-detail]').forEach(btn => {
    bindTap(btn as HTMLElement, () => {
      const card = btn.closest('.augment-card');
      const detail = card?.querySelector('.augment-card-detail') as HTMLElement | null;
      if (!detail) return;
      const open = detail.hidden;
      overlay.querySelectorAll('.augment-card-detail').forEach(el => { (el as HTMLElement).hidden = true; });
      overlay.querySelectorAll('.augment-detail-btn').forEach(el => {
        (el as HTMLButtonElement).textContent = '상세보기';
      });
      if (open) {
        detail.hidden = false;
        (btn as HTMLButtonElement).textContent = '접기';
        card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  });

  overlay.querySelectorAll('[data-augment-pick]').forEach(btn => {
    bindTap(btn as HTMLElement, () => {
      const id = (btn as HTMLElement).dataset.augmentPick!;
      overlay.remove();
      onPick(id);
    });
  });

  root.appendChild(overlay);
}
