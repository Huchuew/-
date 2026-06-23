/**
 * iPhone(Netlify) 업로드용 — dist 폴더만 최신화
 * 실행: npm run netlify:prepare
 */
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');

console.log('[netlify] PWA 아이콘 + 빌드...');
execSync('npm run pwa:icons', { stdio: 'inherit', cwd: root, shell: true });
execSync('npm run build', { stdio: 'inherit', cwd: root, shell: true });

const pipoyaZip = join(dist, 'assets', '_pipoya_monsters.zip');
if (existsSync(pipoyaZip)) {
  rmSync(pipoyaZip);
  console.log('[netlify] _pipoya_monsters.zip 제외');
}

console.log(`\n[netlify] 완료 — dist 폴더를 Netlify에 올리세요:`);
console.log(`  ${dist}`);
console.log('');
console.log('[netlify] ▶ 배포(업데이트) 대시보드 — dist 내용 드래그 앤 드롭');
console.log('  https://app.netlify.com/sites/resplendent-fairy-4505a4/deploys');
console.log('');
console.log('[netlify] ▶ 플레이 주소 (배포 후 접속)');
console.log('  https://resplendent-fairy-4505a4.netlify.app');
