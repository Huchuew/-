/** Play Store / APK 표시 버전 */
export const APP_VERSION = '2.1.2';

/** 제작 스튜디오 */
export const STUDIO_NAME = '후추랩';

const GOOGLE_TEST_PUBLISHER = 'ca-app-pub-3940256099942544';

/** Google 공식 테스트 광고 단위 — 개발·스테이징 전용 */
const ADMOB_TEST_UNITS = {
  androidAppId: 'ca-app-pub-3940256099942544~3347511713',
  iosAppId: 'ca-app-pub-3940256099942544~1458002511',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
} as const;

function isPlaceholderId(id: string | undefined): boolean {
  return !id || id.includes('XXXXXXXX');
}

function shouldForceTestAds(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_ADMOB_TESTING === 'true';
}

/** 개발·테스트 빌드는 항상 테스트 ID, 프로덕션은 .env.production 값 사용 */
function resolveAdUnit(
  envValue: string | undefined,
  testId: string,
  label: string,
): string {
  if (shouldForceTestAds()) return testId;
  if (!isPlaceholderId(envValue)) return envValue!;
  if (import.meta.env.PROD) {
    console.warn(`[AdMob] ${label}: 프로덕션 ID 미설정 — Google 테스트 ID 사용 (Play 출시 전 .env.production 설정 필요)`);
  }
  return testId;
}

export const ADMOB_APP_ID = resolveAdUnit(
  import.meta.env.VITE_ADMOB_APP_ID,
  ADMOB_TEST_UNITS.androidAppId,
  'Android App ID',
);

export const ADMOB_IOS_APP_ID = resolveAdUnit(
  import.meta.env.VITE_ADMOB_IOS_APP_ID,
  ADMOB_TEST_UNITS.iosAppId,
  'iOS App ID',
);

export const ADMOB_REWARDED_ID = resolveAdUnit(
  import.meta.env.VITE_ADMOB_REWARDED_ID,
  ADMOB_TEST_UNITS.rewarded,
  'Rewarded',
);

export const ADMOB_INTERSTITIAL_ID = resolveAdUnit(
  import.meta.env.VITE_ADMOB_INTERSTITIAL_ID,
  ADMOB_TEST_UNITS.interstitial,
  'Interstitial',
);

function usesGoogleTestAdUnits(): boolean {
  return [ADMOB_REWARDED_ID, ADMOB_INTERSTITIAL_ID, ADMOB_APP_ID, ADMOB_IOS_APP_ID]
    .some(id => id.includes(GOOGLE_TEST_PUBLISHER));
}

/** AdMob 테스트 모드 (테스트 기기·테스트 광고 요청) */
export const ADMOB_TESTING = shouldForceTestAds() || usesGoogleTestAdUnits();

/** 프로덕션 빌드인데 테스트 ID가 남아 있는지 (CI/출시 체크용) */
export const ADMOB_PROD_USES_TEST_IDS = import.meta.env.PROD && usesGoogleTestAdUnits();
