import type { GameSave } from '../types';
import { todayKey } from './EndgameSystem';
import { ensureOnboarding } from './OnboardingSystem';

const DAILY_BONUS_LABELS = [
  { id: 'gold', icon: '🪙', label: '황금 지하철', detail: '원정 골드 +32%' },
  { id: 'exp', icon: '📈', label: '경험의 아침', detail: '원정 EXP +28%' },
  { id: 'mat', icon: '📦', label: '수집의 날', detail: '재료 드랍 +38%' },
  { id: 'boss', icon: '👑', label: '보스의 기운', detail: '보스 등장 +15%' },
] as const;

export type DailyBonusId = typeof DAILY_BONUS_LABELS[number]['id'];

function daySeed(day: string): number {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getTodayDailyBonus(): typeof DAILY_BONUS_LABELS[number] {
  const day = todayKey();
  const idx = daySeed(day) % DAILY_BONUS_LABELS.length;
  return DAILY_BONUS_LABELS[idx]!;
}

export function isDailyBonusActive(save: GameSave): boolean {
  ensureOnboarding(save);
  const o = save.onboarding!;
  return o.dailyBonusClaimDay === todayKey();
}

export function claimDailyBonus(save: GameSave): { ok: boolean; bonus: typeof DAILY_BONUS_LABELS[number] } {
  ensureOnboarding(save);
  const o = save.onboarding!;
  const today = todayKey();
  if (o.dailyBonusClaimDay === today) return { ok: false, bonus: getTodayDailyBonus() };
  o.dailyBonusClaimDay = today;
  return { ok: true, bonus: getTodayDailyBonus() };
}

export function getDailyBonusGoldMult(save: GameSave): number {
  if (!isDailyBonusActive(save)) return 1;
  const b = getTodayDailyBonus();
  return b.id === 'gold' ? 1.32 : 1;
}

export function getDailyBonusExpMult(save: GameSave): number {
  if (!isDailyBonusActive(save)) return 1;
  return getTodayDailyBonus().id === 'exp' ? 1.28 : 1;
}

export function getDailyBonusMatMult(save: GameSave): number {
  if (!isDailyBonusActive(save)) return 1;
  return getTodayDailyBonus().id === 'mat' ? 1.38 : 1;
}

export function getDailyBonusBossMult(save: GameSave): number {
  if (!isDailyBonusActive(save)) return 1;
  return getTodayDailyBonus().id === 'boss' ? 1.15 : 1;
}
