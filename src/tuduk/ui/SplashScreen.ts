import { STUDIO_NAME } from '../config/release';

const MIN_MS = 2200;
const MAX_MS = 3600;
const STUDIO_HOLD_MS = 900;

const STUDIO_ICON = './assets/splash/hotchoc-lab.png';
const GAME_ICON = './assets/icons/icon-192.webp';

export function showSplashScreen(container: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    container.innerHTML = `
      <div id="splash-screen">
        <div class="splash-stage splash-stage--studio splash-stage--active" data-stage="studio">
          <img class="splash-icon" src="${STUDIO_ICON}" alt="${STUDIO_NAME}" width="112" height="112" decoding="async" />
          <p class="splash-studio">${STUDIO_NAME}</p>
        </div>
        <div class="splash-stage splash-stage--game" data-stage="game">
          <img class="splash-icon splash-icon--game" src="${GAME_ICON}" alt="투닥투닥RPG" width="120" height="120" decoding="async" />
          <div class="splash-logo-text">투닥투닥</div>
          <div class="splash-logo-sub">RPG</div>
        </div>
        <p class="splash-loading">불러오는 중…</p>
      </div>`;

    const root = container.querySelector('#splash-screen');
    const studioStage = root?.querySelector('[data-stage="studio"]');
    const gameStage = root?.querySelector('[data-stage="game"]');

    window.setTimeout(() => {
      studioStage?.classList.remove('splash-stage--active');
      gameStage?.classList.add('splash-stage--active');
    }, STUDIO_HOLD_MS);

    const finish = () => {
      root?.classList.add('fade-out');
      window.setTimeout(resolve, 360);
    };

    const minWait = Math.max(0, MIN_MS - (Date.now() - started));
    const timer = window.setTimeout(finish, minWait);
    window.setTimeout(() => {
      window.clearTimeout(timer);
      finish();
    }, MAX_MS);
  });
}
