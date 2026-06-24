import type { CombatAudioEvent } from '../data/combatAudio';
import type {
  AdventureEvent, AdventurePhase, AdventureRunStats, CharRunCombatStats, CombatEntity,
  DefeatLog, ElementType, EncounterSlot, GameSave, MonsterDef,
} from '../types';
import { REGIONS } from '../data/regions';
import { MONSTER_MAP, getRegionBoss, getRegionMonsters } from '../data/monsters';
import { CHAR_MAP, charUsesMeleeDash } from '../data/characters';
import { MATERIAL_LABELS } from '../data/equipment';
import {
  ELEMENT_ICON, getElementDamageMult,
} from '../data/elemental';
import {
  formatAffixTip, getEffectiveWeaknessMult, getRegionAffix,
  type RegionAffix,
} from '../data/regionAffixes';
import { applyDungeonCampWaveHeal, clearExpeditionDungeonBuffs, consumeDungeonPrepForRun, getDungeonCampBonuses } from './dungeonCampBonuses';
import {
  canDepartAtFloor, getFloorClearCount, recordFloorBossClear, reconcileShortcutDevelopment,
} from './DungeonShortcutSystem';
import { markFloor10IntroSeen } from './floor10Intro';
import { grantFloorMilestones } from './floorMilestoneSystem';
import { AggroTracker } from './AggroSystem';
import {
  BOSS_BASE_RATE, BOSS_CLEARED_BASE, BOSS_CLEARED_KILL_STEP, BOSS_MAX_RATE,
  BOSS_PITY_GUARANTEE, BOSS_PITY_STEP, getBossCodexThreshold, getBossSpawnRate,
  groupScaleMult, isRegionCleared, onClearedRegionMobKilled, planEncounter,
} from './EncounterSystem';
import {
  beginSpireRun,
  canAccessSpire,
  canStartSpireRun,
  endSpireRun,
  getSpireLocationLabel,
  handleSpireWaveCleared,
  isInSpireRun,
  planSpireEncounter,
} from './SpireRunSystem';
import type { LeaderboardEntry } from '../services/PlayerProfileService';
import {
  canStartRivalDuel,
  beginRivalDuelAttempt,
  finishRivalDuelWin,
  finishRivalDuelLoss,
  getRivalDuelRemaining,
  type RivalDuelResult,
} from './RivalDuelSystem';
import {
  isRivalGhostMonsterId,
  parseRivalGhostCharId,
  pickRivalSkillLabel,
  planRivalDuelEncounter,
  rivalEntryFromRun,
  serializeRivalRun,
} from './RivalDuelCombat';
import { preloadSpireTowerAssets } from '../render/SpireTowerRenderer';
import { getWeeklySpireModifier } from '../data/endgame/spire';
import { checkBossPhase } from './bossPhases';
import {
  getSkillChargeDuration, getSupportSkillCastDuration, inferSkillDelivery,
  isSupportSkillKind, shouldAdvanceForDelivery, shouldSkillCharge, skillChargeBarColor,
  type SkillDeliveryOpts,
  type SkillDelivery,
} from './skillCharge';
import {
  addEliteSpirit, calcEliteSpecialDamage, calcEliteSplashDamage,
  ELITE_SPIRIT_ON_HIT, ELITE_SPIRIT_PER_ATTACK, isEliteMonster,
} from './eliteSpirit';
import { computePartySynergy, formatPartySynergy } from './partySynergy';
import { getCharCombatPowerTier, getTouchSfxTier } from './combatSfxTier';
import {
  MAX_FLOAT_EVENTS, getCombatFeedbackPreset, shouldCombatPerfLite,
  shouldLiteCombatPerf, shouldSuppressCombatFloater, shouldSuppressWaveToast,
} from './combatPerf';
import { setCombatPerfSeBudget } from '../core/SePlayer';
import {
  applyBossGrudgeToDamage, BOSS_HEAL_MULT, getBossGrudgeBonusPct,
  getCombatFatigueMult, regionMonsterAtkScale, regionMonsterAtkSpdMult,
  regionMonsterDefScale, regionMonsterHpScale, regionGrowthPressureMult, regionPlayerHealMult,
  scaleKillExp, scaleKillGold, regionKillGoldScale,
  TOUCH_COOLDOWN_MS, WALK_PHASE_TIME_MULT, WALK_SCROLL_MULT, POTION_HEAL_FLAT,
  POST_KILL_WALK_SEC,
  SKILL_HEAL_MAX_PCT, HEAL_SKILL_PCT_MULT,
} from '../data/combatBalance';
import {
  popBlock,
  popBuffFromDetails,
  popCleanseFromDetails,
  popHeal,
  popHealFromDetails,
  popHealTarget,
  popNormalHit,
  popSkillDamage,
  popUltimate,
  popEncounter,
  popAffixBrief,
  popBossGrudge,
} from '../data/combatFloatText';
import { ensureLocation, isAtLodging, isInExpedition } from './LodgingSystem';
import { creditPendingHuntGold } from './LodgingEconomySystem';
import {
  applyVoluntaryReturnRecovery,
  formatLodgingHealLabel, isPartyFullyHealed, tickLodgingHeal,
} from './RestHealingSystem';
import {
  DUNGEON_MAT_DROP_CHANCES,
  DUNGEON_MAT_DROP_GLOBAL_MULT,
  ELITE_SPIRIT_THREAD_CHANCE,
  ELITE_VOID_SHARD_CHANCE,
  MONSTER_GEM_DROP_CHANCE,
  MONSTER_SPECIAL_DROP_CHANCE,
} from '../data/economyBalance';
import { getDefeatPenaltyRate } from './DefeatSystem';
import {
  getCharDieFrameCount, getSkillAttackAnimKey, markEntityKnockdown,
  MONSTER_TINY_MAP, resolveMonsterProjectile, tickEntityDieAnim, buildCharMeleeMotionPool,
} from '../data/tinyRpgAnim';
import { getActiveSkills } from '../data/combatSkills';
import type { CombatSkillDef } from '../data/combatSkills';
import {
  applyDamageToEnemy, buildMonsterCombatant, buildPartyCombatants,
  syncCombatHp,
} from './CombatSystem';
import {
  applyPartyStrikeSupport, calcMonsterStrikeDamage, maybeApplyMonsterElement,
  resolvePartyStrike, resolveHealerUltimateStrike, resolveUltimateStrike,
  tickStatusEffects, applySkillTouchProc, type SkillStrikeResult,
} from './SkillCombat';
import { isHealerChar } from '../data/characters';
import { partyNeedsHeal, applyCombatHeal, applyCombatCleanse, type HealTargetDetail } from './HealerCombat';
import {
  GAUGE_MAX, applyGaugeToEntity, consumeGauge, getGauge, getGaugeType,
  onPartyAttackGauge, onPartyHitGauge, onPartyKillGaugeBurst,
} from './GaugeSystem';
import { checkAllCodexRewards } from './CodexSystem';
import { getCharExpMultiplier } from './RebirthMarkSystem';
import { getEndgameExpMult } from './EndgameSystem';
import { computePartyBuffers, expToLevel, getPartyTouchDamage } from './StatCalculator';
import { tryRosterProcsOnHit, tryRosterProcsOnKill } from './RosterProcSystem';
import { getPartySlotEventX, getVisualSlotIndex, reconcileFormation } from './FormationSystem';
import { reconcileSave, saveGame } from '../core/SaveManager';
import { addMaterial } from './EquipmentSystem';
import { rollAccessoryDrop } from './AccessoryDropSystem';
import {
  CHAIN_SKIP_AFTER, decayComboStreak, formatComboHud,
  getComboBuff, getComboMilestoneMessage,
} from './combatCombo';
import { tryApplySkillDebuffToEnemy } from './combatSkillEffects';
import {
  applyPartyWipeIncapacitation, canStartExpedition as checkExpeditionReady,
  getActivePartyMembers, getPartyIncapRemainingSec, isCharIncapacitated,
} from './CharacterStatusSystem';
import {
  applyExpeditionSupplyLink, claimTycoonSettlement, enforceWarehouseCap,
} from './TycoonExpansionSystem';
import { tickCampProduction } from './TycoonSystem';
import {
  consumeExpeditionPotion, ensurePotionInventory, getExpeditionPotions,
  packPotionsForExpedition, returnExpeditionPotions,
} from './PotionInventory';
import {
  getReturnTravelMult, getReturnWalkSec, grantBossFirstClearBonus,
  onExpeditionStarted, onLodgingArrival, useReturnSkip,
} from './OnboardingSystem';
import { getCharMaxHp } from './RestHealingSystem';
import {
  buildExpeditionSettlementReport,
  type ExpeditionSettlementReport,
} from '../ui/expeditionSettlement';
import { setExpeditionHighlight, clearExpeditionHighlight } from './expeditionHighlight';
import {
  hasAugmentForFloor, rollAugmentChoices, getAugmentMods, type AugmentPickState,
} from './AugmentSystem';
import { CombatVfxManager } from '../render/combatVfx';
import {
  accelerateBossPacing, getBossGateRemainSec, getClearedWalkMult,
  getUnclearedWalkMult, MOB_KILL_PACE_BONUS_SEC,
  resetFloorSessionPacing, tickFloorPacing,
} from './floorPacing';
import {
  applyMonsterDebuffById, getStatMults, MONSTER_DEBUFF_DEFS,
  rollMonsterDebuffAttempt, tickCombatModifiers,
} from './monsterDebuffs';
import { assessPartyReadiness, formatReadinessHint, isLateGameFloor } from '../data/lateGameBalance';
import { getHomeStationLabel } from '../data/starterSurvey';
import { getSoloGoldMult } from '../data/starterBalance';
import {
  clearExpeditionRunState, markEpicCleared, mergeExpeditionModifiers,
  syncEntityModifiersToSave, tickExpeditionModifiers,
} from './partyExpeditionMods';
import { getWeeklyEpicVariant } from '../data/epicVariants';
import {
  checkEpicPhase, decorateEpicEntity, EPIC_POWER_MULT, epicRewardMult,
  epicSpiritGainPerAttack, epicSpiritGainPerHit,
} from './epicEncounter';
import {
  rollWaveTwist, type WaveTwist,
} from './waveTwist';
import { buildCombatPowerSnapshot } from './combatSnapshot';
import {
  getDailyBonusExpMult, getDailyBonusGoldMult, getDailyBonusMatMult,
} from './dailyBonus';
import { buildExpeditionProgress } from './expeditionProgress';
import { ensureOnboarding } from './OnboardingSystem';
import { resolveBuffVfx, resolveDebuffVfx } from '../data/statusEffectVfx';
import {
  computeMonsterAttackSfxDelayMs, computeMonsterHurtSfxDelayMs, computePartyAttackSfxTiming,
} from './combatSfxTiming';
import {
  calcTravelDurationSec, calcAdvanceTravelDurationSec, TRAVEL_BASE_SEC, TRAVEL_MAX_SEC, TRAVEL_PER_REGION_SEC,
} from './adventure/travelFlow';
import {
  applyWavePaceBonus, computeWavePaceBonus, formatWavePaceEvent,
} from './adventure/wavePacing';
import {
  applySaveHpToParty, mergePartyExpeditionModifiers, tickExpeditionCombatModifiers,
  tickPartyCombatModifiers, tickPartyDeathAnims,
} from './adventure/combatLoop';

export {
  BOSS_BASE_RATE, BOSS_CLEARED_BASE, BOSS_CLEARED_KILL_STEP, BOSS_MAX_RATE,
  BOSS_PITY_GUARANTEE, BOSS_PITY_STEP, getBossSpawnRate, isRegionCleared,
} from './EncounterSystem';
export {
  calcTravelDurationSec, calcAdvanceTravelDurationSec, TRAVEL_BASE_SEC, TRAVEL_MAX_SEC, TRAVEL_PER_REGION_SEC,
  FLOOR_ADVANCE_TRAVEL_MULT, RETURN_DURATION_MULT,
} from './adventure/travelFlow';
export const SPEED_BOOST_MS = 5 * 60 * 1000;
export const REST_DURATION_MS = 60 * 1000;
const ELITE_POWER_MULT = 1.82;

export class AdventureSystem {
  phase: AdventurePhase = 'walk';
  walkX = 0;
  /** 배경 무한 스크롤 전용 (전투 중에도 저속 진행) */
  backgroundScrollX = 0;
  scrollSpeed = 60;
  phaseTimer = 0;
  encounterName = '';
  /** 조우 배너 — 짧은 팝 텍스트 */
  encounterBanner = '';
  isBossFight = false;
  /** 보스 전투 시 이전 처치 횟수 기반 받는 피해 보너스 % */
  bossGrudgePct = 0;
  /** 보스 등장 연출 (초) */
  bossIntroTimer = 0;
  bossIntroName = '';
  /** 엘리트·에픽 등장 연출 */
  eliteIntroTimer = 0;
  eliteIntroLabel = '';
  eliteRewardHint = '';
  bossFightStartedAt = 0;
  combatFightStartedAt = 0;
  private combatFatigueAnnounced = false;
  static readonly BOSS_FLEE_AFTER_SEC = 150;
  isEliteFight = false;
  isEpicFight = false;
  /** 이번 웨이브 변주 (분노·풍요 등) */
  waveTwist: WaveTwist | null = null;

  party: CombatEntity[] = [];
  encounterSlots: EncounterSlot[] = [];
  waveMonsters: MonsterDef[] = [];
  aggro = new AggroTracker();
  currentAffix: RegionAffix = getRegionAffix(1);
  affixTick = 0;
  lastHit: DefeatLog['lastHit'];
  lootGold = 0;

  /** @deprecated 단일 몬스터 호환 */
  get enemy(): CombatEntity | null {
    return this.encounterSlots.find(s => s.entity.hp > 0)?.entity ?? null;
  }
  get currentMonster(): MonsterDef | null {
    return this.encounterSlots.find(s => s.entity.hp > 0)?.def ?? null;
  }

  events: AdventureEvent[] = [];
  /** 💎 드롭 연출 — 화면 가로질러 아이콘 비행 */
  gemFlyVfx: { elapsed: number; duration: number } | null = null;
  runStats: AdventureRunStats = {
    goldEarned: 0, damageDealt: 0, damageTaken: 0, kills: 0, touchDamage: 0,
    matsGained: {}, byChar: {},
  };
  vfx = new CombatVfxManager();
  private lastDotSfxMs = 0;
  private lastTouchMs = 0;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private perfAttackSkip = 0;
  isResting = false;
  restUntil = 0;
  travelFromId = 0;
  travelToId = 0;
  travelDurationSec = 0;
  private pendingTravelRegion: number | null = null;
  /** 숙소 귀환 — 역순 이동 큐 (각 목적지 regionId) */
  private returnTripQueue: number[] = [];
  /** 귀환 시 현재 층 통과 대기(초) — 0이면 다음 이동 */
  private returnWalkSec = 0;
  isReturningToLodging = false;
  isSpireReturnTrip = false;
  isLodgingResting = false;
  /** 체크 시 전투 종료 후 숙소 귀환 */
  pendingReturnToLodging = false;
  onUpdate?: () => void;
  onPhaseChange?: (p: AdventurePhase) => void;
  onSave?: () => void;
  onRestComplete?: () => void;
  /** 숙소 도착 완료 — 랭킹 변동 토스트 등 */
  onLodgingReturn?: () => void;
  /** 18층 보스 클리어 — 축하 모달 표시 (firstClear=true 시 1등 극 연출) */
  onFloor18Celebration?: (firstClear: boolean) => void;
  /** 층별 첫 클리어 — 증강 선택 */
  onAugmentPick?: (pick: AugmentPickState) => void;
  /** 10층 최초 도착 — 2막 안내 */
  onFloor10PhaseIntro?: () => void;
  onAudio?: (event: CombatAudioEvent) => void;
  /** 18층 클리어 축하 대기 — 모달·마을 복귀 전까지 전투 중단 */
  floor18CelebrationPending = false;
  private floor18CelebrationShown = false;
  private floor18FirstClearRun = false;
  /** 증강 선택 대기 */
  augmentPickPending = false;
  private augmentPickShown = false;
  pendingAugmentPick: AugmentPickState | null = null;
  /** 숙소 도착 시 정산 모달 (토스트 대신) */
  pendingSettlement: ExpeditionSettlementReport | null = null;
  /** @deprecated — settlement 모달 사용 */
  lastArrivalMessage = '';

  /** 연속 웨이브 처치 (이동 생략·콤보) */
  waveStreak = 0;
  private skillPity: Record<string, number> = {};
  /** 근접형 캐릭 — 웨이브당 원거리 선봉 1회 제한 */
  private warriorRangedUsed = new Set<string>();
  /** 평타 모션 순환 — attack01/02/03 번갈아 재생 */
  private chainEngage = false;
  /** 라이벌 격파 — 결투장 전투 */
  private rivalDuelTarget: LeaderboardEntry | null = null;
  private rivalSkillTimers = new Map<string, number>();
  /** 결투 종료 — 결과 모달 표시 대기 */
  rivalDuelResultPending: RivalDuelResult | null = null;
  /** 결투 승패 모달 */
  onRivalDuelComplete?: (result: RivalDuelResult) => void;
  private pendingChestMsg = '';
  /** 스킬 바 UI — 최근 사용 스킬 하이라이트 */
  skillBarFlash: Record<string, { nodeId: string; until: number }> = {};
  /** 스킬 바 — 최근 효과 텍스트 */
  combatFeedback: Record<string, { text: string; color: string; until: number }> = {};
  private skillChargeActive = new Map<string, {
    elapsed: number;
    duration: number;
    skillName: string;
    element: ElementType;
    delivery: SkillDelivery;
    kind: 'damage' | 'support';
  }>();
  private pendingDebuffCast = new Map<string, {
    elapsed: number;
    duration: number;
    debuffId: keyof typeof MONSTER_DEBUFF_DEFS;
    sourceName: string;
    atkScale: number;
  }>();
  private pendingDamageStrike = new Map<string, {
    res: SkillStrikeResult;
    targetUid: string;
    animKey: string | null;
  }>();
  private pendingSupportStrike = new Map<string, {
    res: SkillStrikeResult;
    targetUid: string;
    animKey: string | null;
  }>();

  private markSkillUsed(charId: string, nodeId: string, feedback: string, color: string) {
    const until = performance.now() + 1400;
    this.skillBarFlash[charId] = { nodeId, until };
    this.combatFeedback[charId] = { text: feedback, color, until };
  }

  private playBuffStatusFeedback(charId: string, skill: CombatSkillDef) {
    const slot = getVisualSlotIndex(this.save, charId);
    const spec = resolveBuffVfx({
      skillKind: skill.skillKind,
      hasAtk: (skill.buffAtkMult ?? 1) > 1.01,
      hasDef: (skill.buffDefMult ?? 1) > 1.01,
      hasSpd: (skill.buffSpdMult ?? 1) > 1.01,
    });
    if (slot >= 0) this.vfx.onPartyStatusFlash(slot, spec);
    this.onAudio?.({
      type: 'buffApply',
      buffId: skill.nodeId,
      skillKind: skill.skillKind,
      hasAtk: (skill.buffAtkMult ?? 1) > 1.01,
      hasDef: (skill.buffDefMult ?? 1) > 1.01,
      hasSpd: (skill.buffSpdMult ?? 1) > 1.01,
      charId,
    });
  }

