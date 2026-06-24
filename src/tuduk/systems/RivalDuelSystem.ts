import type { GameSave } from '../types';
import type { LeaderboardEntry } from '../services/PlayerProfileService';
import { todayKey } from './EndgameSystem';
import { ensureLeaderboardState } from './LeaderboardSystem';
import { getPartyDps } from './StatCalculator';
import { getRegionAvgDef } from './StatCalculator';
import { notifyRivalDefeat, notifyRivalVictory } from './PlayerMessageSystem';

export const RIVAL_DUEL_DAILY_MAX = 5;
export const RIVAL_DUEL_FLOOR_GAP = 5;
export const RIVAL_DUEL_WIN_SP = 12;
export const RIVAL_DUEL_WIN_GOLD_BASE = 800;

const OFFLINE_RIVAL_NAMES = [
  { nickname: '순찰대 베타', teamName: '고스트 순찰대' },
  { nickname: '지하철 방랑자', teamName: '야간 편대' },
  { nickname: '야탑 도전자', teamName: '등반 연습생' },
];

export interface RivalDuelState {
  dayKey: string;
  attempts: number;
  wins: number;
  lastRivalId?: string;
}

export function ensureRivalDuel(save: GameSave): RivalDuelState {
  const day = todayKey();
  if (!save.rivalDuelTestReset) {
    save.rivalDuelTestReset = true;
    save.rivalDuel = { dayKey: day, attempts: 0, wins: 0 };
    return save.rivalDuel;
  }
  if (!save.rivalDuelTestResetV2) {
    save.rivalDuelTestResetV2 = true;
    const wins = save.rivalDuel?.wins ?? 0;
    save.rivalDuel = { dayKey: day, attempts: 0, wins };
    return save.rivalDuel;
  }
  if (!save.rivalDuel || save.rivalDuel.dayKey !== day) {
    save.rivalDuel = { dayKey: day, attempts: 0, wins: 0 };
  }
  return save.rivalDuel;
}

export function getRivalDuelRemaining(save: GameSave): number {
  const st = ensureRivalDuel(save);
  return Math.max(0, RIVAL_DUEL_DAILY_MAX - st.attempts);
}

export function getRivalDuelButtonLabel(save: GameSave): string {
  const left = getRivalDuelRemaining(save);
  return `격파 ${left}/${RIVAL_DUEL_DAILY_MAX}`;
}

export interface RivalDuelResult {
  won: boolean;
  nickname: string;
  teamName: string;
  message: string;
  gold?: number;
  sp?: number;
  remainingAttempts: number;
}

export function isRivalFloorMatch(save: GameSave, rival: LeaderboardEntry): boolean {
  const myFloor = save.maxRegion ?? 1;
  return Math.abs(rival.maxRegion - myFloor) <= RIVAL_DUEL_FLOOR_GAP;
}

export function canStartRivalDuel(
  save: GameSave,
  rival: LeaderboardEntry,
  inExpedition = false,
): { ok: boolean; reason?: string } {
  if (inExpedition) return { ok: false, reason: '원정 중에는 라이벌 격파를 시작할 수 없어요' };
  if (rival.isPlayer) return { ok: false, reason: '본인과는 대결할 수 없어요' };
  if (!isRivalFloorMatch(save, rival)) {
    return { ok: false, reason: `층 차이 ±${RIVAL_DUEL_FLOOR_GAP} 이내만 격파 가능` };
  }
  if (getRivalDuelRemaining(save) <= 0) {
    return { ok: false, reason: `오늘 격파 횟수 소진 (${RIVAL_DUEL_DAILY_MAX}/${RIVAL_DUEL_DAILY_MAX})` };
  }
  return { ok: true };
}

export function buildOfflineRivalEntries(save: GameSave): LeaderboardEntry[] {
  const myDps = getPartyDps(save, getRegionAvgDef(save.maxRegion ?? 1));
  const myFloor = save.maxRegion ?? 1;
  const weeklyBase = Math.max(40, Math.floor(myDps / 120));
  const eliteChars = ['mujang', 'ujang', 'yujin', 'dung'];
  const lvl = Math.max(8, Math.floor(myFloor * 1.8));

  return OFFLINE_RIVAL_NAMES.map((meta, i) => ({
    rank: i + 2,
    playerId: `offline_rival_${i}`,
    nickname: meta.nickname,
    teamName: meta.teamName,
    maxRegion: Math.max(1, myFloor + (i === 0 ? -1 : i === 1 ? 0 : 1)),
    partySize: 4,
    rosterSize: 4,
    topDps: Math.floor(myDps * (0.9 + i * 0.05)),
    partyDps: Math.floor(myDps * (0.92 + i * 0.06)),
    weeklyScore: weeklyBase + i * 35,
    totalKills: 0,
    touchCount: 0,
    partyElites: eliteChars.slice(0, 3 + (i % 2)).map((charId, j) => ({
      charId,
      level: lvl + j * 2,
      name: charId,
    })),
    isPlayer: false,
  }));
}

export function beginRivalDuelAttempt(save: GameSave, rival: LeaderboardEntry): void {
  const st = ensureRivalDuel(save);
  st.attempts += 1;
  st.lastRivalId = rival.playerId;
}

export function finishRivalDuelWin(
  save: GameSave,
  rival: LeaderboardEntry,
): { gold: number; sp: number; message: string } {
  const st = ensureRivalDuel(save);
  st.wins += 1;
  ensureLeaderboardState(save);
  save.rivalLeague!.bonusSp = (save.rivalLeague!.bonusSp ?? 0) + RIVAL_DUEL_WIN_SP;
  const gold = Math.floor(RIVAL_DUEL_WIN_GOLD_BASE * (1 + (save.maxRegion ?? 1) * 0.04));
  save.gold += gold;
  notifyRivalVictory(save, rival, gold);
  return {
    gold,
    sp: RIVAL_DUEL_WIN_SP,
    message: `⚔️ ${rival.nickname} 모험단 격파! 🪙+${gold.toLocaleString()} · SP+${RIVAL_DUEL_WIN_SP}`,
  };
}

export function finishRivalDuelLoss(
  save: GameSave,
  rival: LeaderboardEntry,
): { message: string } {
  notifyRivalDefeat(save, rival);
  return {
    message: `💀 ${rival.nickname}(${rival.teamName})에게 패배하였습니다`,
  };
}

export function getRivalDuelHint(save: GameSave): string {
  const left = getRivalDuelRemaining(save);
  return `오늘 격파 ${left}/${RIVAL_DUEL_DAILY_MAX} · 결투장에서 모험단 전투`;
}
