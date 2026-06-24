import { GRADE_LABEL } from '../data/equipment';
import type { EquipGrade } from '../types';
import { bindTap } from '../utils/bindTap';

/** 전설급 장신구 획득 축하 연출 */
export function showLegendaryAccessoryModal(
  root: HTMLElement,
  name: string,
  grade: EquipGrade | string,
  onClose?: () => void,
): void {
  root.querySelector('#legendary-accessory-modal')?.remove();

  const gradeLabel = typeof grade === 'string' && grade.length <= 3
    ? (GRADE_LABEL[grade as EquipGrade] ?? grade)
    : grade;

  const overlay = document.createElement('div');
  overlay.id = 'legendary-accessory-modal';
  overlay.className = 'legendary-accessory-modal';
  overlay.innerHTML = `
    <div class="legendary-acc-scene" aria-hidden="true">
      <div class="legendary-acc-rays"></div>
      <div class="legendary-acc-glow"></div>
    </div>
    <div class="legendary-acc-panel" role="dialog" aria-modal="true">
      <p class="legendary-acc-kicker">🎉 전설 장신구 획득!</p>
      <div class="legendary-acc-icon">💎</div>
      <h2 class="legendary-acc-name">${name}</h2>
      <p class="legendary-acc-grade">${gradeLabel}</p>
      <p class="legendary-acc-desc">극희귀 드랍 — 가방에서 확인하세요</p>
      <button type="button" class="btn-primary legendary-acc-btn">확인</button>
    </div>`;

  const close = () => {
    overlay.classList.add('legendary-acc-out');
    setTimeout(() => {
      overlay.remove();
      onClose?.();
    }, 280);
  };

  bindTap(overlay.querySelector('.legendary-acc-btn') as HTMLElement, close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  root.appendChild(overlay);
}

export function flushPendingAccessoryCelebration(
  root: HTMLElement,
  save: { pendingAccessoryCelebrate?: { name: string; grade: string } },
  onCelebrate?: () => void,
): boolean {
  const pending = save.pendingAccessoryCelebrate;
  if (!pending) return false;
  delete save.pendingAccessoryCelebrate;
  onCelebrate?.();
  showLegendaryAccessoryModal(root, pending.name, pending.grade);
  return true;
}
