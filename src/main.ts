import { bootTudukRPG } from './tuduk';

function showFatalError(msg: string) {
  const el = document.getElementById('game-container');
  if (!el) return;
  el.innerHTML = `
    <div class="boot-error">
      <p>${msg}</p>
      <button type="button" onclick="location.reload()">다시 시도</button>
    </div>`;
}

window.addEventListener('error', (ev) => {
  console.error('uncaught', ev.error ?? ev.message);
});

window.addEventListener('unhandledrejection', (ev) => {
  console.error('unhandled rejection', ev.reason);
});

function start() {
  bootTudukRPG().catch((err) => {
    console.error('boot failed', err);
    showFatalError('게임을 불러오지 못했습니다.');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}
