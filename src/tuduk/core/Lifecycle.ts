import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { getActiveGame } from '../Game';

export function bindAppLifecycle(): void {
  const onHide = () => getActiveGame()?.pauseLoop();
  const onShow = () => {
    if (document.visibilityState === 'visible') getActiveGame()?.resumeLoop();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide();
    else onShow();
  });
  window.addEventListener('pagehide', onHide);
  window.addEventListener('pageshow', onShow);

  if (Capacitor.isNativePlatform()) {
    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) getActiveGame()?.resumeLoop();
      else getActiveGame()?.pauseLoop();
    });
  }
}
