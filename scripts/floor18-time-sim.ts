/**
 * 캐릭터별 18층 클리어 예상 시간 (스타터 → 3인 모험단 완성 → 18층)
 * 실행: npx tsx scripts/floor18-time-sim.ts
 */
import { CHARACTERS, CHAR_MAP } from '../src/tuduk/data/characters.ts';
import { getCharGrowth } from '../src/tuduk/data/growthTrees.ts';
import { getRegionBoss, getRegionMonsters } from '../src/tuduk/data/monsters.ts';
import {
  regionMonsterAtkScale, regionMonsterHpScale, scaleKillGold, WALK_PHASE_TIME_MULT,
} from '../src/tuduk/data/combatBalance.ts';
import { assessPartyReadiness, isLateGameFloor } from '../src/tuduk/data/lateGameBalance.ts';
import { getSoloGoldMult } from '../src/tuduk/data/starterBalance.ts';
import { EPIC_POWER_MULT } from '../src/tuduk/systems/epicEncounter.ts';
import { createStarterSave, STARTER_GOLD } from '../src/tuduk/core/SaveManager.ts';
import { expToLevel, getPartyDpsBreakdown, getRegionAvgDef } from '../src/tuduk/systems/StatCalculator.ts';
import { buildMonsterCombatant } from '../src/tuduk/systems/CombatSystem.ts';
import { getMinBossFloorSec } from '../src/tuduk/systems/floorPacing.ts';
import { getBossCodexThreshold } from '../src/tuduk/systems/EncounterSystem.ts';
import { isHealerChar, isTankChar } from '../src/tuduk/data/characters.ts';
import type { CharState, GameSave } from '../src/tuduk/types.ts';

const TRAVEL_BASE_SEC = 1.6;
const TRAVEL_PER_REGION_SEC = 0.45;
const TRAVEL_MAX_SEC = 8;
function calcTravelDurationSec(fromId: number, toId: number): number {
  return Math.min(TRAVEL_MAX_SEC, TRAVEL_BASE_SEC + Math.abs(toId - fromId) * TRAVEL_PER_REGION_SEC);
}

const PLAYER_EFFICIENCY = 1.32;
const FAST_WALK = false;
const LODGING_RECRUIT_SEC = 75;
const BOSS_PITY_EXPECT = expectedBossPityKills();

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec)) return '∞';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

function expectedBossPityKills(): number {
  let expected = 0;
  let survive = 1;
  for (let i = 1; i <= 14; i++) {
    const rate = i === 14 ? 1 : Math.min(0.38, 0.08 + (i - 1) * 0.04);
    expected += i * survive * rate;
    survive *= 1 - rate;
  }
  return expected;
}

function expectedRecruitAttempts(charId: string): number {
  const def = CHAR_MAP[charId];
  if (!def) return 99;
  let pSuccess = 0;
  let expected = 0;
  for (let fails = 0; fails < 25; fails++) {
    const chance = Math.min(0.95, def.recruitRate + Math.min(0.32, fails * 0.035));
    const pThis = (1 - pSuccess) * chance;
    expected += (fails + 1) * pThis;
    pSuccess += pThis;
    if (pSuccess >= 0.995) break;
  }
  return Math.max(1, expected);
}

function autoUnlockNodes(st: CharState, charId: string) {
  const nodes = getCharGrowth(charId)
    .filter(n => n.reqLevel <= st.level && !st.unlockedNodes.includes(n.id))
    .sort((a, b) => a.reqLevel - b.reqLevel || a.id.localeCompare(b.id));
  for (const n of nodes) st.unlockedNodes.push(n.id);
  st.prestige = st.unlockedNodes.filter(id => id.includes('_pr_')).length;
}

function addExp(st: CharState, charId: string, amount: number) {
  st.exp += amount;
  while (st.exp >= expToLevel(st.level)) {
    st.exp -= expToLevel(st.level);
    st.level++;
    autoUnlockNodes(st, charId);
  }
}

function syncEquipment(save: GameSave) {
  for (const id of save.party) {
    const st = save.chars[id];
    if (!st) continue;
    if (st.level >= 5 && !st.equipped?.weapon) {
      st.equipped = { ...st.equipped, weapon: `${id}_w`, armor: `${id}_a` };
    }
  }
}

function isDpsOrBruiser(charId: string): boolean {
  const r = CHAR_MAP[charId]?.equipRole;
  return r === 'dps' || r === 'bruiser';
}

function defaultChar(id: string, level = 1): CharState {
  return {
    id, level, exp: 0, unlockedNodes: [], growthFails: {}, agility: 0,
    threat: 0, prestige: 0, equipped: {},
  };
}