  private playDebuffStatusFeedback(debuffId: string, opts: { onPlayer: boolean; charId?: string; enemyVi?: number }) {
    const spec = resolveDebuffVfx(debuffId);
    if (opts.onPlayer && opts.charId) {
      const slot = getVisualSlotIndex(this.save, opts.charId);
      if (slot >= 0) this.vfx.onPartyStatusFlash(slot, spec);
    } else if (opts.enemyVi != null && opts.enemyVi >= 0) {
      this.vfx.onEnemyStatusFlash(opts.enemyVi, spec);
    }
    this.onAudio?.({ type: 'debuffApply', debuffId, onPlayer: opts.onPlayer });
  }

  private playCleanseFeedback(charId: string) {
    const slot = getVisualSlotIndex(this.save, charId);
    const spec = resolveBuffVfx({ skillKind: 'cleanse' });
    if (slot >= 0) this.vfx.onPartyStatusFlash(slot, spec);
    this.onAudio?.({ type: 'cleanse', charId });
  }

  getSkillBarFlash(charId: string): string | null {
    const f = this.skillBarFlash[charId];
    if (!f || performance.now() > f.until) return null;
    return f.nodeId;
  }

  getCombatFeedback(charId: string): { text: string; color: string } | null {
    const f = this.combatFeedback[charId];
    if (!f || performance.now() > f.until) return null;
    return { text: f.text, color: f.color };
  }

  isSkillCharging(charId: string): boolean {
    return this.skillChargeActive.has(charId) || this.pendingDebuffCast.has(charId);
  }

  getCharacterCastState(charId: string): { ratio: number; label: string; color: string } | null {
    const charge = this.skillChargeActive.get(charId);
    if (charge) {
      return {
        ratio: Math.min(1, charge.elapsed / Math.max(0.01, charge.duration)),
        label: charge.skillName,
        color: skillChargeBarColor(charge.element),
      };
    }
    const debuff = this.pendingDebuffCast.get(charId);
    if (debuff) {
      const def = MONSTER_DEBUFF_DEFS[debuff.debuffId];
      return {
        ratio: Math.min(1, debuff.elapsed / Math.max(0.01, debuff.duration)),
        label: `${def.name} 시전`,
        color: '#cc88ff',
      };
    }
    return null;
  }

  private clearSkillCharges() {
    this.skillChargeActive.clear();
    this.pendingDamageStrike.clear();
    this.pendingSupportStrike.clear();
    this.pendingDebuffCast.clear();
    this.vfx.clearSkillChargeSlots();
  }

  private tickSkillCharges(dt: number) {
    for (const [charId, charge] of [...this.skillChargeActive.entries()]) {
      charge.elapsed += dt;
      const slot = getVisualSlotIndex(this.save, charId);
      const ratio = Math.min(1, charge.elapsed / charge.duration);
      if (slot >= 0) {
        const icon = charge.delivery === 'projectile' ? '🏹'
          : charge.delivery === 'melee' ? '⚔'
            : '✨';
        this.vfx.setSkillChargeSlot(slot, ratio, skillChargeBarColor(charge.element), {
          label: charge.skillName,
          icon,
        });
      }
      if (charge.elapsed >= charge.duration) {
        this.releaseSkillCharge(charId);
      }
    }
  }

  private tryBeginSkillCharge(
    p: CombatEntity,
    targetSlot: EncounterSlot,
    res: SkillStrikeResult,
    animKey: string | null,
  ): boolean {
    if (!res.skill || res.damage <= 0) return false;
    if (!shouldSkillCharge(p.id, res.skill, !!res.isUltimate)) return false;
    const slot = getVisualSlotIndex(this.save, p.id);
    const deliveryOpts = this.buildSkillDeliveryOpts(p.id);
    const duration = getSkillChargeDuration(p.id, res.skill, !!res.isUltimate, deliveryOpts);
    if (duration <= 0.05) return false;
    const delivery = inferSkillDelivery(p.id, res.skill, deliveryOpts);
    this.markWarriorRangedUsed(p.id, delivery);
    this.skillChargeActive.set(p.id, {
      elapsed: 0,
      duration,
      skillName: res.skill.name,
      element: res.skill.element,
      delivery,
      kind: 'damage',
    });
    this.pendingDamageStrike.set(p.id, { res, targetUid: targetSlot.uid, animKey });
    p.attackTimer = duration + 0.18;
    if (slot >= 0) {
      this.vfx.setSkillChargeSlot(slot, 0.04, skillChargeBarColor(res.skill.element));
    }
    const tag = delivery === 'projectile' ? '🏹' : '⚔';
    const eventX = slot >= 0 ? getPartySlotEventX(slot, this.save.party.length) : 0.72;
    this.addEvent(eventX, 0.26, `${tag} ${res.skill.name}`, skillChargeBarColor(res.skill.element), 0.75, true);
    return true;
  }

  private releaseSkillCharge(charId: string) {
    const support = this.pendingSupportStrike.get(charId);
    const pending = this.pendingDamageStrike.get(charId);
    this.skillChargeActive.delete(charId);
    this.pendingDamageStrike.delete(charId);
    this.pendingSupportStrike.delete(charId);
    const slot = getVisualSlotIndex(this.save, charId);
    if (slot >= 0) this.vfx.setSkillChargeSlot(slot, 0, '#fff');
    if (support) {
      this.applySupportStrikeEffects(charId, support);
      return;
    }
    if (!pending) return;
    const p = this.party.find(e => e.id === charId);
    const targetSlot = this.encounterSlots.find(s => s.uid === pending.targetUid);
    if (!p || p.hp <= 0 || !targetSlot || targetSlot.entity.hp <= 0) return;
    this.resolvePartyDamageStrike(p, targetSlot, pending.res, pending.animKey);
  }

  private tryBeginSupportCast(
    p: CombatEntity,
    targetSlot: EncounterSlot,
    res: SkillStrikeResult,
    animKey: string | null,
  ): boolean {
    if (!res.skill || !isSupportSkillKind(res.skill.skillKind)) return false;
    const duration = getSupportSkillCastDuration(res.skill);
    this.skillChargeActive.set(p.id, {
      elapsed: 0,
      duration,
      skillName: res.skill.name,
      element: res.skill.element,
      delivery: 'instant',
      kind: 'support',
    });
    this.pendingSupportStrike.set(p.id, { res, targetUid: targetSlot.uid, animKey });
    p.attackTimer = duration + 0.25;
    const slot = getVisualSlotIndex(this.save, p.id);
    if (slot >= 0) {
      this.vfx.setSkillChargeSlot(slot, 0.04, skillChargeBarColor(res.skill.element), {
        label: res.skill.name,
        icon: '✨',
      });
    }
    const eventX = slot >= 0 ? getPartySlotEventX(slot, this.save.party.length) : 0.72;
    this.addEvent(eventX, 0.26, `✨ ${res.skill.name}`, skillChargeBarColor(res.skill.element), 0.75, true);
    return true;
  }

  private applySupportStrikeEffects(charId: string, pending: {
    res: SkillStrikeResult;
    targetUid: string;
    animKey: string | null;
  }) {
    const p = this.party.find(e => e.id === charId);
    if (!p || p.hp <= 0) return;
    const res = pending.res;
    const targetSlot = this.encounterSlots.find(s => s.uid === pending.targetUid);
    const healMult = (this.isBossFight ? BOSS_HEAL_MULT : 1)
      * regionPlayerHealMult(this.save.currentRegion);

    if (res.skill?.skillKind === 'block') {
      applyPartyStrikeSupport(res, p, this.party, this.save, { healMult });
      this.aggro.applyTaunt(p.id, 5);
      const bSlot = getVisualSlotIndex(this.save, p.id);
      if (bSlot >= 0) {
        this.vfx.onShieldFlash(bSlot);
        if (targetSlot) {
          this.firePartyAttackVfx(p.id, targetSlot, {
            crit: true,
            skill: res.skill,
            animKey: pending.animKey ?? getSkillAttackAnimKey(p.id, res.skill.animTier, res.skill.motionKey ?? 'block'),
            advance: false,
          });
        }
      }
      const blockPct = Math.round((res.skill.blockPct ?? 0.35) * 100);
      this.markSkillUsed(p.id, res.skill.nodeId, popBlock(blockPct), '#88aaff');
      this.playBuffStatusFeedback(p.id, res.skill);
      this.addEvent(0.72, 0.38, popBlock(blockPct), '#88aaff', 1.0, true);
      return;
    }

    if (res.skill?.skillKind === 'buff') {
      applyPartyStrikeSupport(res, p, this.party, this.save, { healMult });
      const details = res.buffDetails ?? [];
      const fb = details.length ? popBuffFromDetails(details) : res.skill.name;
      this.markSkillUsed(p.id, res.skill.nodeId, fb, '#ffee88');
      this.playBuffStatusFeedback(p.id, res.skill);
      this.addEvent(0.72, 0.34, fb, '#ffee88', 1.0, true);
      const bSlot = getVisualSlotIndex(this.save, p.id);
      if (bSlot >= 0 && targetSlot) {
        const buffMotion = res.skill.motionKey
          ?? (res.skill.animTier >= 2 ? 'attack02' : 'attack01');
        this.firePartyAttackVfx(p.id, targetSlot, {
          crit: true,
          skill: res.skill,
          animKey: pending.animKey ?? getSkillAttackAnimKey(p.id, res.skill.animTier, buffMotion),
          advance: false,
        });
      }
      return;
    }

    if (res.isCleanse && res.skill) {
      const cleanseDetails = applyCombatCleanse(
        this.party, res.skill.cleanseCount ?? 1, res.skill.cleanseDots ?? true, this.save,
      );
      const fb = popCleanseFromDetails(cleanseDetails);
      this.markSkillUsed(p.id, res.skill.nodeId, fb, '#aaddff');
      this.playCleanseFeedback(p.id);
      this.addEvent(0.72, 0.36, fb, '#aaddff', 1.0, true);
      const slot = getVisualSlotIndex(this.save, p.id);
      if (slot >= 0 && targetSlot) {
        this.vfx.onHealPulse(slot);
        this.firePartyAttackVfx(p.id, targetSlot, {
          skill: res.skill,
          animKey: pending.animKey ?? getSkillAttackAnimKey(p.id, res.skill.animTier, res.skill.motionKey ?? 'heal'),
          advance: false,
        });
      }
      return;
    }

    if (res.isHeal && res.skill) {
      const healPct = Math.min(
        SKILL_HEAL_MAX_PCT * 1.12,
        (res.skill.healPct ?? 0.08) * HEAL_SKILL_PCT_MULT,
      );
      const { total, details } = applyCombatHeal(
        this.party, healPct, healMult, p.id, undefined, this.save.chars[p.id]?.prestige ?? 0,
      );
      if (total > 0) this.bumpCharStat(p.id, 'healDone', total);
      const healerName = CHAR_MAP[p.id]?.name ?? p.id;
      const fb = details.length ? popHealFromDetails(details, healerName) : popHeal(total);
      this.aggro.addHealThreat(p.id, total, this.currentAffix);
      this.markSkillUsed(p.id, res.skill.nodeId, fb, '#66ff99');
      this.showCombatHealFeedback(p.id, total, details, {
        skill: res.skill,
        isUltimate: !!res.isUltimate,
        ultimateLabel: res.ultimateLabel,
        gaugeType: res.isUltimate ? getGaugeType(p.id) : undefined,
      });
      if (details.length) this.addEvent(0.5, 0.24, fb, '#88ffcc', 1.05, true);
      syncCombatHp(this.save, this.party);
    }
  }

  private scheduleDebuffCast(
    target: CombatEntity,
    debuffId: keyof typeof MONSTER_DEBUFF_DEFS,
    sourceName: string,
    atkScale: number,
  ) {
    if (this.pendingDebuffCast.has(target.id)) return;
    const duration = 3 + Math.random() * 2;
    this.pendingDebuffCast.set(target.id, {
      elapsed: 0,
      duration,
      debuffId,
      sourceName,
      atkScale,
    });
    const slot = getVisualSlotIndex(this.save, target.id);
    if (slot >= 0) {
      const def = MONSTER_DEBUFF_DEFS[debuffId];
      this.vfx.setSkillChargeSlot(slot, 0.05, '#cc88ff', { label: def.name, icon: def.icon });
    }
  }

  private tickPendingDebuffCasts(dt: number) {
    for (const [charId, cast] of [...this.pendingDebuffCast.entries()]) {
      cast.elapsed += dt;
      const slot = getVisualSlotIndex(this.save, charId);
      const ratio = Math.min(1, cast.elapsed / cast.duration);
      if (slot >= 0) {
        const def = MONSTER_DEBUFF_DEFS[cast.debuffId];
        this.vfx.setSkillChargeSlot(slot, ratio, '#cc88ff', { label: def.name, icon: def.icon });
      }
      if (cast.elapsed < cast.duration) continue;
      this.pendingDebuffCast.delete(charId);
      if (slot >= 0) this.vfx.setSkillChargeSlot(slot, 0, '#fff');
      const target = this.party.find(p => p.id === charId);
      if (!target || target.hp <= 0) continue;
      const applied = applyMonsterDebuffById(
        target, cast.debuffId, cast.sourceName, cast.atkScale, this.save.currentRegion, this.save,
      );
      if (applied) {
        this.addEvent(0.28, 0.58, `${applied.icon}${applied.name}!`, '#cc88ff', 2);
        this.playDebuffStatusFeedback(cast.debuffId, { onPlayer: true, charId });
      }
    }
  }

  private resolvePartyDamageStrike(
    p: CombatEntity,
    targetSlot: EncounterSlot,
    res: SkillStrikeResult,
    animKey: string | null,
  ) {
    const actual = this.applyPartyHitToEnemy(p, targetSlot, res);
    this.runStats.damageDealt += actual;
    this.firePartyAttackVfx(p.id, targetSlot, {
      crit: res.isCrit || !!res.isUltimate,
      skill: res.skill ?? null,
      animKey,
    });
    const enemyVis = this.getEnemyVisualSlot(targetSlot);
    const dmgX = this.getEnemyHitNorm(enemyVis).x;
    const atkX = (() => {
      const v = getVisualSlotIndex(this.save, p.id);
      return v >= 0 ? getPartySlotEventX(v, this.save.party.length) : 0.72;
    })();
    if (res.isUltimate) {
      const gt = getGaugeType(p.id);
      const icon = gt === 'mana' ? '💠' : '⚡';
      this.addEvent(dmgX, 0.34, popUltimate(icon, actual), gt === 'mana' ? '#66ccff' : '#ffdd44', 1.1, true);
      this.vfx.onCritShake();
    } else if (res.skill) {
      const fb = popSkillDamage(res.skill, actual);
      this.markSkillUsed(p.id, res.skill.nodeId, fb, '#ffaa44');
      this.addEvent(dmgX, 0.38, fb, res.isCrit ? '#ffee44' : '#ffaa44', 1.0, true);
      const weakMult = targetSlot.entity.element
        ? getEffectiveWeaknessMult(
          res.skill.element, targetSlot.entity.element, this.currentAffix,
          getElementDamageMult(res.skill.element, targetSlot.entity.element),
        ) : 1;
      if (weakMult > 1) this.addEvent(dmgX, 0.32, '약점!', '#88ffcc', 0.85, true);
      if (res.dotApplied) this.addEvent(dmgX, 0.44, '도트', '#ff8844', 0.85, true);
    } else {
      this.addEvent(
        dmgX, 0.42,
        popNormalHit(actual, res.isAoe),
        res.isCrit ? '#ffee44' : '#ffffff',
        0.9, true,
      );
    }
    this.emitPartyAttackAudio(p.id, targetSlot, {
      isCrit: res.isCrit,
      isUltimate: res.isUltimate,
      skill: res.skill ?? null,
    });
    const combo = getComboBuff(this.waveStreak);
    if (res.isCrit || res.isUltimate || combo.fever) {
      if (!this.isCombatPerfLite() || res.isUltimate) this.vfx.onCritShake();
    }
    if (res.isCrit && !res.skill && !res.isUltimate) {
      this.addEvent(atkX, 0.36, '치명!', '#ff4444', 0.85, true);
    }
  }

  /** 하단 스킬 바 — 던전 원정 중 항상 (이동·조우·전투·루트) */
  isCombatSkillBarActive(): boolean {
    if (!this.isInExpedition() || this.isAtLodging()) return false;
    if (this.phase === 'travel' || this.phase === 'defeat') return false;
    return true;
  }

  getBossHpPct(): number {
    const slots = this.getAliveSlots();
    if (!slots.length) return 1;
    let hp = 0;
    let max = 0;
    for (const s of slots) {
      hp += s.entity.hp + (s.entity.bossShield ?? 0);
      max += s.entity.maxHp + Math.floor(s.entity.maxHp * 0.15);
    }
    return max > 0 ? hp / max : 1;
  }

  isRivalDuelActive(): boolean {
    return !!this.save.rivalDuelRun?.active;
  }

  hasRivalDuelResultPending(): boolean {
    return !!this.rivalDuelResultPending;
  }

  resumeAfterRivalDuelResult(): void {
    this.rivalDuelResultPending = null;
    this.returnToLodgingDirect(true);
  }

  getRivalDuelTarget(): LeaderboardEntry | null {
    return this.rivalDuelTarget ?? rivalEntryFromRun(this.save);
  }

  startRivalDuel(rival: LeaderboardEntry): { ok: boolean; reason?: string } {
    if (this.isInExpedition()) {
      return { ok: false, reason: '원정 중에는 라이벌 격파를 시작할 수 없어요' };
    }
    if (!this.isAtLodging()) {
      return { ok: false, reason: '숙소에서만 라이벌 격파를 시작할 수 있어요' };
    }
    const check = canStartRivalDuel(this.save, rival, false);
    if (!check.ok) return check;

    const expReady = checkExpeditionReady(this.save);
    if (!expReady.ok) {
      return { ok: false, reason: expReady.reason ?? '파티가 원정을 떠날 수 없어요' };
    }

    this.save.rivalDuelRun = serializeRivalRun(rival);
    this.rivalDuelTarget = rival;

    if (!this.startRivalDuelExpedition()) {
      delete this.save.rivalDuelRun;
      this.rivalDuelTarget = null;
      return { ok: false, reason: '라이벌 격파 결투장 진입 실패 — 잠시 후 다시 시도해 주세요' };
    }
    this.startRivalDuelEncounter();
    this.startCombat();
    this.addEvent(0.5, 0.3, `⚔️ ${rival.nickname} 모험단과 결투 시작!`, '#ffaa88', 2.4);
    return { ok: true };
  }

