import type { GameSave } from '../types';
import { getBossCodexThreshold } from './EncounterSystem';
import { getBossGateTimeProgress, isBossGateReady } from './floorPacing';
import type { EquipCategory } from '../data/equipmentProgress';
import { getReadinessGradeInfo, getRequiredPartySize, isLateGameFloor, LATE_GAME_FLOOR_MIN } from '../data/lateGameBalance';
import { isEpicClearedForFloor } from './partyExpeditionMods';
import { getGrowthRecommendation } from './RecommendGrowth';
import { getPartyDps, getRegionAvgDef } from './StatCalculator';
import { isEndgameUnlocked, getEndgameLockHint, getEndgameTeaserLore, isEndgameTeaserVisible } from './EndgameSystem';

export type ReadinessGrade = 'critical' | 'low' | 'ok' | 'ready';

export interface ReadinessGradeInfo {
  grade: ReadinessGrade;
  label: string;
  cssClass: string;
  score: number;
  issues: string[];
  partyRequired: boolean;
}

export { getReadinessGradeInfo } from '../data/lateGameBalance';

export interface NextPlayerAction {
  icon: string;
  label: string;
  detail: string;
  tab?: 'party' | 'growth' | 'town';
  townSub?: string;
  growthSub?: 'upgrade' | 'equipment' | 'augments';
  equipCategory?: EquipCategory;
  equipCharId?: string;
}

export function formatBossGateProgressSub(
  save: GameSave,
  regionId: number,
  codexPct: number,
): string {
  const timePct = Math.round(getBossGateTimeProgress(save, regionId) * 100);
  const codexTh = getBossCodexThreshold(regionId);
  const codexPctInt = Math.round(codexPct / codexTh * 100);
  const parts = [`활동 ${timePct}%`, `도감 ${codexPctInt}%`];
  if (isLateGameFloor(regionId) && !save.badges.includes(regionId) && !isEpicClearedForFloor(save, regionId)) {
    parts.push('★ 에픽 시험 필요');
  } else if (isLateGameFloor(regionId) && !isEpicClearedForFloor(save, regionId)) {
    parts.push('★ 에픽 권장');
  }
  if (isBossGateReady(save, regionId, codexPct)) parts.push('보스 가능');
  return parts.join(' · ');
}

export function getNextPlayerAction(save: GameSave, regionId = save.currentRegion): NextPlayerAction {
  if (save.location === 'lodging' || !save.inExpedition) {
    const growth = getGrowthRecommendation(save);
    if (growth && save.gold >= growth.goldCost * 0.7) {
      return {
        icon: growth.kind === 'enhance' ? '⚔️' : '📈',
        label: growth.label,
        detail: growth.detail,
        tab: 'growth',
        ...(growth.kind === 'enhance' ? {
          growthSub: 'equipment' as const,
          equipCategory: growth.equipCategory,
          equipCharId: growth.charId,
        } : {}),
      };
    }
    const matTotal = Object.values(save.materials).reduce((a, b) => a + b, 0);
    if (matTotal >= 5 && save.gold < 50_000) {
      return {
        icon: '💰',
        label: '재료 판매',
        detail: `창고 ${matTotal}개 — [마을·거래]에서 골드 확보`,
        tab: 'town',
        townSub: 'trade',
      };
    }
    const need = getRequiredPartySize(Math.max(LATE_GAME_FLOOR_MIN, save.maxRegion ?? 1));
    if (save.party.length < need && (save.maxRegion ?? 1) >= LATE_GAME_FLOOR_MIN - 1) {
      return {
        icon: '👥',
        label: `${need}인 편성`,
        detail: '10층+ 진입 전 동료 영입·파티 합류',
        tab: 'party',
      };
    }
    return {
      icon: '🗺️',
      label: '모험 출발',
      detail: '마을에서 던전 출발',
      tab: 'town',
      townSub: 'dungeon',
    };
  }

  if (isLateGameFloor(regionId)) {
    const grade = getReadinessGradeInfo(save, regionId);
    if (grade.partyRequired) {
      const need = getRequiredPartySize(regionId);
      return {
        icon: '👥',
        label: `${need}인 편성 권장`,
        detail: '귀환 후 [모험단]에서 동료 합류',
        tab: 'party',
      };
    }
    if (grade.grade === 'low' || grade.grade === 'critical') {
      const issue = grade.issues[0] ?? '성장·장비 정비';
      return {
        icon: '⚠️',
        label: '정비 권장',
        detail: issue,
        tab: 'growth',
      };
    }
  }

  if (isEndgameUnlocked(save)) {
    return { icon: '🗼', label: '야탑 도전', detail: '무한의 탑 · 유물 · 각성', tab: 'town', townSub: 'endgame' };
  }
  if (isEndgameTeaserVisible(save)) {
    return { icon: '🗼', label: '야탑의 문', detail: getEndgameTeaserLore(save), tab: 'town', townSub: 'endgame' };
  }

  const dps = getPartyDps(save, getRegionAvgDef(regionId));
  if (dps < regionId * 28) {
    return { icon: '⚔️', label: '화력 부족', detail: '성장·장비 강화 후 보스 도전', tab: 'growth' };
  }

  return { icon: '⚔️', label: '전진 유지', detail: '보스 게이트 충족 시 자동 등장', tab: 'town', townSub: 'dungeon' };
}

export function getEndgameUnlockHint(save: GameSave): string {
  if (isEndgameUnlocked(save)) return '야탑 해금! [마을·야탑]에서 무한의 탑·유물·각성 도전';
  if (isEndgameTeaserVisible(save)) {
    return getEndgameTeaserLore(save);
  }
  const hint = getEndgameLockHint(save);
  return hint ? `야탑 해금: ${hint}` : '';
}