function starterSave(starterId: string): GameSave {
  const save = createStarterSave(starterId);
  save.party = [starterId];
  save.owned = [starterId];
  save.currentRegion = 1;
  save.maxRegion = 1;
  save.inExpedition = true;
  save.location = 'dungeon';
  save.settings.fastWalk = FAST_WALK;
  save.gold = STARTER_GOLD;
  save.starterCharId = starterId;
  const st = save.chars[starterId]!;
  st.level = 1;
  st.exp = 0;
  st.unlockedNodes = [];
  autoUnlockNodes(st, starterId);
  return save;
}

function effectiveDps(save: GameSave, regionId: number): number {
  const readiness = assessPartyReadiness(save, regionId);
  const raw = getPartyDpsBreakdown(save, getRegionAvgDef(regionId))
    .reduce((s, e) => s + e.dps, 0);
  return raw * PLAYER_EFFICIENCY * readiness.playerAtkMult;
}

function mobCombatHp(regionId: number, mobHp: number, mult = 1): number {
  return mobHp * mult;
}

function bossEffectiveHp(regionId: number, mult = 1): number {
  const boss = getRegionBoss(regionId);
  if (!boss) return Infinity;
  const scale = regionMonsterHpScale(regionId);
  const entity = buildMonsterCombatant(boss, scale, regionMonsterAtkScale(regionId));
  return (entity.maxHp + (entity.bossShield ?? 0)) * mult;
}

function walkSec(regionId: number, cleared: boolean): number {
  if (cleared) return (FAST_WALK ? 0.28 : 0.55) * WALK_PHASE_TIME_MULT;
  const mult = 2.0 + regionId * 0.14;
  const walkBase = (FAST_WALK ? 1.2 : 2.4) * mult;
  const jitter = (FAST_WALK ? 0.6 : 1.6) * WALK_PHASE_TIME_MULT * 0.5;
  return walkBase * WALK_PHASE_TIME_MULT + jitter;
}

function encounterSec() { return FAST_WALK ? 0.5 : 1.2; }
function lootSec() { return (FAST_WALK ? 0.6 : 1.5) * WALK_PHASE_TIME_MULT; }

function mobKillCycleSec(regionId: number, dps: number, mobHp: number, cleared: boolean): number {
  const combat = dps > 0 ? mobHp / dps : Infinity;
  return walkSec(regionId, cleared) + encounterSec() + combat + lootSec();
}

function bossFightSec(regionId: number, dps: number, mult = 1): number {
  const hp = bossEffectiveHp(regionId, mult);
  const combat = dps > 0 ? hp / dps : Infinity;
  return encounterSec() + combat + lootSec() + 4;
}

function epicExtraSec(regionId: number, dps: number, mobHp: number, mult: number): number {
  if (!isLateGameFloor(regionId)) return 0;
  const epicHp = mobHp * EPIC_POWER_MULT * mult;
  return mobKillCycleSec(regionId, dps, epicHp, false) + 6;
}

function avgMob(regionId: number) {
  const mons = getRegionMonsters(regionId);
  if (!mons.length) return { exp: 0, hp: 1, gold: 0 };
  const scale = regionMonsterHpScale(regionId);
  return {
    exp: mons.reduce((s, m) => s + m.exp, 0) / mons.length,
    gold: mons.reduce((s, m) => s + m.gold, 0) / mons.length,
    hp: mons.reduce((s, m) => {
      const ent = buildMonsterCombatant(m, scale, regionMonsterAtkScale(regionId));
      return s + ent.hp;
    }, 0) / mons.length,
  };
}

function addPartyExp(save: GameSave, amount: number) {
  for (const id of save.party) {
    const st = save.chars[id];
    if (st) addExp(st, id, amount);
  }
}

function pickNextRecruit(save: GameSave): string | null {
  if (save.party.length >= 3) return null;
  const hasTank = save.party.some(id => isTankChar(id));
  const hasDps = save.party.some(id => isDpsOrBruiser(id));
  const hasHealer = save.party.some(id => isHealerChar(id) && CHAR_MAP[id]?.job === 'healer');

  const pool: string[] = [];
  if (!hasTank) pool.push('mujang', 'seoyoung', 'teso');
  if (!hasHealer) pool.push('yujin');
  if (!hasDps) pool.push('dung', 'huchu', 'ujang', 'lesford');

  const available = [...new Set(pool)]
    .filter(id => !save.owned.includes(id))
    .sort((a, b) => (CHAR_MAP[a]?.cost ?? 1e9) - (CHAR_MAP[b]?.cost ?? 1e9));
  return available[0] ?? null;
}

function lodgingRoundTripSec(floor: number): number {
  return calcTravelDurationSec(1, floor) * 2 + LODGING_RECRUIT_SEC;
}

