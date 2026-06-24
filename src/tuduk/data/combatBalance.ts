import type { GameSave } from '../types';
import { getMinLevelForFloor, getMinPrestigeForFloor } from './floorProgression';
import { earlyProgressGoldMult } from './economyBalance';

/** 전투 HP 배율 — 캐릭터·몬스터 공통 */
export const COMBAT_HP_SCALE = 10;

/** HP 상향에 맞춘 처치 보상 배율 */
export const REWARD_SCALE = 9.8;

/** 긴 전투에서 필살기 체감 보정 */
export const GAUGE_GAIN_MULT = 1.52;

/** 달리기·루트 구간 배율 (전투 길이 대비 탐색 템포) */
export const WALK_PHASE_TIME_MULT = 0.72;

export const WALK_SCROLL_MULT = 4.2;

/** 웨이브 클리어 후 걷기(루트) 구간 기본 시간(초) */
export const POST_KILL_WALK_SEC = 2.0;

/** 터치(투닥) 추가 피해 — 연타 과다 보상 방지 */
export const TOUCH_HIT_RATIO = 0.26;
export const TOUCH_DMG_MULT = 0.38;
export const TOUCH_MAX_CONTRIBUTORS = 2;
export const TOUCH_COOLDOWN_MS = 185;
export const TOUCH_SKILL_DMG_MULT = 0.38;

/** 파티 버프 스킬 기본 지속(초) — 발동 빈도↓에 맞춰 대폭 상향 */
export const BUFF_SKILL_DURATION_SEC = 32;
/** 방패 막기 버프 지속(초) */
export const BLOCK_BUFF_DURATION_SEC = 16;
/** 몬스터·스킬 디버프 시전 확률 배율 (낮을수록 드묾) */
export const MONSTER_DEBUFF_PROC_MULT = 0.28;
/** 스킬 적중 디버프 시전 확률 배율 */
export const SKILL_DEBUFF_PROC_MULT = 0.30;
/** 지원 스킬(버프·정화) 발동 확률 배율 — 딜 스킬 비중 유지 */
export const SUPPORT_SKILL_PROC_MULT = 0.24;
/** 힐 스킬 발동 확률 추가 배율 (빈도 — 유지) */
export const HEAL_SKILL_PROC_MULT = 0.68;
/** 힐 스킬 회복량 배율 */
export const HEAL_SKILL_PCT_MULT = 0.88;
/** 힐량 — 시전자 공격력 계수 (HP% 회복에 가산) */
export const HEAL_ATK_COEFF = 0.34;
/** 궁극기 힐 회복량 배율 */
export const HEAL_ULTIMATE_PCT_MULT = 0.96;
/** 전역 힐량 보정 (빈도·쿨은 그대로, 회복량만 조절) */
export const HEAL_AMOUNT_GLOBAL_MULT = 0.82;
/** 동일 힐러 연속 회복 쿨 (ms) */
export const HEAL_COOLDOWN_MS = 6_200;
/** 디버프 도트 틱당 피해 보정 (지속↑·발동↓ DPS 유지) */
export const DEBUFF_DOT_DMG_MULT = 1.38;

/** HP 포션 1회 회복량 — 전원 만피 아님, 쓰러진 대상 제외 */
export const POTION_HEAL_FLAT = 10_000;

export interface KillRewardOpts {
  elite?: boolean;
  boss?: boolean;
  epic?: boolean;
}

/** 층별 처치 골드 — 저층 파밍 효율 완화, 고층 보상 가속 */
export function regionKillGoldScale(regionId: number): number {
  const r = Math.max(1, Math.min(MAX_FLOOR, regionId));
  let scale: number;
  if (r <= 6) scale = 0.68 + (r - 1) * 0.04;
  else if (r <= 10) scale = 0.88 + (r - 6) * 0.03;
  else if (r <= 12) scale = 1.0 + (r - 10) * 0.08;
  else {
    const t = (r - 12) / (MAX_FLOOR - 12);
    scale = 1.16 * Math.pow(3.2, t);
  }
  if (r >= 11 && r <= 20) scale *= 1.1;
  return scale;
}

