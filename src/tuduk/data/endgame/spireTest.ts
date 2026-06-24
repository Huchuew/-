/** 개발·테스트용 — 18층 보스 클리어 없이 야탑 진입 허용 (프로덕션 빌드 비활성) */
export function isSpireTestBypass(): boolean {
  if (import.meta.env.PROD) return false;
  return import.meta.env.DEV
    || import.meta.env.VITE_SPIRE_TEST_UNLOCK === 'true';
}
