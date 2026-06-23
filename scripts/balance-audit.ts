/**
 * 캐릭터·파티 밸런스 수치 감사 (StatCalculator 기준)
 * 실행: npx tsx scripts/balance-audit.ts
 */
import { CHARACTERS, CHAR_MAP } from '../src/tuduk/data/characters.ts';
import { GROWTH_NODES, getCharGrowth } from '../src/tuduk/data/growthTrees.ts';
import { MONSTERS } from '../src/tuduk/data/monsters.ts';
import {
  BOSS_HP_MULT, COMBAT_HP_SCALE, MIN_DAMAGE_ATK_PCT, regionMonsterHpScale,
} from '../src/tuduk/data/combatBalance.ts';
import { createStarterSave } from '../src/tuduk/core/SaveManager.ts';
import {
  computeCharStats, getPartyDpsBreakdown, getRegionAvgDef, calcDamage,
} from '../src/tuduk/systems/StatCalculator.ts';
import { buildMonsterCombatant } from '../src/tuduk/systems/CombatSystem.ts';
import type { CharState, GameSave } from '../src/tuduk/types.ts';

function setLevel(st: CharState, level: number) {
  st.level = level;
  st.exp = 0;
}

function unlockMainDpsTree(st: CharState, charId: string, count: number) {
  const trees = [...new Set(getCharGrowth(charId).map(n => n.tree))];
  const mainTree = trees.find(t => !t.includes('방어') && !t.includes('버프') && !t.includes('요리'))
    ?? trees[0];
  const nodes = getCharGrowth(charId)
    .filter(n => n.tree === mainTree)
    .sort((a, b) => a.reqLevel - b.reqLevel || a.id.localeCompare(b.id))
    .slice(0, count);
  st.unlockedNodes = nodes.map(n => n.id);
  st.prestige = st.unlockedNodes.filter(id => id.includes('_pr_')).length;
}

function soloSave(charId: string, level: number, growthNodes: number, region = 1): GameSave {
  const save = createStarterSave(charId);
  save.currentRegion = region;
  save.maxRegion = region;
  setLevel(save.chars[charId]!, level);
  unlockMainDpsTree(save.chars[charId]!, charId, growthNodes);
  return save;
}

function partySave(ids: string[], level: number, growthNodes: number, region = 1): GameSave {
  const save = createStarterSave(ids[0]!);
  save.party = ids;
  save.owned = [...new Set([...save.owned, ...ids])];
  for (const id of ids) {
    if (!save.chars[id]) {
      save.chars[id] = { id, level: 1, exp: 0, unlockedNodes: [], growthFails: {}, agility: 0, threat: 0, prestige: 0, equipped: {} };
    }
    setLevel(save.chars[id]!, level);
    unlockMainDpsTree(save.chars[id]!, id, growthNodes);
  }
  save.currentRegion = region;
  save.maxRegion = region;
  return save;
}

function bossEffectiveHp(regionId: number, bossId: string): number {
  const mon = MONSTERS.find(m => m.id === bossId);
  if (!mon) return 0;
  const hpScale = regionMonsterHpScale(regionId);
  const entity = buildMonsterCombatant(mon, hpScale, regionMonsterAtkScale(regionId));
  return entity.maxHp + (entity.bossShield ?? 0);
}

import { regionMonsterAtkScale } from '../src/tuduk/data/combatBalance.ts';

function ttkSec(partyDps: number, bossHp: number): number {
  if (partyDps <= 0) return Infinity;
  return Math.round(bossHp / partyDps);
}

function growthAtkBudget(charId: string): number {
  return getCharGrowth(charId).reduce((s, n) => s + (n.atk ?? 0), 0);
}

function growthNodeCount(charId: string): number {
  return getCharGrowth(charId).length;
}

console.log('═'.repeat(60));
console.log('투닥투닥 RPG — 캐릭터 밸런스 감사 보고 (수치 시뮬레이션)');
console.log('═'.repeat(60));

// 1) 솔로 DPS 비교 (딜러/브루저 중심)
console.log('\n## 1. 솔로 1인 원정 DPS (Lv.10, 성장 2노드, 1층 방어 기준)');
console.log('캐릭터'.padEnd(10), '역할'.padEnd(8), 'DPS'.padStart(8), 'HP(전투)'.padStart(10), 'ATK'.padStart(6));
const soloRows: { id: string; dps: number; role: string }[] = [];
for (const c of CHARACTERS.filter(x => x.id !== 'hidden')) {
  const save = soloSave(c.id, 10, 2, 1);
  const br = getPartyDpsBreakdown(save, getRegionAvgDef(1))[0];
  const stats = computeCharStats(c, save.chars[c.id]!, save);
  const dps = br?.dps ?? 0;
  soloRows.push({ id: c.id, dps, role: c.equipRole });
  console.log(
    c.name.padEnd(10),
    c.equipRole.padEnd(8),
    String(dps).padStart(8),
    String(stats.hp).padStart(10),
    String(stats.atk).padStart(6),
  );
}