export function scaleKillGold(
  base: number,
  opts: KillRewardOpts = {},
  regionId = 1,
  maxRegion?: number,
): number {
  let g = base * REWARD_SCALE * regionKillGoldScale(regionId);
  if (opts.epic) g *= 2.75;
  else if (opts.elite) g *= 2.15;
  if (opts.boss) g *= 1.22;
  if (maxRegion != null && maxRegion <= 10) {
    g *= earlyProgressGoldMult(maxRegion);
  }
  return Math.floor(g * 1.14);
}

export function scaleKillExp(base: number, opts: KillRewardOpts = {}): number {
  let e = base * REWARD_SCALE * 1.08;
  if (opts.epic) e *= 2.45;
  else if (opts.elite) e *= 1.85;
  if (opts.boss) e *= 1.2;
  return Math.floor(e);
}

/**
 * 1~18층 점진적 난이도 — 초반·중반 체감 대폭 상향 (1~10층 별도 가산)
 */
export const LATE_GAME_FLOOR = 10;
const MAX_FLOOR = 50;

function floorT(regionId: number): number {
  const r = Math.max(1, Math.min(MAX_FLOOR, regionId));
  return (r - 1) / (MAX_FLOOR - 1);
}

/** 지수 곡선 — t^exp 로 후반 가속 */
function floorExpScale(regionId: number, start: number, end: number, exp = 1.38): number {
  const t = floorT(regionId);
  return start * Math.pow(end / start, Math.pow(t, exp));
}

/** 1~12층 추가 배율 — 1층 peak, 12층 1.0 (10층 절벽 완화) */
function earlyFloorBoost(regionId: number, peak: number): number {
  if (regionId > 12) return 1;
  return peak - ((regionId - 1) / 11) * (peak - 1);
}

function lateRamp(regionId: number, fromFloor: number, maxBonus: number): number {
  if (regionId < fromFloor) return 0;
  const t = Math.min(1, (regionId - fromFloor) / (MAX_FLOOR - fromFloor));
  return maxBonus * t;
}

/** 1~3층 튜토리얼 완화 — 4층부터 정상 */
function floorTutorialMult(regionId: number): number {
  if (regionId === 1) return 0.24;
  if (regionId === 2) return 0.50;
  if (regionId === 3) return 0.72;
  return 1;
}

/** 전층 몬스터 추가 배율 */
export const GLOBAL_FLOOR_MONSTER_MULT = 1.12;

export function regionMonsterHpScale(regionId: number): number {
  const base = floorExpScale(regionId, 1.58, 21.5, 1.20);
  let scale = base * earlyFloorBoost(regionId, 1.34) * floorTutorialMult(regionId);
  if (regionId >= 5 && regionId <= 16) scale *= 1.05 + (regionId - 5) * 0.010;
  if (regionId >= 12) scale *= 1 + (regionId - 11) * 0.028;
  if (regionId >= 16) scale *= 1.08;
  if (regionId >= 19) scale *= 1 + (regionId - 18) * 0.022;
  if (regionId >= 35) scale *= 1.12;
  return scale * GLOBAL_FLOOR_MONSTER_MULT;
}

export function regionMonsterAtkScale(regionId: number): number {
  const base = floorExpScale(regionId, 1.28, 17, 1.14);
  let scale = base * earlyFloorBoost(regionId, 1.36) * floorTutorialMult(regionId);
  if (regionId >= 6 && regionId <= 15) scale *= 1.05 + (regionId - 6) * 0.009;
  if (regionId === 10) scale *= 0.92;
  if (regionId === 11) scale *= 0.96;
  if (regionId >= 12) scale *= 1 + (regionId - 11) * 0.024;
  if (regionId >= 16) scale *= 1.06;
  if (regionId >= 19) scale *= 1 + (regionId - 18) * 0.018;
  if (regionId >= 35) scale *= 1.1;
  return scale * GLOBAL_FLOOR_MONSTER_MULT;
}

