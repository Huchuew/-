import type { RivalDuelResult } from '../systems/RivalDuelSystem';
import { RIVAL_DUEL_DAILY_MAX } from '../systems/RivalDuelSystem';
import { bindTap } from '../utils/bindTap';

export function showRivalDuelResultModal(
  root: HTMLElement,
  result: RivalDuelResult,
  onClose?: () => void,
): void {
  root.querySelector('#rival-duel-result-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'rival-duel-result-modal';
  overlay.className = 'settlement-modal rival-duel-result-modal';

  const headClass = result.won ? 'victory' : 'defeat';
  const title = result.won ? '🏆 격파 성공!' : '💀 격파 실패';
  const lead = result.won
    ? `<strong>${escapeHtml(result.nickname)}</strong>(${escapeHtml(result.teamName)}) 모험단을 격파했습니다!`
    : `<strong>${escapeHtml(result.nickname)}</strong>(${escapeHtml(result.teamName)})에게 패배했습니다.`;

  const rewardBlock = result.won
    ? `<section class="rival-duel-rewards">
        <div class="rival-duel-reward-row">
          <span>골드</span>
          <strong>🪙 +${(result.gold ?? 0).toLocaleString()}</strong>
        </div>
        <div class="rival-duel-reward-row">
          <span>주간 SP 보너스</span>
          <strong>📈 +${result.sp ?? 0} SP</strong>
        </div>
      </section>`
    : `<p class="hint rival-duel-loss-hint">파티를 정비한 뒤 다시 도전해 보세요.</p>`;

  overlay.innerHTML = `
    <div class="settlement-panel rival-duel-result-panel" role="dialog" aria-modal="true">
      <header class="settlement-head ${headClass}">
        <div>
          <h2>${title}</h2>
          <p>${lead}</p>
        </div>
      </header>
      <div class="settlement-body rival-duel-result-body">
        ${rewardBlock}
        <p class="hint rival-duel-attempts">오늘 남은 격파 <strong>${result.remainingAttempts}/${RIVAL_DUEL_DAILY_MAX}</strong></p>
      </div>
      <footer class="settlement-foot">
        <button type="button" class="btn-primary rival-duel-result-ok">${result.won ? '🏠 마을로 돌아가기' : '확인'}</button>
      </footer>
    </div>
  `;

  const close = () => {
    overlay.remove();
    onClose?.();
  };
  bindTap(overlay.querySelector('.rival-duel-result-ok'), close);
  bindTap(overlay, e => {
    if (e.target === overlay) close();
  });

  root.appendChild(overlay);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
