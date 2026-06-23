/**
 * 오프라인 보상 계산 스모크 테스트 (Sprint 1 검증용)
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const MAX_OFFLINE_MS = 12 * 60 * 60 * 1000;
const MIN_OFFLINE_MS = 60_000;

function earlyProgressGoldMult(maxRegion) {
  if (maxRegion <= 3) return 1.5;
  if (maxRegion <= 5) return 1.3;
  if (maxRegion <= 8) return 1.12;
  return 1;
}

function calcOffline(dps, maxRegion, elapsedMs, chefBonus = 1) {
  const elapsed = Math.min(elapsedMs, MAX_OFFLINE_MS);
  if (elapsed < MIN_OFFLINE_MS) return { gold: 0, exp: 0, hours: 0 };
  const hours = elapsed / 3_600_000;
  const progressMult = earlyProgressGoldMult(maxRegion);
  const exp = Math.floor(dps * hours * 52 * chefBonus);
  const goldPerHour = Math.max(60, Math.floor(dps * 12 + maxRegion * 35));
  const goldRaw = Math.floor(goldPerHour * hours * chefBonus * progressMult);
  const goldCap = Math.floor(goldPerHour * 12);
  const gold = Math.min(goldRaw, goldCap);
  return { gold, exp, hours: Math.round(hours * 10) / 10 };
}

const cases = [
  { label: '30초 (미지급)', ms: 30_000 },
  { label: '1분', ms: 60_000 },
  { label: '10분', ms: 10 * 60_000 },
  { label: '1시간', ms: 60 * 60_000 },
  { label: '12시간', ms: 12 * 60 * 60_000 },
  { label: '24시간 (12h 캡)', ms: 24 * 60 * 60_000 },
];

const dps = 45;
const maxRegion = 2;

console.log(`[offline-test] DPS=${dps}, maxRegion=${maxRegion}\n`);
for (const c of cases) {
  const r = calcOffline(dps, maxRegion, c.ms);
  console.log(`${c.label.padEnd(16)} → EXP ${String(r.exp).padStart(6)} · GOLD ${String(r.gold).padStart(6)} · ${r.hours}h`);
}
