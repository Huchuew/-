import { createStarterSave, getStarterWeaponId } from '../src/tuduk/core/SaveManager.ts';
import { getCharGrowth } from '../src/tuduk/data/growthTrees.ts';
import { getPartyDps, getRegionAvgDef } from '../src/tuduk/systems/StatCalculator.ts';
import { assessPartyReadiness } from '../src/tuduk/data/lateGameBalance.ts';
import { computePartySynergy } from '../src/tuduk/systems/partySynergy.ts';
import { reconcileFormation } from '../src/tuduk/systems/FormationSystem.ts';
import { getMinLevelForFloor } from '../src/tuduk/data/floorProgression.ts';
import { RECIPE_MAP } from '../src/tuduk/data/equipment.ts';
import { getStarterRecipeId } from '../src/tuduk/data/equipmentCatalog.ts';

function addAuditEquip(save, charId, slot, recipeId) {
  const r = RECIPE_MAP[recipeId];
  if (!r) return;
  const uid = `eq_audit_${charId}_${slot}`;
  if (!save.bag.some(b => b.uid === uid)) {
    save.bag.push({ uid, id: r.id, grade: r.grade, slot: r.slot, level: 0 });
  }
  save.chars[charId].equipped[slot] = uid;
}

function setupSave(party, formation) {
  const save = createStarterSave(party[0]);
  save.party = party;
  save.owned = [...new Set([...save.owned, ...party])];
  save.maxRegion = 10;
  save.currentRegion = 10;
  const level = getMinLevelForFloor(10);
  for (const id of party) {
    if (!save.chars[id]) {
      save.chars[id] = {
        id, level: 1, exp: 0, unlockedNodes: [], growthFails: {},
        agility: 0, threat: 0, prestige: 0, equipped: {},
      };
    }
    const st = save.chars[id];
    st.level = level;
    st.exp = 0;
    const nodes = getCharGrowth(id).filter(n => n.reqLevel <= level).slice(0, 5);
    st.unlockedNodes = nodes.map(n => n.id);
    st.prestige = Math.max(2, st.unlockedNodes.filter(x => x.includes('_pr_')).length);
    st.equipped = {};
    const wId = getStarterWeaponId(id);
    const aId = getStarterRecipeId(id, 'armor');
    if (wId) addAuditEquip(save, id, 'weapon', wId);
    if (aId) addAuditEquip(save, id, 'armor', aId);
    if (st.equipped.weapon) st.equipped.ring = st.equipped.weapon;
  }
  save.partyFormation = formation;
  reconcileFormation(save);
  return save;
}

const comps = [
  { name: '무쟁+유진+둥+후', party: ['mujang', 'yujin', 'dung', 'huchu'], form: ['mujang', 'huchu', 'dung', 'yujin'] },
  { name: '무쟁+유진+둥+우', party: ['mujang', 'yujin', 'dung', 'ujang'], form: ['mujang', 'ujang', 'dung', 'yujin'] },
  { name: '테소+유진+둥+후', party: ['teso', 'yujin', 'dung', 'huchu'], form: ['teso', 'huchu', 'dung', 'yujin'] },
  { name: '무쟁+유진+둥+레', party: ['mujang', 'yujin', 'dung', 'lesford'], form: ['mujang', 'lesford', 'dung', 'yujin'] },
  { name: '서영+유진+둥+후', party: ['seoyoung', 'yujin', 'dung', 'huchu'], form: ['seoyoung', 'huchu', 'dung', 'yujin'] },
  { name: '무쟁+이사+둥+후', party: ['mujang', 'isanim', 'dung', 'huchu'], form: ['mujang', 'huchu', 'dung', 'isanim'] },
  { name: '무쟁+유진+둥+산', party: ['mujang', 'yujin', 'dung', 'sanjeok'], form: ['mujang', 'sanjeok', 'dung', 'yujin'] },
  { name: '포켓+유진+둥+후', party: ['pocket', 'yujin', 'dung', 'huchu'], form: ['pocket', 'huchu', 'dung', 'yujin'] },
];

const def = getRegionAvgDef(10);
console.log(`10층 평균 방어: ${def} · 권장 Lv: ${getMinLevelForFloor(10)}\n`);
const rows = [];
for (const c of comps) {
  const save = setupSave(c.party, c.form);
  const dps = getPartyDps(save, def);
  const r = assessPartyReadiness(save, 10);
  const syn = computePartySynergy(save);
  rows.push({
    name: c.name,
    dps,
    ready: r.ready,
    score: r.score,
    atkMult: syn.atkMult,
    healMult: syn.healMult,
  });
}
rows.sort((a, b) => b.dps - a.dps);
for (const row of rows) {
  console.log(
    `${row.name.padEnd(14)} DPS ${String(row.dps).padStart(5)}  ready=${row.ready}  score=${row.score}  atk×${row.atkMult.toFixed(2)}  heal×${row.healMult.toFixed(2)}`,
  );
}