/** 몬스터 방어 — 고층에서 딜러 성장 없으면 딜이 안 박힘 */
export function regionMonsterDefScale(regionId: number): number {
  const base = floorExpScale(regionId, 1.15, 3.75, 1.22);
  return base * earlyFloorBoost(regionId, 1.28) * floorTutorialMult(regionId) * GLOBAL_FLOOR_MONSTER_MULT;
}

/** 고층 잡몹 공격 속도 — 6층부터 서서히 가속 */
export function regionMonsterAtkSpdMult(regionId: number): number {
  return 1 + lateRamp(regionId, 7, 0.36);
}

/** 전역 플레이어 공속 배율 — 모션 가독성 (TTK는 몬스터·ATK 보정으로 유지) */
export const PLAYER_ATK_SPD_GLOBAL_MULT = 0.62;

/** 플레이어 공격속도 — 4층+ 10층 체감(0.72)으로 통일 (모션 일관성) */
export function regionPlayerAtkSpdMult(regionId: number): number {
  const r = Math.max(1, Math.min(MAX_FLOOR, regionId));
  if (r <= 3) return 0.60 + (r - 1) * 0.04;
  return 0.72;
}

/** 고층 잡몹 방어 관통 */
export function regionMonsterArmorPen(regionId: number): number {
  return Math.min(0.64, lateRamp(regionId, 4, 0.64));
}

/** 고층 잡몹 최소 피해 — 10층 완화 */
export function regionTrashMinDmgPct(regionId: number): number {
  if (regionId <= 10) return Math.min(0.32, lateRamp(regionId, 3, 0.32));
  return Math.min(0.46, lateRamp(regionId, 3, 0.46));
}

/** 파티 방어 실효 감소 — 10층 완화 후 12층부터 본격 상승 */
export function regionPartyDefMult(regionId: number): number {
  if (regionId <= 10) return 0.93;
  if (regionId <= 11) return 0.90;
  const pen = lateRamp(regionId, 12, 0.36);
  return Math.max(0.58, 1 - pen);
}

/** 회복·힐 효율 감소 */
export function regionPlayerHealMult(regionId: number): number {
  const pen = lateRamp(regionId, 3, 0.54);
  return Math.max(0.40, 1 - pen);
}

/** 디버프·독 도트 강도 */
export function regionDebuffScale(regionId: number): number {
  return 1 + lateRamp(regionId, 5, 1.28);
}

/** @deprecated regionMonsterHpScale 사용 */
export function regionMonsterScale(regionId: number): number {
  return regionMonsterHpScale(regionId);
}

/** 몬스터 공격력 추가 배율 */
export const MONSTER_ATK_MULT = 1.72;

/** 몬스터 방어 추가 배율 */
export const MONSTER_DEF_MULT = 1.65;

/** 공격력 대비 최소 피해 (방어 막힘 시 0 데미지 방지) */
export const MIN_DAMAGE_ATK_PCT = 0.21;

/** 파티 → 보스 시 적용 방어 (보스 방어력 체감 완화) */
export const BOSS_PARTY_DEF_MULT = 0.68;

/** 보스 HP 추가 축소 (COMBAT_HP_SCALE 이후) */
export const BOSS_HP_MULT = 0.58;

/** 보스 보호막 비율 (maxHp 대비) */
export const BOSS_SHIELD_HP_PCT = 0.1;

/** 보스전 힐 효율 */
export const BOSS_HEAL_MULT = 0.5;

/** 스킬 치유 상한 — 최대 HP 대비 */
export const SKILL_HEAL_MAX_PCT = 0.1;

/** 보스 → 파티 방어 관통 (탱커 무한 버티기 방지) */
export const BOSS_ARMOR_PEN = 0.34;

/** 보스 공격 최소 피해 (공격력 대비) */
export const BOSS_MIN_ATK_DAMAGE_PCT = 0.32;

/** 전투 지연 시 양측 피해 가속 */
export const COMBAT_FATIGUE_START_SEC = 28;
export const COMBAT_FATIGUE_RAMP_SEC = 75;
export const COMBAT_FATIGUE_MAX_MULT = 2.6;