function tryRecruitAtLodging(save: GameSave, targetId: string, floor: number): number {
  const def = CHAR_MAP[targetId];
  if (!def) return 0;
  const attempts = expectedRecruitAttempts(targetId);
  const totalCost = def.cost * attempts;
  if (save.gold < totalCost) return 0;

  save.gold -= totalCost;
  save.owned.push(targetId);
  if (!save.chars[targetId]) {
    const joinLv = Math.max(1, Math.floor(
      save.party.reduce((s, id) => s + (save.chars[id]?.level ?? 1), 0) / save.party.length,
    ));
    save.chars[targetId] = defaultChar(targetId, joinLv);
    autoUnlockNodes(save.chars[targetId]!, targetId);
  }
  if (save.party.length < 3) save.party.push(targetId);
  save.recruitFails[targetId] = 0;
  return lodgingRoundTripSec(floor);
}

function processRecruits(save: GameSave, floor: number): number {
  let sec = 0;
  while (save.party.length < 3) {
    const next = pickNextRecruit(save);
    if (!next) break;
    const def = CHAR_MAP[next]!;
    const attempts = expectedRecruitAttempts(next);
    const needGold = def.cost * attempts;
    if (save.gold < needGold) break;
    sec += tryRecruitAtLodging(save, next, floor);
    syncEquipment(save);
  }
  return sec;
}

function simulateFloor(save: GameSave, regionId: number): { sec: number; gold: number } {
  const cleared = regionId < (save.maxRegion ?? 1);
  save.currentRegion = regionId;
  save.maxRegion = Math.max(save.maxRegion ?? 1, regionId);

  const readiness = assessPartyReadiness(save, regionId);
  const monMult = readiness.monsterMult;

  const mons = getRegionMonsters(regionId);
  const codexThreshold = getBossCodexThreshold(regionId);
  const minBossSec = getMinBossFloorSec(regionId);
  const needDiscover = Math.ceil(codexThreshold * mons.length);
  const mob = avgMob(regionId);
  const scaledMobHp = mobCombatHp(regionId, mob.hp, monMult);

  let activeSec = 0;
  let discovered = 0;
  let floorSec = 0;
  let gateOpen = false;
  let pityKills = 0;
  let gold = 0;

  while (true) {
    const dps = effectiveDps(save, regionId);
    const cycle = mobKillCycleSec(regionId, dps, scaledMobHp, cleared);
    floorSec += cycle;
    activeSec += cycle;
    gold += Math.floor(scaleKillGold(mob.gold) * getSoloGoldMult(save));

    addPartyExp(save, Math.floor(mob.exp));
    if (discovered < needDiscover) discovered++;

    if (!gateOpen) {
      const codexPct = mons.length ? discovered / mons.length : 1;
      if (activeSec >= minBossSec && codexPct >= codexThreshold) gateOpen = true;
      continue;
    }
    pityKills++;
    if (pityKills >= BOSS_PITY_EXPECT) break;
  }

  const dps = effectiveDps(save, regionId);
  floorSec += epicExtraSec(regionId, dps, scaledMobHp, monMult);
  floorSec += bossFightSec(regionId, dps, monMult);

  const boss = getRegionBoss(regionId);
  if (boss) {
    addPartyExp(save, boss.exp);
    gold += Math.floor(scaleKillGold(boss.gold, { boss: true }) * getSoloGoldMult(save));
  }

  save.gold += gold;
  save.maxRegion = Math.max(save.maxRegion ?? 1, regionId + 1);
  if (!save.badges.includes(regionId)) save.badges.push(regionId);
  syncEquipment(save);

  return { sec: floorSec, gold };
}

interface StarterRunResult {
  totalSec: number;
  dungeonSec: number;
  recruitSec: number;
  partyCompleteFloor: number;
  partyNames: string;
  level: number;
  perFloor: number[];
}

function farmGoldLap(save: GameSave, regionId: number, laps: number): number {
  const cleared = regionId < (save.maxRegion ?? 1);
  const mob = avgMob(regionId);
  const readiness = assessPartyReadiness(save, regionId);
  const scaledHp = mobCombatHp(regionId, mob.hp, readiness.monsterMult);
  let sec = 0;
  for (let i = 0; i < laps; i++) {
    const dps = effectiveDps(save, regionId);
    sec += mobKillCycleSec(regionId, dps, scaledHp, cleared);
    save.gold += scaleKillGold(mob.gold);
    addPartyExp(save, Math.floor(mob.exp));
  }
  syncEquipment(save);
  return sec;
}

