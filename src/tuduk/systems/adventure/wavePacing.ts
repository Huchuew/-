import type { GameSave } from '../../types';
import { isRegionCleared } from '../EncounterSystem';
import {
  accelerateBossPacing, getBossGateRemainSec,
} from '../floorPacing';

export interface WavePaceContext {
  killCount: number;
  isEliteFight: boolean;
  isEpicFight: boolean;
  isBossFight: boolean;
}

/** 웨이브 클리어 시 보스 대기 단축량(초) */
export function computeWavePaceBonus(ctx: WavePaceContext): number {
  let bonus = 4 + ctx.killCount * 2;
  if (ctx.isEliteFight) bonus += 8;
  if (ctx.isEpicFight) bonus += 14;
  return bonus;
}

export interface PaceBonusEvent {
  text: string;
  color: string;
  duration: number;
  small?: boolean;
}

/** 보스 대기 단축 플로팅 텍스트 (없으면 null) */
export function formatWavePaceEvent(
  save: GameSave,
  regionId: number,
  paceBonus: number,
  ctx: Pick<WavePaceContext, 'isBossFight'>,
): PaceBonusEvent | null {
  if (ctx.isBossFight || paceBonus <= 0) return null;
  if (!isRegionCleared(save, regionId)) {
    return { text: `⏱️ 보스 대기 -${paceBonus}초`, color: '#ffcc66', duration: 1.4, small: true };
  }
  if (getBossGateRemainSec(save, regionId) > 0) {
    return { text: `⏱️ 보스까지 -${paceBonus}초`, color: '#ffcc66', duration: 1.2, small: true };
  }
  return null;
}

export function applyWavePaceBonus(save: GameSave, regionId: number, paceBonus: number): void {
  if (paceBonus > 0) accelerateBossPacing(save, regionId, paceBonus);
}