export function getCombatFatigueMult(elapsedSec: number): number {
  if (elapsedSec <= COMBAT_FATIGUE_START_SEC) return 1;
  const t = Math.min(COMBAT_FATIGUE_RAMP_SEC, elapsedSec - COMBAT_FATIGUE_START_SEC);
  return 1 + (COMBAT_FATIGUE_MAX_MULT - 1) * (t / COMBAT_FATIGUE_RAMP_SEC);
}

export function getBossPartyTargetDef(def: number): number {
  return Math.max(0, Math.floor(def * BOSS_PARTY_DEF_MULT));
}

/** 보스 숙련(復讐) — 이전 처치 1회당 받는 피해 +1% */
export const BOSS_GRUDGE_PCT_PER_KILL = 1;
/** 추가 피해 상한 (+200% = 최종 300% 피해) */
export const BOSS_GRUDGE_MAX_BONUS_PCT = 200;
/** 12층 이상 보스는 적용 안 함 (후반 난이도는 층 스케일로만) */
export const BOSS_GRUDGE_MAX_REGION = 11;

/** 도감 보스 처치 횟수 기준, 이번 전투에서 받는 피해 보너스 % */
export function getBossGrudgeBonusPct(
  save: GameSave,
  bossMonsterId: string,
  regionId: number,
): number {
  if (regionId > BOSS_GRUDGE_MAX_REGION) return 0;
  const priorKills = save.codex[bossMonsterId]?.kills ?? 0;
  if (priorKills <= 0) return 0;
  return Math.min(BOSS_GRUDGE_MAX_BONUS_PCT, priorKills * BOSS_GRUDGE_PCT_PER_KILL);
}

export function applyBossGrudgeToDamage(baseDmg: number, bonusPct: number): number {
  if (bonusPct <= 0) return baseDmg;
  return Math.max(1, Math.floor(baseDmg * (1 + bonusPct / 100)));
}

/**
 * 층 권장 레벨·성장·전직 대비 파티 미달 시 몬스터 강화 (4층+)
 * — 성장 없이 층만 올라가면 체감이 급격히 어려워짐
 */
export function regionGrowthPressureMult(save: GameSave, regionId: number): number {
  if (regionId <= 3) return 1;
  const party = save.party.filter(id => save.chars[id]);
  if (!party.length) return 1;

  const minLv = getMinLevelForFloor(regionId);
  let avgLv = 0;
  let avgNodes = 0;
  let avgPrestige = 0;
  for (const id of party) {
    const st = save.chars[id]!;
    avgLv += st.level;
    avgNodes += st.unlockedNodes?.length ?? 0;
    avgPrestige += st.prestige ?? 0;
  }
  const n = party.length;
  avgLv /= n;
  avgNodes /= n;
  avgPrestige /= n;

  const floorEase = regionId <= 10 ? 0.72 : regionId <= 12 ? 0.84 : 1;

  let mult = 1;
  if (avgLv < minLv) {
    const gap = minLv - avgLv;
    const lvCap = regionId <= 11 ? 0.40 : regionId <= 14 ? 0.48 : 0.55;
    const lvRate = regionId <= 11 ? 0.024 : regionId <= 14 ? 0.030 : 0.034;
    mult *= 1 + Math.min(lvCap, gap * lvRate + gap * gap * 0.00065) * floorEase;
  }

  const needNodes = Math.max(2, Math.floor(regionId * 0.45));
  if (avgNodes < needNodes) {
    const nodeRate = regionId <= 11 ? 0.040 : regionId <= 14 ? 0.048 : 0.055;
    mult *= 1 + (needNodes - avgNodes) * nodeRate * floorEase;
  }

  const needPrestige = getMinPrestigeForFloor(regionId);
  if (needPrestige > 0 && avgPrestige < needPrestige) {
    const presRate = regionId >= 16 ? 0.10
      : regionId >= 13 ? 0.072
        : regionId >= 10 ? 0.048
          : 0.085;
    mult *= 1 + (needPrestige - avgPrestige) * presRate * floorEase;
  }

  const maxMult = regionId <= 6 ? 1.55 : regionId <= 10 ? 1.72 : regionId <= 12 ? 1.88 : regionId <= 14 ? 2.05 : 2.28;
  return Math.min(maxMult, mult);
}
