/**
 * Android AndroidManifest.xml — AdMob App ID 동기화 (cap sync 후 실행)
 * .env.production 또는 환경변수 VITE_ADMOB_APP_ID 사용, 없으면 Google 테스트 ID
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const manifestPath = join(process.cwd(), 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (!existsSync(manifestPath)) {
  console.warn('[patch-android-admob] AndroidManifest.xml 없음 — npx cap add android 먼저 실행');
  process.exit(0);
}

const appId = process.env.VITE_ADMOB_APP_ID
  ?? process.env.ADMOB_APP_ID
  ?? 'ca-app-pub-3940256099942544~3347511713';

let xml = readFileSync(manifestPath, 'utf8');
const metaRe = /(<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value=")[^"]*("\s*\/>)/;

if (!metaRe.test(xml)) {
  console.warn('[patch-android-admob] APPLICATION_ID meta-data 없음 — 수동 추가 필요');
  process.exit(1);
}

xml = xml.replace(metaRe, `$1${appId}$2`);

if (!xml.includes('android:screenOrientation="portrait"')) {
  xml = xml.replace(
    /(<activity[^>]*android:name="\.MainActivity")/,
    '$1\n            android:screenOrientation="portrait"',
  );
}

writeFileSync(manifestPath, xml, 'utf8');
console.log(`[patch-android-admob] AdMob App ID 적용: ${appId}`);
