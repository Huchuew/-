import type { CookType, EquipRole, GameSave } from '../types';
import { MAX_PARTY_SIZE, MAX_POTION_STOCK, EXPEDITION_POTION_CARRY } from '../types';
import { getExpeditionPotions, getPotionStock } from '../systems/PotionInventory';
import { formatSynergySummary } from '../systems/equipmentSynergy';
import {
  getFormationLabel, getFormationRoleLabel, moveFormationBack, moveFormationFront,
  reconcileFormation,
} from '../systems/FormationSystem';
import { paintFormationPortraits, paintBulletinPortraits, paintGrowthCharPickers, paintPartyMemberPortraits } from '../render/FormationPortrait';
import { formatElementWheelHtml, formatAttackElementHint, getRegionElementTip } from '../data/elemental';
import { formatAffixTip, getRegionAffix, getWeeklyAffixLabel } from '../data/regionAffixes';
import { formatPartySynergyFull, getCharTraitLabels } from '../systems/partySynergy';
import { getPartyCompositionHint } from '../data/partyComposition';
import { getBossGateFaq } from '../utils/lockHints';
import { awakenCost, awakenItem, canAwaken, isAwakenableGrade } from '../systems/equipAwakening';
import type { AdventureSystem } from '../systems/AdventureSystem';
import { isRegionCleared } from '../systems/AdventureSystem';
import { CHARACTERS, CHAR_MAP, PRESTIGE_PATHS } from '../data/characters';
import { formatRebirthMarkHint } from '../systems/RebirthMarkSystem';
import { computeRosterBonuses, ROSTER_PASSIVE_MAP } from '../data/rosterPassives';
import { REGIONS } from '../data/regions';
import { MONSTERS } from '../data/monsters';
import { getCharGrowth, getNodeBonusWithSkill } from '../data/growthTrees';
import { formatSkillProcHtml, getActiveSkills } from '../data/combatSkills';
import {
  attemptLearn, canAttemptLearn, formatPityBonus, formatPrestigeLevelReq, getCharGrowthTrees,
  getGrowthFails, getGrowthLineProgress, getLearnRate, getPrestigeMilestoneInfo, isNodeLocked, PITY_STEP,
} from '../systems/GrowthSystem';
import { PRESTIGE_TIER_LEVELS, PRESTIGE_TEASER_LEVEL } from '../data/prestigeJobBalance';
import { getGrowthSfxTier } from '../systems/combatSfxTier';
import { applyUnifiedGrowth, getUnifiedGrowthAction } from '../systems/UnifiedGrowth';
import { ACHIEVEMENTS } from '../data/achievements';
import { canClaimAchievement, claimAchievement, countClaimableAchievements, isAchievementClaimed, isAchievementMet } from '../systems/AchievementSystem';
import {
  GRADE_COLOR, GRADE_LABEL, MATERIAL_LABELS, RECIPE_MAP,
  getJobEquipHint, getMaxEnhanceForGrade,
} from '../data/equipment';
import {
  type EquipCategory, findRecipeLine, getCategoryCraftLines, getCraftBlockReason,
  getItemForCharSlot, getMaxEnhanceForRecipeId,
} from '../data/equipmentProgress';
import { applyImportedSave, downloadSaveBackup, importSaveFromFile } from '../core/SaveBackup';
import { resetGameToFreshStart, saveGame } from '../core/SaveManager';
import { returnToStarterSelect } from '../core/BootFlow';
import {
  AGILITY_COOLDOWN_MS, AGILITY_MAX, AGILITY_SPD_PER_LEVEL, AGILITY_UNLOCK_REGION,
  canUpgradeAgility, getAgilityCooldownRemainingMs, getAgilityLevel, getAgilitySpdBonus,
  getTankThreatMult, getThreatLevel, isAgilityUnlocked, THREAT_MAX, THREAT_MULT_PER_LEVEL,
} from '../systems/AgilitySystem';
import { isTankChar } from '../data/characters';
import { TANK_DAMAGE_THREAT_MULT } from '../systems/AggroSystem';
import {
  computeCharStats, expToLevel, getPartyDps, getPartyDpsBreakdown,
  canAssignSupport, formatBufferSummary, getBufferContributions,
  getRegionAvgDef, goldLevelUpCost, isSupportChar,
} from '../systems/StatCalculator';
import { getMonsterRoleLabel } from '../data/monsterRoles';
import {
  CAMP_BUILDINGS, CAMP_PRODUCTION_BUILDINGS, formatInterval, formatIntervalSec, getBuildingLevel,
  getBuildingOutputAmount, isBuildingUnlocked, type CampBuildingId,
} from '../data/campBuildings';
import {
  canUpgradeBuilding, formatBuildingStatus, getBuildingProgress, getCampSummary,
  isBuildingPausedForMaterials, tickCampProduction, upgradeBuilding,
} from '../systems/TycoonSystem';
import {
  canCraft, canEnhance, craftItem, dismantleItem, enhanceCost, enhanceItem, equipItem,
  getEquipStats, getRecipeForItem, getVisibleBagItems, unequipItem,
} from '../systems/EquipmentSystem';
import {
  canRerollBulletin, ensureBulletin,
  getBulletinRerollCost, getBulletinRotateRemainingSec, hasRecruitGuaranteeFor, rerollBulletin,
  tryBulletinRecruit,
} from '../systems/BulletinBoardSystem';
import {
  canClaimRestTip, canCompleteDailyErrand, claimHuntBounty, claimPendingHuntGold, claimRestTip,
  getRestTipClaimsToday, getRestTipDailyLimit, getRestTipGold,
  completeDailyErrand, getClaimableHuntBounty, getDailyErrand, getPendingHuntGold, getPawnableItems,
  pawnEquipment,
} from '../systems/LodgingEconomySystem';
import {
  GEM_COST, canGemBulletinReroll, canGemDispatchRush, canGemGrowthBoost, canGemMaterialCrate,
  canGemPotion, canGemSpeedBoost, canPurchaseRecruitGuarantee, getBoostedLearnRate,
  purchaseRecruitGuarantee, spendGemPotion, tryGemBulletinReroll, tryGemDispatchRush,
  tryGemGrowthBoost, tryGemMaterialCrate, tryGemSpeedBoost,
} from '../systems/GemShop';
import {
  canCook, getCookRecipes, getCookRemainingSec, hasChef, startCook,
} from '../systems/CookSystem';
import { getCodexAtkBonus, getRegionDropHint, getTotalAccessoryCount } from '../systems/CodexSystem';
import { renderAccessoryPanel as renderAccessoryBagPanel } from './panels/accessoryPanel';
import { salvageJunkAccessories } from '../systems/AccessoryBagSystem';
import {
  enhanceBonus, formatEnhanceStatDelta, getEnhanceMilestoneLabel, getEnhanceStatPreview,
} from '../data/equipment';
import { audio } from '../core/AudioManager';
import { refreshBgm } from '../core/bgmContext';
import { bindTap } from '../utils/bindTap';
import { formatRecipeStatLine, formatStatNum } from '../utils/formatStat';
import { attachPanelPointerGuard } from '../utils/panelPointerGuard';
import { renderEndgamePanel } from './panels/endgamePanel';
import { flushPendingAccessoryCelebration } from './legendaryAccessoryModal';
import {
  getSellableItems, scaleSellGold, sellMaterial,
} from '../systems/VendorSystem';
import { buyShopProduct, buyHubDailyDeal, getShopProducts, getShopRotateRemainingSec } from '../systems/LodgingShopSystem';
import { dismissExpeditionHighlight } from '../systems/expeditionHighlight';
import { getCharCurrentHp, getCharMaxHp, isPartyFullyHealed } from '../systems/RestHealingSystem';
import {
  formatDungeonBonusSummary, formatDungeonCycleHint, formatDungeonStackLabel,
  getDungeonMaxStacks, getDungeonPrepStacks, hasAnyDungeonCampBonus,
} from '../systems/dungeonCampBonuses';
import {
  CAMP_ZONES, STAFF_ASSIGNABLE,
} from '../data/tycoonConfig';
import { formatWarehousePanelDetail, getMaterialCapDisplay, getWarehouseFullness } from '../systems/WarehouseSystem';
import { getBossCodexThreshold, BOSS_CLEARED_BASE, BOSS_CLEARED_KILL_STEP } from '../systems/EncounterSystem';
import { formatFloorBossWaitHint, isBossGateReady } from '../systems/floorPacing';
import { formatFloorLevelWallHint } from '../data/floorProgression';
import {
  canClaimOnboardingReward, CHAPTER_TITLES, claimOnboardingReward,
  getChapterRewardGold, getGuideChapter, getOnboardingQuests,
  GUIDE_CHAPTER_COUNT, onGrowthAction,
} from '../systems/OnboardingSystem';
import { getGrowthRecommendation, applyGrowthRecommendation } from '../systems/RecommendGrowth';
import { getReadinessGradeInfo, isLateGameFloor } from '../data/lateGameBalance';
import {
  claimDailyBonus, getTodayDailyBonus, isDailyBonusActive,
} from '../systems/dailyBonus';
import {
  findFirstPrestigeGateChar, formatPrestigeGateBanner, getPrestigeGate,
  isCharGrowthBlocked, isCharPrestigeGated,
} from '../systems/PrestigeGateSystem';
import { getNavLockHint, getWorldNavLockHint, isExtendedNavUnlocked, isWorldNavUnlocked } from '../systems/uiUnlock';
import {
  canStartExpedition, formatIncapHint, formatPartyIncapBanner, getActivePartyMembers,
  getIncapRemainingSec, getPartyIncapRemainingSec,
  hasPartyIncapacitated,
} from '../systems/CharacterStatusSystem';
import { APP_VERSION, STUDIO_NAME } from '../config/release';
import { openPrivacyPolicy } from '../utils/openPrivacy';
import {
  assignStaff, calcDispatchYield, canRemodel, canUnlockZone, claimDispatch,
  ensureTycoon, formatDispatchDuration, formatDispatchRemainSec, getAvailableDispatchRegions,
  getDispatchProgress, getDispatchSlots, getPendingTycoonSummary, getStaffWagePerHour,
  getTotalMaterialCount, getTycoonIncomeRates, getTycoonSummary, getWarehouseCapacity,
  remodelLodging, startDispatch, unlockZone,
} from '../systems/TycoonExpansionSystem';
import { formatShortageHtml, formatShortageHint, getCostShortage } from '../systems/materialShortage';
import type { PanelHost, EndgameSub, CollectionSub } from './panels/PanelHost';
import { subTabs as htmlSubTabs, worldNavGrid as htmlWorldNavGrid, lodgingSection as htmlLodgingSection, panelDetails as htmlPanelDetails } from './panels/panelHtml';
import { renderSettingsPanel } from './panels/settingsPanel';
import { renderTownHub, townBackButton, type TownSub } from './panels/townPanel';
import { renderLeaderboardPanel, clearLeaderboardPanelCache } from './panels/leaderboardPanel';
import { renderProductionCampPanel, productionCampBuildingIds } from './panels/productionCampPanel';
import { formatCampProduceOutput } from './panels/minimalCamp';
import { renderPartyPanel } from './panels/partyPanel';
import { renderMetaBannerHtml } from '../utils/metaHints';
import { buildDungeonFloorStrip, buildDungeonTips, buildLodgingDungeonBonusHint } from './panels/worldPanel';
import { renderLodgingDepartPanel } from './panels/dungeonDepartPanel';
import {
  getPinnedShortcutFloor,
  hasActiveShortcutDevelopment,
  reconcileShortcutDevelopment,
  resolveDepartFloor,
  startShortcutDevelopment,
  togglePinnedShortcutFloor,
} from '../systems/DungeonShortcutSystem';
import {
  findSpotlightSkill, getOwnedPrestigePathNames, renderGrowthCharPicker, renderGrowthSubTabs,
  renderPrestigeShowcase, renderPrestigeTreeFooter, renderSkillSpotlight,
} from './panels/growthPanel';
import { bindAugmentCollectionPanel, renderAugmentCollectionPanel } from './panels/augmentPanel';
import { getPartyHealPercent, renderPanelGuide, type NextPlayerAction } from './panels/contextHints';
import {
  renderMilestoneAchievements, renderCompactBag,
} from './panels/recordsPanel';
import { renderFullAchievementBrowser } from './panels/achievementBrowser';
import { showFloor10PhaseModal } from './floor10PhaseModal';
import { markFloor10IntroSeen, shouldShowFloor10Intro } from '../systems/floor10Intro';
import {
  renderBulletinRecruitGrid, renderBulletinRerollRow, renderBulletinStatsStrip, renderHeroRosterGrid,
} from './panels/bulletinPanel';
import { autoClaimAchievements } from '../systems/AchievementSystem';

const ROLE_TAG: Record<EquipRole, string> = {
  tank: '탱커', dps: '딜러', healer: '힐러', bruiser: '브루저', support: '서포트',
};

export type TabId = 'party' | 'growth' | 'town';
type GrowthSub = 'upgrade' | 'equipment' | 'augments';
export type LodgingWorldSub = 'dungeon' | 'codex' | 'camp' | 'shop' | 'rest' | 'bulletin';
export type ShopSub = 'buy' | 'sell';
export type CampSub = 'facilities' | 'town' | 'guild' | 'dungeon';
type WorldSub = LodgingWorldSub;

export class PanelManager implements PanelHost {
  readonly panelEl: HTMLElement;
  private tab: TabId = 'party';
  private townSub: TownSub = 'hub';
  private growthSub: GrowthSub = 'upgrade';
  private shopSub: ShopSub = 'buy';
  private campSub: CampSub = 'facilities';
  /** 건물 상세 관리 `<details>` 열림 상태 — 강화 후에도 유지 */
  private campDetailOpen = false;
  private prestigeTreeOpen = false;
  endgameSub: EndgameSub = 'spire';
  ascendCharId = 'mujang';
  collectionSub: CollectionSub = 'bag';
  private upgradeCharId = 'mujang';
  private equipCharId = 'mujang';
  private equipCategory: EquipCategory = 'weapon';
  private accessoryShowAll = false;
  private dpsPanelOpen = false;
  private formationPanelOpen = false;
  private hudSettingsOpen = false;
  private departFloorId = 1;
  private panelScrollTop = 0;
  private panelRenderKey = '';
  private readonly panelPointerGuard: ReturnType<typeof attachPanelPointerGuard>;

  constructor(
    private root: HTMLElement,
    public getSave: () => GameSave,
    public getAdv: () => AdventureSystem,
    public onRefresh: () => void,
  ) {
    const panel = root.querySelector('#panel-content');
    if (!panel) throw new Error('panel-content not found');
    this.panelEl = panel as HTMLElement;
    this.panelPointerGuard = attachPanelPointerGuard(this.panelEl);
    this.bindNav();
    this.bindPanelDelegates();
    this.bindStablePanelActions();
    this.panelEl.addEventListener('toggle', (e) => {
      const el = e.target as HTMLElement;
      if (el.matches('.camp-advanced-panel')) {
        this.campDetailOpen = (el as HTMLDetailsElement).open;
      }
    }, true);
    this.render();
  }

  private syncCampDetailOpenState() {
    const el = this.panelEl.querySelector('.camp-advanced-panel') as HTMLDetailsElement | null;
    if (el) this.campDetailOpen = el.open;
  }

