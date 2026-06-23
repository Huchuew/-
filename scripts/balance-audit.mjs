import { createStarterSave, STARTER_GOLD, getStarterWeaponId } from '../src/tuduk/core/SaveManager.ts';
import { CHAR_MAP } from '../src/tuduk/data/characters.ts';
import { getCharGrowth } from '../src/tuduk/data/growthTrees.ts';
import { getRegionMonsters, getRegionBoss } from '../src/tuduk/data/monsters.ts';
import { REGIONS } from '../src/tuduk/data/regions.ts';
import { RECIPE_MAP } from '../src/tuduk/data/equipment.ts';
import { getStarterRecipeId } from '../src/tuduk/data/equipmentCatalog.ts';
import {
  regionMonsterHpScale, regionMonsterAtkScale, regionMonsterDefScale,
  scaleKillGold, scaleKillExp, COMBAT_HP_SCALE, REWARD_SCALE,
} from '../src/tuduk/data/combatBalance.ts';
import { assessPartyReadiness } from '../src/tuduk/data/lateGameBalance.ts';
import { getMinLevelForFloor } from '../src/tuduk/data/floorProgression.ts';
import { getPartyDps, getRegionAvgDef, expToLevel, goldLevelUpCost } from '../src/tuduk/systems/StatCalculator.ts';
import { getBossSpawnRate } from '../src/tuduk/systems/EncounterSystem.ts';
import { SHOP_POTION_GOLD } from '../src/tuduk/data/economyPricing.ts';
import { getWarehouseUpgradeCost, perItemCapAtLevel } from '../src/tuduk/data/tycoonConfig.ts';
import { getShopPrice } from '../src/tuduk/systems/LodgingShopSystem.ts';
import { reconcileFormation } from '../src/tuduk/systems/FormationSystem.ts';
import { GEM_COST } from '../src/tuduk/systems/GemShop.ts';

function scaledMonster(mon, regionId) {
  const hp = Math.floor(mon.hp * COMBAT_HP_SCALE * regionMonsterHpScale(regionId));
  const atk = Math.floor(mon.atk * regionMonsterAtkScale(regionId) * 1.72);
  const def = Math.floor(mon.def * regionMonsterDefScale(regionId) * 1.32);
  const gold = scaleKillGold(mon.gold);
  const exp = scaleKillExp(mon.exp);
  return { hp, atk, def, gold, exp };
}

function addAuditEquip(save, charId, slot, recipeId) {
  const r = RECIPE_MAP[recipeId];
  if (!r) return;
  const uid = `eq_audit_${charId}_${slot}`;
  if (!save.bag.some(b => b.uid === uid)) {
    save.bag.push({ uid, id: r.id, grade: r.grade, slot: r.slot, level: 0 });
  }
  save.chars[charId].equipped[slot] = uid;
}

function makePartySave(party, region, level, nodes = 5) {
  const save = createStarterSave(party[0]);
  save.party = party;
  save.owned = [...new Set([...save.owned, ...party])];
  save.maxRegion = region;
  save.currentRegion = region;
  save.gold = STARTER_GOLD;
  for (const id of party) {
    const st = save.chars[id];
    st.level = level;
    st.exp = 0;
    st.unlockedNodes = getCharGrowth(id).filter(n => n.reqLevel <= level).slice(0, nodes).map(n => n.id);
    st.prestige = region >= 10
      ? Math.max(2, st.unlockedNodes.filter(x => x.includes('_pr_')).length)
      : st.unlockedNodes.filter(x => x.includes('_pr_')).length;
    st.equipped = {};
    const wId = getStarterWeaponId(id);
    const aId = getStarterRecipeId(id, 'armor');
    if (wId) addAuditEquip(save, id, 'weapon', wId);
    if (aId) addAuditEquip(save, id, 'armor', aId);
    if (st.equipped.weapon) st.equipped.ring = st.equipped.weapon;
  }
  save.partyFormation = party;
  reconcileFormation(save);
  return save;
}

console.log('=== 투닥투닥RPG 밸런스 점검 ===\n');

