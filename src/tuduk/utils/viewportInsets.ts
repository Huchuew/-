/** iOS PWA·Safari safe-area 및 standalone 감지 */

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

let probe: HTMLElement | null = null;

function ensureProbe(): HTMLElement {
  if (probe?.isConnected) return probe;
  probe = document.createElement('div');
  probe.id = 'safe-area-probe';
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:0',
    'height:0',
    'padding-top:env(safe-area-inset-top,0px)',
    'padding-right:env(safe-area-inset-right,0px)',
    'padding-bottom:env(safe-area-inset-bottom,0px)',
    'padding-left:env(safe-area-inset-left,0px)',
    'visibility:hidden',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(probe);
  return probe;
}

export function readSafeAreaInsets(): SafeAreaInsets {
  const el = ensureProbe();
  const s = getComputedStyle(el);
  return {
    top: parseFloat(s.paddingTop) || 0,
    right: parseFloat(s.paddingRight) || 0,
    bottom: parseFloat(s.paddingBottom) || 0,
    left: parseFloat(s.paddingLeft) || 0,
  };
}

export function isStandalonePwa(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua)
    && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function combatLayoutBuffer(canvasH: number): number {
  if (canvasH < 220) return 18;
  if (canvasH < 320) return 14;
  if (canvasH < 420) return 10;
  return 8;
}
