import './styles/tuduk.css';

import { bindAppLifecycle } from './core/Lifecycle';
import { continueBoot } from './core/BootFlow';
import { clearSave, resetGameToFreshStart } from './core/SaveManager';
import { showSplashScreen } from './ui/SplashScreen';

export async function bootTudukRPG() {
  const container = document.getElementById('game-container');
  if (!container) return;

  bindAppLifecycle();
  await showSplashScreen(container);

  try {
    const params = new URLSearchParams(location.search);
    if (params.get('reset') === 'hard') {
      clearSave();
    } else if (params.get('reset') === '1') {
      resetGameToFreshStart();
    }
    if (params.has('reset')) {
      params.delete('reset');
      const qs = params.toString();
      const clean = location.pathname + (qs ? `?${qs}` : '') + location.hash;
      history.replaceState(null, '', clean);
    }
  } catch { /* ignore */ }

  continueBoot(container);
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}