console.log('【경제 기본】');
console.log(`  신규 시작 골드: ${STARTER_GOLD.toLocaleString()}`);
console.log(`  포션 상점가: ${SHOP_POTION_GOLD.toLocaleString()} (시작 골드의 ${(STARTER_GOLD / SHOP_POTION_GOLD * 100).toFixed(0)}% — ${STARTER_GOLD >= SHOP_POTION_GOLD ? '구매 가능' : '구매 불가'})`);
console.log(`  창고 Lv1 업그레이드: ${getWarehouseUpgradeCost(0).toLocaleString()}`);
console.log(`  창고 Lv10 업그레이드: ${getWarehouseUpgradeCost(9).toLocaleString()}`);
console.log(`  품목당 cap Lv0/Lv10/Lv50: ${perItemCapAtLevel(0)} / ${perItemCapAtLevel(10)} / ${perItemCapAtLevel(50)}`);
console.log(`  젬 비용: 확정영입 ${GEM_COST.recruitGuarantee} · 포션 ${GEM_COST.freePotion} · 2배속 ${GEM_COST.speedBoost}`);

console.log('\n【층별 몬스터 스케일 (잡몹 평균)】');
console.log('  층 | HP배율 | ATK배율 | DEF배율 | 권장Lv | 잡몹HP~ | 잡몹GOLD~ | 잡몹EXP~');
for (const r of REGIONS.slice(0, 15)) {
  const normals = getRegionMonsters(r.id).filter(m => !m.isBoss && !m.isRare);
  if (!normals.length) continue;
  const avg = normals.reduce((a, m) => {
    const s = scaledMonster(m, r.id);
    return { hp: a.hp + s.hp, atk: a.atk + s.atk, gold: a.gold + s.gold, exp: a.exp + s.exp, n: a.n + 1 };
  }, { hp: 0, atk: 0, gold: 0, exp: 0, n: 0 });
  const n = avg.n;
  console.log(
    `  ${String(r.id).padStart(2)} | ${regionMonsterHpScale(r.id).toFixed(2).padStart(5)} | ${regionMonsterAtkScale(r.id).toFixed(2).padStart(6)} | ${regionMonsterDefScale(r.id).toFixed(2).padStart(6)} | ${String(getMinLevelForFloor(r.id)).padStart(4)} | ${Math.floor(avg.hp / n).toLocaleString().padStart(7)} | ${Math.floor(avg.gold / n).toLocaleString().padStart(8)} | ${Math.floor(avg.exp / n).toLocaleString().padStart(7)}`,
  );
}

const stdParty = ['mujang', 'yujin', 'dung', 'huchu'];
console.log('\n【표준 4인(무쟁+유진+둥+후) DPS vs 층 방어】');
console.log('  층 | Lv | 노드 | DPS | 방어~ | DPS/방어 | 준비도 | 몬HP/DPS(초)');
for (const floor of [1, 3, 5, 7, 9, 10, 12, 15]) {
  const lv = getMinLevelForFloor(floor);
  const nodes = floor < 10 ? 3 : 5;
  const save = makePartySave(stdParty, floor, lv, nodes);
  const def = getRegionAvgDef(floor);
  const dps = getPartyDps(save, def);
  const readiness = assessPartyReadiness(save, floor);
  const normals = getRegionMonsters(floor).filter(m => !m.isBoss && !m.isRare);
  const avgHp = normals.length
    ? normals.reduce((s, m) => s + scaledMonster(m, floor).hp, 0) / normals.length
    : 0;
  const ttk = dps > 0 ? (avgHp / dps).toFixed(1) : '-';
  console.log(
    `  ${String(floor).padStart(2)} | ${String(lv).padStart(3)} | ${String(nodes).padStart(3)} | ${String(dps).padStart(4)} | ${String(def).padStart(5)} | ${(dps / Math.max(1, def)).toFixed(2).padStart(7)} | ${String(readiness.score).padStart(4)}${readiness.ready ? '✓' : ' '} | ${ttk}`,
  );
}