  /** iOS·Android — render()로 DOM이 바뀌어도 탭이 씹히지 않도록 위임 (pointerup + click) */
  private bindStablePanelActions() {
    let lastActionMs = 0;
    const run = (fn: () => void) => {
      const now = Date.now();
      if (now - lastActionMs < 180) return;
      lastActionMs = now;
      void audio.unlock();
      fn();
    };

    const onTap = (e: Event) => {
      const target = e.target as HTMLElement;
      if (this.panelPointerGuard.consumeScrollGesture(target, e)) return;
      const pe = e as PointerEvent;
      if (e.type === 'pointerup' && pe.pointerType === 'mouse' && pe.button !== 0) return;

      if (target.closest('[data-hud-settings-close]')) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          audio.playTab();
          this.closeHudSettings();
        });
        return;
      }

      const holdBtn = target.closest('#hold-floor-advance');
      if (holdBtn) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const s = this.getSave();
          s.settings.holdFloorAdvance = !s.settings.holdFloorAdvance;
          saveGame(s);
          audio.playTab();
          this.render();
        });
        return;
      }

      if (target.closest('#start-expedition, #party-start-expedition')) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const btn = target.closest('#start-expedition, #party-start-expedition') as HTMLElement | null;
          const save = this.getSave();
          const floor = resolveDepartFloor(
            save,
            Number(btn?.dataset.departTarget ?? this.departFloorId) || undefined,
          );
          const tryDepart = () => {
            if (this.getAdv().startExpedition(floor)) {
              audio.playUpgrade();
              this.townSub = 'dungeon';
              this.onRefresh();
              this.render();
            } else audio.playFail();
          };
          if (shouldShowFloor10Intro(this.getSave(), floor)) {
            showFloor10PhaseModal(this.root, () => {
              markFloor10IntroSeen(this.getSave());
              tryDepart();
            });
            return;
          }
          tryDepart();
        });
        return;
      }

      const departFloorBtn = target.closest('[data-depart-floor]') as HTMLElement | null;
      if (departFloorBtn) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          this.departFloorId = Number(departFloorBtn.dataset.departFloor) || 1;
          this.render();
        });
        return;
      }

      const pinShortcutBtn = target.closest('[data-pin-shortcut]') as HTMLButtonElement | null;
      if (pinShortcutBtn) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const save = this.getSave();
          const floor = Number(pinShortcutBtn.dataset.pinShortcut) || this.departFloorId;
          if (togglePinnedShortcutFloor(save, floor)) {
            audio.playTab();
            saveGame(save);
            this.showToast(
              getPinnedShortcutFloor(save) === floor
                ? `📌 ${floor}층 숏컷 고정 — 모험단 탭에서도 ${floor}층 출발`
                : '숏컷 고정 해제',
            );
            this.render();
          } else {
            audio.playFail();
            this.showToast('이 층은 아직 고정할 수 없어요', false);
          }
        });
        return;
      }

      const shortcutDevBtn = target.closest('[data-shortcut-dev]') as HTMLButtonElement | null;
      if (shortcutDevBtn && !shortcutDevBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const save = this.getSave();
          const floor = Number(shortcutDevBtn.dataset.shortcutDev) || 1;
          if (startShortcutDevelopment(save, floor)) {
            audio.playUpgrade();
            saveGame(save);
            this.onRefresh();
            this.showToast(`🛠️ ${floor}층 숏컷 개발 시작`);
            this.render();
          } else {
            audio.playFail();
            this.showToast('숏컷 개발 조건을 확인하세요', false);
          }
        });
        return;
      }

      const expPotion = target.closest('#exp-use-potion');
      if (expPotion && !(expPotion as HTMLButtonElement).disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const adv = this.getAdv();
          const save = this.getSave();
          if (adv.usePotion()) {
            audio.playUpgrade();
            saveGame(save);
            this.onRefresh();
            this.render();
          } else {
            audio.playFail();
            this.showToast(adv.getPotionFailReason());
          }
        });
        return;
      }

      const cookBtn = target.closest('[data-cook]') as HTMLElement | null;
      if (cookBtn && !(cookBtn as HTMLButtonElement).disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const save = this.getSave();
          const type = cookBtn.dataset.cook as CookType;
          if (startCook(save, type)) {
            audio.playCraft();
            saveGame(save);
            this.onRefresh();
            this.render();
          } else audio.playFail();
        });
        return;
      }

      if (target.closest('#formation-toggle')) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          this.formationPanelOpen = !this.formationPanelOpen;
          this.render();
        });
        return;
      }

      if (target.closest('#dps-toggle')) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          this.dpsPanelOpen = !this.dpsPanelOpen;
          this.render();
        });
        return;
      }

      const formFront = target.closest('[data-form-front]') as HTMLElement | null;
      if (formFront && !(formFront as HTMLButtonElement).disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const save = this.getSave();
          const id = formFront.dataset.formFront!;
          if (moveFormationFront(save, id)) {
            saveGame(save);
            audio.playEquip();
            this.onRefresh();
            this.render();
          }
        });
        return;
      }

      const formBack = target.closest('[data-form-back]') as HTMLElement | null;
      if (formBack && !(formBack as HTMLButtonElement).disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const save = this.getSave();
          const id = formBack.dataset.formBack!;
          if (moveFormationBack(save, id)) {
            saveGame(save);
            audio.playEquip();
            this.onRefresh();
            this.render();
          }
        });
        return;
      }

      const actionBtn = target.closest('[data-action]') as HTMLElement | null;
      if (actionBtn && !(actionBtn as HTMLButtonElement).disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handlePartyAction(actionBtn));
        return;
      }

      if (target.closest('#town-quick-rest')) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          if (this.getAdv().startLodgingRest()) {
            audio.playRest();
            this.render();
          } else audio.playFail();
        });
        return;
      }
      if (target.closest('#town-rest-stop')) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          this.getAdv().stopLodgingRest();
          audio.playTab();
          this.render();
        });
        return;
      }

      const bulletinRecruitBtn = target.closest('[data-bulletin-recruit]') as HTMLButtonElement | null;
      if (bulletinRecruitBtn && !bulletinRecruitBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleBulletinRecruit(bulletinRecruitBtn.dataset.bulletinRecruit!));
        return;
      }

      const bulletinGemBtn = target.closest('[data-bulletin-gem]') as HTMLButtonElement | null;
      if (bulletinGemBtn && !bulletinGemBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleBulletinGemGuarantee(bulletinGemBtn.dataset.bulletinGem!));
        return;
      }

      const bulletinRerollBtn = target.closest('#bulletin-reroll') as HTMLButtonElement | null;
      if (bulletinRerollBtn && !bulletinRerollBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleBulletinReroll());
        return;
      }

      const bulletinGemRerollBtn = target.closest('#bulletin-gem-reroll') as HTMLButtonElement | null;
      if (bulletinGemRerollBtn && !bulletinGemRerollBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleBulletinGemReroll());
        return;
      }

      const shopBuyBtn = target.closest('[data-shop-buy]') as HTMLButtonElement | null;
      if (shopBuyBtn && !shopBuyBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleShopBuy(shopBuyBtn.dataset.shopBuy!));
        return;
      }

      const sellAmtBtn = target.closest('[data-sell-amt]') as HTMLButtonElement | null;
      if (sellAmtBtn && !sellAmtBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleSellMaterial(sellAmtBtn.dataset.sellAmt!, Number(sellAmtBtn.dataset.amt ?? 1)));
        return;
      }

      const pawnBtn = target.closest('[data-pawn]') as HTMLButtonElement | null;
      if (pawnBtn && !pawnBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handlePawnEquipment(pawnBtn.dataset.pawn!));
        return;
      }

      const claimPendingHuntBtn = target.closest('#claim-pending-hunt') as HTMLButtonElement | null;
      if (claimPendingHuntBtn && !claimPendingHuntBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleClaimPendingHunt());
        return;
      }

      const huntBountyBtn = target.closest('#hunt-bounty') as HTMLButtonElement | null;
      if (huntBountyBtn && !huntBountyBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleHuntBounty());
        return;
      }

      const dailyErrandBtn = target.closest('#daily-errand') as HTMLButtonElement | null;
      if (dailyErrandBtn && !dailyErrandBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleDailyErrand());
        return;
      }

      const restTipBtn = target.closest('#rest-tip') as HTMLButtonElement | null;
      if (restTipBtn && !restTipBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleRestTip());
        return;
      }

      const claimDailyBtn = target.closest('#claim-daily-bonus') as HTMLButtonElement | null;
      if (claimDailyBtn && !claimDailyBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleClaimDailyBonus());
        return;
      }

      const hubSpecialBtn = target.closest('[data-hub-special-buy]') as HTMLButtonElement | null;
      if (hubSpecialBtn && !hubSpecialBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleHubSpecialBuy());
        return;
      }

      const dismissHighlightBtn = target.closest('[data-dismiss-expedition-highlight]') as HTMLButtonElement | null;
      if (dismissHighlightBtn) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleDismissExpeditionHighlight());
        return;
      }

      const claimOnboardingBtn = target.closest('#claim-onboarding') as HTMLButtonElement | null;
      if (claimOnboardingBtn && !claimOnboardingBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleClaimOnboarding());
        return;
      }

      const prestigeTreeBtn = target.closest('[data-prestige-tree-toggle]');
      if (prestigeTreeBtn) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          this.prestigeTreeOpen = !this.prestigeTreeOpen;
          audio.playTab();
          this.render();
        });
        return;
      }

      const nextGo = target.closest('[data-next-go]') as HTMLElement | null;
      if (nextGo) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.navigateToAction({
          tab: nextGo.dataset.nextTab as TabId,
          townSub: nextGo.dataset.nextTownSub,
          growthSub: nextGo.dataset.nextGrowthSub as 'upgrade' | 'equipment' | 'augments' | undefined,
          equipCharId: nextGo.dataset.nextEquipChar,
          equipCategory: nextGo.dataset.nextEquipCat as import('../data/equipmentProgress').EquipCategory | undefined,
        }));
        return;
      }

      const growthPick = target.closest('.growth-char-pick[data-char]') as HTMLElement | null;
      if (growthPick) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const id = growthPick.dataset.char!;
          this.equipCharId = id;
          this.upgradeCharId = id;
          this.render();
        });
        return;
      }

      const craftBtn = target.closest('[data-craft]') as HTMLButtonElement | null;
      if (craftBtn && !craftBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleCraft(craftBtn.dataset.craft!));
        return;
      }

      const enhanceBtn = target.closest('[data-enhance]') as HTMLButtonElement | null;
      if (enhanceBtn && !enhanceBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleEnhance(enhanceBtn.dataset.enhance!));
        return;
      }

      const awakenBtn = target.closest('[data-awaken]') as HTMLButtonElement | null;
      if (awakenBtn && !awakenBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleAwaken(awakenBtn.dataset.awaken!));
        return;
      }

      const equipAccBtn = target.closest('[data-equip-acc]') as HTMLButtonElement | null;
      if (equipAccBtn && !equipAccBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const save = this.getSave();
          const el = equipAccBtn;
          if (equipItem(save, el.dataset.char!, el.dataset.equipAcc!)) {
            audio.playEquip();
            saveGame(save);
            this.onRefresh();
            this.render();
          } else audio.playFail();
        });
        return;
      }

      const unequipAccBtn = target.closest('[data-unequip-acc]') as HTMLButtonElement | null;
      if (unequipAccBtn && !unequipAccBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const save = this.getSave();
          const el = unequipAccBtn;
          unequipItem(save, el.dataset.char!, el.dataset.unequipAcc!);
          audio.playEquip();
          saveGame(save);
          this.onRefresh();
          this.render();
        });
        return;
      }

      const accSalvageBtn = target.closest('[data-accessory-salvage-junk]') as HTMLButtonElement | null;
      if (accSalvageBtn && !accSalvageBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const save = this.getSave();
          const res = salvageJunkAccessories(save, this.equipCharId);
          if (res.count > 0) {
            audio.playGold();
            saveGame(save);
            this.onRefresh();
            this.showToast(`💍 하급 장신구 ${res.count}개 회수 · 🪙${res.gold.toLocaleString()}`);
            this.render();
          } else {
            audio.playFail();
            this.showToast('회수할 하급 장신구가 없어요', false);
          }
        });
        return;
      }

      const accToggleBtn = target.closest('[data-accessory-toggle-bag]') as HTMLButtonElement | null;
      if (accToggleBtn) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          this.accessoryShowAll = !this.accessoryShowAll;
          audio.playTab();
          this.render();
        });
        return;
      }

      const echarBtn = target.closest('[data-echar]') as HTMLElement | null;
      if (echarBtn) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          this.equipCharId = echarBtn.dataset.echar!;
          this.render();
        });
        return;
      }

      const catBtn = target.closest('[data-cat]') as HTMLElement | null;
      if (catBtn) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          this.equipCategory = catBtn.dataset.cat as EquipCategory;
          this.render();
        });
        return;
      }

      const nodeBtn = target.closest('[data-node]') as HTMLButtonElement | null;
      if (nodeBtn && !nodeBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleLearnNode(this.upgradeCharId, nodeBtn.dataset.node!));
        return;
      }

      const achieveBtn = target.closest('[data-claim-achieve]') as HTMLButtonElement | null;
      if (achieveBtn && !achieveBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const s = this.getSave();
          const id = achieveBtn.dataset.claimAchieve!;
          const res = claimAchievement(s, id);
          if (res.ok) {
            audio.playGold();
            this.showToast(res.message);
            saveGame(s);
            this.onRefresh();
            this.render();
          } else audio.playFail();
        });
        return;
      }

      const recommendBtn = target.closest('#recommend-growth-btn') as HTMLButtonElement | null;
      if (recommendBtn && !recommendBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleRecommendGrowth());
        return;
      }

      const unifiedBtn = target.closest('#unified-growth-btn') as HTMLButtonElement | null;
      if (unifiedBtn && !unifiedBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => this.handleUnifiedGrowth());
        return;
      }

      if (target.closest('#lodging-rest')) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          if (this.getAdv().startLodgingRest()) {
            audio.playRest();
            this.render();
          } else audio.playFail();
        });
        return;
      }
      if (target.closest('#lodging-rest-stop')) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          this.getAdv().stopLodgingRest();
          audio.playTab();
          this.render();
        });
        return;
      }

      const campUpBtn = target.closest('[data-camp-upgrade]') as HTMLButtonElement | null;
      if (campUpBtn && !campUpBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const s = this.getSave();
          const id = campUpBtn.dataset.campUpgrade as CampBuildingId;
          if (upgradeBuilding(s, id)) {
            this.campDetailOpen = true;
            audio.playUpgrade();
            this.onRefresh();
            this.render();
          } else audio.playFail();
        });
        return;
      }

      const unlockZoneBtn = target.closest('[data-unlock-zone]') as HTMLButtonElement | null;
      if (unlockZoneBtn && !unlockZoneBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const s = this.getSave();
          if (unlockZone(s, unlockZoneBtn.dataset.unlockZone!)) {
            audio.playUpgrade();
            this.onRefresh();
            this.render();
          } else audio.playFail();
        });
        return;
      }

      const dispatchBtn = target.closest('[data-dispatch]') as HTMLButtonElement | null;
      if (dispatchBtn && !dispatchBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const s = this.getSave();
          const regionId = Number(dispatchBtn.dataset.dispatch);
          const slots = getDispatchSlots(s);
          const heroes = s.owned.slice(0, slots);
          if (startDispatch(s, regionId, heroes)) {
            audio.playUpgrade();
            this.onRefresh();
            this.render();
          } else audio.playFail();
        });
        return;
      }

      const claimDispatchBtn = target.closest('#claim-dispatch') as HTMLButtonElement | null;
      if (claimDispatchBtn && !claimDispatchBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const s = this.getSave();
          if (claimDispatch(s)) {
            audio.playGold();
            this.onRefresh();
            this.render();
          } else audio.playFail();
        });
        return;
      }

      const gemDispatchBtn = target.closest('#gem-dispatch-rush') as HTMLButtonElement | null;
      if (gemDispatchBtn && !gemDispatchBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const s = this.getSave();
          if (!tryGemDispatchRush(s)) { audio.playFail(); return; }
          audio.playUpgrade();
          this.showToast('⚡ 파견 즉시 완료!');
          saveGame(s);
          this.onRefresh();
          this.render();
        });
        return;
      }

      const remodelBtn = target.closest('#remodel-lodging') as HTMLButtonElement | null;
      if (remodelBtn && !remodelBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const s = this.getSave();
          if (remodelLodging(s)) {
            audio.playUpgrade();
            this.onRefresh();
            this.render();
          } else audio.playFail();
        });
        return;
      }

      const dismantleBtn = target.closest('[data-dismantle]') as HTMLButtonElement | null;
      if (dismantleBtn && !dismantleBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        run(() => {
          const s = this.getSave();
          if (dismantleItem(s, dismantleBtn.dataset.dismantle!)) {
            audio.playGold();
            saveGame(s);
            this.onRefresh();
            this.render();
          } else audio.playFail();
        });
        return;
      }
    };

    this.panelEl.addEventListener('pointerup', onTap);
    this.panelEl.addEventListener('click', onTap);
  }

  private handlePartyAction(el: HTMLElement) {
    const save = this.getSave();
    const id = el.dataset.id!;
    const action = el.dataset.action!;
    if (action === 'support' && isSupportChar(id)) {
      if (save.supportSlot === id) {
        save.supportSlot = null;
      } else if (!canAssignSupport(save, id)) {
        audio.playFail();
        this.showRecruitToast('전투원 1명 이상 남아야 서포트할 수 있어요', false);
        return;
      } else {
        save.supportSlot = id;
        save.party = save.party.filter(p => p !== id);
      }
      audio.playEquip();
    } else if (action === 'add' && save.party.length < MAX_PARTY_SIZE && !save.party.includes(id)) {
      if (save.supportSlot === id) save.supportSlot = null;
      save.party.push(id);
      reconcileFormation(save);
      audio.playEquip();
    } else if (action === 'remove' && save.party.length > 1) {
      const nextParty = save.party.filter(p => p !== id);
      if (save.inExpedition && getActivePartyMembers({ ...save, party: nextParty }).length === 0) {
        audio.playFail();
        this.showRecruitToast('원정 중에는 전투 가능한 멤버가 1명 이상 필요해요', false);
        return;
      }
      save.party = nextParty;
      reconcileFormation(save);
    } else {
      audio.playFail();
      return;
    }
    saveGame(save);
    this.onRefresh();
    this.render();
  }

  private handleBulletinRecruit(charId: string) {
    const s = this.getSave();
    const def = CHAR_MAP[charId];
    const guaranteed = hasRecruitGuaranteeFor(s, charId);
    const result = tryBulletinRecruit(s, charId);
    if (result === 'success') {
      audio.playUpgrade();
      this.showRecruitToast(`${def?.name ?? ''} 영입 성공! 🎉${guaranteed ? ' (확정)' : ''}`, true);
    } else if (result === 'fail') {
      audio.playFail();
      this.showRecruitToast(`${def?.name ?? ''} 영입 실패... 용사가 거절했어요`, false);
    } else {
      audio.playFail();
      if (result === 'no_gold') this.showToast('골드가 부족해요', false);
      return;
    }
    saveGame(s);
    this.onRefresh();
    this.render();
  }

  private handleBulletinGemGuarantee(charId: string) {
    const s = this.getSave();
    const def = CHAR_MAP[charId];
    if (purchaseRecruitGuarantee(s, charId)) {
      audio.playUpgrade();
      this.showRecruitToast(`${def?.name ?? ''} — 다음 🪙영입 100%! ✨`, true);
      saveGame(s);
      this.onRefresh();
      this.render();
    } else audio.playFail();
  }

  private handleBulletinReroll() {
    const s = this.getSave();
    if (rerollBulletin(s)) {
      audio.playGold();
      saveGame(s);
      this.onRefresh();
      this.render();
    } else audio.playFail();
  }

  private handleBulletinGemReroll() {
    const s = this.getSave();
    if (tryGemBulletinReroll(s)) {
      audio.playGold();
      saveGame(s);
      this.onRefresh();
      this.render();
    } else audio.playFail();
  }

  private handleShopBuy(productId: string) {
    const s = this.getSave();
    const res = buyShopProduct(s, productId as import('../systems/LodgingShopSystem').ShopProductId);
    if (res.ok) {
      audio.playEquip(getGrowthSfxTier(s, s.party[0] ?? 'mujang', 1));
      saveGame(s);
      this.showToast(res.message);
      this.onRefresh();
      this.render();
    } else {
      audio.playFail();
      this.showToast(res.message, false);
    }
  }

  private handleHubSpecialBuy() {
    const s = this.getSave();
    const res = buyHubDailyDeal(s);
    if (res.ok) {
      audio.playEquip(getGrowthSfxTier(s, s.party[0] ?? 'mujang', 1));
      saveGame(s);
      this.showToast(res.message);
      this.onRefresh();
      this.render();
    } else {
      audio.playFail();
      this.showToast(res.message, false);
    }
  }

  private handleDismissExpeditionHighlight() {
    const s = this.getSave();
    dismissExpeditionHighlight(s);
    saveGame(s);
    this.render();
  }

  private handleSellMaterial(key: string, amt: number) {
    const s = this.getSave();
    const gold = sellMaterial(s, key, amt);
    if (gold > 0) {
      audio.playGold();
      saveGame(s);
      this.onRefresh();
      this.render();
    } else audio.playFail();
  }

  private handlePawnEquipment(uid: string) {
    const s = this.getSave();
    const gold = pawnEquipment(s, uid);
    if (gold > 0) {
      audio.playGold();
      saveGame(s);
      this.onRefresh();
      this.render();
    } else audio.playFail();
  }

  private handleClaimPendingHunt() {
    const s = this.getSave();
    const gold = claimPendingHuntGold(s);
    if (gold > 0) {
      audio.playGold();
      saveGame(s);
      this.onRefresh();
      this.showToast(`🏹 사냥 적립금 🪙${gold.toLocaleString()} 수령!`);
      this.render();
    } else audio.playFail();
  }

  private handleHuntBounty() {
    const s = this.getSave();
    const gold = claimHuntBounty(s);
    if (gold > 0) {
      audio.playGold();
      saveGame(s);
      this.onRefresh();
      this.render();
    } else audio.playFail();
  }

  private handleDailyErrand() {
    const s = this.getSave();
    const gold = completeDailyErrand(s);
    if (gold > 0) {
      audio.playGold();
      saveGame(s);
      this.onRefresh();
      this.render();
    } else audio.playFail();
  }

  private handleRestTip() {
    const s = this.getSave();
    const gold = claimRestTip(s, this.getAdv().isLodgingResting);
    if (gold > 0) {
      audio.playGold();
      saveGame(s);
      this.onRefresh();
      this.render();
    } else audio.playFail();
  }

  private handleClaimDailyBonus() {
    const s = this.getSave();
    if (claimDailyBonus(s).ok) {
      saveGame(s);
      audio.playGold();
      const b = getTodayDailyBonus();
      this.showToast(`${b.icon} ${b.label} — ${b.detail}`);
      this.render();
    } else audio.playFail();
  }

  private handleClaimOnboarding() {
    const s = this.getSave();
    const ch = getGuideChapter(s);
    if (claimOnboardingReward(s, this.getAdv())) {
      audio.playGold();
      const gold = getChapterRewardGold(ch);
      const extra = ch === 1 ? ' · 무장 영입 할인 해금!' : '';
      this.showToast(`🎉 ${CHAPTER_TITLES[ch - 1]} 완료! 🪙${gold.toLocaleString()}${extra}`);
      this.onRefresh();
      this.render();
    } else audio.playFail();
  }

  private handleCraft(recipeId: string) {
    const save = this.getSave();
    const res = craftItem(save, recipeId, this.equipCharId);
    if (res === 'success') {
      audio.playCraft();
      saveGame(save);
      this.onRefresh();
      this.render();
    } else if (res === 'failed') {
      audio.playFail();
      saveGame(save);
      this.showToast('제작 실패 — 골드만 소모, 재료는 유지됩니다', false);
      this.render();
    } else {
      const r = RECIPE_MAP[recipeId];
      if (r) {
        const hint = formatShortageHint(getCostShortage(save, r.materials, r.craftGold));
        if (hint) this.showToast(hint, false);
      }
      audio.playFail();
    }
  }

  private handleEnhance(uid: string) {
    const save = this.getSave();
    const item = save.bag.find(b => b.uid === uid);
    const recipe = item ? RECIPE_MAP[item.id] : null;
    const before = recipe && item ? getEnhanceStatPreview(recipe, item.level) : null;
    if (enhanceItem(save, uid)) {
      audio.playUpgrade();
      if (recipe && item && before) {
        const after = getEnhanceStatPreview(recipe, item.level);
        const gains: string[] = [];
        if (after.atk > before.atk) gains.push(`ATK +${after.atk - before.atk}`);
        if (after.def > before.def) gains.push(`DEF +${after.def - before.def}`);
        if (after.hp > before.hp) gains.push(`HP +${after.hp - before.hp}`);
        const ms = getEnhanceMilestoneLabel(item.level);
        this.showToast(`${ms ? `${ms} ` : ''}+${item.level} 강화! ${gains.join(' · ')}`);
      }
      saveGame(save);
      this.onRefresh();
      this.render();
    } else {
      if (item) {
        const cost = enhanceCost(save, item.level, item.grade);
        const hint = formatShortageHint(getCostShortage(save, cost.mats, cost.gold));
        if (hint) this.showToast(hint, false);
      }
      audio.playFail();
    }
  }

  private handleAwaken(uid: string) {
    const save = this.getSave();
    if (awakenItem(save, uid)) {
      audio.playUpgrade();
      saveGame(save);
      this.onRefresh();
      this.showToast('★ 각성 성공!');
      this.render();
    } else {
      const item = save.bag.find(b => b.uid === uid);
      if (item) {
        const cost = awakenCost(item.awakenLevel ?? 0);
        const hint = formatShortageHint(getCostShortage(save, cost.mats, cost.gold));
        if (hint) this.showToast(hint, false);
      }
      audio.playFail();
    }
  }

  private handleLearnNode(charId: string, nid: string) {
    const save = this.getSave();
    const result = attemptLearn(save, charId, nid);
    const node = getCharGrowth(charId).find(n => n.id === nid);
    if (result.prestigeClaim) {
      if (result.learned) {
        const tier = (node?.branchTier ?? 1) as 1 | 2 | 3;
        audio.playPrestigeJobChange(charId, tier, save);
        if (tier === 3) this.showToast(`🎉 4차 전직! ${node?.name} — 전투 연출·사운드 강화`);
        else if (tier === 2) this.showToast(`⭐ 3차 전직! ${node?.name}`);
        else this.showToast(`⚔️ 2차 전직! ${node?.name} — 경로 확정 · 다른 성장 해금`);
      } else audio.playFail();
      saveGame(save);
      this.onRefresh();
      this.render();
      return;
    }
    if (result.goldSpent <= 0) { audio.playFail(); return; }
    if (result.learned) {
      const nodeTier = node?.branchTier ?? parseInt(nid.match(/_(\d+)$/)?.[1] ?? '1', 10);
      audio.playUpgrade(getGrowthSfxTier(save, charId, nodeTier));
      this.showToast(`✨ ${node?.name} 습득!`);
    } else {
      audio.playFail();
      this.showToast('골드·재료·레벨 조건을 확인하세요', false);
    }
    saveGame(save);
    this.onRefresh();
    this.render();
  }

  /** 서브탭 — live refresh(120ms)로 DOM이 갱신돼도 탭이 씹히지 않도록 위임 (pointerup + click) */
  private bindPanelDelegates() {
    let lastTapMs = 0;
    const onSubTab = (e: Event) => {
      const target = e.target as HTMLElement;
      if (this.panelPointerGuard.consumeScrollGesture(target, e)) return;
      const pe = e as PointerEvent;
      if (e.type === 'pointerup' && pe.pointerType === 'mouse' && pe.button !== 0) return;
      const now = Date.now();
      if (now - lastTapMs < 200) return;
      const townBtn = target.closest('[data-town-sub]') as HTMLElement | null;
      if (townBtn) {
        e.preventDefault();
        e.stopPropagation();
        const sub = townBtn.dataset.townSub as TownSub;
        if (!sub || sub === this.townSub) return;
        void audio.unlock();
        audio.playTab();
        this.hudSettingsOpen = false;
        if (this.townSub === 'leaderboard') clearLeaderboardPanelCache();
        this.townSub = sub;
        refreshBgm();
        lastTapMs = now;
        this.panelScrollTop = 0;
        this.render();
        return;
      }
      const subBtn = target.closest('.sub-tab[data-sub]') as HTMLElement | null;
      if (subBtn) {
        e.preventDefault();
        const id = subBtn.dataset.sub!;
        void audio.unlock();
        audio.playTab();
        if (this.tab === 'growth') {
          if (id === 'equipment' && findFirstPrestigeGateChar(this.getSave())) {
            audio.playFail();
            this.showToast('⚔️ 전직을 먼저 선택해야 장비·강화를 진행할 수 있습니다', false);
            return;
          }
          if (this.growthSub === id) return;
          this.growthSub = id as GrowthSub;
        } else if (this.tab === 'town' && this.townSub === 'endgame') {
          if (this.endgameSub === id) return;
          this.endgameSub = id as EndgameSub;
        } else {
          return;
        }
        lastTapMs = now;
        this.panelScrollTop = 0;
        this.render();
        return;
      }
      const campSubBtn = target.closest('.camp-sub-tab[data-camp-sub]') as HTMLButtonElement | null;
      if (campSubBtn && !campSubBtn.disabled) {
        e.preventDefault();
        const sub = campSubBtn.dataset.campSub as CampSub;
        if (!sub || sub === this.campSub) return;
        void audio.unlock();
        audio.playTab();
        this.campSub = sub;
        refreshBgm();
        lastTapMs = now;
        this.panelScrollTop = 0;
        this.render();
        return;
      }
      const shopSubBtn = target.closest('.shop-sub-tab[data-shop-sub]') as HTMLButtonElement | null;
      if (shopSubBtn && this.tab === 'town' && this.townSub === 'trade') {
        e.preventDefault();
        const sub = shopSubBtn.dataset.shopSub as ShopSub;
        if (!sub || sub === this.shopSub) return;
        void audio.unlock();
        audio.playTab();
        this.shopSub = sub;
        lastTapMs = now;
        this.panelScrollTop = 0;
        this.render();
      }
    };
    this.panelEl.addEventListener('pointerup', onSubTab);
    this.panelEl.addEventListener('click', onSubTab);
  }

  private bindNav() {
    bindTap(this.root.querySelector('#hud-settings-btn'), () => {
      void audio.unlock();
      audio.playTab();
      this.openSettingsPanel();
    });
    this.root.querySelectorAll('.nav-btn').forEach(btn => {
      bindTap(btn, () => {
        if ((btn as HTMLButtonElement).disabled) {
          audio.playFail();
          const id = (btn as HTMLElement).dataset.tab as TabId;
          const save = this.getSave();
          if (id === 'town') this.showToast(getWorldNavLockHint(save), false);
          return;
        }
        void audio.unlock();
        audio.playTab();
        this.hudSettingsOpen = false;
        this.tab = (btn as HTMLElement).dataset.tab as TabId;
        this.root.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render();
      });
    });
  }

  private syncNavActive() {
    this.root.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', (b as HTMLElement).dataset.tab === this.tab);
    });
  }

  /** 원정 중 탭 제한 + 차원 탭 초반 잠금 */
  private updateNavLock(adv: AdventureSystem) {
    const save = this.getSave();
    const expedition = adv.isInExpedition();
    const expeditionAllowed = new Set<TabId>(['party', 'growth', 'town']);
    const townLocked = !isWorldNavUnlocked(save);

    if (expedition && !expeditionAllowed.has(this.tab)) {
      this.tab = 'party';
    }
    if (townLocked && this.tab === 'town') {
      this.tab = 'party';
    }

    const townHint = getWorldNavLockHint(save);
    this.root.querySelectorAll('.nav-btn').forEach(btn => {
      const id = (btn as HTMLElement).dataset.tab as TabId;
      const expeditionLock = expedition && !expeditionAllowed.has(id);
      const townLock = townLocked && id === 'town';
      const locked = expeditionLock || townLock;
      (btn as HTMLButtonElement).disabled = locked;
      btn.classList.toggle('nav-locked', locked);
      btn.classList.toggle('nav-soon', townLock);
      if (townLock) {
        btn.setAttribute('title', townHint);
      } else {
        btn.removeAttribute('title');
      }
    });
    this.syncNavActive();
  }

  /** 전직 대기 캐릭터 — 성장 탭 강조 (설정·모험 탭은 막지 않음) */
  private enforcePrestigeGate(save: GameSave) {
    const gated = findFirstPrestigeGateChar(save);
    this.root.querySelectorAll('.nav-btn').forEach(btn => {
      const id = (btn as HTMLElement).dataset.tab;
      btn.classList.toggle('nav-prestige-alert', !!gated && id === 'growth');
    });
    if (!gated) return;
    if (this.tab === 'town' && this.townSub === 'endgame') {
      this.townSub = 'hub';
    }
    if (!isCharPrestigeGated(save.chars[this.upgradeCharId], this.upgradeCharId)) {
      this.upgradeCharId = gated;
    }
    this.syncNavActive();
  }

  switchTab(tab: TabId) {
    this.tab = tab;
    this.syncNavActive();
    this.render();
  }

  /** 원정 시작·귀환 시 하단 탭 상태 동기화 */
  refreshExpeditionNav() {
    const prev = this.tab;
    this.updateNavLock(this.getAdv());
    if (this.tab !== prev) this.render();
  }

  /** BGM 상황 판별용 패널 상태 */
  get worldSub(): WorldSub {
    if (this.tab === 'town' && this.townSub === 'hub' && this.getAdv().isLodgingResting) {
      return 'rest';
    }
    return PanelManager.townSubToWorld(this.townSub);
  }

  static townSubToWorld(sub: TownSub): WorldSub {
    const m: Record<TownSub, WorldSub> = {
      hub: 'shop',
      trade: 'shop',
      news: 'bulletin',
      camp: 'camp',
      records: 'codex',
      leaderboard: 'bulletin',
      dungeon: 'dungeon',
      endgame: 'dungeon',
      settings: 'shop',
    };
    return m[sub] ?? 'dungeon';
  }

  getBgmPanelState(): { worldSub: LodgingWorldSub; campSub: CampSub } {
    return { worldSub: this.worldSub, campSub: this.campSub };
  }

  /** 숙소 도착 시 마을 허브로 이동 */
  goToLodgingPanel(sub: 'trade' | 'news' | 'hub' = 'hub') {
    this.tab = 'town';
    this.townSub = sub;
    this.syncNavActive();
    this.render();
  }

  /** 원정·야탑 등반 시작 후 던전 전투 화면으로 전환 */
  enterDungeonRun() {
    this.tab = 'town';
    this.townSub = 'dungeon';
    this.onRefresh();
    this.syncNavActive();
    this.render();
  }

  navigateToAction(partial: Partial<NextPlayerAction> & { tab?: TabId }) {
    if (partial.tab) {
      this.tab = partial.tab;
      this.syncNavActive();
    }
    if (partial.tab === 'town' && partial.townSub) {
      this.townSub = partial.townSub as TownSub;
    }
    if (partial.tab === 'growth') {
      if (partial.growthSub) this.growthSub = partial.growthSub;
      if (partial.equipCharId) {
        this.equipCharId = partial.equipCharId;
        this.upgradeCharId = partial.equipCharId;
      }
      if (partial.equipCategory) this.equipCategory = partial.equipCategory;
    }
    void audio.unlock();
    audio.playTab();
    refreshBgm();
    this.panelScrollTop = 0;
    this.render();
    if (partial.equipCategory || partial.growthSub === 'equipment') {
      requestAnimationFrame(() => {
        this.panelEl.querySelector('#growth-equip-section')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }

  private renderDailyBonusBlock(save: GameSave): string {
    const bonus = getTodayDailyBonus();
    if (isDailyBonusActive(save)) {
      return `<div class="daily-bonus-card active">
        <div class="daily-bonus-main">
          <span class="daily-bonus-icon">${bonus.icon}</span>
          <div class="daily-bonus-body">
            <strong>오늘의 지하철</strong>
            <p class="hint">${bonus.detail} · 적용 중</p>
          </div>
        </div>
      </div>`;
    }
    return `<div class="daily-bonus-card">
      <div class="daily-bonus-main">
        <span class="daily-bonus-icon">${bonus.icon}</span>
        <div class="daily-bonus-body">
          <strong>오늘의 지하철</strong>
          <p class="hint">${bonus.detail}</p>
        </div>
      </div>
      <button type="button" class="btn-sm gold" id="claim-daily-bonus">수령</button>
    </div>`;
  }

  private bindDailyBonus() {
    /* #claim-daily-bonus — bindStablePanelActions 위임 */
  }

  private renderReadinessGrade(save: GameSave, regionId: number): string {
    if (!isLateGameFloor(regionId)) return '';
    const g = getReadinessGradeInfo(save, regionId);
    return `<div class="readiness-grade-card ${g.cssClass}">
      <div class="readiness-grade-head">
        <span>준비도</span>
        <strong>${g.label}</strong>
        <span class="readiness-grade-score">${g.score}%</span>
      </div>
      ${g.issues.length ? `<p class="hint">${g.issues.slice(0, 2).join(' · ')}</p>` : ''}
    </div>`;
  }

  /** 원정 중 층·파티·속파 진행 — 모험단 탭 통합 스트립 */
  private renderExpeditionRunStatus(save: GameSave, adv: AdventureSystem): string {
    const atLodging = adv.isAtLodging();
    const inRun = adv.isInExpedition();
    const returning = adv.isReturningToLodging;
    if (!inRun && !returning) return '';

    const runRegion = save.currentRegion;
    const regionDef = getRegionAvgDef(runRegion);
    const partyBadge = `${save.party.length}/${MAX_PARTY_SIZE} · DPS ${getPartyDps(save, regionDef)}`;
    const returnEta = returning ? adv.getReturnEtaSec() : 0;

    if (returning) {
      return `<div class="expedition-run-card lodging" data-run-strip>
        <header class="expedition-run-head">
          <div class="expedition-run-main">
            <span class="expedition-run-icon" aria-hidden="true">🏠</span>
            <div>
              <strong class="expedition-run-floor">숙소 귀환 중</strong>
              <p class="expedition-run-meta">약 ${returnEta > 0 ? `${returnEta}초` : '잠시'} 후 도착</p>
            </div>
          </div>
          <span class="expedition-run-party badge">${partyBadge}</span>
        </header>
      </div>`;
    }

    const codexPct = adv.getCodexPercent(runRegion);
    const curCodex = Math.floor(codexPct * 100);
    const reg = REGIONS.find(r => r.id === runRegion);
    const bossReady = isBossGateReady(save, runRegion, codexPct);
    const floorMeta = `도감 ${curCodex}% · DPS ${getPartyDps(save, regionDef)}${bossReady ? ' · 보스 가능' : ''}`;
    const expProgress = adv.getExpeditionProgress();
    const readiness = !atLodging ? this.renderReadinessGrade(save, runRegion) : '';

    const progressBlock = expProgress ? `
      <div class="expedition-run-progress">
        <div class="expedition-run-progress-head exp-progress-head">
          <strong>${expProgress.label}</strong>
          <span>${expProgress.sub}</span>
        </div>
        <div class="exp-progress-bar"><div class="exp-progress-fill" style="width:${Math.min(100, expProgress.pct)}%"></div></div>
      </div>` : '';

    return `<div class="expedition-run-card active" data-run-strip>
      <header class="expedition-run-head">
        <div class="expedition-run-main">
          <span class="expedition-run-icon" aria-hidden="true">⚔️</span>
          <div>
            <strong class="expedition-run-floor">${runRegion}층 ${reg?.name ?? ''}</strong>
            <p class="expedition-run-meta">${floorMeta}</p>
          </div>
        </div>
        <span class="expedition-run-party badge">모험단 ${partyBadge}</span>
      </header>
      ${progressBlock}
      ${readiness}
    </div>`;
  }

  /** 원정 중 층 이동 — 이동 중 진행바 + 자동 진층 토글만 */
  private renderFloorTravelControls(save: GameSave, adv: AdventureSystem): string {
    if (!adv.isInExpedition() || adv.isReturningToLodging) return '';

    const holdFloor = save.settings.holdFloorAdvance === true;
    const traveling = adv.isTraveling();
    const travelCheck = adv.canTravelToNextFloor();
    const destId = traveling ? (adv.travelToId || travelCheck.nextId) : travelCheck.nextId;
    const destReg = REGIONS.find(r => r.id === destId);
    const travelPct = traveling ? Math.round(adv.getTravelProgress() * 100) : 0;
    const travelRemain = traveling ? adv.getActiveTravelRemainSec() : 0;

    const progressBlock = traveling
      ? `<div class="floor-travel-progress">
          <div class="floor-travel-progress-head">
            <span>🗺️ ${destReg?.name ?? ''} 이동 중</span>
            <span>${travelRemain}초 · ${travelPct}%</span>
          </div>
          <div class="floor-travel-progress-bar"><div class="floor-travel-progress-fill" style="width:${travelPct}%"></div></div>
        </div>`
      : '';

    return `<div class="floor-travel-panel">
      <div class="floor-travel-panel-head">
        <span class="floor-travel-panel-title">층 이동</span>
        <span class="floor-travel-panel-floor">${save.currentRegion}층</span>
      </div>
      ${progressBlock}
      <button type="button" class="floor-travel-auto-btn ${holdFloor ? 'is-paused' : 'is-on'}" id="hold-floor-advance"
        aria-pressed="${holdFloor}" aria-label="보스 클리어 후 자동 층 이동">
        <span class="floor-travel-auto-track" aria-hidden="true"><span class="floor-travel-auto-knob"></span></span>
        <span class="floor-travel-auto-copy">
          <span class="floor-travel-auto-title">보스 클리어 후 자동 진층</span>
          <span class="floor-travel-auto-sub">${holdFloor ? '끔 · 현재 층에서 계속 사냥' : '켬 · 다음 층으로 자동 이동'}</span>
        </span>
      </button>
    </div>`;
  }

  private refreshPartyHpSpans(save: GameSave): boolean {
    let updated = false;
    for (const id of save.party) {
      const cur = getCharCurrentHp(save, id);
      const max = getCharMaxHp(save, id);
      const el = this.panelEl.querySelector(`[data-party-hp="${id}"]`);
      if (!el) continue;
      el.textContent = `❤ ${Math.floor(cur)}/${max}`;
      updated = true;
    }
    return updated;
  }

  /** 휴식 HP·파견 게이지·행동불능 타이머 등 DOM만 갱신하면 되는 패널 */
  needsLiveRefresh(): boolean {
    const adv = this.getAdv();
    if (adv.isCombatPerfLite() && (adv.phase === 'combat' || adv.phase === 'loot' || adv.phase === 'encounter')) {
      return false;
    }
    if (hasPartyIncapacitated(this.getSave())) return true;
    if (this.tab === 'party') {
      if (adv.isInExpedition() && !adv.isReturningToLodging) return true;
    }
    if (this.tab === 'town' && this.worldSub === 'dungeon') {
      if (adv.isInExpedition() && adv.isTraveling()) return true;
    }
    if (this.tab !== 'town') {
      return false;
    }
    if (adv.isAtLodging() && this.townSub === 'dungeon' && hasActiveShortcutDevelopment(this.getSave())) {
      return true;
    }
    if (adv.isAtLodging() && adv.isLodgingResting) return true;
    if (this.worldSub === 'rest' && adv.isLodgingResting) return true;
    if (this.tab === 'town' && this.townSub === 'camp') {
      const save = this.getSave();
      return productionCampBuildingIds().some(id => getBuildingProgress(save, id).level > 0);
    }
    return false;
  }

  /** 전체 render 없이 게이지·HP만 갱신. false면 full render 필요 */
  refreshLiveWidgets(): boolean {
    const save = this.getSave();
    const adv = this.getAdv();
    let updated = false;
    reconcileShortcutDevelopment(save);

    if (adv.isAtLodging() && this.tab === 'town' && this.townSub === 'dungeon' && !save.inExpedition
        && this.panelEl.querySelector('.depart-panel') && hasActiveShortcutDevelopment(save)) {
      return false;
    }

    if (hasPartyIncapacitated(save)) {
      for (const id of save.party) {
        const sec = getIncapRemainingSec(save, id);
        const el = this.panelEl.querySelector(`[data-incap-timer="${id}"]`);
        if (el) el.textContent = sec > 0 ? formatIncapHint(save, id) : '';
      }
      const banner = this.panelEl.querySelector('[data-party-incap-banner]');
      if (banner) banner.textContent = formatPartyIncapBanner(save);
      const expWarn = this.panelEl.querySelector('#party-expedition-incap');
      if (expWarn) {
        expWarn.textContent = `파티 전원 행동불능 · ${getPartyIncapRemainingSec(save)}초 후 재출발`;
      }
      updated = true;
      if (!hasPartyIncapacitated(save)) return false;
    }

    if (adv.isAtLodging() && adv.isLodgingResting) {
      if (isPartyFullyHealed(save)) return false;
      const hpPct = getPartyHealPercent(save);
      const fill = this.panelEl.querySelector('#town-rest-fill, .town-rest-fill') as HTMLElement | null;
      const pctEl = this.panelEl.querySelector('#town-rest-pct, .town-rest-card-head strong');
      if (fill) {
        fill.style.width = `${hpPct}%`;
        if (pctEl) pctEl.textContent = `${hpPct}%`;
        updated = true;
      } else if (this.panelEl.querySelector('[data-rest-char]')) {
        for (const id of save.party) {
          const hp = getCharCurrentHp(save, id);
          const maxHp = getCharMaxHp(save, id);
          const ratio = maxHp > 0 ? (hp / maxHp) * 100 : 0;
          const row = this.panelEl.querySelector(`[data-rest-char="${id}"]`);
          if (!row) return false;
          const rowFill = row.querySelector('.rest-hp-fill') as HTMLElement | null;
          const text = row.querySelector('.rest-hp-text');
          if (rowFill) rowFill.style.width = `${ratio.toFixed(1)}%`;
          if (text) text.textContent = `${Math.floor(hp)}/${maxHp}`;
          updated = true;
        }
        if (pctEl) pctEl.textContent = `${hpPct}%`;
      } else {
        updated = this.refreshPartyHpSpans(save) || updated;
        if (!updated) return true;
      }
    } else if (adv.isAtLodging()) {
      updated = this.refreshPartyHpSpans(save) || updated;
    }

    if (this.tab === 'town' && this.townSub === 'camp') {
      for (const building of CAMP_PRODUCTION_BUILDINGS) {
        const id = building.id;
        const prog = getBuildingProgress(save, id);
        if (prog.level <= 0) continue;
        const card = this.panelEl.querySelector(`[data-camp-building="${id}"]`);
        if (!card) continue;
        const paused = isBuildingPausedForMaterials(save, id);
        const pct = Math.round(prog.progress * 100);
        const fill = card.querySelector('.prod-camp-gauge-fill, .camp-gauge-fill') as HTMLElement | null;
        const pctEl = card.querySelector('.prod-camp-gauge-pct, .camp-gauge-pct');
        const timer = card.querySelector('.prod-camp-timer');
        const gauge = card.querySelector('.prod-camp-gauge, .camp-gauge-bar');
        if (fill) fill.style.width = `${paused ? 100 : pct}%`;
        if (pctEl) pctEl.textContent = paused ? '⏸ 재료 부족' : prog.ready ? '✨ 생산!' : `${pct}%`;
        if (timer && !paused) {
          const out = getBuildingOutputAmount(building, prog.level);
          const outputLabel = formatCampProduceOutput(building.produce, out);
          timer.textContent = prog.ready
            ? `지금 ${outputLabel} 생산 중`
            : `${formatIntervalSec(prog.remainingMs)} 후 · ${outputLabel}`;
        }
        gauge?.classList.toggle('ready', prog.ready && !paused);
        card.classList.toggle('prod-camp-card--ready', prog.ready && !paused);
        updated = true;
      }
    }

    if (this.tab === 'town' && this.worldSub === 'dungeon') {
      const adv = this.getAdv();
      if (adv.isInExpedition() && this.panelEl.querySelector('.floor-travel-panel')) {
        if (adv.isTraveling()) {
          const pct = Math.round(adv.getTravelProgress() * 100);
          const remain = adv.getActiveTravelRemainSec();
          const bar = this.panelEl.querySelector('.floor-travel-progress-fill') as HTMLElement | null;
          const head = this.panelEl.querySelector('.floor-travel-progress-head span:last-child');
          if (bar) bar.style.width = `${pct}%`;
          if (head) head.textContent = `${remain}초 · ${pct}%`;
        }
        return true;
      }
    }

    if (this.tab === 'party') {
      const adv = this.getAdv();
      if (adv.isInExpedition()) {
        const hasPanel = this.panelEl.querySelector('[data-run-strip]')
          || this.panelEl.querySelector('.floor-travel-panel');
        if (!hasPanel) return false;

        const progress = adv.getExpeditionProgress();
        if (progress) {
          const fill = this.panelEl.querySelector('.exp-progress-fill') as HTMLElement | null;
          const sub = this.panelEl.querySelector('.expedition-run-progress-head span:last-child, .exp-progress-head span:last-child');
          const label = this.panelEl.querySelector('.expedition-run-progress-head strong, .exp-progress-head strong');
          if (fill) fill.style.width = `${Math.min(100, progress.pct)}%`;
          if (sub) sub.textContent = progress.sub;
          if (label) label.textContent = progress.label;
        }

        if (adv.isTraveling()) {
          const pct = Math.round(adv.getTravelProgress() * 100);
          const remain = adv.getActiveTravelRemainSec();
          const bar = this.panelEl.querySelector('.floor-travel-progress-fill') as HTMLElement | null;
          const head = this.panelEl.querySelector('.floor-travel-progress-head span:last-child');
          if (bar) bar.style.width = `${pct}%`;
          if (head) head.textContent = `${remain}초 · ${pct}%`;
        }

        if (adv.isReturningToLodging) {
          const eta = adv.getReturnEtaSec();
          const meta = this.panelEl.querySelector('.expedition-run-card.lodging .expedition-run-meta');
          if (meta) meta.textContent = `약 ${eta > 0 ? `${eta}초` : '잠시'} 후 도착`;
        } else if (!adv.isTraveling()) {
          const meta = this.panelEl.querySelector('.expedition-run-card.active .expedition-run-meta');
          if (meta) {
            const runRegion = save.currentRegion;
            const codexPct = adv.getCodexPercent(runRegion);
            const curCodex = Math.floor(codexPct * 100);
            const bossReady = isBossGateReady(save, runRegion, codexPct);
            meta.textContent = `도감 ${curCodex}% · DPS ${getPartyDps(save, getRegionAvgDef(runRegion))}${bossReady ? ' · 보스 가능' : ''}`;
            const reg = REGIONS.find(r => r.id === runRegion);
            if (reg) {
              const floor = this.panelEl.querySelector('.expedition-run-floor');
              if (floor) floor.textContent = `${runRegion}층 ${reg.name}`;
            }
          }
        }
        return true;
      }
    }

    return updated;
  }

  updateGoldDisplay(gold: number) {
    const label = `🪙 ${gold.toLocaleString()}`;
    this.panelEl.querySelectorAll('.panel-header .badge').forEach(el => {
      if ((el.textContent ?? '').includes('🪙')) el.textContent = label;
    });
  }

  render() {
    const save = this.getSave();
    if (this.tab === 'town' && this.townSub === 'camp') {
      this.syncCampDetailOpenState();
    }
    this.enforcePrestigeGate(save);
    const renderKey = `${this.hudSettingsOpen}|${this.tab}|${this.townSub}|${this.growthSub}|${this.shopSub}|${this.campSub}|${this.endgameSub}|${this.collectionSub}`;
    if (renderKey !== this.panelRenderKey) {
      this.panelRenderKey = renderKey;
      this.panelScrollTop = 0;
    } else {
      this.panelScrollTop = this.panelEl.scrollTop;
    }
    const adv = this.getAdv();
    this.autoClaimSilentAchievements(save);
    this.updateNavLock(adv);
    if (this.hudSettingsOpen) {
      const back = `<button type="button" class="town-back-btn" data-hud-settings-close>
        <span class="town-back-icon">←</span> 돌아가기
      </button>`;
      renderSettingsPanel(this, save, back);
      requestAnimationFrame(() => {
        this.panelEl.scrollTop = this.panelScrollTop;
      });
      return;
    }
    switch (this.tab) {
      case 'party': this.renderParty(save); break;
      case 'growth': this.renderGrowth(save); break;
      case 'town': this.renderTown(save, adv); break;
    }
    requestAnimationFrame(() => {
      this.panelEl.scrollTop = this.panelScrollTop;
      flushPendingAccessoryCelebration(this.root, save, () => audio.playLegendaryDrop());
    });
  }

  subTabs(active: string, items: { id: string; label: string }[], lockId?: string): string {
    return htmlSubTabs(active, items, lockId);
  }

  /** @deprecated 내부용 — panelHtml.worldNavGrid 사용 */
  private worldNavGrid(active: string, items: { id: string; icon: string; label: string }[]): string {
    return htmlWorldNavGrid(active, items);
  }

  private lodgingSection(title: string, body: string): string {
    return htmlLodgingSection(title, body);
  }

  panelDetails(summary: string, body: string): string {
    return htmlPanelDetails(summary, body);
  }

  private campSubUnlockRegion(sub: CampSub): number {
    if (sub === 'dungeon') return 2;
    if (sub === 'town') return 5;
    if (sub === 'guild') return 8;
    return 1;
  }

  private isCampSubUnlocked(save: GameSave, sub: CampSub): boolean {
    return (save.maxRegion ?? 1) >= this.campSubUnlockRegion(sub);
  }

  private renderOnboardingBlock(save: GameSave, adv: AdventureSystem): string {
    const chapter = getGuideChapter(save);
    if (chapter === 0) return '';
    const quests = getOnboardingQuests(save, adv);
    const done = quests.filter(q => q.done).length;
    const canClaim = canClaimOnboardingReward(save, adv);
    const rewardGold = getChapterRewardGold(chapter);
    const rewardLabel = chapter === 1
      ? `🪙${rewardGold.toLocaleString()} + 무장 할인`
      : `🪙${rewardGold.toLocaleString()}`;
    const title = CHAPTER_TITLES[chapter - 1] ?? '가이드';
    const rows = quests.map(q =>
      `<li class="onboarding-quest ${q.done ? 'done' : ''}">
        <span class="onboarding-check">${q.done ? '✅' : '○'}</span>
        <div><strong>${q.label}</strong><p class="hint">${q.hint}</p></div>
      </li>`,
    ).join('');
    return `<div class="onboarding-panel">
      <div class="onboarding-head">
        <h4>🎯 ${title} <span class="hint">(${chapter}/${GUIDE_CHAPTER_COUNT})</span></h4>
        <span class="onboarding-progress">${done}/${quests.length}</span>
      </div>
      <ul class="onboarding-list">${rows}</ul>
      ${canClaim
        ? `<button class="btn-sm gold" id="claim-onboarding">보상 수령 · ${rewardLabel}</button>`
        : '<p class="hint">모든 단계를 완료하면 보상을 받을 수 있어요</p>'}
    </div>`;
  }

  private bindOnboardingClaim() {
    /* #claim-onboarding — bindStablePanelActions 위임 */
  }

  private autoClaimSilentAchievements(save: GameSave) {
    const msgs = autoClaimAchievements(save);
    if (msgs.length === 0) return;
    if (msgs.length === 1) {
      this.showToast(msgs[0]!, true);
    } else {
      const preview = msgs.slice(0, 2).join(' · ');
      const more = msgs.length > 2 ? ` 외 ${msgs.length - 2}건` : '';
      this.showToast(`🏆 업적 ${msgs.length}건 — ${preview}${more}`, true);
    }
    this.onRefresh();
  }

  openSettingsPanel() {
    this.hudSettingsOpen = true;
    this.render();
  }

  closeHudSettings() {
    this.hudSettingsOpen = false;
    this.render();
  }

  private renderGrowth(save: GameSave) {
    this.equipCharId = this.upgradeCharId;
    const gated = !!findFirstPrestigeGateChar(save);
    if (gated && this.growthSub === 'equipment') {
      this.growthSub = 'upgrade';
    }
    if (this.growthSub === 'augments') {
      this.renderAugmentsGrowthTab(save, gated);
      return;
    }
    if (this.growthSub === 'equipment') {
      this.renderEquipmentGrowthTab(save, gated);
      return;
    }
    this.renderUpgrade(save);
  }

  private renderAugmentsGrowthTab(save: GameSave, gated: boolean) {
    const tabs = renderGrowthSubTabs('augments', gated);
    const html = renderAugmentCollectionPanel(save);
    this.panelEl.innerHTML = `${tabs}${html}`;
    bindAugmentCollectionPanel(this.panelEl);
  }

  private renderEquipmentGrowthTab(save: GameSave, gated: boolean) {
    if (!save.owned.includes(this.equipCharId) && save.owned.length) {
      this.equipCharId = save.owned[0]!;
      this.upgradeCharId = this.equipCharId;
    }
    const charId = this.equipCharId;
    const tabs = renderGrowthSubTabs('equipment', gated);
    const charPicker = renderGrowthCharPicker(save, charId);
    const equipHtml = gated
      ? `<div class="prestige-gate-banner equip-gate-banner">
          <strong>⚔️ 전직 선택 필요</strong>
          <p>스킬 탭에서 전직을 완료하면 장비 제작·강화가 열립니다.</p>
        </div>`
      : this.buildEquipmentSectionHtml(save);
    this.panelEl.innerHTML = `${tabs}
      ${charPicker}
      ${equipHtml}`;
    paintGrowthCharPickers(this.panelEl);
    this.bindGrowthCharPicker();
    if (!gated) this.bindEquipmentActions();
  }

  private buildEquipmentSectionHtml(save: GameSave): string {
    if (!save.owned.includes(this.equipCharId) && save.owned.length) {
      this.equipCharId = save.owned[0]!;
    }
    const activeChar = this.equipCharId;
    const charDef = CHAR_MAP[activeChar];
    const eqStats = getEquipStats(save, activeChar);
    const cat = this.equipCategory;
    const catLabel = { weapon: '무기', armor: '방어구', accessory: '장신구' }[cat];
    const lines = getCategoryCraftLines(save, activeChar, cat);
    const equipGate = isCharGrowthBlocked(save, activeChar);
    const equipGateBanner = equipGate
      ? `<div class="prestige-gate-banner equip-gate-banner compact">
          <strong>⚔️ 전직 선택 필요</strong>
        </div>`
      : '';
    let body = '';
    if (cat === 'accessory') {
      body = this.renderAccessoryPanel(save, activeChar);
    } else if (!lines.length || (lines.length === 1 && !lines[0]!.next && !lines[0]!.allDone && lines[0]!.completed.length === 0)) {
      body = '<p class="empty">제작할 장비 없음</p>';
    } else {
      for (const lp of lines) body += this.renderEquipProgressLine(save, activeChar, lp);
    }
    return `<section class="growth-equip-section" id="growth-equip-section">
      ${equipGateBanner}
      <p class="equip-summary">${charDef?.name} · ATK+${eqStats.atk} DEF+${eqStats.def} HP+${eqStats.hp}</p>
      <div class="cat-tabs">
        <button class="cat-tab ${cat === 'weapon' ? 'active' : ''}" data-cat="weapon">무기</button>
        <button class="cat-tab ${cat === 'armor' ? 'active' : ''}" data-cat="armor">방어구</button>
        <button class="cat-tab ${cat === 'accessory' ? 'active' : ''}" data-cat="accessory">장신구</button>
      </div>
      <p class="hint equip-job-hint">${catLabel} — 강화 후 다음 등급 제작</p>
      <div class="equip-steps">${body}</div>
    </section>`;
  }

  private renderTown(save: GameSave, adv: AdventureSystem) {
    const atLodging = adv.isAtLodging();
    if (!atLodging && ['hub', 'trade', 'news', 'records', 'settings', 'leaderboard'].includes(this.townSub)) {
      this.townSub = 'dungeon';
    }
    if (atLodging && this.townSub === 'dungeon' && save.inExpedition) {
      /* 원정 중 던전 뷰 유지 */
    }

    const maxR = save.maxRegion ?? 1;
    const pinned = getPinnedShortcutFloor(save);
    if (pinned != null && pinned >= 1 && pinned <= maxR) {
      this.departFloorId = pinned;
    }
    if (this.departFloorId > maxR) this.departFloorId = maxR;
    if (this.departFloorId < 1) this.departFloorId = 1;

    const prefix = this.townSub === 'hub' ? '' : townBackButton();

    switch (this.townSub) {
      case 'hub':
        this.panelEl.innerHTML = renderTownHub(save, adv);
        break;
      case 'trade':
        this.renderLodgingShop(save, prefix, true);
        break;
      case 'news':
        this.renderLodgingBulletin(save, adv, prefix, true);
        break;
      case 'camp':
        this.renderMinimalCamp(save, prefix, adv);
        break;
      case 'records':
        this.renderRecords(save, prefix);
        break;
      case 'dungeon':
        this.renderDungeon(save, adv, prefix);
        break;
      case 'endgame':
        renderEndgamePanel(this, save, prefix);
        break;
      case 'settings':
        renderSettingsPanel(this, save, prefix);
        break;
      case 'leaderboard':
        renderLeaderboardPanel(this, save, prefix);
        break;
      default:
        this.townSub = 'hub';
        this.renderTown(save, adv);
    }
  }

  private renderMinimalCamp(save: GameSave, prefix: string, _adv: AdventureSystem) {
    tickCampProduction(save);
    const maxRegion = save.maxRegion ?? 1;
    this.panelEl.innerHTML = `${prefix}
      <div class="panel-header"><h3>🏕️ 캠프</h3></div>
      ${renderProductionCampPanel(save, maxRegion)}`;
    this.bindCampActions();
  }

  private renderRecords(save: GameSave, prefix: string) {
    this.renderCodex(save, '');
    const codexHtml = this.panelEl.innerHTML;
    this.panelEl.innerHTML = `${prefix}
      <div class="panel-header"><h3>📖 기록</h3></div>
      ${renderPanelGuide('수집 현황', '주요 업적과 전체 목록을 확인하세요. 미달성 업적은 ??? 로 표시됩니다.')}
      ${renderCompactBag(save)}
      ${renderMilestoneAchievements(this, save)}
      ${renderFullAchievementBrowser(save)}
      <details class="records-details open">
        <summary>몬스터 도감</summary>
        ${codexHtml}
      </details>`;
  }


  private bindStartExpedition() {
    /* #start-expedition · #party-start-expedition — bindStablePanelActions 위임 */
  }

  private renderParty(save: GameSave) {
    const regionDef = getRegionAvgDef(save.currentRegion);
    const adv = this.getAdv();
    const host = {
      panelDetails: (s: string, b: string) => this.panelDetails(s, b),
      dpsPanelOpen: this.dpsPanelOpen,
      renderExpeditionRunStatus: (s: GameSave, a: AdventureSystem) => this.renderExpeditionRunStatus(s, a),
      renderFloorTravelControls: (s: GameSave, a: AdventureSystem) => this.renderFloorTravelControls(s, a),
      renderFormationBlock: (s: GameSave) => this.renderFormationBlock(s),
    };
    this.panelEl.innerHTML = `${renderPartyPanel(host, save, adv)}`;
    this.bindStartExpedition();
    this.bindPartyActions(regionDef);
    paintFormationPortraits(this.panelEl);
    paintPartyMemberPortraits(this.panelEl);
  }

  private renderFormationBlock(save: GameSave): string {
    reconcileFormation(save);
    const formation = save.partyFormation ?? save.party;
    const frontName = CHAR_MAP[formation[0]!]?.name ?? '-';
    const open = this.formationPanelOpen;

    const cards = formation.map((id, i) => {
      const c = CHAR_MAP[id];
      if (!c) return '';
      const role = getFormationRoleLabel(i, formation.length);
      const roleClass = i === 0 ? 'front' : i === formation.length - 1 ? 'back' : 'mid';
      const st = save.chars[id];
      const syn = formatSynergySummary(save, id);
      return `
        <div class="formation-card formation-card--${roleClass}">
          <div class="formation-card-rank">${i + 1}</div>
          <div class="formation-portrait-wrap" style="--char-color:${c.color};--char-accent:${c.accent}">
            <canvas class="formation-portrait" data-char-id="${id}" aria-label="${c.name}"></canvas>
          </div>
          <div class="formation-card-main">
            <div class="formation-card-top">
              <strong class="formation-name" style="color:${c.color}">${c.name}
                <span class="formation-lv">Lv.${st?.level ?? 1}</span></strong>
              <span class="formation-role-badge formation-role-badge--${roleClass}">${role}</span>
            </div>
            <span class="formation-job">${c.jobLabel} · ${getCharTraitLabels(id).join(' ')}</span>
            <p class="formation-syn">${syn}</p>
          </div>
          <div class="formation-card-actions">
            <button class="formation-move-btn" data-form-front="${id}" type="button" title="선봉으로" ${i === 0 ? 'disabled' : ''}>▲</button>
            <button class="formation-move-btn" data-form-back="${id}" type="button" title="후방으로" ${i === formation.length - 1 ? 'disabled' : ''}>▼</button>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="formation-block ${open ? 'open' : 'closed'}">
        <button type="button" class="formation-toggle" id="formation-toggle" aria-expanded="${open}">
          <span class="formation-toggle-left">
            <span class="formation-toggle-icon">🛡️</span>
            <span class="formation-toggle-title">전투 대열</span>
          </span>
          <span class="formation-toggle-meta">선봉 <strong>${frontName}</strong></span>
          <span class="formation-arrow">${open ? '▼' : '▶'}</span>
        </button>
        <div class="formation-body">
          <div class="formation-lane-head">
            <span class="lane-pill lane-pill--enemy">👹 적</span>
            <span class="lane-connector"></span>
            <span class="lane-pill lane-pill--front">선봉</span>
            <span class="lane-connector"></span>
            <span class="lane-pill lane-pill--mid">중열</span>
            <span class="lane-connector"></span>
            <span class="lane-pill lane-pill--back">후방</span>
          </div>
          <p class="formation-summary">${getFormationLabel(save)}</p>
          <div class="formation-cards">${cards}</div>
          <p class="formation-foot">선봉에 가까울수록 몬스터 어그로↑ · 후방은 상대적으로 안전</p>
        </div>
      </div>`;
  }

  private bindPartyActions(_regionDef: number) {
    /* data-action · data-cook · formation — bindStablePanelActions 위임 */
  }

  private renderUpgrade(save: GameSave) {
    if (!save.owned.includes(this.upgradeCharId)) {
      this.upgradeCharId = save.owned[0] ?? 'mujang';
    }
    const charId = this.upgradeCharId;
    const def = CHAR_MAP[charId]!;
    const st = save.chars[charId];
    const stats = computeCharStats(def, st, save);
    const nodes = getCharGrowth(charId);
    const trees = getCharGrowthTrees(charId);
    const unlocked = st.unlockedNodes.length;
    const total = nodes.length;
    const expNeed = expToLevel(st.level);
    const expPct = Math.min(100, Math.floor(st.exp / expNeed * 100));
    const branchKey = st.growthBranches?.[`${charId}_job`] ?? null;
    const pathIdx = branchKey === 'b' ? 1 : 0;
    const prestigePaths = PRESTIGE_PATHS[charId] ?? [];
    const ownedPrestigeNames = getOwnedPrestigePathNames(save, charId);
    const prestigePath = ownedPrestigeNames.length
      ? ownedPrestigeNames
      : (prestigePaths[pathIdx] ?? prestigePaths[0] ?? []);
    const rosterBonus = computeRosterBonuses(save.owned);
    const charPassive = ROSTER_PASSIVE_MAP[charId];
    const prestigeMilestone = getPrestigeMilestoneInfo(st, charId);
    const agiLv = getAgilityLevel(st);
    const agiBonus = getAgilitySpdBonus(agiLv);
    const threatLv = getThreatLevel(st);
    const threatMult = getTankThreatMult(st);
    const isTank = isTankChar(charId);
    const agiCdMs = getAgilityCooldownRemainingMs(st);
    const agiCanUp = canUpgradeAgility(save, charId);
    const agiMaxed = agiLv >= AGILITY_MAX;
    const threatMaxed = !isTank || threatLv >= THREAT_MAX;
    const prestigeGate = getPrestigeGate(st, charId);
    const rebirthHint = formatRebirthMarkHint(charId, save);
    const unified = getUnifiedGrowthAction(save, charId);
    const unifiedCost = unified.costGold > 0 ? ` · 🪙${unified.costGold.toLocaleString()}` : '';
    const spotlightNode = findSpotlightSkill(save, charId);
    let unifiedShortage = '';
    if (!unified.canDo) {
      if (unified.kind === 'skill' && unified.nodeId) {
        const growNode = nodes.find(x => x.id === unified.nodeId);
        if (growNode) unifiedShortage = this.formatCostShortage(save, growNode.cost, growNode.materials);
      } else if (unified.kind === 'level') {
        unifiedShortage = this.formatCostShortage(save, goldLevelUpCost(st.level));
      }
    }
    const gateBanner = prestigeGate
      ? `<div class="prestige-gate-banner">
          <strong>⚔️ ${prestigeGate.milestone.label} — 지금 선택 필수</strong>
          <p>${formatPrestigeGateBanner(prestigeGate)}</p>
          <p class="hint">무료·확정 · 완료 전 일반 성장 잠금</p>
        </div>`
      : '';
    const baseSpd = formatStatNum(stats.atkSpd - agiBonus);

    const anyGate = !!findFirstPrestigeGateChar(save);
    const growthTabs = renderGrowthSubTabs('upgrade', anyGate);
    const rec = getGrowthRecommendation(save);
    const recBtn = rec
      ? `<div class="recommend-growth-box">
          <button class="btn-sm gold" id="recommend-growth-btn">💡 추천: ${rec.label}</button>
          <p class="hint">${rec.detail}</p>
        </div>`
      : '';
    let html = `${growthTabs}
      ${renderGrowthCharPicker(save, charId)}
      ${gateBanner}
      ${recBtn}
      ${spotlightNode
        ? renderSkillSpotlight(
          save, charId, spotlightNode,
          m => this.formatMats(m),
          (g, m) => this.formatCostShortage(save, g, m),
        )
        : ''}
      <div class="upgrade-hero ${prestigeGate ? 'upgrade-hero-gated' : ''}" style="--c:${def.color}">
        ${rebirthHint ? `<p class="hint rebirth-mark-hint">${rebirthHint}</p>` : ''}
        <div class="exp-bar"><div class="exp-fill" style="width:${expPct}%"></div></div>
        <p class="exp-text">EXP ${st.exp} / ${expNeed}</p>
        <div class="stat-grid">
          <div><b>${stats.atk}</b><small>공격</small></div>
          <div><b>${stats.def}</b><small>방어</small></div>
          <div><b>${stats.hp}</b><small>체력</small></div>
          <div><b>${formatStatNum(stats.atkSpd)}</b><small>공속</small></div>
          <div><b>${Math.round(stats.critRate * 100)}%</b><small>치명</small></div>
          <div><b>${unlocked}/${total}</b><small>스킬</small></div>
        </div>
        <button class="btn-primary unified-growth-btn" id="unified-growth-btn" type="button"
          ${unified.canDo ? '' : 'disabled'}>
          성장 찍기 — ${unified.title}${unifiedCost}
        </button>
        <p class="hint unified-growth-detail">${unified.detail}</p>
        ${unifiedShortage}
        ${prestigeGate
          ? `<p class="hint warn prestige-gate-lock">🔒 전직 선택이 우선입니다</p>`
          : ''}
        ${prestigeMilestone && !prestigeMilestone.allDone && st.level >= PRESTIGE_TEASER_LEVEL - 3
          ? `<div class="prestige-milestone-box ${prestigeMilestone.ready ? 'ready' : ''}">
              <div class="prestige-milestone-head">
                <span>⚔️ ${prestigeMilestone.label}</span>
                <span>Lv.${prestigeMilestone.reqLevel}</span>
              </div>
              <div class="prestige-milestone-bar"><div class="prestige-milestone-fill" style="width:${prestigeMilestone.progressPct}%"></div></div>
              <p class="hint">${prestigeMilestone.ready
                ? '✨ 전직 습득 가능! 아래에서 확인하세요'
                : `다음 전직까지 <b>${prestigeMilestone.levelsAway}레벨</b> · Lv.${PRESTIGE_TIER_LEVELS[0]}/${PRESTIGE_TIER_LEVELS[1]}/${PRESTIGE_TIER_LEVELS[2]}`}</p>
            </div>`
          : prestigeMilestone?.allDone
            ? '<p class="hint prestige-done-hint">🏆 4차 전직 완료 — 최종 성장 달성</p>'
            : ''}
      </div>
      <div class="agility-box ${isAgilityUnlocked(save) ? '' : 'locked'} ${prestigeGate ? 'growth-blocked' : ''}">
        <div class="agility-head">
          <h4>🏃 민첩성${isTank ? ' · 🛡️ 어그로' : ''}</h4>
          <span class="agility-lv">민첩 Lv.${agiLv}/${AGILITY_MAX}${isTank ? ` · 어그로 Lv.${threatLv}/${THREAT_MAX}` : ''}</span>
        </div>
        ${isAgilityUnlocked(save)
          ? prestigeGate
            ? '<p class="hint warn">🔒 전직 완료 후 민첩 강화 가능</p>'
            : `<p class="agility-desc">기본 공속 ${baseSpd} → <b>${formatStatNum(stats.atkSpd)}</b>/초 (민첩 +${formatStatNum(agiBonus)})</p>
            ${isTank
              ? `<p class="agility-desc threat-desc">탱커 위협 배율 <b>×${(TANK_DAMAGE_THREAT_MULT * threatMult).toFixed(0)}</b> (기본 ×${TANK_DAMAGE_THREAT_MULT} + 어그로 ${Math.round(THREAT_MULT_PER_LEVEL * 100)}%/Lv)</p>`
              : ''}
            <div class="agility-bar"><div class="agility-fill" style="width:${Math.floor(agiLv / AGILITY_MAX * 100)}%"></div></div>
            ${isTank
              ? `<div class="agility-bar threat-bar"><div class="agility-fill threat-fill" style="width:${Math.floor(threatLv / THREAT_MAX * 100)}%"></div></div>`
              : ''}
            ${agiMaxed && threatMaxed
              ? '<p class="hint">민첩·어그로 최대 달성</p>'
              : agiMaxed && !threatMaxed
                ? '<p class="hint">민첩 최대 · 어그로만 추가 성장 가능</p>'
                : agiCdMs > 0
                  ? `<p class="hint warn">⏳ ${Math.ceil(agiCdMs / 1000)}초 후 다시 강화 (1분 쿨)</p>`
                  : agiCanUp
                    ? '<p class="hint">다음 민첩 강화는 위 「성장 찍기」에서 진행</p>'
                    : '<p class="hint">민첩 강화 대기 중</p>'}`
          : `<p class="hint warn">🔒 ${AGILITY_UNLOCK_REGION}층 해금 후 강화 가능 (현재 ${save.maxRegion ?? 1}층)</p>`}
      </div>`;

    if (charPassive) {
      html += `<div class="roster-passive-box">
        <h4>📚 로스터 패시브 · ${charPassive.name}</h4>
        <p class="hint">보유 시 상시: ${charPassive.ownedDesc}</p>
        ${charPassive.partyProc
          ? `<p class="hint proc-hint">파티 출전 시 ${Math.round(charPassive.partyProc.chance * 100)}% — ${charPassive.partyProc.desc}</p>`
          : ''}
        <p class="hint roster-total">전체 보유 ${rosterBonus.ownedCount}명 · 누적 버프 적용 중</p>
      </div>`;
    }

    const combatSkills = getActiveSkills(st.unlockedNodes);
    if (combatSkills.length > 0) {
      const atkEls = [...new Set(
        combatSkills
          .filter(s => s.element !== 'none' && (s.skillKind === 'damage' || !s.skillKind))
          .map(s => s.element),
      )];
      const myHints = atkEls
        .map(el => formatAttackElementHint(el))
        .filter(Boolean)
        .map(h => `<span class="ew-mine">${h}</span>`)
        .join('');
      html += `<div class="skill-proc-box">
        <h4>⚡ 전투 스킬 (공격 시 발동)</h4>
        <p class="hint skill-proc-list">${combatSkills.map(s => formatSkillProcHtml(s)).join(' · ')}</p>
        ${myHints ? `<p class="element-wheel-tip element-wheel-mine">${myHints}</p>` : ''}
        <p class="element-wheel-tip">${formatElementWheelHtml()}</p>
      </div>`;
    }

    html += `<p class="hint growth-hint">성장 찍기: 스킬 → 민첩 · 레벨업은 골드 버튼 · 전직은 확정 습득</p>`;

    for (const tree of trees) {
      const lp = getGrowthLineProgress(st, tree, nodes);
      if (prestigeGate && !lp.isBranch) {
        html += `<div class="growth-line growth-line-gated">
          <div class="growth-line-head"><h4>${tree}</h4><span class="growth-step locked-tag">🔒</span></div>
          <p class="hint warn">전직 완료 후 스킬 습득 가능</p></div>`;
        continue;
      }

      if (lp.isBranch) {
        if (lp.branchChoices && lp.branchChoices.length > 0) {
          html += `<div class="prestige-branch-action">
            <div class="prestige-fork-banner">⚔️ 2차 전직 — 경로를 선택하세요 (확정 · 무료)</div>
            <div class="branch-fork branch-fork-gate prestige-fork-grid">`;
          for (const opt of lp.branchChoices) {
            const n = opt.node;
            const locked = isNodeLocked(st, n);
            html += `<div class="skill-node branch-option branch-option-gate prestige-path-card ${locked ? 'locked' : 'available'}">
              <div class="prestige-path-card-badge">경로 ${opt.pathLabel}</div>
              <div class="node-icon">${locked ? '🔒' : '⚔️'}</div>
              <div class="node-body">
                <strong>${opt.pathLabel}</strong>
                <p class="node-desc">${n.name} · ${n.desc}</p>
                <p class="node-bonus">${getNodeBonusWithSkill(n)}</p>
                <p class="node-req">${formatPrestigeLevelReq(n, st)}</p>
              </div>
              <div class="node-action">
                ${locked
                  ? `<span class="locked-tag">Lv.${n.reqLevel}</span>`
                  : `<button type="button" class="btn-sm gold prestige-claim-btn" data-node="${n.id}">⚔️ ${opt.pathLabel} 선택</button>`}
              </div>
            </div>`;
          }
          html += '</div></div>';
        } else if (lp.next?.branchGroup) {
          const n = lp.next;
          const locked = isNodeLocked(st, n);
          const tierLabel = n.branchTier === 2 ? '3차' : n.branchTier === 3 ? '4차' : '';
          html += `<div class="prestige-branch-action">
            <div class="skill-node ${locked ? 'locked' : 'available'} prestige-gate-node ${prestigeGate ? 'prestige-gate-node-active' : ''}">
              <div class="node-icon">${locked ? '🔒' : '⚔️'}</div>
              <div class="node-body">
                <strong>${tierLabel ? `${tierLabel} · ` : ''}${n.name}</strong>
                <p class="node-desc">${n.desc}</p>
                <p class="node-bonus">${getNodeBonusWithSkill(n)}</p>
                <p class="node-req">${formatPrestigeLevelReq(n, st)}</p>
              </div>
              <div class="node-action">
                ${locked
                  ? `<span class="locked-tag">Lv.${n.reqLevel}</span>`
                  : `<button type="button" class="btn-sm gold prestige-claim-btn" data-node="${n.id}">⚔️ ${tierLabel || '전직'} 확정 습득</button>`}
              </div>
            </div>
          </div>`;
        }
        continue;
      }

      const doneChain = lp.completed.map(c => c.name).join(' → ');
      html += `<div class="growth-line">
        <div class="growth-line-head">
          <h4>${tree}</h4>
          <span class="growth-step">${lp.completed.length}/${lp.total}</span>
        </div>
        ${doneChain ? `<p class="growth-done">✅ ${doneChain}</p>` : ''}`;

      if (lp.allDone) {
        html += '<p class="growth-master">🏆 마스터</p>';
      } else if (lp.next && !lp.next.branchGroup) {
        /* 일반 스킬 — 습득 가능 시 상단 「다음 스킬」 카드만 사용 */
      }
      html += '</div>';
    }

    html += renderPrestigeShowcase(
      charId, save, prestigePath, branchKey,
      !!(prestigeMilestone?.ready || prestigeGate),
      this.prestigeTreeOpen,
    );
    html += renderPrestigeTreeFooter(charId, save, this.prestigeTreeOpen);

    this.panelEl.innerHTML = html;
    paintGrowthCharPickers(this.panelEl);
    this.bindUpgradeActions(charId);
  }

  private bindGrowthCharPicker() {
    /* growth-char-pick — bindStablePanelActions 위임 */
  }

  private bindUpgradeActions(_charId: string) {
    /* #recommend-growth-btn · #unified-growth-btn — bindStablePanelActions 위임 */
  }

  private handleRecommendGrowth() {
    const save = this.getSave();
    const before = getGrowthRecommendation(save);
    if (!before) { audio.playFail(); return; }
    if (before.kind === 'enhance') {
      this.upgradeCharId = before.charId;
      this.equipCharId = before.charId;
      this.growthSub = 'equipment';
      if (before.equipCategory) this.equipCategory = before.equipCategory;
      this.render();
      this.showToast(`⚔️ ${before.label} — 아래에서 강화하세요`);
      return;
    }
    const res = applyGrowthRecommendation(save);
    if (res.ok) {
      const node = res.rec?.nodeId
        ? getCharGrowth(res.rec.charId).find(n => n.id === res.rec!.nodeId)
        : null;
      if (node?.branchGroup) {
        audio.playPrestigeJobChange(res.rec!.charId, (node.branchTier ?? 1) as 1 | 2 | 3, save);
      } else {
        audio.playUpgrade();
      }
      saveGame(save);
      this.onRefresh();
      this.showToast(res.message);
      this.render();
    } else {
      audio.playFail();
      this.showToast(res.message, false);
    }
  }

  private handleUnifiedGrowth() {
    const save = this.getSave();
    const result = applyUnifiedGrowth(save, this.upgradeCharId);
    if (result.ok) {
      if (result.kind === 'prestige') {
        audio.playPrestigeJobChange(this.upgradeCharId, 1, save);
      } else if (result.kind === 'skill') {
        audio.playUpgrade(getGrowthSfxTier(save, this.upgradeCharId, 2));
      } else {
        audio.playUpgrade();
      }
      saveGame(save);
      this.onRefresh();
      this.showToast(result.message);
      this.render();
    } else {
      audio.playFail();
      this.showToast(result.message, false);
    }
  }

  private formatMats(mats: Record<string, number>) {
    return Object.entries(mats)
      .map(([k, n]) => `${MATERIAL_LABELS[k] ?? k}×${n}`)
      .join(' · ');
  }

  private formatCostShortage(save: GameSave, goldNeed?: number, mats?: Record<string, number>): string {
    return formatShortageHtml(save, goldNeed, mats);
  }

  private renderEquipEnhanceBlock(
    save: GameSave, item: NonNullable<ReturnType<typeof getItemForCharSlot>>,
    lineLabel: string,
  ): string {
    const r = RECIPE_MAP[item.id]!;
    const maxLv = getMaxEnhanceForGrade(item.grade);
    const cost = enhanceCost(save, item.level, item.grade);
    const growthBlocked = isCharGrowthBlocked(save, this.equipCharId);
    const ok = !growthBlocked && canEnhance(save, item.uid);
    const pct = item.level >= maxLv ? 0 : Math.round(
      (enhanceBonus(item.level + 1, item.grade) / Math.max(0.01, enhanceBonus(item.level, item.grade)) - 1) * 100,
    );
    const statLine = formatEnhanceStatDelta(r, item.level);
    const milestone = item.level < maxLv ? getEnhanceMilestoneLabel(item.level + 1, item.grade) : null;
    const curStats = getEnhanceStatPreview(r, item.level);
    const awakenLv = item.awakenLevel ?? 0;
    const awCost = awakenCost(awakenLv);
    const canAw = canAwaken(save, item.uid);
    const enhanceShortage = !growthBlocked && !ok
      ? this.formatCostShortage(save, cost.gold, cost.mats)
      : '';
    const awakenShortage = !canAw && isAwakenableGrade(item.grade) && awakenLv < 3
      ? this.formatCostShortage(save, awCost.gold, awCost.mats)
      : '';
    const awakenStatPct = awakenLv * 8;
    const awakenBlock = isAwakenableGrade(item.grade) && awakenLv < 3 ? `
        <p class="recipe-stat">★각성 ${awakenLv}/3 — 장비 스탯 +${awakenStatPct}% · 세트 시너지 +${awakenLv * 5}%/★</p>
        ${item.grade === 'ur' && awakenLv < 3 ? '<p class="hint">★3 각성 후 초월(다음 등급) 제작 해금</p>' : ''}
        <p class="recipe-cost">🪙${awCost.gold.toLocaleString()} · ${this.formatMats(awCost.mats)}</p>
        ${awakenShortage}
        <button class="btn-sm gold" data-awaken="${item.uid}" ${canAw ? '' : 'disabled'}>★ 각성</button>` : '';
    return `
      <div class="equip-section equip-section-current">
        <p class="equip-section-label">착용 중 · ${lineLabel}</p>
        <div class="step-head">
          <span class="step-badge">+${item.level}${awakenLv ? ` ★${awakenLv}` : ''}</span>
          <strong style="color:${GRADE_COLOR[item.grade]}">${r.name}</strong>
          <span class="grade-tag" style="color:${GRADE_COLOR[item.grade]}">${GRADE_LABEL[item.grade]}</span>
        </div>
        <div class="enhance-bar"><div class="enhance-fill" style="width:${Math.round(item.level / maxLv * 100)}%"></div></div>
        <p class="recipe-stat enhance-now">현재 ATK+${curStats.atk} DEF+${curStats.def} HP+${curStats.hp} · +${item.level}/${maxLv}</p>
        ${item.level >= maxLv
          ? '<p class="hint enhance-max">💥 MAX 강화 달성</p>'
          : `<p class="recipe-stat enhance-next">${statLine} <strong>(+${pct}%)</strong></p>
             ${milestone ? `<p class="hint enhance-milestone">${milestone}</p>` : ''}
             ${growthBlocked
               ? '<p class="hint warn">🔒 전직 완료 후 강화 가능</p>'
               : `<p class="recipe-cost">🪙${cost.gold.toLocaleString()} · ${this.formatMats(cost.mats)}</p>
             ${enhanceShortage}
             <button class="btn-sm gold" data-enhance="${item.uid}" ${ok ? '' : 'disabled'}>강화</button>`}`}
        ${awakenBlock}
      </div>`;
  }

  private renderEquipCraftBlock(
    save: GameSave, charId: string, lp: ReturnType<typeof getCategoryCraftLines>[0],
    opts?: { compact?: boolean },
  ): string {
    if (!lp.next) return '';
    const r = lp.next;
    const chain = findRecipeLine(charId, r.id);
    const blockReason = chain ? getCraftBlockReason(save, charId, chain, r.id) : null;
    const prevNeed = chain
      ? getMaxEnhanceForRecipeId(chain[Math.max(0, chain.indexOf(r.id) - 1)] ?? '')
      : 3;
    const ok = canCraft(save, r.id, charId);
    const matStr = this.formatMats(r.materials);
    const doneStr = lp.completed.length
      ? `<p class="step-done">✅ ${lp.completed.map(c => c.name).join(' → ')}</p>` : '';
    const canCraftNow = !blockReason;
    const craftShortage = canCraftNow && !ok
      ? this.formatCostShortage(save, r.craftGold, r.materials)
      : '';
    return `
      <div class="equip-section equip-section-next ${canCraftNow ? 'ready' : 'locked'}">
        <p class="equip-section-label">${opts?.compact ? '다음 등급' : '제작'} · ${lp.step}/${lp.total}</p>
        <div class="step-head">
          <strong style="color:${GRADE_COLOR[r.grade]}">${r.name}</strong>
          <span class="grade-tag" style="color:${GRADE_COLOR[r.grade]}">${GRADE_LABEL[r.grade]}</span>
        </div>
        ${doneStr}
        <p class="recipe-stat">${formatRecipeStatLine(r)}</p>
        <p class="recipe-cost">🪙${r.craftGold.toLocaleString()} · ${matStr}</p>
        ${craftShortage}
        ${r.craftRate && r.craftRate < 1 && canCraftNow
          ? `<p class="hint craft-rate">제작 성공률 ${Math.round(r.craftRate * 100)}% · 실패 시 재료 유지</p>`
          : ''}
        ${blockReason
          ? `<p class="hint warn">🔒 ${blockReason}</p>`
          : lp.step > 1 && !lp.completed.length
            ? `<p class="hint">이전 장비 +${prevNeed} 강화 필요</p>`
            : ''}
        <button class="btn-sm gold" data-craft="${r.id}" ${ok && canCraftNow ? '' : 'disabled'}>
          ${canCraftNow ? '제작 후 자동 장착' : `+${prevNeed} 강화 후 제작`}
        </button>
      </div>`;
  }

  /** 제작·강화를 한 카드에서 진행 */
  private renderEquipProgressLine(save: GameSave, charId: string, lp: ReturnType<typeof getCategoryCraftLines>[0]) {
    if (lp.allDone) {
      return `<div class="equip-step done">
        <span class="step-badge">완료</span>
        <strong>${lp.lineLabel}</strong>
        <p class="hint">${lp.completed.map(c => c.name).join(' → ')}</p>
      </div>`;
    }

    const item = getItemForCharSlot(save, charId, lp.slot);
    const borderColor = item
      ? GRADE_COLOR[RECIPE_MAP[item.id]?.grade ?? 'f']
      : (lp.next ? GRADE_COLOR[lp.next.grade] : '#666');

    let body = '';
    if (item) {
      body += this.renderEquipEnhanceBlock(save, item, lp.lineLabel);
      if (lp.next) body += this.renderEquipCraftBlock(save, charId, lp, { compact: true });
    } else if (lp.next) {
      body += this.renderEquipCraftBlock(save, charId, lp);
    } else {
      return `<div class="equip-step empty-step">
        <strong>${lp.lineLabel}</strong>
        <p class="hint">장비 없음</p>
      </div>`;
    }

    return `<div class="equip-step" style="border-color:${borderColor}">
      <div class="step-head">
        <strong>${lp.lineLabel}</strong>
        ${item
          ? `<span class="step-badge">${lp.step - 1}/${lp.total}</span>`
          : `<span class="step-badge">${lp.step}/${lp.total}</span>`}
      </div>
      ${body}
    </div>`;
  }

  private renderAccessoryPanel(save: GameSave, charId: string): string {
    return renderAccessoryBagPanel(
      save,
      charId,
      this.accessoryShowAll,
      m => this.formatMats(m),
      (s, gold, mats) => this.formatCostShortage(s, gold, mats),
    );
  }

  private renderEquipment(save: GameSave, embedded = false) {
    if (!save.owned.includes(this.equipCharId) && save.owned.length) {
      this.equipCharId = save.owned[0]!;
    }
    const activeChar = this.equipCharId;
    const charDef = CHAR_MAP[activeChar];
    const eqStats = getEquipStats(save, activeChar);
    const cat = this.equipCategory;
    const catLabel = { weapon: '무기', armor: '방어구', accessory: '장신구' }[cat];
    const lines = getCategoryCraftLines(save, activeChar, cat);

    const equipGate = isCharGrowthBlocked(save, activeChar);
    const anyGate = !!findFirstPrestigeGateChar(save);
    const growthNav = embedded ? this.subTabs('equipment', [
      { id: 'upgrade', label: '⬆️ 강화·스킬' },
      { id: 'equipment', label: anyGate ? '🔒 장비' : '⚔️ 장비' },
    ], anyGate ? 'equipment' : undefined) : '';
    const equipGateBanner = equipGate
      ? `<div class="prestige-gate-banner equip-gate-banner">
          <strong>⚔️ 전직 선택 필요</strong>
          <p>강화·스킬 탭에서 전직을 완료하면 장비 제작·강화가 다시 가능합니다.</p>
        </div>`
      : '';
    let html = `${growthNav}
      ${equipGateBanner}
      <div class="panel-header"><h3>⚔️ 장비 공방</h3><span class="badge">🪙 ${save.gold.toLocaleString()}</span></div>
      <div class="char-tabs">${save.owned.map(id =>
        `<button class="char-tab ${id === activeChar ? 'active' : ''}" data-echar="${id}">${CHAR_MAP[id]?.name}</button>`,
      ).join('')}</div>
      <p class="equip-summary">${charDef?.name} · ATK+${eqStats.atk} DEF+${eqStats.def} HP+${eqStats.hp}</p>
      <div class="cat-tabs">
        <button class="cat-tab ${cat === 'weapon' ? 'active' : ''}" data-cat="weapon">무기</button>
        <button class="cat-tab ${cat === 'armor' ? 'active' : ''}" data-cat="armor">방어구</button>
        <button class="cat-tab ${cat === 'accessory' ? 'active' : ''}" data-cat="accessory">장신구</button>
      </div>
      <p class="equip-job-hint">${charDef?.name} · ${catLabel} — 강화 후 다음 등급 제작 (한 화면)</p>
      <div class="equip-steps">`;

    if (cat === 'accessory') {
      html += this.renderAccessoryPanel(save, activeChar);
    } else if (!lines.length || (lines.length === 1 && !lines[0]!.next && !lines[0]!.allDone && lines[0]!.completed.length === 0)) {
      html += '<p class="empty">이 카테고리에 제작할 장비가 없습니다.</p>';
    } else {
      for (const lp of lines) html += this.renderEquipProgressLine(save, activeChar, lp);
    }

    html += '</div>';
    this.panelEl.innerHTML = html;
    this.bindEquipmentActions();
  }

  private bindEquipmentActions() {
    /* 장비 버튼 — bindStablePanelActions 위임 (pointerup + click) */
  }

  private renderDungeon(save: GameSave, adv: AdventureSystem, prefix = '') {
    const maxRegion = save.maxRegion ?? save.currentRegion;
    const atLodging = adv.isAtLodging();
    const inRun = adv.isInExpedition();
    const returning = adv.isReturningToLodging;
    const runRegion = save.currentRegion;
    const codexPct = inRun ? adv.getCodexPercent(runRegion) : 0;
    const curCodex = inRun ? Math.floor(codexPct * 100) : 0;
    const regionCleared = inRun && isRegionCleared(save, runRegion);
    const bossReady = inRun && isBossGateReady(save, runRegion, codexPct);
    const lodgingStatus = atLodging
      ? `<div class="dungeon-status lodging">
          <span class="dungeon-status-icon">🏠</span>
          <div>
            <strong>숙소 대기</strong>
            <p>층을 고른 뒤 출발 · 2층+는 숏컷 개통 후 바로 이동</p>
          </div>
        </div>`
      : '';
    const expCheck = canStartExpedition(save);
    const hpWarn = atLodging && !isPartyFullyHealed(save)
      ? `<p class="hint warn">⚠️ HP 미회복 — 숙소에서 자동 회복 중 (만피 후 출발 권장)</p>`
      : '';
    const dungeonBonusHint = atLodging && hasAnyDungeonCampBonus(save)
      ? `<p class="hint">${formatDungeonBonusSummary(save)}</p>`
      : '';
    const pending = getPendingTycoonSummary(save);
    const nextFloor = Math.min(maxRegion + 1, REGIONS.length);
    const regionStrip = buildDungeonFloorStrip(save, adv, maxRegion, inRun, runRegion, codexPct);
    const dungeonTips = buildDungeonTips({
      save, adv, inRun, returning, runRegion, codexPct, curCodex,
      bossReady, regionCleared, nextFloor,
    });
    const departPanel = atLodging && !inRun
      ? renderLodgingDepartPanel(save, adv, this.departFloorId)
      : '';
    this.panelEl.innerHTML = `${prefix}${renderMetaBannerHtml(save)}
      <div class="panel-header">
        <h3>${atLodging && !inRun ? '🗺️ 던전 출발' : '던전'}</h3>
        <span class="badge">${atLodging ? '숙소' : `${runRegion}층`}</span>
      </div>
      ${atLodging && !inRun ? departPanel : `${lodgingStatus}${hpWarn}${dungeonBonusHint}`}
      ${inRun && !returning ? this.renderFloorTravelControls(save, adv) : ''}
      ${!atLodging || inRun ? `<div class="dungeon-actions">
        ${atLodging
          ? ''
          : `${returning
              ? ''
              : adv.isPendingReturnToLodging()
                ? `<p class="hint">전투 후 숙소 이동 예약됨</p>`
                : inRun && !returning
                  ? `<button type="button" class="btn-sm" id="exp-use-potion" ${getExpeditionPotions(save) > 0 ? '' : 'disabled'}>💊 포션 ${getExpeditionPotions(save)}/${EXPEDITION_POTION_CARRY}</button>`
                  : ''}`}
      </div>` : ''}
      ${this.panelDetails('전투 정보', dungeonTips)}
      <div class="stage-map-head">
        <h4 class="dungeon-section-title">${atLodging && !inRun ? '층 지도' : '스테이지'}</h4>
        <span class="badge">${maxRegion}/${REGIONS.length}</span>
      </div>
      <div class="dungeon-floor-grid stage-map-grid">${regionStrip}</div>`;
    this.bindDailyBonus();
    this.bindStartExpedition();
    this.bindOnboardingClaim();
  }

  private renderLodgingBulletin(save: GameSave, adv: AdventureSystem, prefix = '', minimal = false) {
    ensureBulletin(save);
    const rotateSec = getBulletinRotateRemainingSec(save);
    const rotateMin = Math.floor(rotateSec / 60);
    const rotateRem = rotateSec % 60;
    const rerollCost = getBulletinRerollCost(save);
    const heroes = save.bulletin?.heroIds ?? [];

    this.panelEl.innerHTML = `${prefix}
      <div class="panel-header bulletin-panel-head">
        <h3>📋 소식 · 모험단 모집</h3>
        <span class="badge bulletin-timer-badge">갱신 ${rotateMin}:${String(rotateRem).padStart(2, '0')}</span>
      </div>
      ${renderPanelGuide('모험단 모집', '일일 보상은 마을 홈에서 먼저 수령하세요. 아래에서 용사를 영입할 수 있어요.')}
      ${renderBulletinStatsStrip(save, heroes)}
      ${minimal ? this.renderDailyBonusBlock(save) : this.renderBulletinQuests(save, adv)}
      ${this.lodgingSection('📌 오늘의 모집', `
        ${renderBulletinRecruitGrid(save, heroes)}
        ${renderBulletinRerollRow(rerollCost, canRerollBulletin(save), canGemBulletinReroll(save))}`)}
      ${renderHeroRosterGrid(save, heroes)}`;

    paintBulletinPortraits(this.panelEl);
  }

  private renderShopMaterialInventory(save: GameSave): string {
    const whCap = getWarehouseCapacity(save);
    const whUsed = getTotalMaterialCount(save);
    const matRows = Object.entries(save.materials).length
      ? Object.entries(save.materials)
        .sort(([a], [b]) => (MATERIAL_LABELS[a] ?? a).localeCompare(MATERIAL_LABELS[b] ?? b, 'ko'))
        .map(([k, v]) => {
          const { fillClass } = getMaterialCapDisplay(save, k);
          return `<div class="shop-mat-row${fillClass ? ` ${fillClass}` : ''}">
            <span class="shop-mat-name">${MATERIAL_LABELS[k] ?? k} ×${v}</span>
            <span class="mat-cap">${v}/${whCap}</span>
          </div>`;
        }).join('')
      : '<p class="lodging-empty">보유 재료 없음 — 던전·캠프에서 수집</p>';
    return `
      <div class="bag-status-strip shop-mat-strip">
        <span>📦 품목당 ${whCap.toLocaleString()}개</span>
        <span>총 ${whUsed.toLocaleString()}개</span>
      </div>
      <div class="shop-mat-list">${matRows}</div>`;
  }

  private shopSubTabs(active: ShopSub): string {
    return `<nav class="sub-tabs shop-sub-nav">
      <button type="button" class="sub-tab shop-sub-tab ${active === 'buy' ? 'active' : ''}" data-shop-sub="buy">🛒 구매</button>
      <button type="button" class="sub-tab shop-sub-tab ${active === 'sell' ? 'active' : ''}" data-shop-sub="sell">💰 판매</button>
    </nav>`;
  }

  private renderBulletinQuests(save: GameSave, adv: AdventureSystem): string {
    const bounty = getClaimableHuntBounty(save);
    const errand = getDailyErrand(save);
    const resting = adv.isLodgingResting;
    const canTip = canClaimRestTip(save, resting);
    const tipLimit = getRestTipDailyLimit(save);
    const tipUsed = getRestTipClaimsToday(save);
    const tipGold = getRestTipGold(save);
    const claimableAch = ACHIEVEMENTS.filter(a => canClaimAchievement(save, a.id));

    const pending = getPendingHuntGold(save);
    const pendingSection = pending.gold > 0
      ? `<div class="bulletin-quest-card">
          <strong>🏹 미수령 사냥금</strong>
          <p class="hint">이전 버전 적립분</p>
          <p class="bulletin-reward-line">🪙${pending.gold.toLocaleString()}</p>
          <button type="button" class="btn-sm gold" id="claim-pending-hunt">수령</button>
        </div>`
      : '';

    const bountySection = `<div class="bulletin-quest-card">
      <strong>🎯 사냥 수당</strong>
      <p class="hint">50마리마다 보너스 · 누적 처치 ${bounty.kills}마리</p>
      <p class="bulletin-reward-line">🪙${bounty.gold.toLocaleString()}</p>
      <button type="button" class="btn-sm gold" id="hunt-bounty" ${bounty.gold > 0 ? '' : 'disabled'}>수령</button>
    </div>`;

    const errandSection = errand.done
      ? `<div class="bulletin-quest-card done"><strong>📜 일일 부탁</strong><p class="hint">오늘 완료 · 내일 새 의뢰</p></div>`
      : `<div class="bulletin-quest-card">
          <strong>📜 일일 부탁</strong>
          <p class="hint">${errand.label} ×${errand.qty} 납품 · 보유 ${errand.have}/${errand.qty}</p>
          <p class="bulletin-reward-line">🪙${errand.reward.toLocaleString()}</p>
          <button type="button" class="btn-sm gold" id="daily-errand" ${canCompleteDailyErrand(save) ? '' : 'disabled'}>납품 완료</button>
        </div>`;

    const tipSection = `<div class="bulletin-quest-card ${resting ? '' : 'muted'}">
      <strong>💰 휴식 손님 팁</strong>
      <p class="hint">${resting ? `휴식 중 · ${tipUsed}/${tipLimit}회` : '휴식 탭에서 휴식 중일 때 수령'}</p>
      <p class="bulletin-reward-line">🪙${tipGold.toLocaleString()}</p>
      <button type="button" class="btn-sm gold" id="rest-tip" ${canTip ? '' : 'disabled'}>팁 받기</button>
    </div>`;

    const dailyBonusSection = this.renderDailyBonusBlock(save).replace(
      'daily-bonus-card',
      'bulletin-quest-card daily-bonus-card',
    );

    const achSection = claimableAch.length
      ? `<div class="bulletin-quest-card">
          <strong>🏆 업적 보상</strong>
          <p class="hint">수령 가능 ${claimableAch.length}건</p>
          <div class="bulletin-ach-list">${claimableAch.slice(0, 6).map(a => `
            <div class="bulletin-ach-row">
              <span>${a.name}</span>
              <span class="hint">🪙${a.reward.toLocaleString()}${a.gemReward ? ` 💎${a.gemReward}` : ''}</span>
              <button type="button" class="btn-sm gold" data-claim-achieve="${a.id}">수령</button>
            </div>`).join('')}</div>
        </div>`
      : '';

    return `${this.lodgingSection('🎁 보상 · 의뢰', `
      <div class="bulletin-quest-grid">
        ${pendingSection}
        ${bountySection}
        ${errandSection}
        ${tipSection}
        ${dailyBonusSection}
        ${achSection}
      </div>
      ${this.renderOnboardingBlock(save, adv)}
    `)}`;
  }

  private bindBulletinQuestHandlers(_adv: AdventureSystem) {
    /* 소식 탭 의뢰·보상 버튼 — bindStablePanelActions 위임 */
  }

  private renderLodgingShop(save: GameSave, prefix = '', unified = false) {
    const whCap = getWarehouseCapacity(save);
    const shopProducts = getShopProducts(save);
    const rotateSec = getShopRotateRemainingSec(save);
    const rotateMin = Math.floor(rotateSec / 60);
    const rotateRem = rotateSec % 60;
    const buyRows = shopProducts.map(p => {
      const limitHint = p.dailyLimit != null ? ` · 오늘 ${p.boughtToday ?? 0}/${p.dailyLimit}` : '';
      const lockHint = p.canBuy ? '' : ` <span class="hint warn">(${p.reason})</span>`;
      return `<div class="shop-row shop-buy-row">
        <div class="shop-buy-main">
          <div class="shop-item-icon-wrap" aria-hidden="true">${p.icon}</div>
          <div class="shop-item-info">
            <span class="shop-item-name">${p.name}</span>
            <span class="shop-item-meta hint">${p.desc}${limitHint}</span>
          </div>
        </div>
        <div class="shop-sell-controls shop-buy-controls">
          <span class="shop-price">🪙${p.price.toLocaleString()}</span>
          <button type="button" class="btn-sm gold" data-shop-buy="${p.id}" ${p.canBuy ? '' : 'disabled'}>구매</button>
          ${lockHint}
        </div>
      </div>`;
    }).join('');

    const items = getSellableItems(save);
    const matSellRows = items.length
      ? items.map(i => {
        const { qty, cap, fillClass } = getMaterialCapDisplay(save, i.key);
        return `
        <div class="shop-row shop-sell-row${fillClass ? ` ${fillClass}` : ''}">
          <div class="shop-item-info">
            <span class="shop-item-name">${i.label}</span>
            <span class="shop-item-meta">
              <span class="shop-qty">×${i.qty}</span>
              <span class="shop-price">🪙${i.unitPrice}/개</span>
              <span class="mat-cap">${qty}/${cap}</span>
            </span>
          </div>
          <div class="shop-sell-controls shop-sell-controls-lg">
            <button type="button" class="btn-sell-lg" data-sell-amt="${i.key}" data-amt="1">1</button>
            <button type="button" class="btn-sell-lg" data-sell-amt="${i.key}" data-amt="5">5</button>
            <button type="button" class="btn-sell-lg" data-sell-amt="${i.key}" data-amt="10">10</button>
            <button type="button" class="btn-sell-lg gold" data-sell-amt="${i.key}" data-amt="${i.qty}">전부</button>
          </div>
        </div>`;
      }).join('')
      : '<p class="lodging-empty">판매할 재료가 없어요.</p>';

    const pawnItems = getPawnableItems(save);
    const pawnRows = pawnItems.length
      ? pawnItems.slice(0, 10).map(p => `
        <div class="shop-row shop-sell-row">
          <span class="shop-item-name">${p.label}</span>
          <span class="shop-price">🪙${p.gold.toLocaleString()}</span>
          <button type="button" class="btn-sm gold" data-pawn="${p.uid}">매입</button>
        </div>`).join('')
      : '<p class="lodging-empty">매입 가능한 장비 없음</p>';

    const buyPanel = `<p class="lodging-intro">30분마다 진열이 바뀝니다 — 포션·영약·재료 꾸러미 중 ${shopProducts.length}종 판매 중.</p>
      <div class="shop-list">${buyRows || '<p class="lodging-empty">구매 가능한 상품 없음</p>'}</div>`;

    const sellPanel = `<p class="lodging-intro">재료·장비를 판매해 골드를 모으세요. 품목당 ${whCap.toLocaleString()}개 한도.</p>
      ${this.lodgingSection('📦 보유 재료', this.renderShopMaterialInventory(save))}
      ${this.lodgingSection('🧺 재료 판매', `<div class="shop-list">${matSellRows}</div>`)}
      ${this.lodgingSection('⚔️ 장비 매입', `<div class="shop-list">${pawnRows}</div>`)}`;

    this.panelEl.innerHTML = `${prefix}
      <div class="panel-header"><h3>💰 거래</h3>
        <span class="badge bulletin-timer-badge">진열 ${rotateMin}:${String(rotateRem).padStart(2, '0')}</span>
      </div>
      ${renderPanelGuide('거래소', '던전에서 모은 📦재료를 판매해 골드를 확보하세요 (주 수입). 위 — 포션·영약 구매 · 아래 — 재료·장비 판매')}
      ${unified
        ? `${buyPanel}<hr class="town-section-divider" />${sellPanel}`
        : `${this.shopSubTabs(this.shopSub)}${this.shopSub === 'buy' ? buyPanel : sellPanel}`}`;
  }

  private renderLodgingRest(save: GameSave, adv: AdventureSystem, prefix = '') {
    const healRate = adv.getLodgingHealRate();
    const resting = adv.isLodgingResting;
    const members = save.party.map(id => {
      const ch = CHAR_MAP[id];
      const st = save.chars[id];
      if (!ch || !st) return '';
      const maxHp = getCharMaxHp(save, id);
      const hp = getCharCurrentHp(save, id);
      const ratio = maxHp > 0 ? Math.min(100, hp / maxHp * 100) : 100;
      const full = hp >= maxHp;
      return `<div class="rest-member-row ${resting && !full ? 'healing' : ''}" data-rest-char="${id}">
        <span class="rest-member-name">${ch.name} Lv.${st.level}</span>
        <div class="rest-hp-bar">
          <div class="rest-hp-fill ${resting ? 'anim' : ''}" style="width:${ratio.toFixed(1)}%"></div>
        </div>
        <span class="rest-hp-text">${Math.floor(hp)}/${maxHp} ${full ? '✅' : ''}</span>
        ${formatIncapHint(save, id) ? `<span class="hint warn incap-timer" data-incap-timer="${id}">${formatIncapHint(save, id)}</span>` : ''}
      </div>`;
    }).join('');
    const allFull = isPartyFullyHealed(save);
    const partyWiped = hasPartyIncapacitated(save);
    const reviveBlock = partyWiped ? `
      <div class="lodging-panel-card rest-revive-card">
        <h4 class="rest-party-title">💀 전멸 후 회복</h4>
        <p class="hint warn party-incap-banner" data-party-incap-banner>${formatPartyIncapBanner(save)}</p>
      </div>` : '';
    const clinic = save.camp?.clinicLevel ? ` · 치료술 Lv.${save.camp.clinicLevel}` : '';
    this.panelEl.innerHTML = `${prefix}
      <p class="lodging-intro">숙소 도착 시 자동 회복 · <strong>${healRate}</strong>${clinic} · ${resting ? (partyWiped ? '행동불능 — 회복 대기' : '회복 중') : allFull ? '전원 만피' : '회복 필요'} · 팁·보상은 벽보 탭</p>
      ${reviveBlock}
      ${this.lodgingSection('모험단 HP', `
        ${members || '<p class="hint">파티원 없음</p>'}
        ${resting
          ? '<button class="btn-primary rest-heal-btn rest-stop" id="lodging-rest-stop">⏸ 휴식 중단</button>'
          : `<button class="btn-primary rest-heal-btn" id="lodging-rest" ${allFull ? 'disabled' : ''}>
              ${allFull ? '✅ 전원 회복됨' : '🛏️ 휴식하기'}
            </button>`}`)}`;
    /* #lodging-rest · #lodging-rest-stop — bindStablePanelActions 위임 */
  }

  private campSubTabs(save: GameSave, active: CampSub): string {
    const items: { id: CampSub; label: string }[] = [
      { id: 'facilities', label: '⛏️ 생산' },
      { id: 'dungeon', label: '⚔️ 던전' },
      { id: 'town', label: '🏘️ 마을' },
      { id: 'guild', label: '🗡️ 길드' },
    ];
    return `<nav class="world-nav-grid cols-4 camp-sub-nav">${items.map(i => {
      const unlocked = this.isCampSubUnlocked(save, i.id);
      const icon = i.id === 'facilities' ? '⛏️' : i.id === 'dungeon' ? '⚔️' : i.id === 'town' ? '🏘️' : '🗡️';
      const short = i.id === 'facilities' ? '생산' : i.id === 'dungeon' ? '던전' : i.id === 'town' ? '마을' : '길드';
      const lock = unlocked ? '' : `<span class="world-nav-lock">🔒${this.campSubUnlockRegion(i.id)}</span>`;
      return `<button type="button" class="world-nav-item camp-sub-tab ${active === i.id ? 'active' : ''} ${unlocked ? '' : 'locked'}" data-camp-sub="${i.id}" ${unlocked ? '' : 'disabled'}>
        <span class="world-nav-icon">${icon}</span>
        <span class="world-nav-label">${short}</span>${lock}
      </button>`;
    }).join('')}</nav>`;
  }

  private renderTycoonDashboard(save: GameSave): string {
    const rates = getTycoonIncomeRates(save);
    const totalPassive = rates.innGoldPerHour + rates.kitchenGoldPerHour + rates.warehouseGoldPerHour;
    const pendingLine = rates.pendingGold > 0 || rates.pendingMatLabel
      ? `<div class="tycoon-dash-pending">
          <span class="tycoon-dash-label">원정 적립</span>
          <span>${rates.pendingGold > 0 ? `🪙${rates.pendingGold.toLocaleString()}` : ''}${rates.pendingMatLabel ? ` · 📦${rates.pendingMatLabel}` : ''}</span>
        </div>`
      : '';
    const boostLine = rates.supplyBoostPct > 0
      ? `<div class="tycoon-dash-boost">⚡ 던전 공급부스트 +${rates.supplyBoostPct}% · ${rates.supplyBoostMin}분</div>`
      : '';
    const eventLine = rates.activeEventLabel
      ? `<div class="tycoon-dash-event">${rates.activeEventLabel}</div>` : '';
    return `<div class="tycoon-dashboard">
      <div class="tycoon-dash-row">
        <div class="tycoon-dash-stat">
          <span class="tycoon-dash-label">보유 골드</span>
          <strong>🪙 ${save.gold.toLocaleString()}</strong>
        </div>
        <div class="tycoon-dash-stat">
          <span class="tycoon-dash-label">창고 (품목당)</span>
          <strong>📦 ${rates.warehouseCap.toLocaleString()}${rates.warehouseFullKinds > 0 ? ` · 만석${rates.warehouseFullKinds}` : ''}</strong>
        </div>
        <div class="tycoon-dash-stat">
          <span class="tycoon-dash-label">패시브 수입</span>
          <strong>🪙 ${totalPassive.toLocaleString()}/h</strong>
        </div>
      </div>
      <div class="tycoon-dash-sub">
        <span>여관 🪙${rates.innGoldPerHour}/h</span>
        <span>식당 🪙${rates.kitchenGoldPerHour}/h</span>
        ${rates.warehouseGoldPerHour > 0 ? `<span>창고 🪙${rates.warehouseGoldPerHour}/h</span>` : ''}
        <span>공급 ${rates.matIncomePct}%</span>
        ${rates.remodelTier > 0 ? `<span>리모델 T${rates.remodelTier}</span>` : ''}
      </div>
      <p class="hint tycoon-dash-dungeon">${formatDungeonBonusSummary(save)}</p>
      ${pendingLine}${boostLine}${eventLine}
    </div>`;
  }

  private renderCampBuildingCard(save: GameSave, def: typeof CAMP_BUILDINGS[number], maxRegion: number): string {
    const unlocked = isBuildingUnlocked(save, def.id);
    const prog = getBuildingProgress(save, def.id);
    const canUp = canUpgradeBuilding(save, def.id);
    const isProd = def.kind === 'production';
    const isDungeon = def.kind === 'dungeon';
    const isCycled = isProd || isDungeon;
    const materialPaused = isProd && isBuildingPausedForMaterials(save, def.id);
    const pct = Math.round(prog.progress * 100);
    const matLabel = def.produce === 'potion'
      ? 'HP 포션'
      : (MATERIAL_LABELS[def.produce ?? ''] ?? def.produce ?? '');
    const statusLine = formatBuildingStatus(save, def.id);
    const dungeonStacks = isDungeon ? getDungeonPrepStacks(save, def.id) : 0;
    const dungeonMax = isDungeon ? getDungeonMaxStacks(prog.level) : 0;
    const dungeonChargeLabel = isDungeon && prog.level > 0
      ? formatDungeonStackLabel(def.id, prog.level, 1)
      : '';
    const warehouseHint = def.id === 'warehouse'
      ? (() => {
        const wh = formatWarehousePanelDetail(
          prog.level,
          save,
          save.tycoon?.autoSellOverflow ?? true,
        );
        return `<div class="camp-warehouse-detail">
          <p class="hint camp-warehouse-cap">${wh.headline}</p>
          <p class="hint">${wh.nextLine}</p>
          <p class="hint camp-warehouse-explain">${wh.explain}</p>
        </div>`;
      })()
      : '';
    const outputAmt = isProd && prog.level > 0 ? getBuildingOutputAmount(def, prog.level) : 0;
    const outputLabel = def.produce === 'potion'
      ? `💊 HP포션 ×${outputAmt}`
      : `📦 ${matLabel} ×${outputAmt}`;
    const speedHint = isProd && prog.level > 0
      ? `<p class="hint camp-output-line">${outputLabel} / ${formatInterval(prog.intervalMs)} · Lv업 시 가속</p>`
      : '';
    const dungeonHint = isDungeon && prog.level > 0
      ? `<p class="hint camp-output-line">${formatDungeonCycleHint(def, prog.level, prog.intervalMs)}</p>
         ${dungeonStacks > 0 ? `<p class="hint camp-dungeon-prep">✅ 다음 원정 준비 <b>×${dungeonStacks}/${dungeonMax}</b> · ${dungeonChargeLabel}</p>` : ''}`
      : '';
    const gaugeBlock = isCycled && prog.level > 0 ? `
        ${speedHint}${dungeonHint}
        ${materialPaused ? '<p class="hint warn camp-paused">⏸ 재료부족 — 던전에서 재료를 모아오세요</p>' : ''}
        <div class="camp-gauge-wrap">
          <div class="camp-gauge-bar ${prog.ready && !materialPaused ? 'ready' : ''} ${materialPaused ? 'paused' : ''} ${isDungeon ? 'dungeon-prep' : ''}">
            <div class="camp-gauge-fill" style="width:${pct}%"></div>
            <span class="camp-gauge-pct">${materialPaused ? '⏸' : prog.ready ? '✨ 완료!' : `${pct}%`}</span>
          </div>
          <span class="camp-gauge-label">
            ${materialPaused ? statusLine : prog.ready
              ? (isDungeon ? (dungeonStacks >= dungeonMax ? '만충 — 출발 대기' : '충전 적립!') : '곧 생산!')
              : `${formatIntervalSec(prog.remainingMs)} 후 ${isDungeon ? '충전' : matLabel}`}
          </span>
        </div>
        <p class="hint camp-produce">${materialPaused ? statusLine : isDungeon ? statusLine : `다음 생산까지 ${formatInterval(prog.remainingMs || prog.intervalMs)}`}</p>`
      : def.kind === 'buff' && prog.level > 0
        ? `<p class="hint camp-buff-active">${formatBuildingStatus(save, def.id)}</p>${warehouseHint}`
        : isCycled && prog.level <= 0
          ? `<p class="hint">${isDungeon ? '건설 후 게이지 충전 → 다음 원정 버프 적립' : '건설 후 게이지가 차오르며 자동 생산'}</p>`
          : `<p class="hint">건설 시 효과 적용</p>${warehouseHint}`;
    return `<div class="camp-building-card ${unlocked ? '' : 'locked'} ${prog.ready ? 'camp-ready' : ''}" data-camp-building="${def.id}">
      <div class="camp-building-head">
        <span class="camp-icon">${def.icon}</span>
        <div>
          <strong>${def.name} Lv.${prog.level}</strong>
          <p class="hint">${def.desc}</p>
        </div>
      </div>
      ${unlocked ? `
        ${gaugeBlock}
        <button class="btn-sm gold" data-camp-upgrade="${def.id}" ${canUp.ok ? '' : 'disabled'}>
          ${prog.level <= 0 ? '건설' : '업그레이드'} (🪙${canUp.cost.toLocaleString()})
        </button>
        ${!canUp.ok && canUp.reason ? `<p class="hint warn">${canUp.reason}</p>` : ''}
      ` : `<p class="hint warn">🔒 ${def.unlockRegion}층 해금 필요 (현재 ${maxRegion}층)</p>`}
    </div>`;
  }

  private bindCampActions() {
    this.panelEl.querySelector('#warehouse-auto')?.addEventListener('change', e => {
      const s = this.getSave();
      ensureTycoon(s).autoSellOverflow = (e.target as HTMLInputElement).checked;
      saveGame(s);
      audio.playTab();
    });
    this.panelEl.querySelector('#tycoon-auto')?.addEventListener('change', e => {
      const s = this.getSave();
      ensureTycoon(s).autoManage = (e.target as HTMLInputElement).checked;
      saveGame(s);
      audio.playTab();
    });
    this.panelEl.querySelectorAll('[data-staff-assign]').forEach(sel => {
      sel.addEventListener('change', e => {
        const s = this.getSave();
        const el = e.target as HTMLSelectElement;
        const building = el.dataset.staffAssign as CampBuildingId;
        const charId = el.value || null;
        if (assignStaff(s, building, charId)) {
          audio.playTab();
          this.onRefresh();
        }
      });
    });
    /* data-camp-upgrade · data-unlock-zone · data-dispatch · #claim-dispatch · #gem-dispatch-rush · #remodel-lodging — bindStablePanelActions 위임 */
  }

  private renderCampDungeon(save: GameSave, maxRegion: number): string {
    const dungeonBuildings = CAMP_BUILDINGS.filter(b => b.kind === 'dungeon');
    const bonusLine = formatDungeonBonusSummary(save);
    return `<div class="tycoon-panel-section tycoon-panel-compact camp-dungeon-intro">
        <h4>⚔️ 던전 준비 시설</h4>
        <p class="hint">채광장처럼 <b>게이지가 차면</b> 「다음 원정」 버프 1충전 · 최대 3충전 · <b>출발 시 1회 소모</b></p>
        <p class="hint camp-dungeon-summary"><strong>${bonusLine}</strong></p>
      </div>
      ${dungeonBuildings.map(def => this.renderCampBuildingCard(save, def, maxRegion)).join('')}`;
  }

  private renderCampFacilities(save: GameSave, maxRegion: number): string {
    const prod = CAMP_BUILDINGS.filter(b => b.kind === 'production' || b.id === 'clinic');
    return prod.map(def => this.renderCampBuildingCard(save, def, maxRegion)).join('');
  }

  private renderCampTown(save: GameSave, maxRegion: number): string {
    ensureTycoon(save);
    const service = CAMP_BUILDINGS.filter(b =>
      ['warehouse', 'inn', 'kitchen'].includes(b.id));
    const whLv = getBuildingLevel(save, 'warehouse');
    const fullness = getWarehouseFullness(save);
    const whDetail = formatWarehousePanelDetail(whLv, save, save.tycoon!.autoSellOverflow);
    const whPct = fullness.maxFillPct;
    const zoneCards = CAMP_ZONES.map(z => {
      const owned = save.tycoon!.zones.includes(z.id);
      const check = canUnlockZone(save, z.id);
      return `<div class="tycoon-zone-card ${owned ? 'owned' : ''}">
        <strong>${z.icon} ${z.name}</strong>
        <p class="hint">${z.desc}</p>
        ${owned
          ? '<span class="tycoon-badge">해금됨</span>'
          : `<button class="btn-sm gold" data-unlock-zone="${z.id}" ${check.ok ? '' : 'disabled'}>
              해금 (🪙${z.cost.toLocaleString()})
            </button>
            ${!check.ok && check.reason ? `<p class="hint warn">${check.reason}</p>` : ''}`}
      </div>`;
    }).join('');
    const staffRows = STAFF_ASSIGNABLE.filter(id => getBuildingProgress(save, id).level > 0).map(id => {
      const def = CAMP_BUILDINGS.find(b => b.id === id)!;
      const current = save.tycoon!.staff[id] ?? '';
      const options = save.owned
        .map(cid => {
          const busyElsewhere = Object.entries(save.tycoon!.staff)
            .some(([bid, cid2]) => bid !== id && cid2 === cid);
          const suffix = busyElsewhere ? ' (다른 건물 근무)' : '';
          return `<option value="${cid}" ${current === cid ? 'selected' : ''}>${CHAR_MAP[cid]?.name ?? cid}${suffix}</option>`;
        })
        .join('');
      return `<div class="tycoon-staff-row">
        <span>${def.icon} ${def.name}</span>
        <select data-staff-assign="${id}" class="tycoon-staff-select">
          <option value="">— 미배치 —</option>
          ${options}
        </select>
      </div>`;
    }).join('') || '<p class="hint">서비스·생산 건물 건설 후 직원 배치 가능</p>';
    return `
      ${service.map(def => this.renderCampBuildingCard(save, def, maxRegion)).join('')}
      <div class="tycoon-panel-section tycoon-panel-compact camp-warehouse-panel">
        <h4>📦 창고 운영 (품목당 보관 한도)</h4>
        <p class="hint"><strong>${whDetail.headline}</strong></p>
        <div class="camp-warehouse-meter">
          <div class="camp-warehouse-meter-fill" style="width:${whPct}%"></div>
        </div>
        <p class="hint">${whDetail.nextLine}</p>
        <p class="hint camp-warehouse-explain">${whDetail.explain}</p>
        <label class="tycoon-check">
          <input type="checkbox" id="warehouse-auto" ${save.tycoon!.autoSellOverflow ? 'checked' : ''}/>
          초과 재료 → 🪙 자동 매각 (창고 Lv.1+ 필요)
        </label>
        <label class="tycoon-check">
          <input type="checkbox" id="tycoon-auto" ${save.tycoon!.autoManage ? 'checked' : ''}/>
          파견 자동 출발·수령
        </label>
      </div>
      <div class="tycoon-panel-section">
        <h4>🗺️ 캠프 구역</h4>
        <div class="tycoon-zone-grid">${zoneCards}</div>
      </div>
      <div class="tycoon-panel-section">
        <h4>👷 직원 · 🪙${getStaffWagePerHour(save)}/h</h4>
        ${staffRows}
      </div>
      ${this.renderRemodelSection(save)}`;
  }

  private renderRemodelSection(save: GameSave): string {
    ensureTycoon(save);
    const t = save.tycoon!;
    const remodel = canRemodel(save);
    return `<div class="tycoon-panel-section">
      <h4>🏗️ 숙소 리모델링 T${t.remodelTier}</h4>
      <p class="hint">영구 판매·생산 보너스 · 서비스 건물만 초기화 (생산 시설 유지)</p>
      <button class="btn-sm gold" id="remodel-lodging" ${remodel.ok ? '' : 'disabled'}>
        리모델링 (🪙${remodel.cost.toLocaleString()})
      </button>
      ${!remodel.ok && remodel.reason ? `<p class="hint warn">${remodel.reason}</p>` : ''}
    </div>`;
  }

  private renderCampGuild(save: GameSave, maxRegion: number): string {
    ensureTycoon(save);
    const guildCard = this.renderCampBuildingCard(save, CAMP_BUILDINGS.find(b => b.id === 'guild')!, maxRegion);
    const t = save.tycoon!;
    const disp = getDispatchProgress(save);
    const d = t.dispatch;
    const guildLv = getBuildingLevel(save, 'guild');
    const dispatchBlock = d ? `
      <div class="tycoon-dispatch-active">
        <p><strong>파견 중</strong> · ${d.regionId}층 → 📦${MATERIAL_LABELS[d.matKey] ?? d.matKey} ×${d.qty}</p>
        <div class="camp-gauge-wrap">
          <div class="camp-gauge-bar">
            <div class="camp-gauge-fill" style="width:${Math.round(disp.pct * 100)}%"></div>
            <span class="camp-gauge-pct">${Math.round(disp.pct * 100)}%</span>
          </div>
          <p class="hint dispatch-remain-hint">${disp.remainSec > 0
            ? `⏱ ${formatDispatchRemainSec(disp.remainSec)} 남음 · ${Math.round(disp.pct * 100)}%`
            : '✨ 수령 가능!'}</p>
        </div>
        <div class="dispatch-action-row">
          <button class="btn-sm gold" id="claim-dispatch" ${disp.remainSec <= 0 ? '' : 'disabled'}>재료 수령</button>
          <button class="btn-sm support" id="gem-dispatch-rush" ${canGemDispatchRush(save) ? '' : 'disabled'}>
            ⚡ 💎${GEM_COST.dispatchRush} 즉시 완료
          </button>
        </div>
      </div>`
      : `<p class="hint">던전 층별 재료 파견 · 길드 Lv업 시 시간 단축·수확 증가</p>`;
    const regionBtns = getAvailableDispatchRegions(save).map(r => {
      const yieldQty = guildLv > 0 ? calcDispatchYield(save, r.regionId, r.mat, r.baseQty) : r.baseQty;
      const dur = formatDispatchDuration(r.regionId, guildLv);
      return `<button class="btn-sm tycoon-dispatch-btn" data-dispatch="${r.regionId}" ${guildLv > 0 && !t.dispatch ? '' : 'disabled'}>
        <span class="dispatch-btn-title">${r.label} · ${r.regionId}층</span>
        <span class="dispatch-btn-meta">📦${MATERIAL_LABELS[r.mat] ?? r.mat} ×${yieldQty} · ⏱${dur}</span>
      </button>`;
    }).join('');
    return `
      ${guildCard}
      <div class="tycoon-panel-section">
        <h4>⚔️ 용사 파견</h4>
        ${dispatchBlock}
        <div class="tycoon-dispatch-btns">${regionBtns}</div>
      </div>`;
  }

  private renderCamp(save: GameSave, prefix = '') {
    tickCampProduction(save);
    const maxRegion = save.maxRegion ?? 1;
    this.panelEl.innerHTML = `${prefix}
      <div class="panel-header"><h3>🏕️ 캠프</h3></div>
      ${renderProductionCampPanel(save, maxRegion)}`;
    this.bindCampActions();
  }

  private renderCodex(save: GameSave, prefix = '') {
    const discovered = Object.values(save.codex).filter(c => c.discovered).length;
    const pct = Math.floor(discovered / MONSTERS.length * 100);
    const codexBonus = Math.round(getCodexAtkBonus(save) * 100);
    const byRegion = REGIONS.map(reg => {
      const mons = MONSTERS.filter(m => m.regionId === reg.id);
      const found = mons.filter(m => save.codex[m.id]?.discovered).length;
      const regPct = mons.length ? Math.floor(found / mons.length * 100) : 0;
      const rows = mons.map(m => {
        const c = save.codex[m.id];
        const disc = c?.discovered;
        const role = disc ? getMonsterRoleLabel(m.id) : '';
        return `<div class="codex-row ${disc ? '' : 'unknown'}">
          <span class="codex-name">${disc ? m.name : '???'}${role ? ` <em>${role}</em>` : ''}</span>
          <span class="codex-stat">${disc ? `HP${m.hp} ATK${m.atk}` : '—'}</span>
          <span class="codex-kills">${disc ? `×${c.kills}` : ''}</span>
        </div>`;
      }).join('');
      const dropHint = getRegionDropHint(save, reg.id);
      return `<div class="codex-region-block">
        <div class="codex-region-head">
          <strong>${reg.id}. ${reg.name}</strong>
          <span class="codex-region-pct">${regPct}%</span>
        </div>
        <p class="hint codex-drop-hint">${dropHint}</p>
        ${rows}
      </div>`;
    }).join('');
    this.panelEl.innerHTML = `${prefix}
      <div class="panel-header">
        <h3>📖 몬스터 도감</h3>
        <span class="badge">${pct}%</span>
      </div>
      <div class="codex-summary">
        <span>발견 ${discovered}/${MONSTERS.length}</span>
        <span>영구 ATK +${codexBonus}%</span>
      </div>
      <p class="hint">도감 100% → 영구 ATK+3% · 해당 층 장신구 종류 공개 · 보스 처치 → 다음 층 해금</p>
      <div class="codex-region-list">${byRegion}</div>`;
  }


  private showRecruitToast(msg: string, success: boolean) {
    this.showToast(msg, success);
  }

  showToast(msg: string, success = true) {
    const el = document.createElement('div');
    el.className = `recruit-toast ${success ? 'success' : 'fail'}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  showWarehouseAlert(msg: string) {
    const el = document.createElement('div');
    el.className = 'warehouse-alert';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

}
