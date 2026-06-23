/** 속파·연속 교전 시 렌더·DOM·저장 부하 완화 */

import type { GameSave } from '../types';

export const MAX_FLOAT_EVENTS = 16;
export const MAX_SLASH_VFX = 5;
export const MAX_PROJECTILE_VFX = 4;

export type CombatFeedbackPreset = 'rich' | 'balanced' | 'lite';

export function getCombatFeedbackPreset(_save: GameSave): CombatFeedbackPreset {
  return 'rich';
}

/** 클리어 층 속파 중 전투 연출·UI를 경량화할지 */
export function shouldCombatPerfLite(
  speedFarm: boolean,
  inExpedition: boolean,
  phase: string,
  waveStreak: number,
): boolean {
  if (!speedFarm || !inExpedition) return false;
  if (phase === 'combat' || phase === 'loot' || phase === 'encounter') return true;
  return phase === 'walk' && waveStreak >= 2;
}

/** lite 프리셋 — 전투 중 항상 경량 (숫자 피드백은 유지) */
export function shouldLiteCombatPerf(
  inExpedition: boolean,
  phase: string,
): boolean {
  if (!inExpedition) return false;
  return phase === 'combat' || phase === 'loot' || phase === 'encounter' || phase === 'boss';
}

/** 속파 중 생략해도 되는 전투 플로터 */
export function shouldSuppressCombatFloater(
  text: string,
  compact: boolean,
  preset: CombatFeedbackPreset = 'balanced',
): boolean {
  if (preset === 'rich') return false;
  if (preset === 'lite') {
    if (/^-\d/.test(text) || text.startsWith('−')) return false;
    if (text === '치명!' || text === '약점!') return false;
    return compact;
  }
  if (!compact) return false;
  if (/^-\d/.test(text) || text.startsWith('−')) return true;
  if (text === '치명!' || text === '약점!' || text === '도트' || text === '방어') return true;
  return false;
}

/** 속파 중 웨이브 클리어 토스트 — 핵심 보상만 */
export function shouldSuppressWaveToast(text: string): boolean {
  if (text.startsWith('⚡ 연속 교전')) return true;
  if (text.includes('COMBO') || text.includes('콤보')) return true;
  if (text.startsWith('📦')) return true;
  if (text.includes('Lv.') && text.includes('!')) return true;
  return false;
}