console.log('\n【10층 권장 스펙 미달 시 페널티】');
const under = makePartySave(['mujang'], 10, 20, 2);
const ready = makePartySave(stdParty, 10, getMinLevelForFloor(10), 5);
const u = assessPartyReadiness(under, 10);
const rd = assessPartyReadiness(ready, 10);
console.log(`  1인 Lv20 노드2: score=${u.score} 몬배율×${u.monsterMult.toFixed(2)} 공격×${u.playerAtkMult.toFixed(2)}`);
console.log(`  4인 Lv150 노드5: score=${rd.score} 몬배율×${rd.monsterMult.toFixed(2)} 공격×${rd.playerAtkMult.toFixed(2)}`);

console.log('\n【보스 등장률 (도감100%, 균형목표)】');
const save10 = makePartySave(stdParty, 10, 150, 5);
for (const floor of [1, 5, 10]) {
  const cleared = floor < 10;
  const rate = getBossSpawnRate(save10, floor, 1);
  const boss = getRegionBoss(floor);
  const bs = boss ? scaledMonster(boss, floor) : null;
  console.log(`  ${floor}층 보스율 ${(rate * 100).toFixed(0)}% | 보스HP ${bs?.hp.toLocaleString() ?? '-'} GOLD ${bs?.gold.toLocaleString() ?? '-'}`);
}

console.log('\n【레벨업 골드 비용 (1→N 누적)】');
let cum = 0;
for (const lv of [10, 20, 50, 100, 150]) {
  for (let i = 1; i < lv; i++) cum += goldLevelUpCost(i);
  console.log(`  Lv${lv}까지 누적: ${cum.toLocaleString()}`);
  cum = 0;
  for (let i = 1; i < lv; i++) cum += goldLevelUpCost(i);
}

console.log('\n【스타터 난이도 (10층 DPS, Lv권장, 노드5)】');
const recLv10 = getMinLevelForFloor(10);
for (const id of ['dung', 'huchu', 'mujang', 'seoyoung', 'yujin']) {
  const save = makePartySave([id, 'yujin', 'dung', 'huchu'].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4), 10, recLv10, 5);
  if (!save.chars[id]) continue;
  save.party = [id, ...stdParty.filter(x => x !== id)].slice(0, 4);
  reconcileFormation(save);
  const dps = getPartyDps(save, getRegionAvgDef(10));
  console.log(`  ${CHAR_MAP[id]?.name ?? id}: DPS ${dps}`);
}

console.log('\n【잠재 이슈 플래그】');
const issues = [];
if (STARTER_GOLD < SHOP_POTION_GOLD) {
  issues.push(`⚠ 시작 골드(${STARTER_GOLD.toLocaleString()}) < 포션가(${SHOP_POTION_GOLD.toLocaleString()}) — 초반 포션 0회`);
} else {
  issues.push(`✓ 시작 골드로 포션 ${Math.floor(STARTER_GOLD / SHOP_POTION_GOLD)}회 구매 가능`);
}
const saveNew = createStarterSave('dung');
const potionPrice = getShopPrice(saveNew, SHOP_POTION_GOLD, true);
issues.push(`  실제 포션 구매가(고정): ${potionPrice.toLocaleString()}`);

const f10 = makePartySave(stdParty, 10, recLv10, 5);
const f10dps = getPartyDps(f10, getRegionAvgDef(10));
const f10hp = getRegionMonsters(10).filter(m => !m.isBoss && !m.isRare)
  .reduce((s, m) => s + scaledMonster(m, 10).hp, 0) / 2;
if (f10dps > 0 && f10hp / f10dps > 25) {
  issues.push(`⚠ 10층 잡몹 TTK ${(f10hp / f10dps).toFixed(0)}초 — 장기전 가능`);
} else if (f10dps > 0 && f10hp / f10dps < 3) {
  issues.push(`⚠ 10층 잡몹 TTK ${(f10hp / f10dps).toFixed(1)}초 — 너무 빠름`);
} else if (f10dps > 0) {
  issues.push(`✓ 10층 잡몹 TTK ~${(f10hp / f10dps).toFixed(1)}초 (권장 스펙)`);
}

const wh1 = getWarehouseUpgradeCost(0);
if (STARTER_GOLD < wh1) {
  issues.push(`⚠ 시작 골드 < 창고 Lv1(${wh1.toLocaleString()}) — 초반 창고 업그레이드 불가`);
}

issues.forEach(i => console.log(`  ${i}`));
console.log('\n=== 점검 완료 ===');
