/**
 * 중반 골드 밸런스 분석 (수정 없음, 수치만 출력)
 * node scripts/gold-balance-analysis.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// TS 모듈 직접 import 대신 핵심 공식을 코드와 동일하게 재현
const REWARD_SCALE = 9.8;
const STARTER_GOLD = 35_000;

function regionKillGoldScale(regionId) {
  const r = Math.max(1, Math.min(50, regionId));
  let scale;
  if (r <= 6) scale = 0.68 + (r - 1) * 0.04;
  else if (r <= 10) scale = 0.88 + (r - 6) * 0.03;
  else if (r <= 12) scale = 1.0 + (r - 10) * 0.08;
  else {
    const t = (r - 12) / (50 - 12);
    scale = 1.16 * Math.pow(3.2, t);
  }
  if (r >= 11 && r <= 20) scale *= 1.1;
  return scale;
}

function scaleKillGold(base, regionId, opts = {}, maxRegion) {
  let g = base * REWARD_SCALE * regionKillGoldScale(regionId);
  if (opts.elite) g *= 2.15;
  if (opts.boss) g *= 1.22;
  if (maxRegion != null && maxRegion <= 10) {
    g *= earlyProgressGoldMult(maxRegion);
  }
  return Math.floor(g * 1.14);
}

const GRADE_ORDER = ['f','e','d','c','b','a','s','sr','ssr','ur','u1','u2','u3','u4','u5','u6','u7','u8','u9','ua'];
const ENHANCE_MULT = { f:1,e:1.2,d:1.4,c:1.65,b:2,a:2.5,s:3.2,sr:4,ssr:5,ur:6.5,u1:7.5,u2:8.5,u3:9.5,u4:10.5,u5:11.5,u6:12.5,u7:13.5,u8:14.5,u9:15.5,ua:17 };
const GRADE_CRAFT_GOLD = [48, 105, 210, 380, 720, 7200, 17800, 285000, 528000, 1175000];

function gradeIndex(g) { return GRADE_ORDER.indexOf(g); }

function earlyEnhanceGoldMult(level, grade) {
  const gi = gradeIndex(grade);
  if (level >= 2) return gi <= 4 ? 0.78 : gi <= 7 ? 0.9 : 1;
  if (level >= 1) return gi <= 4 ? 0.58 : gi <= 7 ? 0.72 : 0.86;
  return gi <= 4 ? 0.45 : gi <= 7 ? 0.58 : 0.72;
}

function enhanceCost(level, grade) {
  const gi = gradeIndex(grade);
  const gradeMult = ENHANCE_MULT[grade];
  const costMult = 1 + (gradeMult - 1) * (gi >= 5 ? 0.52 : 0.35);
  const tierScale = 1 + level * (gi >= 8 ? 0.12 : 0.08);
  const goldBase = gi >= 5 && gi <= 7 ? 7500 : 8800;
  const gold = Math.floor(goldBase * (level + 1) * costMult * tierScale * (1 + level * 0.045) * earlyEnhanceGoldMult(level, grade));
  return gold;
}

function earlyProgressGoldMult(maxRegion) {
  if (maxRegion <= 3) return 1.48;
  if (maxRegion <= 5) return 1.3;
  if (maxRegion <= 8) return 1.12;
  return 1;
}

function offlineGoldPerHour(dps, maxRegion) {
  const progressMult = earlyProgressGoldMult(maxRegion);
  const goldPerHour = Math.max(60, Math.floor(dps * 12 + maxRegion * 35));
  const goldRaw = Math.floor(goldPerHour * 1 * progressMult);
  const goldCap = Math.floor(goldPerHour * 12);
  return Math.min(goldRaw, goldCap);
}

// 몬스터 base gold from monsters.ts typical trash (goblin 12, scaling by region ~ linear)
function avgTrashGoldBase(regionId) {
  return Math.floor(12 + regionId * 2.5);
}

/** 구간 대표 층, 예상 kill/min (코드·QA 추정), 대표 DPS */
const BANDS = [
  { label: '1~10층', floors: [1, 3, 5, 8, 10], killsPerMin: [5, 4.5, 4, 3.5, 3], dps: [45, 80, 150, 280, 450], grade: 'f', enhanceLv: 0 },
  { label: '11~30층', floors: [12, 18, 24, 30], killsPerMin: [2.8, 2.2, 1.8, 1.5], dps: [600, 1200, 2200, 4000], grade: 'a', enhanceLv: 0 },
  { label: '31~60층', floors: [35, 45, 55], killsPerMin: [1.2, 1.0, 0.85], dps: [8000, 18000, 35000], grade: 'sr', enhanceLv: 1 },
  { label: '61층+', floors: [65, 80], killsPerMin: [0.7, 0.55], dps: [55000, 120000], grade: 'ur', enhanceLv: 2 },
];

console.log('=== 투닥투닥 RPG 중반 골드 밸런스 분석 ===\n');
console.log(`STARTER_GOLD(신규): ${STARTER_GOLD.toLocaleString()}\n`);

for (const band of BANDS) {
  console.log(`--- ${band.label} ---`);
  console.log('층 | kill골드 | 1분골드 | 5분골드 | 강화+0 | 강화→1회(분) | 제작(대표) | 제작→(분) | 오프1h');
  for (let i = 0; i < band.floors.length; i++) {
    const floor = band.floors[i];
    const kpm = band.killsPerMin[i];
    const dps = band.dps[i];
    const base = avgTrashGoldBase(floor);
    const killGold = scaleKillGold(base, floor, {}, floor <= 10 ? floor : undefined);
    const minGold = Math.floor(killGold * kpm);
    const fiveMinGold = minGold * 5;
    const enhCost = enhanceCost(band.enhanceLv, band.grade);
    const craftIdx = Math.min(gradeIndex(band.grade), GRADE_CRAFT_GOLD.length - 1);
    const craftGold = GRADE_CRAFT_GOLD[craftIdx] ?? GRADE_CRAFT_GOLD[0];
    const minsToEnh = minGold > 0 ? (enhCost / minGold).toFixed(1) : '∞';
    const minsToCraft = minGold > 0 ? (craftGold / minGold).toFixed(1) : '∞';
    const off1h = offlineGoldPerHour(dps, floor);
    console.log(
      `${String(floor).padStart(2)} | ${String(killGold).padStart(6)} | ${String(minGold).padStart(7)} | ${String(fiveMinGold).padStart(8)} | ${String(enhCost).padStart(7)} | ${String(minsToEnh).padStart(10)} | ${String(craftGold).padStart(9)} | ${String(minsToCraft).padStart(8)} | ${off1h}`,
    );
  }
  console.log('');
}

console.log('판단 기준: 강화 1회 30초~2분(초반) / 3~8분(중반) / 10분+ 위험');
console.log('※ kill/min은 전투+이동+루트 포함 QA 추정치. 실제 DPS·파티·터치에 따라 변동.');
