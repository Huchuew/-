import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const src = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const releaseDir = join(root, 'release');
const dest = join(releaseDir, '투닥투닥RPG.apk');

mkdirSync(releaseDir, { recursive: true });
copyFileSync(src, dest);
const mb = (statSync(dest).size / (1024 * 1024)).toFixed(2);
console.log(`[release] APK: ${dest} (${mb} MB)`);
