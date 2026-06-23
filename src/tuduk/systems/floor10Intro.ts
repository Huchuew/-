import type { GameSave } from '../types';
import { ensureOnboarding } from './OnboardingSystem';
import { saveGame } from '../core/SaveManager';

/** 숙소 출발·10층 도착 시 2막 안내 모달 */
export function shouldShowFloor10Intro(save: GameSave, departFloor = 1): boolean {
  const maxR = save.maxRegion ?? 1;
  if (maxR < 10) return false;
  if (departFloor < 10 && maxR < 10) return false;
  ensureOnboarding(save);
  return !save.onboarding!.floor10IntroSeen;
}

export function markFloor10IntroSeen(save: GameSave): void {
  ensureOnboarding(save);
  if (save.onboarding!.floor10IntroSeen) return;
  save.onboarding!.floor10IntroSeen = true;
  saveGame(save);
}
