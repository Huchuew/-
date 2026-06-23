import type { GameSave } from '../types';
import { CHAR_MAP } from '../data/characters';
import {
  assessPartyReadiness, getMinLevelForFloor, getRequiredPartySize, isLateGameFloor,
} from '../data/lateGameBalance';
import { getBossCodexThreshold } from './EncounterSystem';
import { getBossGateTimeProgress, getMinBossFloorSec, isBossGateReady } from './floorPacing';
import { getGrowthRecommendation } from './RecommendGrowth';
import { getPartyDps, getRegionAvgDef } from './StatCalculator';

/** 원정 중 다음 목표 한 줄 가이드 */
export function getExpeditionFocusHint(save: GameSave, regionId: number, codexPct: number): string | null {
  if (!save.inExpedition || save.location === 'lodging') return null;

  const growth = getGrowthRecommendation(save);
  if (growth && save.gold >= growth.goldCost * 0.85) {
    return `💡 추천: ${growth.label} (${growth.detail})`;
  }

  if (isLateGameFloor(regionId)) {
    const r = assessPartyReadiness(save, regionId);
    const need = getRequiredPartySize(regionId);
    if (save.party.length < need) {
      return `🚫 ${regionId}층 ${need}인 권장 — 현재 ${save.party.length}인 (적 강화)`;
    }
    if (!r.ready && r.issues.length) {
      return `💡 정비: ${r.issues.slice(0, 2).join(' · ')}`;
    }
    if (r.ready) {
      return `✅ 4인 준비 충분 — 공격·방어 보너스 적용`;
    }
  }

  if (!isBossGateReady(save, regionId, codexPct)) {
    const timePct = Math.floor(getBossGateTimeProgress(save, regionId) * 100);
    const codexInt = Math.floor(codexPct * 100);
    const codexNeed = Math.floor(getBossCodexThreshold(regionId) * 100);
    const remainMin = Math.ceil(
      Math.max(0, getMinBossFloorSec(regionId, save) * (1 - getBossGateTimeProgress(save, regionId))) / 60,
    );
    if (codexInt >= codexNeed * 0.7 && timePct < 50) {
      return `💡 도감 OK — 잡몹 처치로 보스 대기 가속 (~${remainMin}분)`;
    }
    if (timePct >= 50 && codexInt < codexNeed) {
      return `💡 시간 OK — 미발견 몬스터 사냥으로 도감 ${codexInt}%→${codexNeed}%`;
    }
    return `💡 보스 준비: 활동 ${timePct}% · 도감 ${codexInt}%`;
  }

  const minLv = getMinLevelForFloor(regionId);
  const low = save.party.find(id => (save.chars[id]?.level ?? 1) < minLv);
  if (low && isLateGameFloor(regionId)) {
    return `💡 ${CHAR_MAP[low]?.name} Lv.${minLv} 전후 권장 (지금 Lv.${save.chars[low]?.level})`;
  }

  const dps = getPartyDps(save, getRegionAvgDef(regionId));
  if (dps < regionId * 28) {
    return `💡 화력 부족 — 장비 강화·성장 후 보스 도전`;
  }

  return `⚔️ 보스 등장 가능 — 전진 유지!`;
}