  /** 라이벌 격파 전용 원정 — 숏컷·던전 준비 없이 1층 결투장 */
  private startRivalDuelExpedition(): boolean {
    if (this.isInExpedition() || !this.isAtLodging()) return false;

    this.pendingReturnToLodging = false;
    this.save.defeatLog = undefined;
    clearExpeditionHighlight(this.save);
    this.save.location = 'dungeon';
    this.save.inExpedition = true;
    this.save.currentRegion = 1;
    resetFloorSessionPacing(this.save, 1);
    clearExpeditionRunState(this.save);
    this.currentAffix = getRegionAffix(1);
    this.resetRunStats();
    this.resetVfx();
    this.clearEncounter();
    this.isBossFight = false;
    this.isEliteFight = false;
    this.isEpicFight = false;
    this.killedThisWave = [];
    this.waveProcExp = 0;
    this.pendingTravelRegion = null;
    this.party = buildPartyCombatants(this.save);
    syncCombatHp(this.save, this.party);
    this.isLodgingResting = false;
    this.backgroundScrollX = 0;
    this.lastArrivalMessage = '';
    this.waveStreak = 0;
    this.chainEngage = false;
    saveGame(this.save);
    this.onSave?.();
    return true;
  }

  private clearRivalDuelState() {
    this.rivalDuelTarget = null;
    this.rivalSkillTimers.clear();
    if (this.save.rivalDuelRun) {
      this.save.rivalDuelRun.active = false;
      delete this.save.rivalDuelRun;
    }
  }

  private finishRivalDuelCombat(won: boolean) {
    const rival = this.getRivalDuelTarget();
    let result: RivalDuelResult | null = null;

    if (rival) {
      if (won) {
        const res = finishRivalDuelWin(this.save, rival);
        result = {
          won: true,
          nickname: rival.nickname,
          teamName: rival.teamName,
          gold: res.gold,
          sp: res.sp,
          message: res.message,
          remainingAttempts: getRivalDuelRemaining(this.save),
        };
      } else {
        const res = finishRivalDuelLoss(this.save, rival);
        result = {
          won: false,
          nickname: rival.nickname,
          teamName: rival.teamName,
          message: res.message,
          remainingAttempts: getRivalDuelRemaining(this.save),
        };
      }
    }

    this.clearRivalDuelState();
    this.vfx.retreatAllMelee();
    this.clearEncounter();
    this.killedThisWave = [];
    this.waveProcExp = 0;
    this.isBossFight = false;
    this.isEliteFight = false;
    this.isEpicFight = false;
    this.pendingReturnToLodging = false;
    this.pendingSettlement = null;
    this.resetRunStats();

    if (!result) {
      saveGame(this.save);
      this.returnToLodgingDirect(true);
      this.onSave?.();
      return;
    }

    this.rivalDuelResultPending = result;
    this.setPhase('loot');
    this.phaseTimer = 0;
    this.addEvent(
      0.5, 0.24,
      result.won ? '🏆 격파 성공!' : '💀 격파 실패',
      result.won ? '#ffdd88' : '#ff8888',
      4,
      true,
    );
    saveGame(this.save);
    this.onRivalDuelComplete?.(result);
    this.onSave?.();
  }

