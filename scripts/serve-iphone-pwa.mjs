/**
 * Mac 없이 iPhone 홈 화면 앱 설치 (PWA)
 * 같은 Wi‑Fi에서 아이폰 Safari로 접속 → 공유 → 홈 화면에 추가
 */
import { spawn, execSync } from 'node:child_process';
import os from 'node:os';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PORT = Number(process.env.PWA_PORT || 4173);
const root = process.cwd();

function getLocalIps() {
  const ips = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const net of ifaces ?? []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return [...new Set(ips)];
}

function pickBestIp(ips) {
  const lan = ips.find((ip) => /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(ip));
  return lan ?? ips[0] ?? '127.0.0.1';
}

console.log('[iphone:pwa] PWA 아이콘 생성...');
execSync(
  'npx @capacitor/assets generate --pwa --assetPath resources --iconBackgroundColor "#000000" --splashBackgroundColor "#000000"',
  { stdio: 'inherit', cwd: root, shell: true },
);

console.log('[iphone:pwa] 웹 빌드...');
execSync('npm run build', { stdio: 'inherit', cwd: root, shell: true });

const ips = getLocalIps();
const ip = pickBestIp(ips);
const url = `http://${ip}:${PORT}`;
const allUrls = ips.map((a) => `   http://${a}:${PORT}`).join('\n');
const guidePath = join(root, 'release', '아이폰-설치방법.txt');
const guide = `투닥투닥RPG — iPhone 설치 (Mac 없이)

1) PC에서 npm run iphone:pwa 실행 (창 닫지 말 것)
2) iPhone Safari 주소창에 아래 중 하나 입력 (192.168 예시 말고 터미널에 나온 주소 사용):

${allUrls}

3) 공유(□↑) → 홈 화면에 추가

안 열리면:
- PC와 iPhone 같은 Wi‑Fi인지 확인
- iPhone LTE 끄고 Wi‑Fi만 사용
- Windows 방화벽에서 4173 포트 허용
`;

mkdirSync(join(root, 'release'), { recursive: true });
writeFileSync(guidePath, guide, 'utf8');
console.log(`\n[iphone:pwa] 안내 파일: ${guidePath}`);
console.log('\n========================================');
console.log('  iPhone Safari — 아래 주소로 접속:');
for (const a of ips) console.log(`  http://${a}:${PORT}`);
console.log('  (192.168.0.10 같은 예시 주소 쓰지 마세요)');
console.log('  → 공유 → 홈 화면에 추가');
console.log('  서버 창을 닫으면 접속이 끊깁니다.');
console.log('========================================\n');

const child = spawn(
  'npx',
  ['vite', 'preview', '--host', '0.0.0.0', `--port`, String(PORT)],
  { stdio: 'inherit', cwd: root, shell: true },
);

child.on('exit', (code) => process.exit(code ?? 0));
