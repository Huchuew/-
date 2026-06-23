import type { GameSave } from '../types';
import { isRegionCleared } from './EncounterSystem';
import { getBossSpawnRate, getBossCodexThreshold } from './EncounterSystem';
import {
  getBossGateRemainSec,
  getBossGateTimeProgress,
} from './floorPacing';
import { formatBossGateProgressSub } from './playerGuide';

export function buildExpeditionProgress(
  save: GameSave,
  opts: {
    region: number;
    codexPct: number;
    isSpeedFarmMode: boolean;
    isBossFight: boolean;
    phaseIsBoss: boolean;
  },
): { pct: number; label: string; sub: string } {
  const { region, codexPct, isSpeedFarmMode, isBossFight, phaseIsBoss } = opts;

  let result: { pct: number; label: string; sub: string };
  if (isSpeedFarmMode) {
    const rate = Math.round(getBossSpawnRate(save, region, codexPct) * 100);
    result = { pct: rate, label: '속파 모드', sub: `보스 확률 ${rate}%` };
  } else if (isRegionCleared(save, region)) {
    const timePct = Math.round(getBossGateTimeProgress(save, region) * 100);
    if (timePct < 100) {
      const remain = getBossGateRemainSec(save, region);
      result = {
        pct: timePct,
        label: '클리어 층',
        sub: `보스까지 ${remain}초 · 잡몹 처치 시 가속`,
      };
    } else {
      const rate = Math.round(getBossSpawnRate(save, region, codexPct) * 100);
      result = { pct: rate, label: '클리어 층', sub: `보스 ${rate}% · 잡몹 처치 시 ↑` };
    }
  } else {
    const timePct = Math.round(getBossGateTimeProgress(save, region) * 100);
    const codexTh = getBossCodexThreshold(region);
    const codexPctInt = Math.round(codexPct / codexTh * 100);
    const pct = Math.min(100, Math.max(timePct, codexPctInt));
    result = {
      pct,
      label: '보스 게이트',
      sub: formatBossGateProgressSub(save, region, codexPct),
    };
  }

  if (isBossFight && phaseIsBoss) {
    return { ...result, pct: 100, sub: '보스와의 전투 진행중!!' };
  }
  return result;
}
