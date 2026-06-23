/**
 * A안 Pipoya 에셋 설치 — 명시적 파일 매핑
 * npm run setup:pipoya
 */
import { existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const incoming = join(root, 'tools', 'incoming');
const outMonsters = join(root, 'public', 'assets', 'monsters');
const outChars = join(root, 'public', 'assets', 'characters');

/** Pipoya 실제 스프라이트 기준 매핑 — pipoyaMonsters.ts 와 동기화 */
const MONSTER_FILES = {
  goblin: 'pipo-enemy013.png',
  slime_green: 'pipo-enemy009a.png',
  goblin_rare: 'pipo-enemy013a.png',
  boss_goblin_chief: 'pipo-enemy019.png',
  skeleton: 'pipo-enemy039.png',
  bat: 'pipo-enemy001.png',
  bat_rare: 'pipo-enemy001a.png',
  boss_iron_knight: 'pipo-enemy026.png',
  wolf: 'pipo-enemy002.png',
  boss_wolf_king: 'pipo-enemy023.png',
  ghost: 'pipo-enemy010.png',
  boss_lich: 'pipo-enemy025.png',
  mage_slime: 'pipo-enemy012.png',
  boss_arcane: 'pipo-enemy033.png',
  fish: 'pipo-enemy042.png',
  slime_blue: 'pipo-enemy009.png',
  boss_kraken: 'pipo-enemy046.png',
  treant: 'pipo-enemy006.png',
  bear: 'pipo-enemy037.png',
  boss_treant: 'pipo-enemy045.png',
  shadow: 'pipo-enemy017.png',
  boss_shadow: 'pipo-boss002.png',
  ice_slime: 'pipo-enemy009b.png',
  boss_frost: 'pipo-enemy015.png',
  flower_mon: 'pipo-enemy005.png',
  bee: 'pipo-enemy004.png',
  boss_rose: 'pipo-enemy007.png',
  golem: 'pipo-enemy033b.png',
  boss_brass: 'pipo-enemy033a.png',
  frog: 'pipo-enemy016.png',
  boss_river: 'pipo-enemy046a.png',
  soldier: 'pipo-enemy018.png',
  archer_mob: 'pipo-enemy041.png',
  boss_general: 'pipo-enemy020.png',
  star_slime: 'pipo-enemy030.png',
  boss_stellar: 'pipo-boss001.png',
  boss_sage: 'pipo-enemy043.png',
  boss_forest: 'pipo-enemy045a.png',
  jade_golem: 'pipo-enemy032.png',
  boss_jade: 'pipo-enemy044e.png',
  demon: 'pipo-enemy040.png',
  dragon: 'pipo-enemy021.png',
  dragon_rare: 'pipo-enemy044d.png',
  boss_final: 'pipo-boss004.png',
};

/** Pipoya 32x32 캐릭터 팩 — 폴더 내 PNG 경로 */
const CHAR_FILES = {
  mujang: 'Male/Male 01-1.png',
  dung: 'Male/Male 05-1.png',
  huchu: 'Male/Male 03-1.png',
  lesford: 'Soldier/Soldier 02-1.png',
  ampa: 'Male/Male 06-1.png',
  ujang: 'Male/Male 08-1.png',
  yujin: 'Male/Male 10-1.png',
  seoyoung: 'Female/Female 10-1.png',
  byunghoon: 'Male/Male 11-1.png',
  cutie: 'Female/Female 12-1.png',
  hidden: 'Other/pipo-charachip_soldier01.png',
};

mkdirSync(incoming, { recursive: true });
mkdirSync(outMonsters, { recursive: true });
mkdirSync(outChars, { recursive: true });

function findZip(namePart) {
  if (!existsSync(incoming)) return null;
  return readdirSync(incoming).find(
    f => f.toLowerCase().includes(namePart.toLowerCase()) && f.endsWith('.zip'),
  ) ?? null;
}

async function extractZip(zipPath, destDir) {
  const { execSync } = await import('child_process');
  mkdirSync(destDir, { recursive: true });
  try {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force"`,
      { stdio: 'inherit' },
    );
    return true;
  } catch (e) {
    console.error('압축 해제 실패:', zipPath, e.message);
    return false;
  }
}

function findFileByName(dir, fileName) {
  if (!existsSync(dir)) return null;
  let best = null;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      const found = findFileByName(p, fileName);
      if (found) {
        const preferNonShade = !found.includes('shade') || found.includes('non shade');
        if (!best || (preferNonShade && best.includes('shade') && !best.includes('non shade'))) {
          best = found;
        }
      }
    } else if (ent.name.toLowerCase() === fileName.toLowerCase()) {
      if (!best || p.includes('non shade')) best = p;
    }
  }
  return best;
}

function findCharFile(extractRoot, relPath) {
  const parts = relPath.split('/');
  const fileName = parts.at(-1);
  const sub = parts.slice(0, -1).join('/');
  const direct = join(extractRoot, ...parts);
  if (existsSync(direct)) return direct;
  for (const ent of readdirSync(extractRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const candidate = join(extractRoot, ent.name, sub, fileName);
    if (existsSync(candidate)) return candidate;
    const deep = findFileByName(join(extractRoot, ent.name), fileName);
    if (deep && deep.replace(/\\/g, '/').includes(sub.replace(/\\/g, '/'))) return deep;
  }
  return findFileByName(extractRoot, fileName);
}

function installMonsters(extractRoot) {
  const report = [];
  for (const [gameId, srcName] of Object.entries(MONSTER_FILES)) {
    const src = findFileByName(extractRoot, srcName);
    if (src) {
      copyFileSync(src, join(outMonsters, `${gameId}.png`));
      report.push(`✓ ${gameId} ← ${basename(src)}`);
    } else {
      report.push(`✗ ${gameId} (${srcName} 없음)`);
    }
  }
  return report;
}

function installChars(extractRoot) {
  const report = [];
  for (const [charId, relPath] of Object.entries(CHAR_FILES)) {
    const src = findCharFile(extractRoot, relPath);
    if (src) {
      copyFileSync(src, join(outChars, `${charId}.png`));
      report.push(`✓ ${charId} ← ${basename(src)}`);
    } else {
      report.push(`✗ ${charId} (${relPath} 없음)`);
    }
  }
  return report;
}

async function main() {
  console.log('=== Pipoya A안 에셋 설치 ===\n');

  const monsterZip = findZip('monster pack') ?? findZip('pipoya rpg');
  if (monsterZip) {
    const tmp = join(incoming, '_extract_monsters');
    console.log('[몬스터]', monsterZip);
    if (await extractZip(join(incoming, monsterZip), tmp)) {
      installMonsters(tmp).forEach(l => console.log(l));
    }
  } else {
    console.log('[몬스터] zip 없음');
  }

  const charZip = findZip('character sprites 32') ?? findZip('32x32');
  if (charZip) {
    const tmp = join(incoming, '_extract_chars');
    console.log('\n[캐릭터]', charZip);
    if (await extractZip(join(incoming, charZip), tmp)) {
      installChars(tmp).forEach(l => console.log(l));
    }
  } else {
    console.log('\n[캐릭터] zip 없음');
  }

  console.log('\n완료. 게임 새로고침 후 스프라이트 확인.');
}

main();
