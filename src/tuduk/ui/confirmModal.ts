/** 게임 내 확인 모달 — 브라우저 confirm 대체 */
import { bindTap } from '../utils/bindTap';

export function showConfirmModal(
  root: HTMLElement,
  opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  },
): void {
  root.querySelector('#game-confirm-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'game-confirm-modal';
  overlay.className = 'settlement-modal game-confirm-modal';
  const confirmLabel = opts.confirmLabel ?? '예';
  const cancelLabel = opts.cancelLabel ?? '아니오';
  overlay.innerHTML = `
    <div class="settlement-panel game-confirm-panel" role="alertdialog" aria-modal="true">
      <header class="settlement-head game-confirm-head">
        <h2>${opts.title}</h2>
      </header>
      <div class="settlement-body game-confirm-body">
        <div class="game-confirm-message">${opts.message}</div>
      </div>
      <footer class="settlement-foot game-confirm-foot">
        <button type="button" class="btn-sm game-confirm-cancel">${cancelLabel}</button>
        <button type="button" class="btn-primary game-confirm-ok ${opts.danger ? 'danger' : ''}">${confirmLabel}</button>
      </footer>
    </div>`;

  const close = () => overlay.remove();
  bindTap(overlay.querySelector('.game-confirm-cancel'), close);
  bindTap(overlay.querySelector('.game-confirm-ok'), () => {
    close();
    opts.onConfirm();
  });
  bindTap(overlay, e => {
    if (e.target === overlay) close();
  });
  root.appendChild(overlay);
}
