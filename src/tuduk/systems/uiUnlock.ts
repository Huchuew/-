import type { GameSave } from '../types';
import { isEndgameTeaserVisible, isEndgameUnlocked } from './EndgameSystem';
import { isOnboardingComplete } from './OnboardingSystem';

/** 확장 내비 — 8층+ 또는 야탑 티저(15층+) */
export function isExtendedNavUnlocked(save: GameSave): boolean {
  if (isEndgameUnlocked(save)) return true;
  if (isEndgameTeaserVisible(save)) return true;
  if (isOnboardingComplete(save)) return true;
  if ((save.maxRegion ?? 1) >= 8) return true;
  if ((save.tutorialStep ?? 0) >= 99) return true;
  return false;
}

export function getNavLockHint(save: GameSave): string {
  if (isExtendedNavUnlocked(save)) return '';
  const max = save.maxRegion ?? 1;
  if (max < 8) return `8층 도달 후 야탑 탭 해금 (현재 ${max}층)`;
  return '가이드 완료 후 야탑 탭 이용 가능';
}

/** 월드 탭 — 2층 도달 후 (캠프·상점) */
export function isWorldNavUnlocked(save: GameSave): boolean {
  return (save.maxRegion ?? 1) >= 2 || !!save.inExpedition;
}

export function getWorldNavLockHint(save: GameSave): string {
  if (isWorldNavUnlocked(save)) return '';
  return '2층 도달 후 월드(숙소·캠프) 탭 해금';
}
