import type { GameSave } from '../types';
import { getEndgameLockHint, isEndgameUnlocked } from '../systems/EndgameSystem';
import { isExtendedNavUnlocked, isWorldNavUnlocked } from '../systems/uiUnlock';
import { isOnboardingComplete, getGuideChapter } from '../systems/OnboardingSystem';
import { getBossGateTimeProgress, isBossGateReady } from '../systems/floorPacing';
import { getBossCodexThreshold } from '../systems/EncounterSystem';

export { getEndgameLockHint };

/** 엔드게임 잠금 한 줄 (UI 공통) */
export function formatEndgameLockLine(save: GameSave): string {
  if (isEndgameUnlocked(save)) return '';
  const hint = getEndgameLockHint(save);
  return hint ? `${hint} 후 해금` : '엔드게임 조건 미달';
}

/** 월드 탭 잠금 */
export function getWorldLockHint(save: GameSave): string {
  if (isWorldNavUnlocked(save)) return '';
  return '2층 도달 후 월드(숙소·캠프) 탭 해금';
}

/** 차원 탭 잠금 — 엔드 해금 시 즉시 오픈 */
export function getDimensionNavLockHint(save: GameSave): string {
  if (isExtendedNavUnlocked(save)) return '';
  if (isEndgameUnlocked(save)) return '';
  const max = save.maxRegion ?? 1;
  if (max < 8) return `8층 도달 후 차원 탭 해금 (현재 ${max}층)`;
  const ch = getGuideChapter(save);
  if (ch > 0) return `시작 가이드 ${ch}/3 완료 후 차원 탭 해금`;
  return '차원 탭 이용 가능';
}

/** 캠프 서브탭 잠금 */
export function getCampSubLockHint(save: GameSave, sub: 'town' | 'guild' | 'market'): string {
  const max = save.maxRegion ?? 1;
  if (sub === 'town' && max < 5) return `5층 도달 후 마을 해금 (현재 ${max}층)`;
  if (sub === 'guild' && max < 8) return `8층 도달 후 길드 해금 (현재 ${max}층)`;
  if (sub === 'market' && max < 10) return `10층 도달 후 시장 해금 (현재 ${max}층)`;
  return '';
}

/** 보스가 안 나올 때 FAQ 한 줄 */
export function getBossGateFaq(save: GameSave, regionId: number, codexPct: number): string {
  if (isBossGateReady(save, regionId, codexPct)) return '';
  const codexNeed = Math.round(getBossCodexThreshold(regionId) * 100);
  const codexCur = Math.round(codexPct * 100);
  const timePct = Math.round(getBossGateTimeProgress(save, regionId) * 100);
  if (codexCur < codexNeed) {
    return `보스는 도감 ${codexNeed}% 이후 등장 · 현재 ${codexCur}%`;
  }
  if (timePct < 100) {
    return `보스는 사냥 시간 충족 후 등장 · 진행 ${timePct}%`;
  }
  return '보스 조건 충족 — 곧 등장합니다';
}
