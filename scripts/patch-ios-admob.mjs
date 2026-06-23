/**
 * iOS Info.plist — AdMob·ATT·세로 고정 (cap sync 후 실행)
 * 사용: node scripts/patch-ios-admob.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const plistPath = join(process.cwd(), 'ios', 'App', 'App', 'Info.plist');
if (!existsSync(plistPath)) {
  console.warn('[patch-ios-admob] ios/App/App/Info.plist 없음 — npx cap add ios 먼저 실행');
  process.exit(0);
}

const appId = process.env.VITE_ADMOB_IOS_APP_ID
  ?? process.env.ADMOB_IOS_APP_ID
  ?? 'ca-app-pub-3940256099942544~1458002511';

const skadIds = [
  'cstr6suwn9.skadnetwork',
  '4fzdc2evr5.skadnetwork',
  '4pfyvq9l8r.skadnetwork',
  '2fnua5tdw4.skadnetwork',
  'ydx93a7ass.skadnetwork',
  '5a6flpkh64.skadnetwork',
  'p78axxw29g.skadnetwork',
  'v72qych5uu.skadnetwork',
  'ludvb6z3bs.skadnetwork',
  'cp8zw746q7.skadnetwork',
  '3sh42y64q3.skadnetwork',
  'c6k4g5qg8m.skadnetwork',
  's39g8k73mm.skadnetwork',
  '3qy4746246.skadnetwork',
  'f38h382jlk.skadnetwork',
  'hs6bdukanm.skadnetwork',
  'v4nxqhlyqp.skadnetwork',
  'wzmmz9fp6w.skadnetwork',
  'yclnxrl5pm.skadnetwork',
  't38b2kh725.skadnetwork',
  '7ug5zh24hu.skadnetwork',
  '9rd848q2bz.skadnetwork',
  'n6fk4nfna4.skadnetwork',
  'kbd757ywx3.skadnetwork',
  '9t245vhmpl.skadnetwork',
  'eh6m2bh4zr.skadnetwork',
  'a2p9lx4jpn.skadnetwork',
  '22mmun2rn5.skadnetwork',
  '4468km3ulz.skadnetwork',
  '2u9pt9hc89.skadnetwork',
  '8s468mfl3y.skadnetwork',
  'klf5c3l5u5.skadnetwork',
  'ppxm28t8ap.skadnetwork',
  'ecpz2srf59.skadnetwork',
  'uw77j35x4d.skadnetwork',
  'pwa73g5rt2.skadnetwork',
  'mlmmfzh3r3.skadnetwork',
  '578prtvx9j.skadnetwork',
  '4dzt52r2t5.skadnetwork',
  'e5fvkxwrpn.skadnetwork',
  '8c4e2ghe7u.skadnetwork',
  'zq492l623r.skadnetwork',
  '3rd42ekr43.skadnetwork',
  '3qcr597p9d.skadnetwork',
];

let xml = readFileSync(plistPath, 'utf8');

/** plist 키 전체 제거 (array/string/boolean) */
function removePlistKey(source, key) {
  let out = source;
  out = out.replace(new RegExp(`\\s*<key>${key}</key>\\s*<array>[\\s\\S]*?<\\/array>`, 'g'), '');
  out = out.replace(new RegExp(`\\s*<key>${key}</key>\\s*<string>[^<]*<\\/string>`, 'g'), '');
  out = out.replace(new RegExp(`\\s*<key>${key}</key>\\s*<(true|false)\\/>`, 'g'), '');
  return out;
}

/** patch 실패로 남은 SKAdNetwork 조각·중복 plist 꼬리 제거 */
function stripOrphanSkadFragments(source) {
  let out = source;
  const end = out.indexOf('</plist>');
  if (end >= 0) {
    out = out.slice(0, end + '</plist>'.length);
  }
  while (out.includes('<key>SKAdNetworkIdentifier</key>') && !out.includes('<key>SKAdNetworkItems</key>')) {
    out = out.replace(/\s*<dict>\s*<key>SKAdNetworkIdentifier<\/key>\s*<string>[^<]+<\/string>\s*<\/dict>/, '');
  }
  return out;
}

for (const key of [
  'GADIsAdManagerApp',
  'GADApplicationIdentifier',
  'NSUserTrackingUsageDescription',
  'SKAdNetworkItems',
  'ITSAppUsesNonExemptEncryption',
]) {
  xml = removePlistKey(xml, key);
}
xml = stripOrphanSkadFragments(xml);

const skadBlock = skadIds.map(id => `\t\t<dict>\n\t\t\t<key>SKAdNetworkIdentifier</key>\n\t\t\t<string>${id}</string>\n\t\t</dict>`).join('\n');

const admobBlock = `
\t<key>GADApplicationIdentifier</key>
\t<string>${appId}</string>
\t<key>NSUserTrackingUsageDescription</key>
\t<string>맞춤형 광고 제공을 위해 사용됩니다. 거부해도 게임 이용에는 영향이 없습니다.</string>
\t<key>SKAdNetworkItems</key>
\t<array>
${skadBlock}
\t</array>
\t<key>ITSAppUsesNonExemptEncryption</key>
\t<false/>`;

xml = xml.replace(/<\/dict>\s*<\/plist>\s*$/i, `${admobBlock}\n</dict>\n</plist>`);

xml = xml.replace(
  /<key>UISupportedInterfaceOrientations<\/key>\s*<array>[\s\S]*?<\/array>/,
  `<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
	</array>`,
);

writeFileSync(plistPath, xml, 'utf8');
console.log(`[patch-ios-admob] Info.plist patched (GADApplicationIdentifier=${appId})`);
