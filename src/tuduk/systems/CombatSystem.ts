import type { CombatEntity, GameSave, MonsterDef } from '../types';
import { CHAR_MAP } from '../data/characters';
import {
  calcDamage, calcMagicDamage, computeCharStats, computePartyBuffers,
  getBattleShopBuffAtk, getBattleShopBuffMults,
} from './StatCalculator';
import { getCookBuffMult } from './CookSystem';
import { applyGaugeToEntity, syncCombatGauge } from './GaugeSystem';
import {
  BOSS_HP_MULT, BOSS_SHIELD_HP_PCT, COMBAT_HP_SCALE, getBossPartyTargetDef,
  MONSTER_ATK_MULT, MONSTER_DEF_MULT,
} from '../data/combatBalance';
import { isCharIncapacitated } from './CharacterStatusSystem';
import { getStatMults } from './monsterDebuffs';
import { mergeExpeditionModifiers } from './partyExpeditionMods';
import { getDungeonCampBonuses } from './dungeonCampBonuses';

export function buildPartyCombatants(save: GameSave, opts?: { combatOnly?: boolean }): CombatEntity[] {
  const buffers = computePartyBuffers(save);
  const cook = getCookBuffMult(save);
  const shop = getBattleShopBuffMults(save);
  const dungeonCamp = getDungeonCampBonuses(save);
  const partyIds = opts?.combatOnly
    ? save.party.filter(id => !isCharIncapacitated(save, id))
    : save.party;

  return partyIds.map((id, i) => {
    const def = CHAR_MAP[id]!;
    const state = save.chars[id]!;
    const maxStats = computeCharStats(def, state, save, 1);
    const saved = save.combatHp?.[id];
    const maxHp = Math.floor(maxStats.hp * shop.hp);
    const hpRatio = saved != null ? saved / Math.max(1, maxHp) : 1;
    const s = computeCharStats(def, state, save, Math.min(1, hpRatio));
    const hp = saved != null ? Math.min(saved, maxHp) : maxHp;

    return {
      id,
      name: def.name,
      hp,
      maxHp,
      atk: Math.floor(s.atk * buffers.atk * shop.atk * cook.atk * dungeonCamp.atkMult),
      def: Math.floor(s.def * shop.def * dungeonCamp.defMult),
      mdef: Math.floor(s.mdef * shop.def * dungeonCamp.defMult),
      atkSpd: s.atkSpd * buffers.spd * cook.spd * shop.spd,
      critRate: Math.min(0.8, s.critRate + buffers.crit * 0.05 + dungeonCamp.critBonus + shop.crit),
      critMult: s.critMult,
      color: def.color,
      attackTimer: i * 0.3,
      isPlayer: true,
      aoe: s.aoe,
      aoeBonus: s.aoeBonus,
      pierce: s.pierce,
      berserk: s.berserk,
      statusEffects: [],
      combatModifiers: [],
    };
  }).map(p => {
    mergeExpeditionModifiers(save, p);
    applyGaugeToEntity(save, p);
    return p;
  });
}

export function syncCombatHp(save: GameSave, party: CombatEntity[]) {
  if (!save.combatHp) save.combatHp = {};
  for (const p of party) save.combatHp[p.id] = p.hp;
  syncCombatGauge(save, party);
}

export function buildMonsterCombatant(
  mon: MonsterDef,
  hpScale = 1,
  atkScale = hpScale,
): CombatEntity {
  const bossMult = mon.isBoss ? BOSS_HP_MULT : 1;
  const hp = Math.floor(mon.hp * hpScale * COMBAT_HP_SCALE * bossMult);
  return {
    id: mon.id,
    name: mon.name,
    hp,
    maxHp: hp,
    atk: Math.floor(mon.atk * atkScale * MONSTER_ATK_MULT),
    def: Math.floor(mon.def * hpScale * MONSTER_DEF_MULT * (mon.isBoss ? 0.82 : 1)),
    mdef: mon.mdef,
    atkSpd: mon.isBoss ? 0.65 : 1.0,
    critRate: 0.05,
    critMult: 1.5,
    color: mon.isBoss ? '#ff4444' : mon.isRare ? '#ffd700' : '#88cc44',
    attackTimer: 0.5,
    isPlayer: false,
    aoe: false,
    aoeBonus: 0,
    pierce: false,
    berserk: false,
    bossShield: mon.isBoss ? Math.floor(hp * BOSS_SHIELD_HP_PCT) : 0,
    enraged: false,
    isMagic: mon.isMagic ?? mon.mdef > mon.def + 5,
    element: mon.element ?? 'none',
    statusEffects: [],
  };
}

export interface AttackResult {
  damage: number;
  isCrit: boolean;
  attackerId: string;
  targetId: string;
  isAoe: boolean;
}

export function partyAttack(attacker: CombatEntity, target: CombatEntity): AttackResult {
  const { atkMult } = getStatMults(attacker);
  const isCrit = Math.random() < attacker.critRate;
  let raw = Math.floor(attacker.atk * atkMult);
  if (isCrit) raw = Math.floor(raw * attacker.critMult);

  const targetDef = target.id.includes('boss')
    ? getBossPartyTargetDef(target.def)
    : target.def;
  let dmg = calcDamage(raw, targetDef, attacker.pierce);

  if (attacker.bossShield && attacker.bossShield > 0) {
    /* noop - shield on target handled in AdventureSystem */
  }

  let isAoe = false;
  if (attacker.aoe && dmg > 0) {
    const splash = Math.floor(dmg * (0.25 + attacker.aoeBonus));
    dmg += splash;
    isAoe = true;
  }

  return { damage: dmg, isCrit, attackerId: attacker.id, targetId: target.id, isAoe };
}

export function applyDamageToEnemy(enemy: CombatEntity, rawDmg: number): number {
  let dmg = rawDmg;
  if (enemy.bossShield && enemy.bossShield > 0) {
    const absorbed = Math.min(enemy.bossShield, dmg);
    enemy.bossShield -= absorbed;
    dmg -= absorbed;
  }
  if (dmg > 0) {
    enemy.hp = Math.max(0, enemy.hp - dmg);
    if (enemy.hp / enemy.maxHp < 0.3 && !enemy.enraged && enemy.id.includes('boss')) {
      enemy.enraged = true;
      enemy.atk = Math.floor(enemy.atk * 1.4);
      enemy.atkSpd *= 1.25;
    }
  }
  return dmg;
}

export function monsterAttack(attacker: CombatEntity, target: CombatEntity): AttackResult {
  const dmg = attacker.isMagic
    ? calcMagicDamage(attacker.atk, target.mdef)
    : calcDamage(attacker.atk, target.def);
  return {
    damage: Math.max(1, dmg),
    isCrit: false,
    attackerId: attacker.id,
    targetId: target.id,
    isAoe: false,
  };
}
