/** 패널 스크롤 vs 탭 구분 — 세로·가로 스크롤 컨테이너 모두 감지 */
const SCROLL_MOVE_PX = 18;
const SCROLL_BIAS = 0.68;
const H_SCROLL_BIAS = 0.68;
const SCROLL_DELTA = 8;

const H_SCROLL_SEL = [
  '.growth-char-roster-grid',
  '.growth-char-picker',
  '.depart-floor-scroll',
  '.prestige-tree-wrap',
  '.combat-status-hud',
].join(', ');

const INTERACTIVE_SEL = [
  'button',
  'a',
  'label',
  'input',
  'select',
  'textarea',
  'summary',
  '.town-hub-card',
  '.world-nav-item',
  '.growth-char-pick',
  '.sub-tab',
  '.nav-btn',
  '.camp-sub-tab',
  '.cat-tab',
  '.depart-floor-pill',
  '.equip-step',
  '.rival-duel-claim',
  '.rival-claim-btn',
  '.rival-allclear-btn',
  '[data-tab]',
  '[data-town-sub]',
  '[data-craft]',
  '[data-enhance]',
].join(', ');

function findScrollHost(target: EventTarget | null, root: HTMLElement): HTMLElement {
  let el = target instanceof HTMLElement ? target : null;
  while (el && el !== root) {
    if (el.matches(H_SCROLL_SEL)) return el;
    const style = getComputedStyle(el);
    const scrollX = (style.overflowX === 'auto' || style.overflowX === 'scroll')
      && el.scrollWidth > el.clientWidth + 4;
    const scrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll')
      && el.scrollHeight > el.clientHeight + 4;
    if (scrollX || scrollY) return el;
    el = el.parentElement;
  }
  return root;
}

export function attachPanelPointerGuard(root: HTMLElement) {
  let tracking = false;
  let moved = false;
  let horizontal = false;
  let startX = 0;
  let startY = 0;
  let scrollHost: HTMLElement = root;
  let scrollTop0 = 0;
  let scrollLeft0 = 0;
  let gestureCache: { ts: number; block: boolean } | null = null;

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    tracking = true;
    moved = false;
    horizontal = false;
    startX = e.clientX;
    startY = e.clientY;
    scrollHost = findScrollHost(e.target, root);
    scrollTop0 = scrollHost.scrollTop;
    scrollLeft0 = scrollHost.scrollLeft;
    gestureCache = null;
  };

  const onMove = (e: PointerEvent) => {
    if (!tracking) return;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx + dy < SCROLL_MOVE_PX) return;
    if (dx >= dy * H_SCROLL_BIAS && scrollHost.matches(H_SCROLL_SEL)) {
      horizontal = true;
      moved = true;
      return;
    }
    if (dy >= dx * SCROLL_BIAS) moved = true;
  };

  const onEnd = () => {
    tracking = false;
  };

  root.addEventListener('pointerdown', onDown, { passive: true });
  root.addEventListener('pointermove', onMove, { passive: true });
  root.addEventListener('pointerup', onEnd, { passive: true });
  root.addEventListener('pointercancel', onEnd, { passive: true });

  return {
    /** @param target 탭 대상 — 버튼 등은 실제 스크롤이 있을 때만 무시 */
    consumeScrollGesture(target?: EventTarget | null, e?: Event): boolean {
      const ts = e?.timeStamp ?? 0;
      if (ts > 0 && gestureCache?.ts === ts) return gestureCache.block;

      const vScroll = Math.abs(scrollHost.scrollTop - scrollTop0) > SCROLL_DELTA;
      const hScroll = Math.abs(scrollHost.scrollLeft - scrollLeft0) > SCROLL_DELTA;
      const scrolled = vScroll || hScroll;
      const interactive = target instanceof HTMLElement && !!target.closest(INTERACTIVE_SEL);
      const wasScroll = interactive
        ? scrolled
        : (moved || scrolled);
      moved = false;
      horizontal = false;
      tracking = false;
      if (ts > 0) gestureCache = { ts, block: wasScroll };
      return wasScroll;
    },
  };
}
