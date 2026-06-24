import { APP_VERSION } from '../config/release';

const BANNER_ID = 'app-update-banner';
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

function parseVersion(v: string): number[] {
  return v.split('.').map(part => Number.parseInt(part, 10) || 0);
}

export function isRemoteVersionNewer(remote: string, local: string): boolean {
  const r = parseVersion(remote);
  const l = parseVersion(local);
  const len = Math.max(r.length, l.length);
  for (let i = 0; i < len; i++) {
    const rv = r[i] ?? 0;
    const lv = l[i] ?? 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

function versionUrl(): string {
  const base = import.meta.env.BASE_URL ?? './';
  return `${base}version.json?t=${Date.now()}`;
}

export async function fetchDeployedVersion(): Promise<string | null> {
  try {
    const res = await fetch(versionUrl(), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json() as { version?: string };
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null;
  }
}

async function clearRuntimeCaches(): Promise<void> {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map(key => caches.delete(key)));
}

/** PWA·홈화면 앱 — 캐시 비우고 최신 빌드 로드 */
export async function applyHardReload(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.update();
  }
  await clearRuntimeCaches();
  window.location.reload();
}

function showUpdateBanner(remoteVersion: string): void {
  if (document.getElementById(BANNER_ID)) return;

  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.className = 'app-update-banner';
  banner.setAttribute('role', 'alert');
  banner.innerHTML = `
    <span class="app-update-banner__text">새 버전 <b>v${remoteVersion}</b> (현재 v${APP_VERSION})</span>
    <button type="button" class="app-update-banner__btn">업데이트</button>
  `;

  banner.querySelector('.app-update-banner__btn')?.addEventListener('click', () => {
    void applyHardReload();
  });

  document.body.appendChild(banner);
}

export async function checkForAppUpdate(): Promise<{ updated: boolean; remote: string | null }> {
  const remote = await fetchDeployedVersion();
  if (!remote) return { updated: false, remote: null };
  if (remote !== APP_VERSION && isRemoteVersionNewer(remote, APP_VERSION)) {
    showUpdateBanner(remote);
    return { updated: true, remote };
  }
  return { updated: false, remote };
}

export function initAppUpdate(): void {
  void checkForAppUpdate();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForAppUpdate();
  });

  window.setInterval(() => { void checkForAppUpdate(); }, CHECK_INTERVAL_MS);

  if ('serviceWorker' in navigator) {
    const base = import.meta.env.BASE_URL ?? './';
    void navigator.serviceWorker.register(`${base}sw.js`, { scope: base })
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              void checkForAppUpdate();
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[appUpdate] service worker register failed', err);
      });
  }
}
