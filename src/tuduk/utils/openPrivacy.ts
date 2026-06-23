import { Capacitor } from '@capacitor/core';

/** Capacitor WebView·웹 브라우저 모두에서 개인정보처리방침 열기 */
export function openPrivacyPolicy(): void {
  const url = new URL('privacy.html', window.location.href).href;
  if (Capacitor.isNativePlatform()) {
    window.location.assign(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