  private tickRivalGhostSkills(dt: number) {
    if (!this.isRivalDuelActive()) return;
    for (const enc of this.getAliveSlots()) {
      const charId = enc.rivalCharId;
      if (!charId) continue;
      let elapsed = (this.rivalSkillTimers.get(enc.uid) ?? 0) + dt;
      const interval = 5.5 + (enc.slot % 3) * 1.2;
      if (elapsed < interval) {
        this.rivalSkillTimers.set(enc.uid, elapsed);
        continue;
      }
      this.rivalSkillTimers.set(enc.uid, 0);
      const target = this.party.filter(p => p.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (!target) continue;
      const enemy = enc.entity;
      const skillName = pickRivalSkillLabel(charId);
      const dmg = Math.floor(
        enemy.atk * (2.4 + Math.random() * 0.8) * this.getCombatFatigueMult(),
      );
      const prevHp = target.hp;
      target.hp = Math.max(0, target.hp - dmg);
      markEntityKnockdown(target, prevHp);
      this.runStats.damageTaken += dmg;
      this.bumpCharStat(target.id, 'damageTaken', dmg);
      this.lastHit = { attacker: enemy.name, target: target.name, damage: dmg };
      onPartyHitGauge(this.save, target.id);
      const slot = getVisualSlotIndex(this.save, target.id);
      if (slot >= 0) this.vfx.onPartyHit(slot);
      this.addEvent(0.28, 0.46, `★${skillName} -${dmg}`, '#ff6688', 1.2, true);
      this.onAudio?.({ type: 'hurt', magic: enemy.isMagic ?? false, delayMs: 80 });
      if (this.party.every(p => p.hp <= 0)) this.onPartyWipe();
    }
  }

  constructor(public save: GameSave) {
    reconcileSave(save);
    ensureLocation(save);
    this.save.defeatUntil = 0;
    this.party = buildPartyCombatants(save);
    this.restoreRuntimeFromSave();
    if (isAtLodging(save)) {
      this.resetVfx();
      this.clearEncounter();
      if (this.phase !== 'travel') this.setPhase('walk');
      if (!this.isLodgingResting) {
        this.autoStartLodgingRestIfNeeded(false);
      }
    } else if (save.inExpedition) {
      this.resetVfx();
      this.clearEncounter();
      if (this.phase !== 'travel') this.setPhase('walk');
      if (isInSpireRun(save)) {
        void preloadSpireTowerAssets();
      }
      if (this.isReturningToLodging && !this.returnTripQueue.length && save.currentRegion > 1) {
        for (let r = save.currentRegion - 1; r >= 1; r--) this.returnTripQueue.push(r);
      }
    }
  }

  /** 세이브에 원정 런타임 동기화 (앱 백그라운드·주기 저장용) */
  syncRuntimeToSave(): void {
    this.save.expeditionRuntime = {
      isReturningToLodging: this.isReturningToLodging,
      isSpireReturnTrip: this.isSpireReturnTrip,
      returnTripQueue: [...this.returnTripQueue],
      isLodgingResting: this.isLodgingResting,
      pendingTravelRegion: this.pendingTravelRegion,
      pendingReturnToLodging: this.pendingReturnToLodging,
      travelFromId: this.travelFromId,
      travelToId: this.travelToId,
      travelDurationSec: this.travelDurationSec,
      returnWalkSec: this.returnWalkSec,
      phase: this.phase,
      phaseTimer: this.phaseTimer,
    };
  }

  private restoreRuntimeFromSave(): void {
    const rt = this.save.expeditionRuntime;
    if (!rt) return;
    this.isReturningToLodging = !!rt.isReturningToLodging;
    this.isSpireReturnTrip = !!rt.isSpireReturnTrip;
    this.returnTripQueue = [...(rt.returnTripQueue ?? [])];
    this.isLodgingResting = !!rt.isLodgingResting && isAtLodging(this.save);
    this.pendingTravelRegion = rt.pendingTravelRegion ?? null;
    this.pendingReturnToLodging = !!rt.pendingReturnToLodging;
    this.travelFromId = rt.travelFromId ?? 0;
    this.travelToId = rt.travelToId ?? 0;
    this.travelDurationSec = rt.travelDurationSec ?? 0;
    this.returnWalkSec = rt.returnWalkSec ?? 0;
    if (rt.phase === 'travel' && rt.travelToId && rt.travelDurationSec) {
      this.phase = 'travel';
      this.phaseTimer = rt.phaseTimer ?? 0;
    } else if (rt.phase === 'loot') {
      this.phase = 'loot';
      this.phaseTimer = rt.phaseTimer ?? 0;
    }
  }

  private forceLodgingState() {
    this.save.location = 'lodging';
    this.save.inExpedition = false;
    this.save.currentRegion = 1;
    this.currentAffix = getRegionAffix(1);
    this.isReturningToLodging = false;
    this.isSpireReturnTrip = false;
    this.returnTripQueue = [];
  }

  isAtLodging(): boolean {
    return isAtLodging(this.save);
  }

  isInExpedition(): boolean {
    return isInExpedition(this.save);
  }

  isDefeatRestActive(): boolean {
    if (this.isInExpedition()) return this.phase === 'defeat';
    if (getActivePartyMembers(this.save).length > 0) return false;
    return this.save.party.some(id => isCharIncapacitated(this.save, id));
  }

  getDefeatRemainingSec(): number {
    return getPartyIncapRemainingSec(this.save);
  }

  getDefeatLog(): DefeatLog | null {
    return this.save.defeatLog ?? null;
  }

  private resetRunStats() {
    this.runStats = {
      goldEarned: 0, damageDealt: 0, damageTaken: 0, kills: 0, touchDamage: 0,
      matsGained: {}, byChar: {},
    };
  }

  private bumpCharStat(charId: string, field: keyof CharRunCombatStats, amount: number) {
    if (amount <= 0 || !charId) return;
    const cur = this.runStats.byChar[charId] ?? { damageDealt: 0, damageTaken: 0, healDone: 0 };
    cur[field] += amount;
    this.runStats.byChar[charId] = cur;
  }

  getCharRunStats(charId: string): CharRunCombatStats {
    return this.runStats.byChar[charId] ?? { damageDealt: 0, damageTaken: 0, healDone: 0 };
  }

  get region() {
    return REGIONS.find(r => r.id === this.save.currentRegion) ?? REGIONS[0];
  }

  isInSpireRun(): boolean {
    return isInSpireRun(this.save);
  }

  getCurrentLocationLabel(): string {
    if (this.isSpireReturnTrip) {
      const floor = this.save.spireRun?.floor ?? 1;
      return `🗼 야탑 ${floor}층 → 🏠 마을`;
    }
    if (this.isInSpireRun()) return getSpireLocationLabel(this.save);
    if (this.isAtLodging()) return '🏠 모험숙소';
    if (this.isReturningToLodging) {
      if (this.phase === 'travel' && this.travelFromId && this.travelToId) {
        const from = REGIONS.find(r => r.id === this.travelFromId);
        const to = REGIONS.find(r => r.id === this.travelToId);
        return `🏠 귀환 ${from?.name ?? '?'} → ${to?.name ?? '?'}`;
      }
      const reg = REGIONS.find(r => r.id === this.save.currentRegion);
      return `🏠 숙소 귀환 중 · ${this.save.currentRegion}층 ${reg?.name ?? ''}`.trim();
    }
    if (this.phase === 'travel' && this.travelFromId && this.travelToId) {
      const from = REGIONS.find(r => r.id === this.travelFromId);
      const to = REGIONS.find(r => r.id === this.travelToId);
      return `🚶 ${from?.name ?? '?'} → ${to?.name ?? '?'}`;
    }
    return `📍 ${this.region.name} (${this.save.currentRegion}층)`;
  }

  /** @deprecated — HUD는 getCurrentLocationLabel + getHomeStationLabel 분리 사용 */
  getRegionLabel(): string {
    return this.getCurrentLocationLabel();
  }

  getTravelProgress(): number {
    if (this.phase !== 'travel' || this.travelDurationSec <= 0) return 0;
    return Math.min(1, this.phaseTimer / this.travelDurationSec);
  }

  isTraveling(): boolean {
    return this.phase === 'travel';
  }

  isSpireReturnInProgress(): boolean {
    return this.isSpireReturnTrip;
  }

  getSpireReturnRemainingSec(): number {
    if (!this.isSpireReturnTrip || this.phase !== 'travel') return 0;
    return Math.max(0, Math.ceil(this.travelDurationSec * (1 - this.getTravelProgress())));
  }

  getReturnWalkRemainingSec(): number {
    return Math.max(0, Math.ceil(this.returnWalkSec));
  }

  isSpeedBoostActive(): boolean {
    return Date.now() < (this.save.speedBoostUntil ?? 0);
  }

  getSpeedBoostRemainingSec(): number {
    return Math.max(0, Math.ceil(((this.save.speedBoostUntil ?? 0) - Date.now()) / 1000));
  }

  getTimeScale(): number {
    const ad = this.isSpeedBoostActive() ? 2 : 1;
    const battle = (this.phase === 'combat' || this.phase === 'boss'
      || this.phase === 'encounter' || this.phase === 'loot')
      ? this.getBattleSpeedMult() : 1;
    return ad * battle;
  }

  /** 기본 1.5× — 10층+ 2× (설정) */
  getBattleSpeedMult(): number {
    const requested = this.save.settings.battleSpeed === 2 ? 2 : 1.5;
    if (this.save.currentRegion < 10) return Math.min(requested, 1.5);
    return requested;
  }

  isSpeedFarmMode(): boolean {
    return isRegionCleared(this.save, this.save.currentRegion)
      && this.save.settings.speedFarmMode !== false;
  }

  /** 클리어 층 속파 — 연출·DOM·저장 경량화 */
  isCombatPerfLite(): boolean {
    const preset = getCombatFeedbackPreset(this.save);
    if (preset === 'rich') return false;
    if (preset === 'lite') {
      return shouldLiteCombatPerf(this.isInExpedition(), this.phase);
    }
    return shouldCombatPerfLite(
      this.isSpeedFarmMode(),
      this.isInExpedition(),
      this.phase,
      this.waveStreak,
    );
  }

  private requestSave(immediate = false) {
    this.syncRuntimeToSave();
    if (immediate || !this.isCombatPerfLite()) {
      if (this.saveDebounceTimer) {
        clearTimeout(this.saveDebounceTimer);
        this.saveDebounceTimer = null;
      }
      saveGame(this.save);
      this.onSave?.();
      return;
    }
    if (this.saveDebounceTimer) return;
    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;
      saveGame(this.save);
      this.onSave?.();
    }, 2200);
  }

  /** 앱 일시정지·종료 시 디바운스 무시하고 즉시 저장 */
  flushPendingSave() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    this.syncRuntimeToSave();
    saveGame(this.save);
    this.onSave?.();
  }

  getWaveStreak(): number {
    return this.waveStreak;
  }

  getComboHudText(): string {
    return formatComboHud(this.waveStreak);
  }

  getPartyGaugeSnapshot(): {
    id: string; name: string; ratio: number; ready: boolean; type: string;
    color: string; accent: string; typeLabel: string;
  }[] {
    const ids = this.party.length > 0
      ? this.party.filter(p => p.hp > 0).map(p => p.id)
      : this.save.party;
    return ids.map(id => {
      const def = CHAR_MAP[id];
      const ratio = getGauge(this.save, id);
      const type = getGaugeType(id);
      return {
        id,
        name: def?.name ?? id,
        ratio,
        ready: ratio >= GAUGE_MAX,
        type,
        color: def?.color ?? '#6688cc',
        accent: def?.accent ?? '#aaccff',
        typeLabel: type === 'mana' ? '마나' : '분노',
      };
    });
  }

  getEncounterTargetHints() {
    return [];
  }

  getExpeditionProgress(): { pct: number; label: string; sub: string } {
    return buildExpeditionProgress(this.save, {
      region: this.save.currentRegion,
      codexPct: this.getCodexPercent(this.save.currentRegion),
      isSpeedFarmMode: this.isSpeedFarmMode(),
      isBossFight: this.isBossFight,
      phaseIsBoss: this.phase === 'boss',
    });
  }

  getReturnEtaSec(): number {
    if (!this.isReturningToLodging) return 0;
    let total = this.returnWalkSec;
    if (this.phase === 'travel') {
      total += Math.max(0, this.travelDurationSec - this.phaseTimer);
    }
    let cur = this.save.currentRegion;
    for (const dest of this.returnTripQueue) {
      total += calcTravelDurationSec(cur, dest) * getReturnTravelMult(this.save);
      total += getReturnWalkSec(this.save, dest);
      cur = dest;
    }
    if (this.returnTripQueue.length === 0 && this.phase === 'walk' && this.isReturningToLodging) {
      total += getReturnWalkSec(this.save, cur);
    }
    return Math.max(0, Math.ceil(total));
  }

  getWalkScrollSpeed(): number {
    if (this.phase === 'travel') {
      const fast = this.save.settings.fastWalk ? 1.15 : 1;
      return this.scrollSpeed * WALK_SCROLL_MULT * fast * 2.2;
    }
    if (this.phase !== 'walk') return 0;
    const fast = this.save.settings.fastWalk ? 1.15 : 1;
    return this.scrollSpeed * WALK_SCROLL_MULT * fast;
  }

  /** 배경 패럴랙스 속도 — 전투·조우 중 정지, 루트·이동 중만 스크롤 */
  getBackgroundScrollSpeed(): number {
    if (this.isRivalDuelActive()) return 0;
    if (this.isAtLodging()) return 0;
    if (this.phase === 'defeat' || this.isDefeatRestActive() || this.isResting) return 0;
    if (this.phase === 'combat' || this.phase === 'boss' || this.phase === 'encounter') return 0;
    const fast = this.save.settings.fastWalk ? 1.12 : 1;
    const base = this.scrollSpeed * WALK_SCROLL_MULT * fast;
    if (this.phase === 'travel') return base * 2.4;
    if (this.phase === 'walk' || this.phase === 'loot') return base * 1.05;
    return base * 0.15;
  }

  isBackgroundMoving(): boolean {
    return this.getBackgroundScrollSpeed() > 0;
  }

  isWalking(): boolean {
    return this.phase === 'walk' || this.phase === 'travel';
  }

  activateSpeedBoost(ms = SPEED_BOOST_MS): void {
    this.save.speedBoostUntil = Date.now() + ms;
    saveGame(this.save);
  }

  update(dt: number) {
    if (this.isAtLodging()) {
      if (this.isLodgingResting) {
        if (tickLodgingHeal(this.save, dt)) {
          this.party = buildPartyCombatants(this.save);
          this.onUpdate?.();
        }
        if (isPartyFullyHealed(this.save)) {
          this.isLodgingResting = false;
          this.addEvent(0.5, 0.32, '✅ 휴식 완료 — HP 전원 회복!', '#88ffcc', 2);
          saveGame(this.save);
          this.onRestComplete?.();
          this.onSave?.();
        }
      }
      this.onUpdate?.();
      return;
    }
    if (this.isResting) {
      this.tickRest();
      this.onUpdate?.();
      return;
    }
    const scale = this.getTimeScale();
    dt *= scale;
    if (this.isInExpedition() && !this.isAtLodging() && this.phase !== 'travel') {
      tickFloorPacing(this.save, this.region.id, dt);
    }
    if (this.isInExpedition() && !this.isAtLodging() && !this.isReturningToLodging
      && (this.phase === 'walk' || this.phase === 'loot' || this.phase === 'encounter')) {
      this.tickExpeditionModifiers(dt);
    }
    this.phaseTimer += dt;
    this.vfx.update(dt);
    this.vfx.perfLite = this.isCombatPerfLite();
    setCombatPerfSeBudget(this.isCombatPerfLite());
    this.walkX += this.getWalkScrollSpeed() * dt;
    this.backgroundScrollX += this.getBackgroundScrollSpeed() * dt;

    switch (this.phase) {
      case 'walk': {
        if (this.floor18CelebrationPending || this.augmentPickPending) break;
        if (this.pendingTravelRegion != null && !this.isReturningToLodging) {
          this.finishLootAndResume();
          break;
        }
        if (this.isReturningToLodging) {
          this.returnWalkSec -= dt;
          if (this.returnWalkSec <= 0) {
            this.advanceReturnTrip();
          }
          break;
        }
        const cleared = isRegionCleared(this.save, this.region.id);
        const speedFarm = this.isSpeedFarmMode();
        const walkBase = cleared
          ? getClearedWalkMult(!!this.save.settings.fastWalk, speedFarm)
          : (this.save.settings.fastWalk ? 0.50 : 0.85) * getUnclearedWalkMult(this.region.id);
        const jitter = cleared ? (speedFarm ? 0.03 : 0.08) : (this.save.settings.fastWalk ? 0.18 : 0.42);
        const walkLimit = walkBase * WALK_PHASE_TIME_MULT;
        if (this.phaseTimer > walkLimit + Math.random() * jitter * WALK_PHASE_TIME_MULT) {
          this.startEncounter();
        }
        break;
      }
      case 'encounter':
        if (this.phaseTimer > this.getEncounterDelay()) this.startCombat();
        break;
      case 'combat':
      case 'boss':
        this.updateCombat(dt);
        break;
      case 'loot':
        if (this.rivalDuelResultPending) break;
        if (this.phaseTimer > this.getLootDelay()) {
          this.finishLootAndResume();
        }
        break;
      case 'travel':
        this.tickTravel(dt);
        break;
    }

    this.events = this.events.filter(e => {
      e.life -= dt;
      e.y -= 0.12 * dt;
      return e.life > 0;
    });
    if (this.gemFlyVfx) {
      this.gemFlyVfx.elapsed += dt;
      if (this.gemFlyVfx.elapsed >= this.gemFlyVfx.duration) this.gemFlyVfx = null;
    }
    if (this.bossIntroTimer > 0) {
      this.bossIntroTimer = Math.max(0, this.bossIntroTimer - dt);
    }
    if (this.eliteIntroTimer > 0) {
      this.eliteIntroTimer = Math.max(0, this.eliteIntroTimer - dt);
    }
    this.onUpdate?.();
  }

  private getEncounterDelay(): number {
    if (this.isSpeedFarmMode()) return 0.1;
    if (isRegionCleared(this.save, this.save.currentRegion)) return 0.16;
    return this.save.settings.fastWalk ? 0.18 : 0.32;
  }

  private getLootDelay(): number {
    if (this.isSpeedFarmMode()) return 0.45;
    if (isRegionCleared(this.save, this.save.currentRegion)) return 1.35;
    return this.save.settings.fastWalk ? 1.5 : POST_KILL_WALK_SEC;
  }

  getBossFightElapsedSec(): number {
    if (!this.isBossFight || this.phase !== 'boss' || !this.bossFightStartedAt) return 0;
    return (Date.now() - this.bossFightStartedAt) / 1000;
  }

  getCombatElapsedSec(): number {
    if ((this.phase !== 'combat' && this.phase !== 'boss') || !this.combatFightStartedAt) return 0;
    return (Date.now() - this.combatFightStartedAt) / 1000;
  }

  private getCombatFatigueMult(): number {
    return getCombatFatigueMult(this.getCombatElapsedSec());
  }

  private maybeAnnounceCombatFatigue() {
    const elapsed = this.getCombatElapsedSec();
    if (this.combatFatigueAnnounced || elapsed < 28) return;
    this.combatFatigueAnnounced = true;
    this.addEvent(0.5, 0.22, '⚡ 전투 가속 — 양측 피해 증가!', '#ffcc66', 2.2);
  }

  canFleeBoss(): boolean {
    return this.phase === 'boss' && this.isBossFight
      && this.getBossFightElapsedSec() >= AdventureSystem.BOSS_FLEE_AFTER_SEC;
  }

  fleeBoss(): boolean {
    if (!this.canFleeBoss()) return false;
    const name = this.bossIntroName || this.encounterName || '보스';
    this.resetVfx();
    this.clearEncounter();
    this.isBossFight = false;
    this.bossGrudgePct = 0;
    this.bossFightStartedAt = 0;
    this.bossIntroTimer = 0;
    this.setPhase('walk');
    this.addEvent(0.5, 0.3, `🏃 ${name}에게서 도망쳤다…`, '#ffaa88', 2.5);
    saveGame(this.save);
    this.onSave?.();
    return true;
  }

  private setPhase(p: AdventurePhase) {
    const prev = this.phase;
    this.phase = p;
    this.phaseTimer = 0;
    if (p === 'walk' || p === 'travel' || p === 'defeat' || p === 'boss') {
      this.requestSave(true);
    }
    if (this.isCombatPerfLite() && (p === 'combat' || p === 'encounter')) {
      if (this.events.length > 8) this.events = this.events.slice(-8);
    }
    if (prev !== p) this.onPhaseChange?.(p);
  }

  private startEncounter() {
    if (this.isRivalDuelActive()) {
      this.startRivalDuelEncounter();
      return;
    }
    const region = this.region;
    const pathGold = Math.floor(1 + (this.isInSpireRun()
      ? (this.save.spireRun?.floor ?? 1) * 0.45
      : region.id * 0.35));
    creditPendingHuntGold(this.save, pathGold);
    this.runStats.goldEarned += pathGold;
    this.currentAffix = this.isInSpireRun()
      ? getRegionAffix(Math.min(18, this.save.currentRegion))
      : getRegionAffix(region.id);
    const codexPct = this.getCodexPercent(region.id);
    let plan = this.isInSpireRun()
      ? planSpireEncounter(this.save)
      : planEncounter(this.save, region.id, codexPct);
    if (!plan) {
      const normals = getRegionMonsters(region.id).filter(m => !m.isRare);
      const fallback = normals[Math.floor(Math.random() * normals.length)];
      if (!fallback) {
        this.phaseTimer = 0;
        return;
      }
      plan = { monsters: [fallback], isBoss: false, isElite: false, isEpic: false, spawnCount: 1 };
    }

    this.isBossFight = plan.isBoss;
    this.isEliteFight = plan.isElite;
    this.isEpicFight = plan.isEpic;
    this.waveMonsters = plan.monsters;
    this.encounterSlots = [];

    const primary = plan.monsters[0]!;
    this.encounterName = primary.name;
    this.encounterBanner = popEncounter({
      name: primary.name,
      count: plan.spawnCount,
      isBoss: plan.isBoss,
      isElite: plan.isElite,
      isEpic: plan.isEpic,
      element: primary.element,
    });
    const bannerColor = this.isEpicFight ? '#ff66aa'
      : this.isEliteFight ? '#ff8844'
        : plan.isBoss ? '#ff6666' : '#ffdd88';
    this.addEvent(0.5, 0.32, this.encounterBanner, bannerColor, 1.0, true);
    if (this.currentAffix.id !== 'calm') {
      this.addEvent(0.5, 0.26, popAffixBrief(this.currentAffix), '#aaccff', 0.9, true);
    }
    this.onAudio?.({ type: 'encounter' });
    this.waveTwist = rollWaveTwist(plan.isBoss, plan.isElite, plan.isEpic);
    if (this.waveTwist) {
      this.addEvent(0.5, 0.2, this.waveTwist.banner, '#cc88ff', 1.8, true);
    }
    this.setPhase('encounter');
  }

  private startRivalDuelEncounter() {
    const rival = this.getRivalDuelTarget();
    if (!rival) {
      this.clearRivalDuelState();
      this.returnToLodgingDirect(true);
      return;
    }
    beginRivalDuelAttempt(this.save, rival);
    this.currentAffix = getRegionAffix(Math.min(18, this.save.currentRegion));
    const plan = planRivalDuelEncounter(rival, this.save);
    this.isBossFight = false;
    this.isEliteFight = true;
    this.isEpicFight = false;
    this.waveMonsters = plan.monsters;
    this.encounterSlots = [];
    this.encounterName = `${rival.teamName}`;
    this.encounterBanner = `⚔️ ${rival.nickname} 모험단 — 라이벌 격파!`;
    this.addEvent(0.5, 0.32, this.encounterBanner, '#ff8866', 1.4, true);
    this.onAudio?.({ type: 'encounter' });
    this.waveTwist = null;
  }

  private resetVfx() {
    this.vfx.clearMeleeEngage();
    this.vfx.partyStrike = null;
    this.vfx.enemyHitFlashes = {};
    this.vfx.enemyStrikes = {};
    this.vfx.enemyAttackFlashes = {};
    this.vfx.partyFlash = null;
    this.vfx.enemyKnock = 0;
    this.vfx.slashes = [];
    this.vfx.projectiles = [];
    this.clearSkillCharges();
  }

  private getEnemyVisualSlot(targetSlot: EncounterSlot): number {
    const alive = this.encounterSlots.filter(s => s.entity.hp > 0);
    const idx = alive.findIndex(s => s.uid === targetSlot.uid);
    return idx >= 0 ? idx : 0;
  }

  private getEnemyHitNorm(visualSlot: number): { x: number; y: number } {
    const alive = this.encounterSlots.filter(s => s.entity.hp > 0);
    const n = Math.max(1, alive.length);
    const baseX = 0.76;
    const gap = n > 1 ? 0.042 : 0;
    return { x: baseX + visualSlot * gap, y: 0.48 };
  }

  private buildSkillDeliveryOpts(charId: string): SkillDeliveryOpts {
    const slot = getVisualSlotIndex(this.save, charId);
    return {
      meleeAttached: slot >= 0 && this.vfx.isMeleeAttached(slot),
      meleeEngageStarted: slot >= 0 && this.vfx.hasMeleeEngagement(slot),
      warriorRangedUsed: this.warriorRangedUsed.has(charId),
    };
  }

  private markWarriorRangedUsed(charId: string, delivery: SkillDelivery) {
    if (charUsesMeleeDash(charId) && delivery === 'projectile') {
      this.warriorRangedUsed.add(charId);
    }
  }

  private meleeAttackOpts(charId: string, targetSlot: EncounterSlot | null | undefined) {
    if (!targetSlot || !charUsesMeleeDash(charId)) return undefined;
    const st = this.save.chars[charId];
    const skills = st ? getActiveSkills(st.unlockedNodes, charId) : [];
    return {
      enemyUid: targetSlot.uid,
      motionPool: buildCharMeleeMotionPool(charId, skills.length),
    };
  }

  private emitPartyAttackAudio(
    charId: string,
    targetSlot: EncounterSlot,
    res: { isCrit?: boolean; isUltimate?: boolean; skill?: CombatSkillDef | null },
  ) {
    const slot = getVisualSlotIndex(this.save, charId);
    const useMeleeEngage = charUsesMeleeDash(charId);
    const alreadyEngaged = useMeleeEngage && slot >= 0
      && this.vfx.melee.isEngagedOnEnemy(slot, targetSlot.uid);
    const timing = computePartyAttackSfxTiming({
      charId,
      isSkill: !!res.skill,
      isUltimate: !!res.isUltimate,
      powerTier: getCharCombatPowerTier(this.save, charId),
      useMeleeEngage,
      alreadyEngaged,
    });
    this.onAudio?.({
      type: 'attack',
      charId,
      crit: !!res.isCrit,
      ultimate: res.isUltimate,
      powerTier: getCharCombatPowerTier(this.save, charId),
      skill: res.skill
        ? { element: res.skill.element, animTier: res.skill.animTier, name: res.skill.name }
        : undefined,
      swingDelayMs: timing.swingMs,
      hitDelayMs: timing.hitMs,
      playHitLanded: !res.skill && !res.isUltimate,
    });
  }

  private firePartyAttackVfx(
    charId: string,
    targetSlot: EncounterSlot | null | undefined,
    opts: {
      crit?: boolean;
      skill?: CombatSkillDef | null;
      animKey?: string | null;
      advance?: boolean;
    } = {},
  ) {
    const skill = opts.skill ?? null;
    const crit = opts.crit ?? false;
    if (this.isCombatPerfLite() && !skill && !crit) {
      this.perfAttackSkip += 1;
      if (this.perfAttackSkip % 3 !== 0) return;
    }
    const slot = getVisualSlotIndex(this.save, charId);
    if (slot < 0) return;
    const st = this.save.chars[charId];
    const deliveryOpts = this.buildSkillDeliveryOpts(charId);
    const delivery = skill
      ? inferSkillDelivery(charId, skill, deliveryOpts)
      : (charUsesMeleeDash(charId) ? 'melee' : 'instant');
    this.markWarriorRangedUsed(charId, delivery);
    const advance = opts.advance ?? shouldAdvanceForDelivery(charId, delivery);
    const enemySlot = targetSlot ? this.getEnemyVisualSlot(targetSlot) : 0;
    const hitNorm = this.getEnemyHitNorm(enemySlot);
    this.vfx.onPartyAttack(
      slot,
      crit || !!skill,
      hitNorm.x,
      hitNorm.y,
      advance,
      skill,
      opts.animKey ?? null,
      charId,
      getCharCombatPowerTier(this.save, charId),
      st?.prestige ?? 0,
      this.meleeAttackOpts(charId, targetSlot),
      enemySlot,
      deliveryOpts,
    );
  }

  private startCombat() {
    if (!this.waveMonsters.length) return;
    this.resetVfx();
    this.warriorRangedUsed.clear();
    this.killedThisWave = [];
    this.waveProcExp = 0;
    reconcileFormation(this.save);
    this.party = buildPartyCombatants(this.save, { combatOnly: true });
    if (!this.party.length) {
      this.addEvent(0.5, 0.28, '⚠ 전투 가능한 파티원 없음 — 숙소로 후퇴', '#ffaa66', 2);
      this.returnToLodging(true);
      return;
    }
    const affix = this.currentAffix;
    const count = this.waveMonsters.length;
    const region = this.save.currentRegion;
    const readiness = assessPartyReadiness(this.save, region);
    const twist = this.waveTwist;
    const growthPressure = regionGrowthPressureMult(this.save, region);
    const hpScale = regionMonsterHpScale(region) * groupScaleMult(count, region)
      * readiness.monsterMult * growthPressure;
    const atkScale = regionMonsterAtkScale(region) * groupScaleMult(count, region)
      * readiness.monsterMult * growthPressure * (twist?.enemyAtkMult ?? 1);
    const eliteMult = this.isEpicFight ? EPIC_POWER_MULT
      : this.isEliteFight ? ELITE_POWER_MULT : 1;

    this.encounterSlots = this.waveMonsters.map((mon, i) => {
      const entity = buildMonsterCombatant(mon, hpScale * eliteMult, atkScale * eliteMult);
      entity.instanceUid = `${mon.id}_${i}`;
      entity.atk = Math.floor(entity.atk * affix.monAtkMult);
      entity.def = Math.floor(entity.def * affix.monDefMult * regionMonsterDefScale(region)
        * growthPressure * (twist?.enemyDefMult ?? 1));
      entity.mdef = Math.floor(entity.mdef * regionMonsterDefScale(region) * growthPressure);
      entity.atkSpd *= affix.monSpdMult;
      if (!mon.isBoss) {
        entity.atkSpd *= regionMonsterAtkSpdMult(region);
      }
      entity.attackTimer = 0.35 + i * 0.45;
      const elite = isEliteMonster(mon, this.isEliteFight || this.isEpicFight);
      const isEpic = this.isEpicFight && i === 0;
      if (isEpic) decorateEpicEntity(entity);
      else if (elite && i === 0) entity.name = `⚠ ${mon.name}`;
      return {
        uid: entity.instanceUid, def: mon, entity, slot: i,
        isElite: elite || isEpic, isEpic, spiritGauge: isEpic ? 0.35 : 0,
        rivalCharId: parseRivalGhostCharId(mon.id) ?? undefined,
      };
    });

    if (readiness.playerAtkMult !== 1) {
      for (const p of this.party) {
        p.atk = Math.max(1, Math.floor(p.atk * readiness.playerAtkMult));
      }
    }

    this.aggro.reset(this.encounterSlots.map(s => s.uid), this.save);
    this.affixTick = 0;
    this.lastHit = undefined;
    this.bossGrudgePct = 0;
    this.combatFightStartedAt = Date.now();
    this.combatFatigueAnnounced = false;
    if (this.isEpicFight || this.isEliteFight) {
      this.eliteIntroTimer = 1.6;
      this.eliteIntroLabel = this.isEpicFight
        ? `★ ${getWeeklyEpicVariant().name}`
        : '⚠ 엘리트';
      this.eliteRewardHint = this.isEpicFight
        ? `보상 ×${epicRewardMult().toFixed(2)}`
        : '보상 ×2.15';
    } else {
      this.eliteIntroTimer = 0;
      this.eliteIntroLabel = '';
      this.eliteRewardHint = '';
    }
    if (this.isBossFight) {
      const boss = this.waveMonsters.find(m => m.isBoss);
      if (boss) {
        this.bossIntroName = boss.name;
        this.bossIntroTimer = 2.4;
        this.bossFightStartedAt = Date.now();
        this.bossGrudgePct = getBossGrudgeBonusPct(this.save, boss.id, region);
        const grudge = popBossGrudge(this.bossGrudgePct);
        if (grudge) this.addEvent(0.5, 0.28, grudge, '#cc88ff', 0.9, true);
      }
    } else {
      this.bossFightStartedAt = 0;
      this.bossIntroTimer = 0;
      this.bossIntroName = '';
    }
    this.setPhase(this.isBossFight ? 'boss' : 'combat');
  }

  private applyBossGrudgeDmg(baseDmg: number, enc: EncounterSlot): number {
    if (!enc.def.isBoss || this.bossGrudgePct <= 0) return baseDmg;
    return applyBossGrudgeToDamage(baseDmg, this.bossGrudgePct);
  }

  private getAliveSlots(): EncounterSlot[] {
    return this.encounterSlots.filter(s => s.entity.hp > 0);
  }

  private pickPartyTarget(): EncounterSlot | null {
    const alive = this.getAliveSlots();
    if (!alive.length) return null;
    return alive.reduce((a, b) => {
      const aMax = Math.max(1, a.entity.maxHp);
      const bMax = Math.max(1, b.entity.maxHp);
      return (a.entity.hp / aMax) < (b.entity.hp / bMax) ? a : b;
    });
  }

  private clearEncounter() {
    this.encounterSlots = [];
    this.waveMonsters = [];
    this.encounterBanner = '';
    this.waveTwist = null;
    this.combatFightStartedAt = 0;
    this.combatFatigueAnnounced = false;
  }

  getAggroSnapshots() {
    const alive = this.getAliveSlots();
    return this.aggro.getSnapshots(
      this.save,
      alive.map(s => ({ uid: s.uid, name: s.entity.name })),
    );
  }

  getCurrentAffix() { return this.currentAffix; }

  private applyPartyHitToEnemy(
    p: CombatEntity,
    targetSlot: EncounterSlot,
    res: SkillStrikeResult,
  ): number {
    let total = 0;
    const affix = this.currentAffix;
    const targets = res.isAoe ? this.getAliveSlots() : [targetSlot];
    const combo = getComboBuff(this.waveStreak);
    for (const slot of targets) {
      let dmg = Math.floor(res.damage * this.getCombatFatigueMult() * combo.atkMult);
      if (res.skill && res.skillDamage > 0) {
        const debuffFx = tryApplySkillDebuffToEnemy(
          slot.entity, res.skill, p.name, this.save.currentRegion,
        );
        if (debuffFx) {
          this.addEvent(0.72, 0.3, `${debuffFx.icon}${debuffFx.name}!`, '#cc88ff', 1.4);
          const enemyVi = this.encounterSlots.findIndex(s => s.uid === slot.uid);
          if (debuffFx.debuffId) {
            this.playDebuffStatusFeedback(debuffFx.debuffId, { onPlayer: false, enemyVi });
          }
        }
      }
      if (res.isAoe && slot.uid !== targetSlot.uid) dmg = Math.floor(dmg * 0.55);
      if (res.skill?.element && slot.entity.element) {
        const base = getElementDamageMult(res.skill.element, slot.entity.element);
        const mult = getEffectiveWeaknessMult(res.skill.element, slot.entity.element, affix, base);
        dmg = Math.floor(dmg * mult);
      }
      const prevRatio = slot.entity.hp / slot.entity.maxHp;
      const actual = applyDamageToEnemy(slot.entity, dmg);
      total += actual;
      if (slot.isElite && actual > 0) {
        slot.spiritGauge = addEliteSpirit(slot.spiritGauge ?? 0, ELITE_SPIRIT_ON_HIT);
      }
      this.aggro.addDamageThreat(slot.uid, p.id, actual, affix, this.save);
      const phaseEv = checkBossPhase(slot, prevRatio);
      if (phaseEv) this.addEvent(0.5, 0.24, phaseEv.message, phaseEv.color, 2);
      const epicEv = checkEpicPhase(slot, prevRatio);
      if (epicEv) this.addEvent(0.5, 0.24, epicEv.message, epicEv.color, 2);
      if (slot.entity.hp <= 0) this.onSingleEnemyKilled(slot);
    }
    if (total > 0) this.bumpCharStat(p.id, 'damageDealt', total);
    return total;
  }

  private tickAffixEffects(dt: number) {
    const affix = this.currentAffix;
    if (!affix.poisonTick) return;
    this.affixTick += dt;
    if (this.affixTick < affix.poisonTick.interval) return;
    this.affixTick = 0;
    for (const p of this.party) {
      if (p.hp <= 0) continue;
      const dmg = affix.poisonTick.dmg;
      p.hp = Math.max(0, p.hp - dmg);
      this.runStats.damageTaken += dmg;
      this.bumpCharStat(p.id, 'damageTaken', dmg);
      this.addEvent(0.28, 0.56, `☠독안개 -${dmg}`, '#88dd44');
    }
  }

  private updateCombat(dt: number) {
    if (this.augmentPickPending) return;
    if (!this.encounterSlots.length) return;
    if (!this.getAliveSlots().length) { this.onWaveCleared(); return; }

    this.tickRivalGhostSkills(dt);
    this.tickAffixEffects(dt);
    this.tickAllDots(dt);
    this.tickPartyModifiers(dt);
    if (!this.getAliveSlots().length) { this.onWaveCleared(); return; }

    this.tickSkillCharges(dt);
    this.tickPendingDebuffCasts(dt);

    for (const p of this.party) {
      if (p.hp <= 0) continue;
      if (this.skillChargeActive.has(p.id)) continue;
      const combo = getComboBuff(this.waveStreak);
      const spdMult = getStatMults(p).spdMult * combo.spdMult;
      p.attackTimer -= dt;
      if (p.attackTimer <= 0) {
        p.attackTimer = 1 / Math.max(0.88, p.atkSpd * spdMult);
        const targetSlot = this.pickPartyTarget();
        if (!targetSlot) continue;
        const st = this.save.chars[p.id];
        applyGaugeToEntity(this.save, p);
        const gaugeReady = getGauge(this.save, p.id) >= GAUGE_MAX;
        const autoUlt = this.save.settings.autoUltimate !== false;
        let res: SkillStrikeResult | null = null;
        if (gaugeReady && autoUlt) {
          const gt = getGaugeType(p.id);
          if (isHealerChar(p.id) && partyNeedsHeal(this.party)) {
            res = resolveHealerUltimateStrike(p, this.party, gt, st?.prestige ?? 0);
          } else {
            res = resolveUltimateStrike(p, targetSlot.entity, gt);
          }
          consumeGauge(this.save, p.id);
          p.gauge = 0;
        } else if (st) {
          const pity = this.skillPity[p.id] ?? 0;
          const strike = resolvePartyStrike(p, targetSlot.entity, st, this.party, {
            healMult: (this.isBossFight ? BOSS_HEAL_MULT : 1)
              * regionPlayerHealMult(this.save.currentRegion),
            comboCritBonus: combo.critBonus,
            deferSupport: true,
          }, this.save, pity);
          res = strike;
          if (strike.skillPityInc) {
            this.skillPity[p.id] = strike.skill ? 0 : (pity + 1);
          }
          onPartyAttackGauge(this.save, p.id, combo.gaugeBonus, strike.isCrit);
          p.gauge = getGauge(this.save, p.id);
        }
        if (!res) continue;

        const isSupportProc = !!res.skill && !res.isUltimate && (
          res.skill.skillKind === 'block'
          || res.skill.skillKind === 'buff'
          || res.isCleanse
          || res.isHeal
        );

        if (isSupportProc) {
          const supportMotion = res.skill!.motionKey
            ?? (res.isCleanse || res.isHeal ? 'heal'
              : res.skill!.skillKind === 'block' ? 'block'
              : res.skill!.animTier >= 2 ? 'attack02' : 'attack01');
          const animKey = getSkillAttackAnimKey(p.id, res.skill!.animTier, supportMotion);
          if (this.tryBeginSupportCast(p, targetSlot, res, animKey)) {
            if (!this.getAliveSlots().length) { this.onWaveCleared(); return; }
            continue;
          }
          this.applySupportStrikeEffects(p.id, { res, targetUid: targetSlot.uid, animKey });
          if (!this.getAliveSlots().length) { this.onWaveCleared(); return; }
          continue;
        }

        this.maybeAnnounceCombatFatigue();

        if (res.isHeal) {
          const healAmt = res.healAmount ?? 0;
          if (healAmt > 0) this.bumpCharStat(p.id, 'healDone', healAmt);
          const healerName = CHAR_MAP[p.id]?.name ?? p.id;
          const fb = res.healDetails?.length
            ? popHealFromDetails(res.healDetails, healerName)
            : popHeal(healAmt);
          this.aggro.addHealThreat(p.id, healAmt, this.currentAffix);
          if (res.skill) {
            this.markSkillUsed(p.id, res.skill.nodeId, fb, '#66ff99');
          }
          this.showCombatHealFeedback(p.id, healAmt, res.healDetails, {
            skill: res.skill ?? null,
            isUltimate: !!res.isUltimate,
            ultimateLabel: res.ultimateLabel,
            gaugeType: res.isUltimate ? getGaugeType(p.id) : undefined,
          });
          if (!res.isUltimate && res.healDetails?.length) {
            this.addEvent(0.5, 0.24, fb, '#88ffcc', 1.05, true);
          }
          syncCombatHp(this.save, this.party);
        } else if (res.damage > 0) {
          const animTier = res.isUltimate ? 3 : (res.skill?.animTier ?? 1);
          let animKey: string | null = null;
          if (res.skill || res.isUltimate) {
            const motionKey = res.isUltimate
              ? (res.skill?.motionKey ?? 'attack03')
              : (res.skill?.motionKey ?? null);
            animKey = getSkillAttackAnimKey(p.id, animTier, motionKey);
          }
          if (this.tryBeginSkillCharge(p, targetSlot, res, animKey)) {
            if (!this.getAliveSlots().length) { this.onWaveCleared(); return; }
            continue;
          }
          this.resolvePartyDamageStrike(p, targetSlot, res, animKey);
        } else if (!res.isHeal) {
          this.addEvent(0.72, 0.42, '방어', '#888888', 0.8, true);
        }
        if (!this.getAliveSlots().length) { this.onWaveCleared(); return; }
      }
    }

    const aliveEnemies = this.getAliveSlots();
    for (let vi = 0; vi < aliveEnemies.length; vi++) {
      const enc = aliveEnemies[vi]!;
      const enemy = enc.entity;
      enemy.attackTimer -= dt;
      if (enemy.attackTimer > 0) continue;
      enemy.attackTimer = 1 / Math.max(0.2, enemy.atkSpd);
      const target = this.aggro.pickTarget(enc.uid, this.party, this.save, this.currentAffix);
      if (!target) continue;
      const monId = enc.def.id;
      const magic = enemy.isMagic ?? false;
      const spiritReady = enc.isElite && (enc.spiritGauge ?? 0) >= 1;
      this.vfx.onMonsterAttack(vi, monId, getVisualSlotIndex(this.save, target.id));
      const monAtkDelay = computeMonsterAttackSfxDelayMs(monId);
      this.onAudio?.({
        type: 'monsterAttack', monsterId: monId,
        tinyPack: MONSTER_TINY_MAP[monId] ?? 'orc',
        isBoss: enc.def.isBoss, magic,
        visualSlot: vi,
        delayMs: monAtkDelay,
      });

      let strikeDmg = 0;
      if (spiritReady) {
        enc.spiritGauge = 0;
        const fatigue = this.getCombatFatigueMult();
        const base = Math.floor(calcMonsterStrikeDamage(enemy, target, enc.def.element, this.save.currentRegion) * fatigue);
        const primaryDmg = this.applyBossGrudgeDmg(calcEliteSpecialDamage(base), enc);
        strikeDmg = primaryDmg;
        const splashDmg = calcEliteSplashDamage(primaryDmg);
        const prevHp = target.hp;
        target.hp = Math.max(0, target.hp - primaryDmg);
        markEntityKnockdown(target, prevHp);
        this.runStats.damageTaken += primaryDmg;
        this.bumpCharStat(target.id, 'damageTaken', primaryDmg);
        this.lastHit = { attacker: enemy.name, target: target.name, damage: primaryDmg };
        onPartyHitGauge(this.save, target.id);
        applyGaugeToEntity(this.save, target);
        const dot = maybeApplyMonsterElement(enemy, target, enc.def);
        const debuffId = rollMonsterDebuffAttempt(
          target, enc.def, !!enc.isElite, this.save.currentRegion,
        );
        if (debuffId) this.scheduleDebuffCast(target, debuffId, enemy.name, enemy.atk);
        const slot = getVisualSlotIndex(this.save, target.id);
        const monProjectile = !!resolveMonsterProjectile(monId);
        if (slot >= 0 && !monProjectile) this.vfx.onPartyHit(slot);
        this.addEvent(0.28, 0.42, `🔥${enemy.name} 투지 폭발! -${primaryDmg}`, '#ff4400', 2);
        this.onAudio?.({
          type: 'hurt', magic: true, element: enc.def.element,
          delayMs: computeMonsterHurtSfxDelayMs(monId),
        });
        for (const ally of this.party) {
          if (ally.hp <= 0 || ally.id === target.id) continue;
          const sDmg = splashDmg;
          const pPrev = ally.hp;
          ally.hp = Math.max(0, ally.hp - sDmg);
          markEntityKnockdown(ally, pPrev);
          this.runStats.damageTaken += sDmg;
          this.bumpCharStat(ally.id, 'damageTaken', sDmg);
          const sSlot = getVisualSlotIndex(this.save, ally.id);
          if (sSlot >= 0) this.vfx.onPartyHit(sSlot);
          this.addEvent(0.28, 0.5, `💥광역 -${sDmg}`, '#ff8844');
        }
        if (dot) this.addEvent(0.28, 0.54, `${ELEMENT_ICON[dot.element]}${dot.sourceName}!`, '#ff8844');
      } else {
        const fatigue = this.getCombatFatigueMult();
        const dmg = this.applyBossGrudgeDmg(
          Math.floor(calcMonsterStrikeDamage(enemy, target, enc.def.element, this.save.currentRegion) * fatigue), enc,
        );
        strikeDmg = dmg;
        const prevHp = target.hp;
        target.hp = Math.max(0, target.hp - dmg);
        markEntityKnockdown(target, prevHp);
        this.runStats.damageTaken += dmg;
        this.bumpCharStat(target.id, 'damageTaken', dmg);
        this.lastHit = { attacker: enemy.name, target: target.name, damage: dmg };
        onPartyHitGauge(this.save, target.id);
        applyGaugeToEntity(this.save, target);
        const dot = maybeApplyMonsterElement(enemy, target, enc.def);
        const debuffId = rollMonsterDebuffAttempt(
          target, enc.def, !!enc.isElite, this.save.currentRegion,
        );
        if (debuffId) this.scheduleDebuffCast(target, debuffId, enemy.name, enemy.atk);
        const slot = getVisualSlotIndex(this.save, target.id);
        const monProjectile = !!resolveMonsterProjectile(monId);
        if (slot >= 0 && !monProjectile) this.vfx.onPartyHit(slot);
        const el = enc.def.element;
        const elIcon = el && el !== 'none' ? ELEMENT_ICON[el] : '';
        this.onAudio?.({
          type: 'hurt', magic, element: dot?.element ?? el,
          delayMs: computeMonsterHurtSfxDelayMs(monId),
        });
        this.addEvent(0.28, 0.48, `${elIcon}${magic ? '마법 ' : ''}-${dmg}`, '#ff6644');
        if (dot) this.addEvent(0.28, 0.54, `${ELEMENT_ICON[dot.element]}${dot.sourceName} 도트!`, '#ff8844');
        for (const proc of tryRosterProcsOnHit(this.save)) {
          this.addEvent(0.28, 0.62, `🛡️${proc.charName} ${proc.text}`, proc.color, 1.5);
        }
        if (enc.isElite) {
          enc.spiritGauge = addEliteSpirit(enc.spiritGauge ?? 0, ELITE_SPIRIT_PER_ATTACK);
        }
      }
      if (this.currentAffix.reflectPct > 0 && strikeDmg > 0) {
        const reflect = Math.max(1, Math.floor(strikeDmg * this.currentAffix.reflectPct));
        enemy.hp = Math.max(0, enemy.hp - reflect);
        this.addEvent(0.72, 0.5, `🌿반사 -${reflect}`, '#88cc88');
        if (enemy.hp <= 0) this.onSingleEnemyKilled(enc);
      }
    }
    syncCombatHp(this.save, this.party);
    if (this.party.length > 0 && this.party.every(p => p.hp <= 0)) this.onPartyWipe();
    this.tickPartyDieAnims(dt);
  }

  private tickPartyDieAnims(dt: number) {
    tickPartyDeathAnims(this.party, dt);
  }

  private tickPartyModifiers(dt: number) {
    tickPartyCombatModifiers(this.party, this.save, dt, {
      onDamageTaken: (charId, amount) => {
        this.runStats.damageTaken += amount;
        this.bumpCharStat(charId, 'damageTaken', amount);
      },
      onFloatText: (x, y, text, color) => this.addEvent(x, y, text, color),
    });
  }

  private tickExpeditionModifiers(dt: number) {
    const ids = this.party.length ? this.party.map(p => p.id) : this.save.party;
    const inCombat = this.phase === 'combat' || this.phase === 'boss';
    tickExpeditionCombatModifiers(this.save, this.party, ids, dt, inCombat, {
      onDamageTaken: (charId, amount) => {
        this.runStats.damageTaken += amount;
        this.bumpCharStat(charId, 'damageTaken', amount);
      },
      onFloatText: (x, y, text, color) => this.addEvent(x, y, text, color),
    });
    this.applySaveCombatHpToParty();
    if (this.party.length) mergePartyExpeditionModifiers(this.party, this.save);
  }

  /** 이동 중 디버프가 갱신한 combatHp → 파티 엔티티에 반영 */
  private applySaveCombatHpToParty() {
    applySaveHpToParty(this.party, this.save);
  }

  private ensurePartyForPotion() {
    if (this.phase === 'combat' || this.phase === 'boss') return;
    if (!this.party.length) {
      this.party = buildPartyCombatants(this.save);
      return;
    }
    this.applySaveCombatHpToParty();
  }

  consumePendingSettlement(): ExpeditionSettlementReport | null {
    const hit = this.pendingSettlement;
    this.pendingSettlement = null;
    return hit;
  }

  isPendingReturnToLodging(): boolean {
    return this.pendingReturnToLodging;
  }

  canReturnToLodgingNow(): boolean {
    if (this.isAtLodging() || this.isReturningToLodging || this.phase === 'travel') return false;
    return this.phase !== 'combat' && this.phase !== 'boss' && this.phase !== 'encounter';
  }

  /** 마을가기 체크 — 즉시 가능하면 귀환, 전투 중이면 종료 후 귀환 예약 */
  setPendingReturnToLodging(on: boolean): boolean {
    if (!this.isInExpedition() || this.isAtLodging()) {
      this.pendingReturnToLodging = false;
      return false;
    }
    if (this.isReturningToLodging) return on;
    this.pendingReturnToLodging = on;
    if (!on) {
      saveGame(this.save);
      this.syncRuntimeToSave();
      this.onSave?.();
      return true;
    }
    if (this.canReturnToLodgingNow()) {
      return this.returnToLodging();
    }
    if (this.phase === 'combat' || this.phase === 'boss' || this.phase === 'encounter') {
      this.addEvent(0.5, 0.22, '🏠 전투 종료 후 숙소로 이동합니다', '#ccaaee', 2);
    }
    saveGame(this.save);
    this.syncRuntimeToSave();
    this.onSave?.();
    return true;
  }

  private tryConsumePendingReturn(): boolean {
    if (!this.pendingReturnToLodging || this.isReturningToLodging) return false;
    this.pendingReturnToLodging = false;
    this.pendingTravelRegion = null;
    this.chainEngage = false;
    return this.returnToLodging(true);
  }

  private tickAllDots(dt: number) {
    const now = Date.now();
    const playDot = (element: import('../types').ElementType) => {
      if (now - this.lastDotSfxMs < 420) return;
      this.lastDotSfxMs = now;
      this.onAudio?.({ type: 'dot', element });
    };

    for (const enc of this.encounterSlots) {
      if (enc.entity.hp <= 0) continue;
      for (const ev of tickStatusEffects(enc.entity, dt, true)) {
        this.runStats.damageDealt += ev.damage;
        if (ev.sourceCharId) this.bumpCharStat(ev.sourceCharId, 'damageDealt', ev.damage);
        this.addEvent(0.72, 0.5, ev.text, ev.color);
        if (ev.element !== 'none') playDot(ev.element);
        if (enc.entity.hp <= 0) this.onSingleEnemyKilled(enc);
      }
    }
    for (const p of this.party) {
      if (p.hp <= 0) continue;
      const prevHp = p.hp;
      for (const ev of tickStatusEffects(p, dt, false)) {
        this.runStats.damageTaken += ev.damage;
        this.bumpCharStat(p.id, 'damageTaken', ev.damage);
        this.addEvent(0.28, 0.52, ev.text, ev.color);
        if (ev.element !== 'none') playDot(ev.element);
      }
      markEntityKnockdown(p, prevHp);
    }
    this.tickPartyDieAnims(dt);
    syncCombatHp(this.save, this.party);
  }

  private onPartyWipe() {
    if (this.isReturningToLodging || this.phase === 'travel') return;
    if (this.isRivalDuelActive()) {
      this.finishRivalDuelCombat(false);
      return;
    }
    const voluntaryReturn = this.pendingReturnToLodging;
    const penaltyRate = getDefeatPenaltyRate(this.save);
    const penaltyGold = Math.floor(this.save.gold * penaltyRate);
    const goldLost = Math.min(this.save.gold, penaltyGold);
    this.save.gold = Math.max(0, this.save.gold - penaltyGold);

    const syn = computePartySynergy(this.save);
    const defeatLog: DefeatLog = {
      goldLost,
      sessionGoldForfeited: this.runStats.goldEarned,
      penaltyGold,
      stats: { ...this.runStats },
      regionName: this.isInSpireRun()
        ? `야탑 ${this.save.spireRun?.floor ?? 1}층`
        : this.region.name,
      affixName: this.currentAffix.name,
      affixTip: formatAffixTip(this.currentAffix),
      lastHit: this.lastHit,
      aggroTip: this.aggro.getAggroTip(this.currentAffix),
      synergyLines: syn.lines,
      enemyCount: this.encounterSlots.length,
      powerSnapshot: buildCombatPowerSnapshot(this.save, this.save.currentRegion),
    };
    this.save.defeatLog = defeatLog;
    this.save.defeatUntil = 0;
    if (!voluntaryReturn) {
      applyPartyWipeIncapacitation(this.save);
    }
    this.save.stats.defeatCount = (this.save.stats.defeatCount ?? 0) + 1;

    this.resetVfx();
    this.clearEncounter();
    this.isBossFight = false;
    this.isEliteFight = false;
    this.isEpicFight = false;
    this.killedThisWave = [];
    this.waveProcExp = 0;
    this.pendingReturnToLodging = false;
    this.isReturningToLodging = false;
    this.isSpireReturnTrip = false;
    this.returnTripQueue = [];
    this.pendingTravelRegion = null;

    this.waveStreak = 0;
    this.chainEngage = false;
    const wipeMsg = this.isInSpireRun()
      ? '💀 야탑에서 패퇴 — 숙소로 귀환합니다'
      : '💀 전멸 — 숙소로 후퇴합니다';
    this.addEvent(0.5, 0.28, wipeMsg, '#ff6666', 2.5);

    this.finalizeLodgingArrival(false);
  }

  private trackRunMaterial(mat: string, qty: number) {
    if (qty <= 0) return;
    this.runStats.matsGained[mat] = (this.runStats.matsGained[mat] ?? 0) + qty;
  }

  private rollMaterialDrop(mat: string, chance: number, drops: string[]) {
    if (Math.random() < chance) {
      addMaterial(this.save, mat, 1);
      this.trackRunMaterial(mat, 1);
      drops.push(MATERIAL_LABELS[mat] ?? mat);
    }
  }

  private killedThisWave: MonsterDef[] = [];
  private waveProcExp = 0;

  private onSingleEnemyKilled(slot: EncounterSlot) {
    if (slot.defeated) return;
    slot.defeated = true;
    const aliveAfter = this.getAliveSlots();
    if (aliveAfter.length > 0) {
      this.vfx.handoffMeleeDeadEnemy(slot.uid);
    }
    const mon = slot.def;
    if (isRivalGhostMonsterId(mon.id)) {
      this.killedThisWave.push(mon);
      this.runStats.kills++;
      this.onAudio?.({ type: 'kill', isBoss: false, isElite: true });
      if (!this.getAliveSlots().length) this.onWaveCleared();
      return;
    }
    if (!mon.isBoss && !mon.isRare && !this.isBossFight && !this.isEpicFight) {
      accelerateBossPacing(this.save, this.save.currentRegion, MOB_KILL_PACE_BONUS_SEC);
    }
    this.killedThisWave.push(mon);
    this.runStats.kills++;
    if (!this.save.codex[mon.id]) {
      this.save.codex[mon.id] = { kills: 0, discovered: true };
    }
    this.save.codex[mon.id].kills++;
    this.save.stats.totalKills++;
    onPartyKillGaugeBurst(
      this.save,
      this.party.filter(p => p.hp > 0).map(p => p.id),
      getComboBuff(this.waveStreak).gaugeBonus,
    );
    onClearedRegionMobKilled(this.save, this.save.currentRegion, mon);
    const procGold = Math.floor(scaleKillGold(mon.gold, {
      elite: this.isEliteFight && !this.isEpicFight,
      epic: this.isEpicFight,
      boss: mon.isBoss,
    }, this.save.currentRegion, this.save.maxRegion) * getSoloGoldMult(this.save));
    const procExp = Math.floor(scaleKillExp(mon.exp, {
      elite: this.isEliteFight && !this.isEpicFight,
      epic: this.isEpicFight,
      boss: mon.isBoss,
    }) * getEndgameExpMult(this.save));
    for (const proc of tryRosterProcsOnKill(this.save, mon, procGold, procExp)) {
      if (proc.expBonus) this.waveProcExp += proc.expBonus;
      if (proc.healBonus) this.bumpCharStat(proc.charId, 'healDone', proc.healBonus);
      this.addEvent(0.62, 0.16 + Math.random() * 0.12, `✨${proc.charName} ${proc.text}`, proc.color, 1.6);
    }
    this.onAudio?.({ type: 'kill', isBoss: mon.isBoss, isElite: mon.isRare || this.isEliteFight });
    if (Math.random() < MONSTER_GEM_DROP_CHANCE) this.grantMonsterGemDrop();
    if (!this.getAliveSlots().length) this.onWaveCleared();
  }

  private grantMonsterGemDrop() {
    this.save.gems += 1;
    this.gemFlyVfx = { elapsed: 0, duration: 2.6 };
    this.onAudio?.({ type: 'gem' });
    this.addEvent(0.5, 0.22, '💎 보석 획득!', '#e8a8ff', 2.8);
  }

  private onWaveCleared() {
    if (this.phase === 'loot') return;
    if (this.isRivalDuelActive()) {
      this.finishRivalDuelCombat(true);
      return;
    }
    this.vfx.retreatAllMelee();
    syncCombatHp(this.save, this.party);
    if (applyDungeonCampWaveHeal(this.save, this.party)) {
      const pct = Math.round(getDungeonCampBonuses(this.save).waveHealPct * 1000) / 10;
      this.addEvent(0.5, 0.34, `💧 치유 샘 +${pct}% HP`, '#66ddff', 1.8);
    }
    const augWaveHeal = getAugmentMods(this.save).waveHealPct;
    if (augWaveHeal > 0 && this.party.length) {
      for (const p of this.party) {
        if (p.hp <= 0) continue;
        p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * augWaveHeal));
      }
      syncCombatHp(this.save, this.party);
    }
    let totalExp = 0;
    const lootLabels: string[] = [];

    if (this.isEpicFight) {
      markEpicCleared(this.save, this.save.currentRegion);
      this.addEvent(0.5, 0.2, '★ 에픽 격파 — 보스가 나타날 수 있습니다!', '#ff88dd', 2.6);
    }

    let paceBonus = computeWavePaceBonus({
      killCount: this.killedThisWave.length,
      isEliteFight: this.isEliteFight,
      isEpicFight: this.isEpicFight,
      isBossFight: this.isBossFight,
    });
    applyWavePaceBonus(this.save, this.save.currentRegion, paceBonus);
    const paceEvt = formatWavePaceEvent(this.save, this.save.currentRegion, paceBonus, {
      isBossFight: this.isBossFight,
    });
    if (paceEvt) {
      this.addEvent(0.5, paceEvt.small ? 0.28 : 0.28, paceEvt.text, paceEvt.color, paceEvt.duration, !!paceEvt.small);
    }

    let waveGold = 0;
    for (const mon of this.killedThisWave) {
      const rewardOpts = {
        elite: this.isEliteFight && !this.isEpicFight,
        epic: this.isEpicFight,
        boss: mon.isBoss,
      };
      waveGold += Math.floor(scaleKillGold(mon.gold, rewardOpts, this.save.currentRegion, this.save.maxRegion) * getSoloGoldMult(this.save));
      const exp = scaleKillExp(mon.exp, rewardOpts);
      totalExp += Math.floor(exp * getEndgameExpMult(this.save));
      for (const drop of mon.drops) {
        if (Math.random() < MONSTER_SPECIAL_DROP_CHANCE) {
          addMaterial(this.save, drop, 1);
          this.trackRunMaterial(drop, 1);
          lootLabels.push(MATERIAL_LABELS[drop] ?? drop);
        }
      }
    }

    const matBoost = (this.save.currentRegion >= 9 ? 1.10 : 1.0)
      * getDungeonCampBonuses(this.save).matDropMult
      * (this.waveTwist?.matMult ?? 1)
      * getDailyBonusMatMult(this.save)
      * DUNGEON_MAT_DROP_GLOBAL_MULT
      * getAugmentMods(this.save).matDropMult;
    const dropRolls = Math.min(4, Math.max(1, Math.floor(this.killedThisWave.length / 1.5)));
    for (let i = 0; i < dropRolls; i++) {
      this.rollMaterialDrop('iron_ore', DUNGEON_MAT_DROP_CHANCES.iron_ore! * matBoost, lootLabels);
      this.rollMaterialDrop('wood_chip', DUNGEON_MAT_DROP_CHANCES.wood_chip! * matBoost, lootLabels);
      this.rollMaterialDrop('slime_gel', DUNGEON_MAT_DROP_CHANCES.slime_gel! * matBoost, lootLabels);
      this.rollMaterialDrop('beast_fang', DUNGEON_MAT_DROP_CHANCES.beast_fang! * matBoost, lootLabels);
      this.rollMaterialDrop('magic_dust', DUNGEON_MAT_DROP_CHANCES.magic_dust! * matBoost, lootLabels);
      if (this.save.currentRegion >= 9) {
        this.rollMaterialDrop('spirit_thread', DUNGEON_MAT_DROP_CHANCES.spirit_thread! * matBoost, lootLabels);
      }
      if (this.save.currentRegion >= 12) {
        this.rollMaterialDrop('void_shard', DUNGEON_MAT_DROP_CHANCES.void_shard! * matBoost, lootLabels);
      }
    }
    if (this.isEliteFight && this.save.currentRegion >= 9 && Math.random() < ELITE_SPIRIT_THREAD_CHANCE) {
      addMaterial(this.save, 'spirit_thread', 1);
      this.trackRunMaterial('spirit_thread', 1);
      lootLabels.push(MATERIAL_LABELS.spirit_thread ?? 'spirit_thread');
    }
    if ((this.isEliteFight || this.isEpicFight) && this.save.currentRegion >= 12 && Math.random() < ELITE_VOID_SHARD_CHANCE) {
      addMaterial(this.save, 'void_shard', 1);
      this.trackRunMaterial('void_shard', 1);
      lootLabels.push(MATERIAL_LABELS.void_shard ?? 'void_shard');
    }
    enforceWarehouseCap(this.save);

    const accDrop = rollAccessoryDrop(
      this.save,
      isInSpireRun(this.save) ? Math.max(18, this.save.currentRegion) : this.save.currentRegion,
    );
    if (accDrop) {
      lootLabels.unshift(accDrop.legendary ? `✨💍${accDrop.name}` : `💍${accDrop.name}`);
    }

    totalExp += this.waveProcExp;
    this.waveProcExp = 0;

    const buffers = computePartyBuffers(this.save);
    const expGainBase = Math.floor(totalExp * buffers.exp);
    for (const id of this.save.party) {
      const st = this.save.chars[id];
      if (!st) continue;
      const expGain = Math.floor(expGainBase * getCharExpMultiplier(this.save, id) * getDailyBonusExpMult(this.save));
      st.exp += expGain;
      while (st.exp >= expToLevel(st.level)) {
        st.exp -= expToLevel(st.level);
        st.level++;
        this.addEvent(0.35, 0.3, `${CHAR_MAP[id]?.name} Lv.${st.level}!`, '#44ff88');
      }
    }

    waveGold = Math.floor(waveGold * (buffers.gold ?? 1) * getComboBuff(this.waveStreak + 1).goldMult
      * (this.waveTwist?.goldMult ?? 1)
      * getAugmentMods(this.save).killGoldMult
      * getDailyBonusGoldMult(this.save));
    if (waveGold > 0) {
      const killN = this.killedThisWave.length;
      creditPendingHuntGold(this.save, waveGold, killN);
      this.runStats.goldEarned += waveGold;
    }

    if (this.isCombatPerfLite()) {
      if (expGainBase > 0 || waveGold > 0) {
        const parts: string[] = [];
        if (expGainBase > 0) parts.push(`+${expGainBase} EXP`);
        if (waveGold > 0) parts.push(`+${waveGold.toLocaleString()}G`);
        this.addEvent(0.5, 0.36, parts.join(' · '), '#88ffaa', 0.65, true);
      }
    } else {
      if (expGainBase > 0) this.addEvent(0.5, 0.38, `+${expGainBase} EXP`, '#88ffaa');
      if (waveGold > 0) this.addEvent(0.5, 0.42, `🏹 +${waveGold.toLocaleString()}G`, '#ffdd66');
      const maxShow = 4;
      lootLabels.slice(0, maxShow).forEach((label, i) => {
        this.addEvent(0.5, 0.3 + i * 0.055, `📦 ${label}`, '#66ccff', 1.8);
      });
      if (lootLabels.length > maxShow) {
        this.addEvent(0.5, 0.3 + maxShow * 0.055, `📦 외 ${lootLabels.length - maxShow}종`, '#88aaff', 1.8);
      }
    }

    const newCodex = checkAllCodexRewards(this.save);
    for (const rid of newCodex) {
      const r = REGIONS.find(x => x.id === rid);
      this.addEvent(0.5, 0.24, `📖 ${r?.name} 도감완료! ATK+3%`, '#cc88ff', 2.5);
    }

    const bossMon = this.killedThisWave.find(m => m.isBoss);
    if (bossMon && !this.isInSpireRun()) {
      const prevMaxRegion = this.save.maxRegion ?? 1;
      this.waveStreak = 0;
      this.chainEngage = false;
      const bonusMsg = grantBossFirstClearBonus(this.save, bossMon.regionId);
      if (bonusMsg) this.addEvent(0.5, 0.26, bonusMsg, '#ffdd66', 2.5);
      if (!this.save.badges.includes(bossMon.regionId)) {
        this.save.badges.push(bossMon.regionId);
        const reg = REGIONS.find(r => r.id === bossMon.regionId);
        this.addEvent(0.5, 0.28, `🏅 ${reg?.badgeName} 획득!`, '#ffaa00', 2);
      }
      const firstBossClear = getFloorClearCount(this.save, bossMon.regionId) === 0;
      recordFloorBossClear(this.save, bossMon.regionId);
      if (firstBossClear && !hasAugmentForFloor(this.save, bossMon.regionId)) {
        const choiceIds = rollAugmentChoices(this.save, bossMon.regionId);
        if (choiceIds.length > 0) {
          this.pendingAugmentPick = { floorId: bossMon.regionId, choiceIds };
          this.augmentPickPending = true;
          this.augmentPickShown = false;
          this.chainEngage = false;
        }
      }
      if (bossMon.regionId >= 18) {
        this.save.maxRegion = Math.max(this.save.maxRegion ?? this.save.currentRegion, bossMon.regionId);
        const firstClear = bossMon.regionId === 18
          && getFloorClearCount(this.save, 18) === 1
          && !this.save.floor18ClearCelebrated;
        if (firstClear) {
          this.floor18CelebrationPending = true;
          this.floor18FirstClearRun = true;
          this.chainEngage = false;
          this.addEvent(0.5, 0.18, '🏆 18층 정복! 야탑의 문이 열립니다', '#ffdd88', 3);
        } else if (bossMon.regionId === 18) {
          this.addEvent(0.5, 0.18, '🌹 모란 보스 재격파!', '#ffaa88', 2);
        }
        const nextRegion = bossMon.regionId + 1;
        if (nextRegion <= REGIONS.length) {
          this.save.maxRegion = Math.max(this.save.maxRegion ?? 1, nextRegion);
          const nextReg = REGIONS.find(r => r.id === nextRegion);
          if (!this.isReturningToLodging && !this.pendingReturnToLodging && !this.save.settings.holdFloorAdvance) {
            this.pendingTravelRegion = nextRegion;
            this.addEvent(0.5, 0.2, `📍 ${nextReg?.name}로 이동 준비`, '#88ccff', 2);
          } else if (!this.isReturningToLodging) {
            this.addEvent(0.5, 0.2, `📍 ${nextReg?.name} — 층 이동 멈춤 중`, '#ffcc88', 2);
          }
        }
      } else {
        const nextRegion = bossMon.regionId + 1;
        if (nextRegion <= 18) {
          this.save.maxRegion = Math.max(this.save.maxRegion ?? this.save.currentRegion, nextRegion);
          const nextReg = REGIONS.find(r => r.id === nextRegion);
          if (!this.isReturningToLodging && !this.pendingReturnToLodging && !this.save.settings.holdFloorAdvance) {
            this.pendingTravelRegion = nextRegion;
            this.addEvent(0.5, 0.2, `📍 ${nextReg?.name}로 이동 준비`, '#88ccff', 2);
          } else if (!this.isReturningToLodging) {
            this.addEvent(0.5, 0.2, `📍 ${nextReg?.name} — 층 이동 멈춤 중`, '#ffcc88', 2);
          }
        }
      }
      for (const msg of grantFloorMilestones(this.save, prevMaxRegion, this.save.maxRegion ?? 1)) {
        this.addEvent(0.5, 0.22, msg, '#ffcc66', 2.5);
      }
    }

    if (this.isInSpireRun()) {
      const spireResult = handleSpireWaveCleared(this.save);
      if (spireResult === 'floor_cleared') {
        const cleared = this.save.endgame?.spireBest ?? 0;
        const nextFloor = this.save.spireRun?.floor ?? cleared + 1;
        const mod = getWeeklySpireModifier(this.save.spireRun?.weekId ?? '');
        resetFloorSessionPacing(this.save, nextFloor);
        this.currentAffix = getRegionAffix(Math.min(18, this.save.currentRegion));
        this.addEvent(0.5, 0.2, `🗼 야탑 ${cleared}층 돌파! [${mod.name}]`, '#ffdd88', 2.6);
        if ([25, 30, 35, 40].includes(cleared)) {
          this.addEvent(0.5, 0.24, '💠 탑의 심핵 획득!', '#88eeff', 2.4);
        }
        this.addEvent(0.5, 0.26, `⬆️ ${nextFloor}층으로 — 계속 등반!`, '#aaddff', 2);
      }
    }

    this.killedThisWave = [];
    this.waveProcExp = 0;
    this.waveStreak++;
    const combo = getComboBuff(this.waveStreak);
    const milestone = getComboMilestoneMessage(this.waveStreak);
    if (milestone) {
      this.addEvent(0.5, 0.14, milestone, combo.color, combo.fever ? 2.4 : 1.8);
      if (combo.fever && !this.isCombatPerfLite()) this.vfx.onCritShake();
    } else if (combo.label && !this.isCombatPerfLite()) {
      this.addEvent(0.5, 0.14, combo.label, combo.color, 1.6);
    }
    if (this.waveStreak >= CHAIN_SKIP_AFTER && !this.floor18CelebrationPending && !this.augmentPickPending) {
      this.chainEngage = true;
    }

    const chestChance = (this.isSpeedFarmMode() ? 0.10 : 0.14) + getAugmentMods(this.save).chestChanceAdd;
    if (Math.random() < chestChance) {
      const region = this.save.currentRegion;
      const chestGold = Math.floor((4 + region * 1.8) * regionKillGoldScale(region)
        * getAugmentMods(this.save).chestGoldMult
        * (this.isEliteFight || this.isEpicFight ? 2.2 : 1));
      creditPendingHuntGold(this.save, chestGold);
      this.runStats.goldEarned += chestGold;
      if (!this.isCombatPerfLite()) {
        this.addEvent(0.5, 0.48, `🎁 +${chestGold.toLocaleString()}G`, '#ffcc66', 1.5);
      }
      if (Math.random() < 0.14) {
        const matPool = region >= 12
          ? (['iron_ore', 'wood_chip', 'slime_gel', 'spirit_thread', 'void_shard'] as const)
          : region >= 9
            ? (['iron_ore', 'wood_chip', 'slime_gel', 'spirit_thread'] as const)
            : (['iron_ore', 'wood_chip', 'slime_gel'] as const);
        const mat = matPool[Math.floor(Math.random() * matPool.length)]!;
        addMaterial(this.save, mat, 1);
        this.trackRunMaterial(mat, 1);
        if (!this.isCombatPerfLite()) {
          this.addEvent(0.5, 0.52, `🎁 ${MATERIAL_LABELS[mat] ?? mat}`, '#88ccff', 1.4);
        }
      }
    }

    this.isEliteFight = false;
    this.isEpicFight = false;
    this.clearEncounter();
    this.setPhase('loot');
    this.syncRuntimeToSave();
    this.requestSave();
  }

  resumeAfterAugmentPick() {
    this.clearAugmentPick();
    this.finishLootAndResume();
  }

  clearAugmentPick() {
    this.augmentPickPending = false;
    this.augmentPickShown = false;
    this.pendingAugmentPick = null;
  }

  clearFloor18Celebration() {
    this.floor18CelebrationPending = false;
    this.floor18FirstClearRun = false;
    this.floor18CelebrationShown = false;
  }

  /** 18층 클리어 후 즉시 숙소 복귀 (17층 연속 이동 스킵) */
  returnToLodgingDirect(silent = false): boolean {
    if (this.isAtLodging()) return false;
    this.clearFloor18Celebration();
    this.pendingReturnToLodging = false;
    this.isResting = false;
    this.restUntil = 0;
    this.pendingTravelRegion = null;
    this.resetVfx();
    this.clearEncounter();
    this.isBossFight = false;
    this.isEliteFight = false;
    this.isEpicFight = false;
    this.killedThisWave = [];
    this.waveProcExp = 0;
    this.isReturningToLodging = false;
    this.isSpireReturnTrip = false;
    this.returnTripQueue = [];
    this.returnWalkSec = 0;
    this.travelFromId = 0;
    this.travelToId = 0;
    this.travelDurationSec = 0;
    this.party = buildPartyCombatants(this.save);
    if (!silent) {
      this.addEvent(0.5, 0.28, '🏠 18층 정복 — 숙소로 귀환합니다', '#ccaaee', 2.4);
    }
    this.finalizeLodgingArrival(true);
    return true;
  }

  private finishLootAndResume() {
    if (this.tryConsumePendingReturn()) return;
    if (this.augmentPickPending) {
      if (!this.augmentPickShown && this.pendingAugmentPick) {
        this.augmentPickShown = true;
        this.chainEngage = false;
        this.setPhase('loot');
        this.phaseTimer = 0;
        this.onAugmentPick?.(this.pendingAugmentPick);
      }
      return;
    }
    if (this.floor18CelebrationPending) {
      if (!this.floor18CelebrationShown) {
        this.floor18CelebrationShown = true;
        this.chainEngage = false;
        this.setPhase('loot');
        this.phaseTimer = 0;
        this.onFloor18Celebration?.(this.floor18FirstClearRun);
      }
      return;
    }
    if (this.pendingTravelRegion != null) {
      this.waveStreak = decayComboStreak(this.waveStreak, true);
      this.chainEngage = false;
      const to = this.pendingTravelRegion;
      this.pendingTravelRegion = null;
      this.beginTravel(to, false);
      return;
    }
    if (this.chainEngage) {
      this.chainEngage = false;
      this.phaseTimer = 0;
      this.startEncounter();
      return;
    }
    this.resumeWalk();
  }

  private beginReturnWalkOnRegion(regionId: number) {
    this.returnWalkSec = getReturnWalkSec(this.save, regionId);
    this.save.currentRegion = regionId;
    this.currentAffix = getRegionAffix(regionId);
    this.resumeWalk();
  }

  private beginTravel(toRegionId: number, showInterstitial: boolean) {
    const from = this.save.currentRegion;
    if (from === toRegionId) {
      if (this.isReturningToLodging) this.beginReturnWalkOnRegion(from);
      else this.resumeWalk();
      return;
    }
    this.resetVfx();
    this.clearEncounter();
    this.isBossFight = false;
    this.party = buildPartyCombatants(this.save);
    this.travelFromId = from;
    this.travelToId = toRegionId;
    let travelSec = calcTravelDurationSec(from, toRegionId);
    if (this.isReturningToLodging) {
      travelSec *= getReturnTravelMult(this.save);
    } else if (toRegionId > from) {
      travelSec = calcAdvanceTravelDurationSec(from, toRegionId);
    }
    this.travelDurationSec = travelSec;
    this.phaseTimer = 0;
    this.setPhase('travel');
    const fromReg = REGIONS.find(r => r.id === from);
    const toReg = REGIONS.find(r => r.id === toRegionId);
    if (this.isReturningToLodging) {
      this.addEvent(0.5, 0.3, `🏠 ${fromReg?.name} → ${toReg?.name}`, '#ccaaee', 2);
    } else {
      this.addEvent(0.5, 0.3, `🗺️ ${toReg?.name}로 이동`, '#aaddff', 2);
    }
    this.syncRuntimeToSave();
  }

  private tickTravel(_dt: number) {
    if (this.phaseTimer >= this.travelDurationSec) {
      this.completeTravel();
    }
  }

  private completeTravel() {
    if (this.isSpireReturnTrip) {
      this.travelFromId = 0;
      this.travelToId = 0;
      this.travelDurationSec = 0;
      this.isSpireReturnTrip = false;
      this.addEvent(0.5, 0.32, '🏠 마을 도착', '#ccbbff', 2);
      this.syncRuntimeToSave();
      this.finalizeLodgingArrival(true);
      return;
    }

    const arrivedId = this.travelToId;
    if (arrivedId > 0) {
      this.save.currentRegion = arrivedId;
      const reg = REGIONS.find(r => r.id === arrivedId);
      const msg = this.isReturningToLodging
        ? `🏠 ${reg?.name} 통과`
        : `📍 ${reg?.name} 도착!`;
      this.addEvent(0.5, 0.32, msg, '#88ccff', 2);
      if (!this.isReturningToLodging && isLateGameFloor(arrivedId)) {
        const hint = formatReadinessHint(this.save, arrivedId);
        if (hint) this.addEvent(0.5, 0.22, hint, '#ff9966', 2.8);
        this.addEvent(0.5, 0.16, '★ 보스 전 에픽 시험이 나타납니다', '#ff88cc', 2.4);
      }
      if (!this.isReturningToLodging && arrivedId === 10) {
        ensureOnboarding(this.save);
        if (!this.save.onboarding!.floor10IntroSeen) {
          markFloor10IntroSeen(this.save);
          this.onFloor10PhaseIntro?.();
        }
      }
    }
    this.travelFromId = 0;
    this.travelToId = 0;
    this.travelDurationSec = 0;
    this.syncRuntimeToSave();
    saveGame(this.save);
    this.onSave?.();
    if (this.isReturningToLodging) {
      if (arrivedId > 0) this.beginReturnWalkOnRegion(arrivedId);
      else this.advanceReturnTrip();
      return;
    }
    resetFloorSessionPacing(this.save, arrivedId);
    this.resumeWalk();
  }

  private advanceReturnTrip() {
    if (this.phase === 'combat' || this.phase === 'boss' || this.phase === 'encounter' || this.phase === 'loot') {
      return;
    }
    if (this.returnTripQueue.length > 0) {
      const next = this.returnTripQueue.shift()!;
      this.beginTravel(next, false);
      return;
    }
    this.finalizeLodgingArrival(true);
  }

  private finalizeLodgingArrival(showMessage: boolean) {
    const defeatLog = this.save.defeatLog
      ? {
        ...this.save.defeatLog,
        stats: {
          ...this.save.defeatLog.stats,
          matsGained: { ...this.save.defeatLog.stats.matsGained },
          byChar: { ...this.save.defeatLog.stats.byChar },
        },
      }
      : undefined;
    const kind = defeatLog ? 'defeat' as const : 'return' as const;
    if (kind === 'return') {
      applyVoluntaryReturnRecovery(this.save);
    }
    const runStatsSnapshot = defeatLog?.stats ?? {
      ...this.runStats,
      matsGained: { ...this.runStats.matsGained },
      byChar: { ...this.runStats.byChar },
    };
    const runMats = { ...runStatsSnapshot.matsGained };
    const runKills = runStatsSnapshot.kills;
    const spireFloor = this.save.spireRun?.active ? (this.save.spireRun.floor ?? 0) : 0;
    const deepestFloor = spireFloor > 0 ? spireFloor : (this.save.maxRegion ?? 1);

    this.isReturningToLodging = false;
    this.isSpireReturnTrip = false;
    this.returnTripQueue = [];
    this.returnWalkSec = 0;
    this.travelFromId = 0;
    this.travelToId = 0;
    this.travelDurationSec = 0;
    this.walkX = 0;
    this.backgroundScrollX = 0;
    this.save.location = 'lodging';
    this.save.inExpedition = false;
    if (this.save.spireRun?.active) {
      endSpireRun(this.save);
    }
    this.save.currentRegion = 1;
    clearExpeditionRunState(this.save);
    clearExpeditionDungeonBuffs(this.save);
    this.currentAffix = getRegionAffix(1);
    this.isResting = false;
    this.restUntil = 0;
    this.pendingTravelRegion = null;
    this.resetVfx();
    this.clearEncounter();
    this.isBossFight = false;
    this.isEliteFight = false;
    this.isEpicFight = false;
    this.killedThisWave = [];
    this.waveProcExp = 0;
    this.resetRunStats();
    this.party = buildPartyCombatants(this.save);
    syncCombatHp(this.save, this.party);
    this.autoStartLodgingRestIfNeeded(showMessage);
    this.syncRuntimeToSave();
    this.setPhase('walk');
    onLodgingArrival(this.save);

    const returnedPotions = returnExpeditionPotions(this.save);
    const labProduced = tickCampProduction(this.save).lab ?? 0;
    const supplyLink = applyExpeditionSupplyLink(this.save, runMats, runKills, deepestFloor);
    const settlement = claimTycoonSettlement(this.save);
    settlement.caravanGold = supplyLink.caravanGold;

    this.pendingSettlement = buildExpeditionSettlementReport({
      kind,
      runStats: runStatsSnapshot,
      runMats,
      deepestFloor,
      defeatLog,
      settlement,
      supplyBoostPct: supplyLink.boostPct,
      returnedPotions,
      labPotions: labProduced,
      save: this.save,
    });
    const matQty = Object.values(runMats).reduce((sum, n) => sum + (n ?? 0), 0);
    setExpeditionHighlight(this.save, {
      kind,
      matQty,
      goldEarned: runStatsSnapshot.goldEarned,
    });
    this.lastArrivalMessage = '';

    this.save.defeatLog = undefined;
    if (showMessage && !this.isLodgingResting) {
      const arriveMsg = spireFloor > 0
        ? `🏠 마을 도착 — 야탑 ${spireFloor}층까지 등반`
        : '🏠 숙소 도착 — HP 자동 회복 중';
      this.addEvent(0.5, 0.32, arriveMsg, spireFloor > 0 ? '#ccbbff' : '#aaddff', 2);
    }
    saveGame(this.save);
    this.onSave?.();
    this.onUpdate?.();
    this.onLodgingReturn?.();
  }

  startLodgingRest(): boolean {
    if (!this.isAtLodging() || this.isReturningToLodging) return false;
    if (isPartyFullyHealed(this.save)) return false;
    if (this.isLodgingResting) return true;
    this.isLodgingResting = true;
    this.syncRuntimeToSave();
      this.addEvent(0.5, 0.32, `🛏️ 휴식 시작 (+${formatLodgingHealLabel(this.save)})`, '#aaddff', 2);
    return true;
  }

  /** HP 미회복 시 숙소 도착·로드 후 자동 휴식 */
  autoStartLodgingRestIfNeeded(showEvent = true): void {
    if (!this.isAtLodging() || this.isReturningToLodging) return;
    if (isPartyFullyHealed(this.save)) {
      this.isLodgingResting = false;
      return;
    }
    if (this.isLodgingResting) return;
    this.isLodgingResting = true;
    this.syncRuntimeToSave();
    if (showEvent) {
      this.addEvent(0.5, 0.32, `🛏️ 자동 휴식 (+${formatLodgingHealLabel(this.save)})`, '#aaddff', 2);
    }
  }

  stopLodgingRest() {
    this.isLodgingResting = false;
    this.syncRuntimeToSave();
  }

  getLodgingHealRate(): string {
    return formatLodgingHealLabel(this.save);
  }

  private resumeWalk() {
    this.resetVfx();
    this.clearEncounter();
    this.isBossFight = false;
    this.isEliteFight = false;
    this.isEpicFight = false;
    this.killedThisWave = [];
    this.waveProcExp = 0;
    this.party = buildPartyCombatants(this.save);
    this.setPhase('walk');
  }

  /** 탭 궁극기 — 게이지 100% 파티원 즉시 발동 */
  tryTapUltimate(): boolean {
    if (this.phase !== 'combat' && this.phase !== 'boss') return false;
    const targetSlot = this.pickPartyTarget();
    if (!targetSlot) return false;
    const ready = this.party.find(p => p.hp > 0 && getGauge(this.save, p.id) >= GAUGE_MAX);
    if (!ready) return false;
    const gt = getGaugeType(ready.id);
    const useHealUlt = isHealerChar(ready.id) && partyNeedsHeal(this.party);
    const res = useHealUlt
      ? resolveHealerUltimateStrike(ready, this.party, gt, this.save.chars[ready.id]?.prestige ?? 0)
      : resolveUltimateStrike(ready, targetSlot.entity, gt);
    consumeGauge(this.save, ready.id);
    ready.gauge = 0;
    if (res.isHeal) {
      const healAmt = res.healAmount ?? 0;
      if (healAmt > 0) this.bumpCharStat(ready.id, 'healDone', healAmt);
      this.aggro.addHealThreat(ready.id, healAmt, this.currentAffix);
      this.showCombatHealFeedback(ready.id, healAmt, res.healDetails, {
        skill: null,
        isUltimate: true,
        ultimateLabel: res.ultimateLabel,
        gaugeType: gt,
      });
      syncCombatHp(this.save, this.party);
      return true;
    }
    const actual = this.applyPartyHitToEnemy(ready, targetSlot, res);
    this.runStats.damageDealt += actual;
    const ultAnim = getSkillAttackAnimKey(ready.id, 3, 'attack03');
    this.firePartyAttackVfx(ready.id, targetSlot, { crit: true, animKey: ultAnim });
    this.vfx.onCritShake();
    const icon = gt === 'mana' ? '💠' : '⚡';
    this.addEvent(0.72, 0.34, popUltimate(icon, actual), gt === 'mana' ? '#66ccff' : '#ffdd44', 1.1, true);
    this.emitPartyAttackAudio(ready.id, targetSlot, { isUltimate: true, isCrit: false, skill: null });
    if (!this.getAliveSlots().length) this.onWaveCleared();
    return true;
  }

  touchBurst() {
    if (this.isAtLodging() || this.phase === 'defeat' || this.isDefeatRestActive()
      || this.phase === 'travel' || this.isResting) return 0;
    if (this.tryTapUltimate()) return 1;
    const targetSlot = this.pickPartyTarget();
    if (!targetSlot || targetSlot.entity.hp <= 0) return 0;
    const now = Date.now();
    if (now - this.lastTouchMs < TOUCH_COOLDOWN_MS) return 0;
    this.lastTouchMs = now;
    const enemy = targetSlot.entity;
    const dmg = Math.floor(getPartyTouchDamage(this.save, enemy.def) * this.getCombatFatigueMult());
    let actual = applyDamageToEnemy(enemy, Math.min(enemy.hp + (enemy.bossShield ?? 0), dmg));
    const touchCharId = this.party.find(p => p.hp > 0)?.id;
    const slot = touchCharId ? getVisualSlotIndex(this.save, touchCharId) : -1;
    if (slot >= 0 && touchCharId) {
      const id = touchCharId;
      const attacker = this.party.find(p => p.id === id);
      if (attacker && id) {
        this.aggro.addDamageThreat(targetSlot.uid, id, actual, this.currentAffix, this.save);
        const skillRes = applySkillTouchProc(this.save, attacker, enemy, id);
        if (skillRes?.skill) {
          actual += skillRes.skillDamage;
          this.addEvent(0.5, 0.34, popSkillDamage(skillRes.skill, skillRes.skillDamage), '#ffaa44', 0.95, true);
          const animKey = getSkillAttackAnimKey(id, skillRes.skill.animTier, skillRes.skill.motionKey);
          this.firePartyAttackVfx(id, targetSlot, { crit: true, skill: skillRes.skill, animKey });
        } else {
          this.firePartyAttackVfx(id, targetSlot, {});
        }
      } else {
        this.firePartyAttackVfx(id ?? '', targetSlot, {});
      }
    }
    this.runStats.damageDealt += actual;
    if (touchCharId) this.bumpCharStat(touchCharId, 'damageDealt', actual);
    this.runStats.touchDamage += actual;
    this.save.stats.touchCount++;
    this.addEvent(0.5, 0.4, `-${actual}`, '#ff88ff', 0.9, true);
    this.onAudio?.({ type: 'touch', powerTier: getTouchSfxTier(this.save) });
    syncCombatHp(this.save, this.party);
    if (enemy.hp <= 0) this.onSingleEnemyKilled(targetSlot);
    return actual;
  }

  getCodexPercent(regionId: number): number {
    const mons = getRegionMonsters(regionId);
    if (mons.length === 0) return 1;
    const found = mons.filter(m => this.save.codex[m.id]?.discovered).length;
    return found / mons.length;
  }

  addEvent(x: number, y: number, text: string, color: string, life = 1.4, compact = false) {
    const preset = getCombatFeedbackPreset(this.save);
    const perf = this.isCombatPerfLite();
    if (perf && shouldSuppressCombatFloater(text, compact, preset)) return;
    if (perf && shouldSuppressWaveToast(text)) return;
    if (this.events.length >= MAX_FLOAT_EVENTS) {
      this.events.shift();
    }
    this.events.push({
      type: 'loot', x, y, text, color,
      life: perf ? life * 0.55 : life,
      compact,
    });
  }

  private showCombatHealFeedback(
    healerId: string,
    healAmt: number,
    details: HealTargetDetail[] | undefined,
    opts: {
      skill?: import('../data/combatSkills').CombatSkillDef | null;
      isUltimate?: boolean;
      ultimateLabel?: string;
      gaugeType?: string;
    },
  ): void {
    const healerName = CHAR_MAP[healerId]?.name ?? healerId;
    const healerSlot = getVisualSlotIndex(this.save, healerId);
    const partySize = this.save.party.length;
    const targetSlots = (details ?? [])
      .map(d => getVisualSlotIndex(this.save, d.charId))
      .filter(s => s >= 0);

    if (healerSlot >= 0) {
      this.vfx.onCombatHeal(healerSlot, targetSlots.length ? targetSlots : [healerSlot], healerId);
      const animKey = opts.skill
        ? getSkillAttackAnimKey(healerId, opts.skill.animTier, opts.skill.motionKey ?? 'heal')
        : getSkillAttackAnimKey(healerId, 3, 'heal');
      this.vfx.onPartyAttack(
        healerSlot, false, 0.78, 0.48, false, opts.skill ?? null, animKey, healerId,
        getCharCombatPowerTier(this.save, healerId),
        this.save.chars[healerId]?.prestige ?? 0,
      );
    }

    if (details?.length) {
      for (const d of details) {
        const tSlot = getVisualSlotIndex(this.save, d.charId);
        this.addEvent(
          getPartySlotEventX(tSlot, partySize),
          0.34 + tSlot * 0.05,
          popHealTarget(healerName, d.charName, d.amount),
          '#66ff99', 1.35, true,
        );
      }
    } else if (healAmt > 0) {
      this.addEvent(0.72, 0.36, popHeal(healAmt), '#66ff99', 1.0, true);
    }

    if (opts.isUltimate) {
      const icon = opts.gaugeType === 'mana' ? '💠' : '⚡';
      const fb = details?.length
        ? popHealFromDetails(details, healerName)
        : popHeal(healAmt);
      this.addEvent(
        0.5, 0.22,
        `${icon}${opts.ultimateLabel ?? '궁극 회복'} ${fb}`,
        opts.gaugeType === 'mana' ? '#66ccff' : '#44ff88', 1.15, true,
      );
      this.vfx.onCritShake();
    }

    this.onAudio?.({
      type: 'heal',
      charId: healerId,
      targetCount: details?.length ?? 1,
      ultimate: !!opts.isUltimate,
    });
  }

  travelToRegion(regionId: number) {
    if (!this.isInExpedition()) return;
    if (this.phase === 'defeat' || this.isDefeatRestActive() || this.phase === 'travel') return;
    if (this.phase === 'combat' || this.phase === 'boss' || this.phase === 'encounter') return;
    const max = this.save.maxRegion ?? this.save.currentRegion;
    if (regionId < 1 || regionId > max) return;
    if (this.save.currentRegion === regionId) return;
    if (regionId !== this.save.currentRegion + 1) return;
    this.pendingTravelRegion = null;
    this.beginTravel(regionId, false);
  }

  /** 수동 다음 층 이동 가능 여부 (UI·토스트용) */
  canTravelToNextFloor(): { ok: boolean; nextId: number; nextName: string; etaSec: number; reason?: string } {
    const cur = this.save.currentRegion;
    const nextId = cur + 1;
    const nextReg = REGIONS.find(r => r.id === nextId);
    const nextName = nextReg?.name ?? `${nextId}층`;
    const etaSec = Math.ceil(calcAdvanceTravelDurationSec(cur, nextId));
    if (!this.isInExpedition() || this.isReturningToLodging) {
      return { ok: false, nextId, nextName, etaSec, reason: '원정 중에만 이동할 수 있어요' };
    }
    if (this.phase === 'travel') {
      return { ok: false, nextId, nextName, etaSec, reason: '층 이동 중이에요' };
    }
    if (this.phase === 'combat' || this.phase === 'boss' || this.phase === 'encounter') {
      return { ok: false, nextId, nextName, etaSec, reason: '전투·조우 중에는 이동할 수 없어요' };
    }
    const max = this.save.maxRegion ?? cur;
    if (nextId > max) {
      return { ok: false, nextId, nextName, etaSec, reason: '보스 클리어 후 다음 층이 열려요' };
    }
    if (nextId > REGIONS.length) {
      return { ok: false, nextId, nextName, etaSec, reason: '최종 층이에요' };
    }
    return { ok: true, nextId, nextName, etaSec };
  }

  travelToNextFloor(): boolean {
    const check = this.canTravelToNextFloor();
    if (!check.ok) return false;
    this.travelToRegion(check.nextId);
    return this.phase === 'travel';
  }

  getActiveTravelRemainSec(): number {
    if (this.phase !== 'travel' || this.travelDurationSec <= 0) return 0;
    return Math.max(0, Math.ceil(this.travelDurationSec - this.phaseTimer));
  }

  startExpedition(startFloor = 1): boolean {
    if (this.isInExpedition() || !this.isAtLodging()) return false;
    const expReady = checkExpeditionReady(this.save);
    if (!expReady.ok) return false;
    reconcileShortcutDevelopment(this.save);
    const floor = Math.floor(startFloor);
    const depart = canDepartAtFloor(this.save, floor);
    if (!depart.ok) return false;
    const maxR = this.save.maxRegion ?? 1;
    if (floor < 1 || floor > maxR) return false;

    this.pendingReturnToLodging = false;
    this.save.defeatLog = undefined;
    clearExpeditionHighlight(this.save);
    this.save.location = 'dungeon';
    this.save.inExpedition = true;
    this.save.currentRegion = floor;
    resetFloorSessionPacing(this.save, floor);
    clearExpeditionRunState(this.save);
    consumeDungeonPrepForRun(this.save);
    this.currentAffix = getRegionAffix(floor);
    this.resetRunStats();
    this.resetVfx();
    this.clearEncounter();
    this.isBossFight = false;
    this.isEliteFight = false;
    this.isEpicFight = false;
    this.killedThisWave = [];
    this.waveProcExp = 0;
    this.pendingTravelRegion = null;
    this.party = buildPartyCombatants(this.save);
    syncCombatHp(this.save, this.party);
    this.isLodgingResting = false;
    this.setPhase('walk');
    this.lastArrivalMessage = '';
    this.waveStreak = 0;
    this.chainEngage = false;
    onExpeditionStarted(this.save);
    const packed = packPotionsForExpedition(this.save);
    const db = getDungeonCampBonuses(this.save);
    if (db.atkMult > 1 || db.defMult > 1 || db.expMult > 1 || db.goldMult > 1
      || db.critBonus > 0 || db.matDropMult > 1 || db.waveHealPct > 0) {
      this.addEvent(0.5, 0.26, '🏕️ 캠프 준비 보너스 적용!', '#88ccff', 2.2);
    }
    this.addEvent(0.5, 0.32, floor === 1
      ? '⚔️ 모험 출발 — 1층부터!'
      : `🛤️ 숏컷 출발 — ${floor}층!`, '#ffcc66', 2);
    if (packed > 0) {
      this.addEvent(0.5, 0.38, `💊 포션 ${packed}개 지참 (최대 3)`, '#44ff88', 1.8);
    }
    saveGame(this.save);
    this.onSave?.();
    return true;
  }

  startSpireExpedition(): boolean {
    if (this.isInExpedition() || !this.isAtLodging()) return false;
    if (!canAccessSpire(this.save)) return false;
    if (!canStartSpireRun(this.save).ok) return false;
    if (!beginSpireRun(this.save)) return false;

    this.pendingReturnToLodging = false;
    this.save.defeatLog = undefined;
    clearExpeditionHighlight(this.save);
    this.save.location = 'dungeon';
    this.save.inExpedition = true;
    resetFloorSessionPacing(this.save, this.save.spireRun!.floor);
    clearExpeditionRunState(this.save);
    this.currentAffix = getRegionAffix(Math.min(18, this.save.currentRegion));
    this.resetRunStats();
    this.resetVfx();
    this.clearEncounter();
    this.isBossFight = false;
    this.isEliteFight = false;
    this.isEpicFight = false;
    this.killedThisWave = [];
    this.waveProcExp = 0;
    this.pendingTravelRegion = null;
    this.party = buildPartyCombatants(this.save);
    syncCombatHp(this.save, this.party);
    this.isLodgingResting = false;
    this.setPhase('walk');
    this.lastArrivalMessage = '';
    this.waveStreak = 0;
    this.chainEngage = false;
    onExpeditionStarted(this.save);
    void preloadSpireTowerAssets();
    const floor = this.save.spireRun!.floor;
    const mod = getWeeklySpireModifier(this.save.spireRun!.weekId);
    this.addEvent(0.5, 0.3, `🗼 야탑 ${floor}층 등반 — [${mod.name}]`, '#ccbbff', 2.4);
    this.addEvent(0.5, 0.36, '스크롤 전투 — 웨이브를 격파해 올라가세요!', '#aaddff', 2);
    saveGame(this.save);
    this.onSave?.();
    return true;
  }

  returnToLodging(silent = false): boolean {
    if (this.isAtLodging() || this.isReturningToLodging) return false;
    if (this.phase === 'travel') return false;
    if (this.phase === 'combat' || this.phase === 'boss' || this.phase === 'encounter') {
      return false;
    }

    this.pendingReturnToLodging = false;
    this.isResting = false;
    this.restUntil = 0;
    this.pendingTravelRegion = null;
    this.resetVfx();
    this.clearEncounter();
    this.isBossFight = false;
    this.isEliteFight = false;
    this.isEpicFight = false;
    this.killedThisWave = [];
    this.waveProcExp = 0;
    applyVoluntaryReturnRecovery(this.save);
    this.party = buildPartyCombatants(this.save);

    if (this.isInSpireRun()) {
      return this.beginSpireReturnToLodging(silent);
    }

    const from = this.save.currentRegion;
    this.isReturningToLodging = true;
    useReturnSkip(this.save);
    this.returnTripQueue = [];
    for (let r = from - 1; r >= 1; r--) this.returnTripQueue.push(r);

    if (!silent) {
      this.addEvent(0.5, 0.28, `🏠 숙소로 귀환 — ${from}층부터 되돌아갑니다`, '#ccaaee', 2.2);
    }

    if (this.returnTripQueue.length > 0) {
      const first = this.returnTripQueue.shift()!;
      this.beginTravel(first, false);
    } else {
      this.beginReturnWalkOnRegion(from);
    }

    saveGame(this.save);
    this.onSave?.();
    return true;
  }

  /** 야탑 — 층별 역순 이동 없이 한 번에 마을 귀환 */
  private beginSpireReturnToLodging(silent: boolean): boolean {
    const spireFloor = this.save.spireRun?.floor ?? 1;
    this.isReturningToLodging = true;
    this.isSpireReturnTrip = true;
    this.returnTripQueue = [];
    this.returnWalkSec = 0;
    this.travelFromId = 0;
    this.travelToId = 0;
    this.travelDurationSec = Math.min(14, 4 + Math.pow(spireFloor, 0.55) * 1.15);
    this.phaseTimer = 0;
    this.setPhase('travel');

    if (!silent) {
      this.addEvent(0.5, 0.28, `🗼 야탑 ${spireFloor}층에서 마을로 귀환`, '#ccbbff', 2.4);
    }

    saveGame(this.save);
    this.syncRuntimeToSave();
    this.onSave?.();
    return true;
  }

  healPartyFull() {
    this.party = buildPartyCombatants(this.save);
    for (const p of this.party) {
      p.hp = p.maxHp;
      p.dieAnimProgress = undefined;
    }
    syncCombatHp(this.save, this.party);
  }

  /** hp>0 생존자만 flat 회복 — 쓰러짐·행동불능 부활 없음 */
  private applyPotionHeal(amount: number): number {
    this.ensurePartyForPotion();
    let total = 0;
    if (this.party.length) {
      for (const p of this.party) {
        if (p.hp <= 0) continue;
        if (isCharIncapacitated(this.save, p.id)) continue;
        const before = p.hp;
        p.hp = Math.min(p.maxHp, p.hp + amount);
        total += p.hp - before;
      }
      if (total > 0) syncCombatHp(this.save, this.party);
    } else {
      if (!this.save.combatHp) this.save.combatHp = {};
      for (const id of this.save.party) {
        if (isCharIncapacitated(this.save, id)) continue;
        const max = getCharMaxHp(this.save, id);
        const cur = this.save.combatHp[id] ?? max;
        if (cur <= 0) continue;
        const next = Math.min(max, cur + amount);
        total += next - cur;
        this.save.combatHp[id] = next;
      }
    }
    return total;
  }

  /** hp>0 생존자만 만피 — 젬 포션 등 (부활 없음) */
  private healAlivePartyFull(): number {
    let total = 0;
    if (this.party.length) {
      for (const p of this.party) {
        if (p.hp <= 0) continue;
        if (isCharIncapacitated(this.save, p.id)) continue;
        const before = p.hp;
        p.hp = p.maxHp;
        p.dieAnimProgress = undefined;
        total += p.hp - before;
      }
      if (total > 0) syncCombatHp(this.save, this.party);
    } else {
      if (!this.save.combatHp) this.save.combatHp = {};
      for (const id of this.save.party) {
        if (isCharIncapacitated(this.save, id)) continue;
        const max = getCharMaxHp(this.save, id);
        const cur = this.save.combatHp[id] ?? max;
        if (cur <= 0) continue;
        total += max - cur;
        this.save.combatHp[id] = max;
      }
    }
    return total;
  }

  private wouldPotionHeal(): boolean {
    this.ensurePartyForPotion();
    if (!this.party.length) this.party = buildPartyCombatants(this.save);
    if (this.party.length) {
      return this.party.some(p =>
        p.hp > 0 && !isCharIncapacitated(this.save, p.id) && p.hp < p.maxHp,
      );
    }
    for (const id of this.save.party) {
      if (isCharIncapacitated(this.save, id)) continue;
      const max = getCharMaxHp(this.save, id);
      const cur = this.save.combatHp?.[id] ?? max;
      if (cur > 0 && cur < max) return true;
    }
    return false;
  }

  usePotion(): boolean {
    if (this.augmentPickPending) return false;
    if (!this.isInExpedition()) return false;
    if (this.phase === 'defeat' || this.isDefeatRestActive() || this.phase === 'travel' || this.isResting) return false;
    ensurePotionInventory(this.save);
    if (getExpeditionPotions(this.save) <= 0) return false;
    this.ensurePartyForPotion();
    if (!this.party.length) this.party = buildPartyCombatants(this.save);
    if (!this.wouldPotionHeal()) return false;
    if (!consumeExpeditionPotion(this.save)) return false;
    const aug = getAugmentMods(this.save);
    const healed = this.applyPotionHeal(Math.floor(POTION_HEAL_FLAT * aug.potionHealMult * aug.potionHealPenalty));
    if (healed <= 0) return false;
    this.save.stats.potionsUsed++;
    this.addEvent(
      0.5, 0.35,
      `💊 +${healed.toLocaleString()} HP (생존자) · 휴대 ${this.save.potions}개`,
      '#44ff88',
    );
    saveGame(this.save);
    this.onSave?.();
    return true;
  }

  getPotionFailReason(): string {
    if (!this.isInExpedition()) return '원정 중에만 포션을 쓸 수 있어요';
    if (this.phase === 'defeat' || this.isDefeatRestActive()) return '전멸·휴식 중에는 사용 불가';
    if (this.phase === 'travel') return '층 이동 중에는 사용 불가';
    if (this.isResting) return '휴식 중에는 사용 불가';
    ensurePotionInventory(this.save);
    if (getExpeditionPotions(this.save) <= 0) return '휴대 포션이 없어요 (숙소 상점·캠프 제작)';
    if (!this.wouldPotionHeal()) return '회복할 HP가 없어요 (생존 파티원 만피)';
    return '포션 사용 불가';
  }

  /** @deprecated — 숙소 이동으로 대체 */
  startRest() {
    return this.returnToLodging();
  }

  private tickRest() {
    if (Date.now() < this.restUntil) return;
    this.finishRest();
  }

  private finishRest() {
    if (!this.isResting) return;
    this.isResting = false;
    this.restUntil = 0;
    this.healPartyFull();
    this.addEvent(0.5, 0.32, '✅ 휴식 완료 — HP 전원 회복!', '#88ffcc', 2);
    saveGame(this.save);
    this.onSave?.();
    this.onRestComplete?.();
  }

  getRestRemainingSec(): number {
    if (!this.isResting) return 0;
    return Math.max(0, Math.ceil((this.restUntil - Date.now()) / 1000));
  }

  getFreePotionFailReason(): string {
    if (this.phase === 'defeat' || this.isDefeatRestActive()) return '전멸·휴식 중에는 사용 불가';
    if (this.phase === 'travel') return '층 이동 중에는 사용 불가';
    if (this.isResting) return '휴식 중에는 사용 불가';
    return this.wouldPotionHeal()
      ? '젬 포션 사용 불가'
      : '회복할 HP가 없어요 (생존 파티원 만피)';
  }

  canUseFreePotion(): boolean {
    if (this.phase === 'defeat' || this.isDefeatRestActive() || this.phase === 'travel' || this.isResting) {
      return false;
    }
    return this.wouldPotionHeal();
  }

  useFreePotion(): boolean {
    if (this.phase === 'defeat' || this.isDefeatRestActive() || this.phase === 'travel' || this.isResting) {
      return false;
    }
    const healed = this.healAlivePartyFull();
    if (healed <= 0) return false;
    this.save.stats.potionsUsed++;
    this.addEvent(0.5, 0.35, `💎 생존자 HP +${healed.toLocaleString()}`, '#44ff88');
    saveGame(this.save);
    return true;
  }
}
