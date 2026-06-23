import type { GameSave } from '../types';
import { computePartyBuffers, getBattleShopBuffAtk, getPartyDps, getRegionAvgDef } from './StatCalculator';
import { computePartySynergy } from './partySynergy';
import { getCookBuffMult } from './CookSystem';
import { getReadinessGradeInfo } from './playerGuide';
import { getDungeonCampBonuses } from './dungeonCampBonuses';

export interface SnapshotRow {
  label: string;
  value: string;
  tone?: 'good' | 'bad' | 'neutral';
}

/** 전멸·정산용 — 전투력 구성 요약 */
export function buildCombatPowerSnapshot(save: GameSave, regionId: number): SnapshotRow[] {
  const rows: SnapshotRow[] = [];
  const def = getRegionAvgDef(regionId);
  const dps = getPartyDps(save, def);
  const grade = getReadinessGradeInfo(save, regionId);
  rows.push({
    label: '준비도',
    value: `${grade.label} (${grade.score}%)`,
    tone: grade.grade === 'ready' ? 'good' : grade.grade === 'critical' || grade.grade === 'low' ? 'bad' : 'neutral',
  });
  rows.push({ label: '파티 DPS', value: dps.toLocaleString(), tone: dps >= regionId * 28 ? 'good' : 'bad' });

  const syn = computePartySynergy(save);
  if (syn.atkMult > 1.001) {
    rows.push({ label: '파티 시너지', value: `공격 +${Math.round((syn.atkMult - 1) * 100)}%`, tone: 'good' });
  }

  const buffers = computePartyBuffers(save);
  const cook = getCookBuffMult(save);
  const shop = getBattleShopBuffAtk(save);
  const camp = getDungeonCampBonuses(save);

  if (buffers.atk > 1.001) rows.push({ label: '버퍼·로스터', value: `공격 +${Math.round((buffers.atk - 1) * 100)}%`, tone: 'neutral' });
  if (cook.atk > 1.001) rows.push({ label: '요리 (일시)', value: `공격 +${Math.round((cook.atk - 1) * 100)}%`, tone: 'neutral' });
  if (shop > 1.001) rows.push({ label: '상점 버프 (일시)', value: `공격 +${Math.round((shop - 1) * 100)}%`, tone: 'neutral' });
  if (camp.atkMult > 1.001) rows.push({ label: '던전 캠프 (원정)', value: `공격 +${Math.round((camp.atkMult - 1) * 100)}%`, tone: 'neutral' });

  if (grade.issues.length) {
    rows.push({ label: '미충족', value: grade.issues.slice(0, 2).join(' · '), tone: 'bad' });
  }
  return rows;
}
