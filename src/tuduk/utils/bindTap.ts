/** iOS WebView·Android WebView에서 click이 씹힐 때 pointerup으로 UI 탭 보장 */
export function bindTap(el: Element | null | undefined, handler: (e: Event) => void): void {
  if (!el) return;
  let lastAt = 0;
  let downX = 0;
  let downY = 0;
  let pointerHandled = false;
  const fire = (e: Event, fromPointer: boolean) => {
    if (!fromPointer && pointerHandled) return;
    const now = Date.now();
    if (now - lastAt < 200) return;
    if (e instanceof PointerEvent) {
      const dx = Math.abs(e.clientX - downX);
      const dy = Math.abs(e.clientY - downY);
      if (dx + dy > 22) return;
    }
    lastAt = now;
    if (fromPointer) {
      pointerHandled = true;
      window.setTimeout(() => { pointerHandled = false; }, 450);
    }
    e.stopPropagation();
    handler(e);
  };
  el.addEventListener('pointerdown', (e: Event) => {
    const pe = e as PointerEvent;
    downX = pe.clientX;
    downY = pe.clientY;
  }, { passive: true });
  el.addEventListener('pointerup', (e) => fire(e, true));
  el.addEventListener('click', (e) => fire(e, false));
}
