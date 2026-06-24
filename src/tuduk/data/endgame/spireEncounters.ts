import { MONSTERS } from '../monsters';
import type { GameSave, MonsterDef } from '../../types';
import type { EncounterPlan } from '../../systems/EncounterSystem';
import {
  regionMonsterAtkScale,
  regionMonsterDefScale,
  regionMonsterHpScale,
} from '../combatBalance';

export interface SpireEncounterWave {
  id: string;
  name: string;
  isBoss: boolean;
  hpWeight: number;
  slot: number;
}

export const SPIRE_WAVES_PER_FLOOR = 3;

export function spireWavesRequired(floor: number): number {
  return isSpireBossFloor(floor) ? 1 : SPIRE_WAVES_PER_FLOOR;
}

export function spireEffectiveRegion(floor: number): number {
  const soft = Math.pow(Math.max(1, floor), 0.62);
  return Math.min(50, 6 + Math.floor(soft * 2.15));
}

const NORMAL_POOL = MONSTERS.filter(m => !m.isBoss && !m.isRare);
const BOSS_POOL = MONSTERS.filter(m => m.isBoss);

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pickFrom<T>(pool: T[], rand: () => number, used: Set<string>, key: (t: T) => string): T | null {
  const avail = pool.filter(m => !used.has(key(m)));
  if (!avail.length) return null;
  return avail[Math.floor(rand() * avail.length)] ?? null;
}

function maxRegionForFloor(floor: number): number {
  return Math.min(18, 1 + Math.floor(Math.pow(Math.max(1, floor), 0.55) * 0.85));
}

function poolForFloor(floor: number, bosses = false): MonsterDef[] {
  const cap = maxRegionForFloor(floor);
  const base = bosses ? BOSS_POOL : NORMAL_POOL;
  return base.filter(m => m.regionId <= cap);
}

export function isSpireBossFloor(floor: number): boolean {
  return floor % 10 === 0 || floor % 25 === 0;
}

export function buildSpireEncounter(floor: number, weekId: string): SpireEncounterWave[] {
  const rand = seeded(floor * 92821 + weekId.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const used = new Set<string>();

  if (isSpireBossFloor(floor)) {
    const boss = pickFrom(poolForFloor(floor, true), rand, used, m => m.id);
    if (boss) {
      return [{
        id: boss.id,
        name: boss.name,
        isBoss: true,
        hpWeight: 1,
        slot: 0,
      }];
    }
  }

  const waveCount = Math.min(4, 1 + Math.floor(floor / 6));
  const waves: SpireEncounterWave[] = [];
  const pool = poolForFloor(floor, false);

  for (let i = 0; i < waveCount; i++) {
    const mon = pickFrom(pool, rand, used, m => m.id);
    if (!mon) break;
    used.add(mon.id);
    waves.push({
      id: mon.id,
      name: mon.name,
      isBoss: false,
      hpWeight: 1,
      slot: i,
    });
  }

  if (!waves.length) {
    const fallback = NORMAL_POOL[0]!;
    waves.push({
      id: fallback.id,
      name: fallback.name,
      isBoss: false,
      hpWeight: 1,
      slot: 0,
    });
  }

  return waves;
}

export function scaleMonsterForSpire(mon: MonsterDef, floor: number, opts?: { boss?: boolean; elite?: boolean }): MonsterDef {
  const eff = spireEffectiveRegion(floor);
  const soft = Math.pow(Math.max(1, floor), 0.72);
  const hpScale = (regionMonsterHpScale(eff) / regionMonsterHpScale(10)) * (1 + soft * 0.018);
  const atkScale = (regionMonsterAtkScale(eff) / regionMonsterAtkScale(10)) * (1 + soft * 0.014);
  const defScale = regionMonsterDefScale(eff) / Math.max(1, regionMonsterDefScale(10));
  const bossMult = (opts?.boss || mon.isBoss) ? 2.25 : 1;
  const eliteMult = opts?.elite ? 1.38 : 1;
  return {
    ...mon,
    regionId: eff,
    isBoss: !!(opts?.boss || mon.isBoss),
    hp: Math.floor(mon.hp * hpScale * bossMult * eliteMult),
    atk: Math.floor(mon.atk * atkScale * bossMult * eliteMult),
    def: Math.floor(mon.def * defScale * bossMult),
    mdef: Math.floor(mon.mdef * defScale * eliteMult),
    gold: Math.floor(mon.gold * (1 + soft * 0.045)),
    exp: Math.floor(mon.exp * (1 + soft * 0.035)),
  };
}

function monsterById(id: string): MonsterDef | undefined {
  return MONSTERS.find(m => m.id === id);
}

export function planSpireWave(save: GameSave): EncounterPlan | null {
  const run = save.spireRun;
  if (!run?.active) return null;

  const floor = run.floor;
  const weekId = run.weekId;
  const waveIndex = run.wavesThisFloor;
  const roster = buildSpireEncounter(floor, weekId);
  const bossFloor = isSpireBossFloor(floor);
  const finalWave = waveIndex >= spireWavesRequired(floor) - 1;

  if (bossFloor || finalWave) {
    const bossId = roster.find(r => r.isBoss)?.id
      ?? pickFrom(poolForFloor(floor, true), seeded(floor + waveIndex), new Set(), m => m.id)?.id
      ?? roster[0]?.id;
    const base = bossId ? monsterById(bossId) : undefined;
    if (!base) return null;
    const boss = scaleMonsterForSpire({ ...base, isBoss: true }, floor, { boss: true });
    return {
      monsters: [boss],
      isBoss: true,
      isElite: false,
      isEpic: false,
      spawnCount: 1,
    };
  }

  const count = Math.min(roster.length, 1 + Math.floor(floor / 12) + (waveIndex > 0 ? 1 : 0));
  const picked = roster.slice(0, count);
  const monsters = picked
    .map(w => monsterById(w.id))
    .filter((m): m is MonsterDef => !!m)
    .map(m => scaleMonsterForSpire(m, floor, { elite: waveIndex === 1 && floor >= 4 }));

  if (!monsters.length) return null;

  return {
    monsters,
    isBoss: false,
    isElite: waveIndex === 1 && floor >= 4,
    isEpic: false,
    spawnCount: monsters.length,
  };
}

export function spireFloorSubtitle(floor: number): string {
  if (isSpireBossFloor(floor)) return '수호 보스 등장';
  const tier = Math.floor(floor / 10);
  if (tier <= 0) return '저층 복도';
  if (tier === 1) return '중층 회랑';
  if (tier === 2) return '고층 성벽';
  return '천공 근처';
}
