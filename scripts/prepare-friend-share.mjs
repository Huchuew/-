/**
 * 지인 공유용 — dist 빌드 + zip (Netlify Drop에 올리면 끝)
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const releaseDir = join(root, 'release');
const zipPath = join(releaseDir, '투닥투닥RPG-친구공유.zip');

console.log('[share] PWA 아이콘 + 빌드...');
execSync('npm run pwa:icons', { stdio: 'inherit', cwd: root, shell: true });
execSync('npm run build', { stdio: 'inherit', cwd: root, shell: true });

mkdirSync(releaseDir, { recursive: true });
if (existsSync(zipPath)) rmSync(zipPath);

// 불필요한 대용량 파일 제외 (Netlify 업로드 실패 방지)
const pipoyaZip = join(root, 'dist', 'assets', '_pipoya_monsters.zip');
if (existsSync(pipoyaZip)) {
  rmSync(pipoyaZip);
  console.log('[share] _pipoya_monsters.zip 제외 (웹 배포용)');
}

const ps = `Compress-Archive -Path "${join(root, 'dist', '*')}" -DestinationPath "${zipPath}" -Force`;
execSync(ps, { stdio: 'inherit', shell: 'powershell.exe' });

const guide = `투닥투닥RPG — 지인 공유

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 iPhone 접속 주소 (Netlify)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  https://resplendent-fairy-4505a4.netlify.app

  Safari 주소창에 위 링크 입력
  → 공유(□↑) → 홈 화면에 추가

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Netlify 다시 올릴 때 (중요!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  zip 말고 dist 폴더 안 내용을 직접 올리세요:

  1) 폴더 열기: ${join(root, 'dist')}
  2) 안에서 Ctrl+A (index.html, assets, manifest 전부 선택)
  3) Netlify → Deploys → 드래그 영역에 끌어다 놓기

  또는 zip: ${zipPath}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Android 친구
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  release 폴더의 APK 파일을 카톡으로내면 끝.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 참고
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• App Store 정식 출시가 아니라서 이렇게 하면 됩니다.
• Mac, Apple 개발자 12만원, TestFlight 전부 필요 없음.
• 나중에 정식 출시할 때만 그때 준비하면 됩니다.
`;

writeFileSync(join(releaseDir, '지인공유-방법.txt'), guide, 'utf8');
console.log(`\n[share] 완료: ${zipPath}`);
console.log('[share] Netlify Drop에 zip 올리고 링크만 친구에게 보내세요.');
console.log(`[share] 안내: ${join(releaseDir, '지인공유-방법.txt')}`);
