/** 10층 진입 — 게임 2막 안내 */
import { bindTap } from '../utils/bindTap';

export function showFloor10PhaseModal(root: HTMLElement, onOk: () => void): void {
  root.querySelector('#floor10-phase-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'floor10-phase-modal';
  overlay.className = 'settlement-modal floor10-phase-modal';
  overlay.innerHTML = `
    <div class="settlement-panel floor10-phase-panel" role="dialog" aria-modal="true">
      <header class="settlement-head floor10-phase-head">
        <p class="floor10-phase-icon" aria-hidden="true">⚡</p>
        <h2>10층 — 게임 2막</h2>
        <p class="floor10-phase-lead">여기부터는 준비 없이 가면 체감이 확 달라집니다</p>
      </header>
      <div class="settlement-body floor10-phase-body">
        <ul class="floor10-checklist">
          <li><strong>3인(10~11층) → 4인(12층+)</strong> — 인원 부족 시 적이 더 강해집니다</li>
          <li><strong>준비도 등급</strong> — 던전 출발·모험단 탭에서 층별 점수 확인</li>
          <li><strong>★ 에픽 시험</strong> — 보스 전 에픽 몬스터가 나올 수 있어요</li>
          <li><strong>캠프 🏕️생산</strong> — 채광·가공으로 재료를 자동 생산하고 창고에 쌓으세요</li>
          <li><strong>전직·성장·장비</strong> — 천천히 맞춰 가면 충분합니다</li>
        </ul>
        <p class="hint">탱·딜·힐 균형 파티 · 숏컷은 보스 다회 클리어 후 개통</p>
      </div>
      <footer class="settlement-foot">
        <button type="button" class="btn-primary floor10-phase-ok">알겠어요 — 출발!</button>
      </footer>
    </div>
  `;

  bindTap(overlay.querySelector('.floor10-phase-ok'), () => {
    overlay.remove();
    onOk();
  });
  root.appendChild(overlay);
}