function ensurePartyBeforeLateGame(save: GameSave, atFloor: number): number {
  let extra = 0;
  const farmRegion = Math.min(6, Math.max(1, (save.maxRegion ?? 1) - 1));
  let guard = 0;
  while (save.party.length < 3 && guard++ < 40) {
    const next = pickNextRecruit(save);
    if (!next) break;
    const need = (CHAR_MAP[next]?.cost ?? 0) * expectedRecruitAttempts(next);
    if (save.gold >= need) {
      extra += processRecruits(save, atFloor);
      continue;
    }
    extra += farmGoldLap(save, farmRegion, 4);
    extra += processRecruits(save, atFloor);
  }
  return extra;
}

function simulateStarterRun(starterId: string): StarterRunResult {
  const save = starterSave(starterId);
  const perFloor: number[] = [];
  let totalSec = 0;
  let recruitSec = 0;
  let dungeonSec = 0;
  let partyCompleteFloor = 0;

  const markPartyComplete = (floor: number) => {
    if (partyCompleteFloor === 0 && save.party.length >= 3) partyCompleteFloor = floor;
  };

  for (let floor = 1; floor <= 18; floor++) {
    if (floor === 10 && save.party.length < 3) {
      const prep = ensurePartyBeforeLateGame(save, 9);
      recruitSec += prep;
      totalSec += prep;
      dungeonSec += prep;
      markPartyComplete(9);
    }

    if (floor > 1) {
      const travel = calcTravelDurationSec(floor - 1, floor);
      totalSec += travel;
      dungeonSec += travel;
    }

    const recruitBefore = processRecruits(save, floor);
    if (recruitBefore > 0) {
      recruitSec += recruitBefore;
      totalSec += recruitBefore;
      markPartyComplete(floor);
    }

    const { sec } = simulateFloor(save, floor);
    perFloor.push(sec);
    dungeonSec += sec;
    totalSec += sec;

    const recruitAfter = processRecruits(save, floor);
    if (recruitAfter > 0) {
      recruitSec += recruitAfter;
      totalSec += recruitAfter;
      markPartyComplete(floor);
    }
  }

  if (partyCompleteFloor === 0) {
    partyCompleteFloor = save.party.length >= 3 ? 18 : 99;
  }

  return {
    totalSec,
    dungeonSec,
    recruitSec,
    partyCompleteFloor,
    partyNames: save.party.map(id => CHAR_MAP[id]?.name ?? id).join('+'),
    level: save.chars[starterId]!.level,
    perFloor,
  };
}

console.log('═'.repeat(80));
console.log('투닥투닥 RPG — 스타터 기준 18층 클리어 예상 시간 (3인 모험단 완성 포함)');
console.log('═'.repeat(80));
console.log(`가정: 해당 캐릭터 스타트 · 골드 파밍 후 숙소 영입(철삼각 우선) · 10층+ 준비도/에픽 반영`);
console.log(`DPS×${PLAYER_EFFICIENCY} · 영입=기대 시도횟수×비용 · 숙소 왕복 ${LODGING_RECRUIT_SEC}초/회`);
console.log('');

const chars = CHARACTERS.filter(c => c.id !== 'hidden');
const rows = chars
  .map(c => ({ ...c, ...simulateStarterRun(c.id) }))
  .sort((a, b) => a.totalSec - b.totalSec);

console.log('순위  스타터    역할      3인완성  파티구성           총시간        영입   던전    18층');
console.log('-'.repeat(80));
rows.forEach((r, i) => {
  const p3 = r.partyCompleteFloor <= 18 ? `${r.partyCompleteFloor}층` : '미달';
  const f18 = r.perFloor[17] ?? 0;
  console.log(
    `${String(i + 1).padStart(2)}.  ${r.name.padEnd(8)} ${r.equipRole.padEnd(8)} ${p3.padEnd(7)} ${r.partyNames.padEnd(16)} ${formatDuration(r.totalSec).padEnd(12)} ${formatDuration(r.recruitSec).padEnd(6)} ${formatDuration(r.dungeonSec).padEnd(7)} ${formatDuration(f18)}`,
  );
});

const fastest = rows[0]!;
const slowest = rows[rows.length - 1]!;
console.log('');
console.log('## 요약');
console.log(`  최단: ${fastest.name} ${formatDuration(fastest.totalSec)} (3인 완성 ~${fastest.partyCompleteFloor}층, ${fastest.partyNames})`);
console.log(`  최장: ${slowest.name} ${formatDuration(slowest.totalSec)}`);
console.log(`  평균: ${formatDuration(rows.reduce((s, r) => s + r.totalSec, 0) / rows.length)}`);
console.log(`  스프레드: ${(slowest.totalSec / Math.max(1, fastest.totalSec)).toFixed(2)}x`);
console.log(`  영입·숙소 왕복 평균: ${formatDuration(rows.reduce((s, r) => s + r.recruitSec, 0) / rows.length)}`);
console.log('');
console.log('※ 사망·성장 실패·장비 강화 대기·광고 미포함. 실제 ±25~40% 변동.');
console.log('═'.repeat(80));
