import type { GameSave, MonsterDef } from '../types';
import type { LeaderboardEntry } from '../services/PlayerProfileService';
import type { PartyEliteSnapshot } from '../core/supabaseClient';
import type { EncounterPlan } from './EncounterSystem';
import { CHAR_MAP } from '../data/characters';
import { getRegionAvgDef } from './StatCalculator';
import { COMBAT_HP_SCALE } from '../data/combatBalance';

export const RIVAL_MONSTER_PREFIX = 'rival_ghost_';

const DEFAULT_ELITE_CHARS = ['mujang', 'ujang', 'yujin', 'dung'];

const RIVAL_SKILL_FLAVOR: Record<string, string[]> = {
  huchu: ['화염 난사', '운석'],
  mujang: ['방패 강타', '철벽'],
  ujang: ['연속 베기', '섬광'],
  dung: ['저격', '관통 화살'],
  lesford: ['찌르기', '용맹한 일격'],
  ampa: ['광폭', '피의 일격'],
  yujin: ['치유의 빛', '성스러운 타격'],
  seoyoung: ['수호', '방패 돌진'],
  teso: ['성역', '심판'],
  yujin2: ['치유', '타격'],
};

export function pickRivalSkillLabel(charId: string): string {
  const list = RIVAL_SKILL_FLAVOR[charId] ?? ['필살기', '강타'];
  return list[Math.floor(Math.random() * list.length)]!;
}

function syntheticElites(rival: LeaderboardEntry): PartyEliteSnapshot[] {
  const count = Math.min(4, Math.max(2, rival.partySize || 3));
  const lvl = Math.max(8, Math.floor(rival.maxRegion * 1.8));
  return DEFAULT_ELITE_CHARS.slice(0, count).map((charId, i) => ({
    charId,
    level: lvl + i * 2,
    name: CHAR_MAP[charId]?.name ?? charId,
  }));
}

function rivalPowerScale(rival: LeaderboardEntry, save: GameSave): number {
  const myFloor = save.maxRegion ?? 1;
  const gap = rival.maxRegion - myFloor;
  return Math.max(0.82, Math.min(1.18, 1 + gap * 0.03));
}

export function buildRivalGhostMonster(
  rival: LeaderboardEntry,
  elite: PartyEliteSnapshot,
  index: number,
  save: GameSave,
): MonsterDef {
  const def = CHAR_MAP[elite.charId];
  const scale = rivalPowerScale(rival, save);
  const regionDef = getRegionAvgDef(rival.maxRegion);
  const dpsEach = Math.max(400, Math.floor(rival.partyDps / Math.max(2, rival.partySize || 3)));
  const hp = Math.floor(dpsEach * 8 * COMBAT_HP_SCALE * scale);
  const atk = Math.floor((dpsEach * 0.42 + regionDef * 0.15) * scale);
  const defStat = Math.floor((regionDef * 0.35 + elite.level * 2.2) * scale);
  return {
    id: `${RIVAL_MONSTER_PREFIX}${rival.playerId}_${elite.charId}_${index}`,
    name: `${elite.name} Lv.${elite.level}`,
    regionId: rival.maxRegion,
    hp,
    atk,
    def: defStat,
    mdef: Math.floor(defStat * 0.85),
    gold: 0,
    exp: 0,
    isBoss: false,
    isRare: true,
    rareChance: 0,
    drops: [],
    isMagic: def?.job === 'mage' || def?.job === 'healer',
  };
}

export function planRivalDuelEncounter(rival: LeaderboardEntry, save: GameSave): EncounterPlan {
  const elites = rival.partyElites.length ? rival.partyElites : syntheticElites(rival);
  const monsters = elites.map((e, i) => buildRivalGhostMonster(rival, e, i, save));
  return {
    monsters,
    isBoss: false,
    isElite: true,
    isEpic: false,
    spawnCount: monsters.length,
  };
}

export function isRivalGhostMonsterId(id: string): boolean {
  return id.startsWith(RIVAL_MONSTER_PREFIX);
}

export function parseRivalGhostCharId(monId: string): string | null {
  if (!isRivalGhostMonsterId(monId)) return null;
  const parts = monId.split('_');
  return parts.length >= 4 ? parts[parts.length - 2]! : null;
}

export function serializeRivalRun(rival: LeaderboardEntry) {
  return {
    rivalPlayerId: rival.playerId,
    nickname: rival.nickname,
    teamName: rival.teamName,
    maxRegion: rival.maxRegion,
    partyDps: rival.partyDps,
    partyElites: rival.partyElites,
    active: true,
  };
}

export function rivalEntryFromRun(save: GameSave): LeaderboardEntry | null {
  const run = save.rivalDuelRun;
  if (!run?.active) return null;
  return {
    rank: 0,
    playerId: run.rivalPlayerId,
    nickname: run.nickname,
    teamName: run.teamName,
    maxRegion: run.maxRegion,
    partySize: run.partyElites.length || 3,
    rosterSize: run.partyElites.length || 3,
    topDps: run.partyDps,
    partyDps: run.partyDps,
    weeklyScore: 0,
    totalKills: 0,
    touchCount: 0,
    partyElites: run.partyElites,
    isPlayer: false,
  };
}
