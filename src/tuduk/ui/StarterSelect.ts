import { CHARACTERS, CHAR_MAP } from '../data/characters';
import {
  compareStarterSimRank,
  formatStarterSimMeta, getStarterProfile, renderStarterRatingRows,
} from '../data/starterBalance';
import { STUDIO_NAME } from '../config/release';
import type { EquipRole } from '../types';
import { attachPanelPointerGuard } from '../utils/panelPointerGuard';

/** 시작 선택 가능 (히든 요리사 제외) */
export const STARTER_CHAR_IDS = CHARACTERS
  .filter(c => c.id !== 'hidden')
  .map(c => c.id);

const ROLE_TAG: Record<EquipRole, string> = {
  tank: '탱커', dps: '딜러', healer: '힐러', bruiser: '브루저', support: '서포트',
};

export function showStarterSelect(
  container: HTMLElement,
  onPick: (charId: string) => void,
): void {
  const sortedIds = [...STARTER_CHAR_IDS].sort(compareStarterSimRank);
  const cards = sortedIds.map(id => {
    const c = CHAR_MAP[id]!;
    const role = ROLE_TAG[c.equipRole] ?? c.jobLabel;
    const profile = getStarterProfile(id);
    const simMeta = formatStarterSimMeta(id);
    const ratings = renderStarterRatingRows(id);
    return `
      <button class="starter-card" data-starter="${id}" type="button">
        <span class="starter-rank">#${profile?.simRank ?? '?'}</span>
        <span class="starter-dot" style="background:${c.color}"></span>
        <span class="starter-name">${c.name}</span>
        <span class="starter-job">${c.jobLabel} · ${role}</span>
        ${ratings}
        <span class="starter-sim-meta">${simMeta}</span>
        <span class="starter-desc">${profile?.hint ?? c.desc}</span>
      </button>`;
  }).join('');

  container.innerHTML = `
    <div id="starter-screen">
      <div class="starter-box">
        <p class="starter-studio">${STUDIO_NAME}</p>
        <h2>⚔️ 투닥투닥RPG</h2>
        <p class="starter-title">모험을 시작할 동료를 선택하세요</p>
        <p class="starter-hint">#숫자 = 18층 클리어 예상 순위 (작을수록 빠름) · 초반·후반 동그라미는 쉬움·성장 많을수록 가득</p>
        <div class="starter-grid">${cards}</div>
      </div>
    </div>`;

  let picked = false;
  const starterGuard = attachPanelPointerGuard(container);

  const onPickTap = (e: Event) => {
    if (picked) return;
    const target = e.target as HTMLElement;
    if (starterGuard.consumeScrollGesture(target, e)) return;
    const btn = target.closest<HTMLButtonElement>('[data-starter]');
    if (!btn?.dataset.starter) return;
    picked = true;
    container.querySelectorAll('[data-starter]').forEach(b => { (b as HTMLButtonElement).disabled = true; });
    onPick(btn.dataset.starter);
  };
  container.addEventListener('pointerup', onPickTap);
  container.addEventListener('click', onPickTap);
}