const dpsChars = soloRows.filter(r => r.role === 'dps' || r.role === 'bruiser');
const dpsVals = dpsChars.map(r => r.dps).filter(d => d > 0);
const dpsMin = Math.min(...dpsVals);
const dpsMax = Math.max(...dpsVals);
const dpsSpread = dpsMax / Math.max(1, dpsMin);
console.log(`\n딜러/브루저 DPS 스프레드: ${dpsMin} ~ ${dpsMax} (${dpsSpread.toFixed(2)}x)`);

// 2) 성장 트리 총 ATK 예산
console.log('\n## 2. 성장 트리 총 ATK 보너스 (전 노드 합)');
for (const c of CHARACTERS.filter(x => x.equipRole === 'dps' || x.equipRole === 'bruiser' || x.equipRole === 'tank')) {
  console.log(`  ${c.name.padEnd(8)} 노드 ${String(growthNodeCount(c.id)).padStart(2)}개 · ATK합 ${growthAtkBudget(c.id)}`);
}

// 3) 철삼각 vs 다른 조합
console.log('\n## 3. 파티 조합 DPS (Lv.15, 성장 3노드, 3층)');
const parties: [string, string[]][] = [
  ['철삼각 (무쟁+후추+유진)', ['mujang', 'huchu', 'yujin']],
  ['탱+딜2 (무쟁+둥둥+우쟁)', ['mujang', 'dung', 'ujang']],
  ['원거리 (무쟁+후추+둥둥)', ['mujang', 'huchu', 'dung']],
  ['탱만 3 (무쟁+서영+테소)', ['mujang', 'seoyoung', 'teso']],
  ['딜러 3 (후추+둥둥+우쟁)', ['huchu', 'dung', 'ujang']],
  ['브루저 (무쟁+얌파+큐티)', ['mujang', 'ampa', 'cutie']],
];
for (const [label, ids] of parties) {
  const save = partySave(ids, 15, 3, 3);
  const total = getPartyDpsBreakdown(save, getRegionAvgDef(3)).reduce((s, e) => s + e.dps, 0);
  const br = getPartyDpsBreakdown(save, getRegionAvgDef(3));
  const share = br.map(e => `${e.name}${e.share}%`).join(', ');
  console.log(`  ${label.padEnd(28)} 총DPS ${String(total).padStart(5)} · ${share}`);
}

// 4) 보스 TTK
console.log('\n## 4. 보스 처치 예상 시간 (TTK, 초) — 스킬/터치 미포함');
const bossTests: [string, number, string[]][] = [
  ['1층 고블린족장', 1, ['mujang', 'huchu', 'yujin']],
  ['2층 철기사', 2, ['mujang', 'huchu', 'yujin']],
  ['3층 늑대왕', 3, ['mujang', 'huchu', 'yujin']],
];
for (const [name, region, party] of bossTests) {
  const boss = MONSTERS.find(m => m.regionId === region && m.isBoss);
  if (!boss) continue;
  const hp = bossEffectiveHp(region, boss.id);
  const lv = 8 + region * 4;
  const save = partySave(party, lv, Math.min(3, region + 1), region);
  const dps = getPartyDpsBreakdown(save, getRegionAvgDef(region)).reduce((s, e) => s + e.dps, 0);
  console.log(`  ${name.padEnd(14)} HP~${hp.toLocaleString().padStart(6)} · DPS ${String(dps).padStart(5)} · TTK ${ttkSec(dps, hp)}초 (${Math.round(ttkSec(dps, hp) / 60)}분)`);
}

// 5) 스타터별 초반 체감
console.log('\n## 5. 스타터 캐릭터 솔로 초반 (Lv.5, 성장 1, 1층 보스)');
for (const starter of ['mujang', 'huchu', 'ujang', 'dung', 'yujin']) {
  const save = soloSave(starter, 5, 1, 1);
  const dps = getPartyDpsBreakdown(save)[0]?.dps ?? 0;
  const boss = MONSTERS.find(m => m.id === 'boss_goblin_chief')!;
  const hp = bossEffectiveHp(1, boss.id);
  console.log(`  ${CHAR_MAP[starter]?.name.padEnd(8)} DPS ${String(dps).padStart(4)} · 1층보스 TTK ${ttkSec(dps, hp)}초`);
}

// 6) 탱커 생존 (받는 피해)
console.log('\n## 6. 탱커 vs 딜러 — 보스 1회 타격 받은 피해 (1층 보스 ATK)');
const bossMon = buildMonsterCombatant(
  MONSTERS.find(m => m.id === 'boss_goblin_chief')!,
  regionMonsterHpScale(1),
  regionMonsterAtkScale(1),
);
for (const tid of ['mujang', 'seoyoung', 'teso', 'huchu', 'dung']) {
  const save = soloSave(tid, 12, 2, 1);
  const c = CHAR_MAP[tid]!;
  const s = computeCharStats(c, save.chars[tid]!, save);
  const taken = calcDamage(bossMon.atk, s.def);
  const hitsToDie = Math.ceil(s.hp / Math.max(1, taken));
  console.log(`  ${c.name.padEnd(8)} HP ${String(s.hp).padStart(5)} DEF ${String(s.def).padStart(3)} · 피격 ${taken} · ${hitsToDie}회 사망`);
}

console.log('\n' + '═'.repeat(60));
console.log('※ 실제 전투는 스킬·터치·힐·버프·피로도 등으로 달라집니다.');
console.log('═'.repeat(60));
