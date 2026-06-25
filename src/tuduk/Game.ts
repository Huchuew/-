import { loadSave, reconcileSave, refreshLastOnlineFromStorage, saveGame, setSaveErrorHandler, isResetToStarterPending } from './core/SaveManager';
import { CHAR_MAP } from './data/characters';
import { AdventureSystem } from './systems/AdventureSystem';
import { AdventureRenderer } from './render/AdventureRenderer';
import { PanelManager, type TabId } from './ui/PanelManager';
import { applyOfflineReward, calcOfflineReward, type OfflineResult } from './systems/OfflineReward';
import { tickCampProduction } from './systems/TycoonSystem';
import { tickTycoon } from './systems/TycoonExpansionSystem';
import { buildPartyCombatants } from './systems/CombatSystem';
import { audio } from './core/AudioManager';
import { getPrestigeJobProfile } from './data/prestigeAudio';
import { refreshBgm, setBgmContextProvider } from './core/bgmContext';
import { preloadGameAssets } from './assets/preloadAssets';
import { showExpeditionSettlementModal } from './ui/expeditionSettlement';
import { showRivalDuelResultModal } from './ui/rivalDuelResultModal';
import { showFloor18ClearModal } from './ui/floor18ClearModal';
import { showAugmentPickModal } from './ui/augmentModal';
import {
  buildAugmentPickForFloor, getPendingAugmentFloors, hasAugmentForFloor,
  markAugmentFloorSkipped, pickAugment, type AugmentPickState,
} from './systems/AugmentSystem';
import { AUGMENT_MAP } from './data/augments';
import { showFloor10PhaseModal } from './ui/floor10PhaseModal';
import { setWarehouseAlertHandler } from './systems/WarehouseSystem';
import { TutorialOverlay } from './ui/TutorialOverlay';
import { StatusEffectsHud } from './ui/StatusEffectsHud';
import { CombatSkillBar } from './ui/CombatSkillBar';
import { combatSkillBarHeightPx } from './data/combatUiLayout';
import { isStandalonePwa } from './utils/viewportInsets';
import { EXPEDITION_POTION_CARRY, MAX_POTION_STOCK, type GameSave } from './types';
import { showConfirmModal } from './ui/confirmModal';
import { getExpeditionPotions, getPotionStock } from './systems/PotionInventory';
import { getHomeStationLabel, getPlayerNickname, getAdventureTeamName } from './data/starterSurvey';
import { GEM_COST, tryGemAugmentRerollAll } from './systems/GemShop';
import { bindTap } from './utils/bindTap';
import { hapticLight, setVibrationEnabled } from './core/Haptics';
import { getSpireWeekId } from './data/endgame/spire';
import { calcWeeklyScore } from './systems/LeaderboardSystem';
import { tryLodgingPubRankToast } from './systems/PubRankToast';
import type { LeaderboardEntry } from './services/PlayerProfileService';
import { processPlayerMailOnLodging } from './systems/PlayerMessageSystem';

let activeGame: TudakGame | null = null;

export function getActiveGame(): TudakGame | null {
  return activeGame;
}

export function beginRivalDuelFromLeaderboard(rival: LeaderboardEntry): { ok: boolean; message: string } {
  const game = getActiveGame();
  if (!game) return { ok: false, message: '게임이 실행 중이지 않아요' };
  return game.beginRivalDuel(rival);
}

export function isGameInExpedition(): boolean {
  const game = getActiveGame();
  return game ? game.isInExpedition() : false;
}

export class TudakGame {
  private save: GameSave;
  private adv: AdventureSystem;
  private renderer: AdventureRenderer;
  private panels: PanelManager;
  private tutorial: TutorialOverlay;
  private wasAtLodging = false;
  private canvas: HTMLCanvasElement;
  private adventureStage: HTMLElement;
  private lastTime = 0;
  private raf = 0;
  private lastPanelGold = -1;
  private lastLivePanelMs = 0;
  private lastCampTickMs = 0;
  private lastBgmSyncMs = 0;
  private loopActive = true;
  private pendingOffline: OfflineResult | null = null;
  private statusHud: StatusEffectsHud;
  private skillBar: CombatSkillBar;
  private lastInFightLayout = false;
  private retroAugmentQueue: number[] = [];
  private retroAugmentModalOpen = false;
  private retroAugmentScheduled = false;
  private retroAugmentIsReroll = false;

  constructor(private root: HTMLElement, initialSave?: GameSave) {
    this.save = reconcileSave(initialSave ?? loadSave()!);
    setVibrationEnabled(this.save.settings.vibration !== false);
    refreshLastOnlineFromStorage(this.save);
    const offlinePreview = calcOfflineReward(this.save);
    applyOfflineReward(this.save);
    tickCampProduction(this.save);
    saveGame(this.save);
    void processPlayerMailOnLodging(this.save, () => {});

    this.canvas = root.querySelector('#adventure-canvas') as HTMLCanvasElement;
    this.adventureStage = root.querySelector('.adventure-stage') as HTMLElement;
    if (!this.canvas || !this.adventureStage) {
      throw new Error('게임 UI를 초기화하지 못했습니다 (canvas/stage 없음)');
    }
    const uiLayer = (root.querySelector('.adventure-ui-layer') ?? this.adventureStage) as HTMLElement;
    const skillBarDock = root.querySelector('#combat-skill-bar-dock') as HTMLElement;
    if (!skillBarDock) {
      throw new Error('게임 UI를 초기화하지 못했습니다 (skill-bar-dock 없음)');
    }
    this.statusHud = new StatusEffectsHud(uiLayer);
    this.skillBar = new CombatSkillBar(skillBarDock);

    this.adv = new AdventureSystem(this.save);
    this.adv.onSave = () => {
      try {
        const atLodging = this.adv.isAtLodging();
        if (atLodging && !this.wasAtLodging) {
          this.panels.goToLodgingPanel('hub');
          this.syncParty();
          this.panels.render();
          const report = this.adv.consumePendingSettlement();
          if (report) {
            showExpeditionSettlementModal(this.root, report, () => {
              this.syncParty();
              this.scheduleRetroactiveAugmentPicks();
            });
          } else {
            this.scheduleRetroactiveAugmentPicks();
          }
        }
        this.wasAtLodging = atLodging;
        this.syncParty();
        this.updateHud();
        this.updateLodgingUi();
        if (this.adv.isInExpedition() || atLodging) {
          this.panels.refreshExpeditionNav();
        }
      } catch (err) {
        console.error('[Game] onSave failed', err);
      }
    };
    this.adv.onRestComplete = () => {
      audio.playRest();
      this.updateLodgingUi();
    };
    this.adv.onLodgingReturn = () => {
      const weekId = getSpireWeekId();
      const weeklyScore = calcWeeklyScore(this.save);
      void processPlayerMailOnLodging(this.save, msg => this.panels.showToast(msg, true));
      window.setTimeout(() => {
        void tryLodgingPubRankToast(this.save, weekId, weeklyScore, msg => {
          this.panels.showToast(msg, true);
        });
      }, 2800);
    };
    this.adv.onUpdate = () => {
      if (this.adv.isAtLodging() && this.adv.isLodgingResting) {
        if (!this.panels.refreshLiveWidgets()) this.panels.render();
      }
    };
    this.adv.onAugmentPick = (pick) => {
      audio.playUpgrade();
      showAugmentPickModal(this.root, this.save, pick, (id) => {
        if (!pickAugment(this.save, id, pick.floorId, pick.choiceIds)) return;
        saveGame(this.save);
        const def = AUGMENT_MAP[id];
        if (def) this.panels.showToast(`✨ 증강: ${def.icon} ${def.name}`);
        this.syncParty();
        this.adv.resumeAfterAugmentPick();
      });
    };
    this.adv.onRivalDuelComplete = (result) => {
      if (result.won) audio.playGold();
      else audio.playFail();
      showRivalDuelResultModal(this.root, result, () => {
        this.adv.resumeAfterRivalDuelResult();
        this.panels.showToast(result.message, result.won);
        saveGame(this.save);
        this.syncParty();
        this.updateHud();
        this.panels.goToLodgingPanel('hub');
        this.panels.render();
        refreshBgm();
      });
    };
    this.adv.onFloor18Celebration = (firstClear) => {
      audio.playUpgrade();
      if (firstClear) {
        this.save.floor18ClearCelebrated = true;
        saveGame(this.save);
      }
      showFloor18ClearModal(this.root, this.save, () => {
        this.adv.clearFloor18Celebration();
        if (this.adv.returnToLodgingDirect()) {
          audio.playTownOpen();
          this.syncParty();
          this.updateLodgingUi();
          this.panels.render();
        }
      }, { firstClear });
    };
    this.adv.onFloor10PhaseIntro = () => {
      showFloor10PhaseModal(this.root, () => {});
    };
    setBgmContextProvider(() => this.buildBgmContext());
    this.adv.onPhaseChange = () => refreshBgm();
    this.adv.onAudio = ev => {
      const schedule = (fn: () => void, ms?: number) => {
        if (ms && ms > 0) setTimeout(fn, ms);
        else fn();
      };
      switch (ev.type) {
        case 'attack': {
          const perf = this.adv.isCombatPerfLite();
          const prestige = getPrestigeJobProfile(this.save, ev.charId);
          schedule(
            () => audio.playCharAttack(ev.charId, ev.crit, ev.skill, ev.ultimate, ev.powerTier ?? 0, prestige),
            ev.swingDelayMs,
          );
          schedule(() => {
            if (ev.playHitLanded && !perf) {
              audio.playHitLanded(ev.charId === 'huchu' || ev.charId === 'yujin');
            }
            if (ev.crit && !ev.ultimate && !ev.skill) audio.playCrit();
          }, ev.hitDelayMs);
          break;
        }
        case 'heal':
          audio.playCombatHeal(ev.charId, ev.targetCount ?? 1, ev.ultimate ?? false);
          break;
        case 'monsterAttack':
          schedule(
            () => audio.playMonsterAttack(ev.monsterId, ev.tinyPack, ev.isBoss, ev.magic, ev.visualSlot ?? 0),
            ev.delayMs,
          );
          break;
        case 'hurt':
          schedule(() => audio.playHitReceived(ev.magic, ev.element), ev.delayMs);
          break;
        case 'dot':
          audio.playDotTick(ev.element);
          break;
        case 'crit': audio.playCrit(); break;
        case 'kill':
          if (!this.adv.isCombatPerfLite() || Math.random() < 0.35) {
            audio.playKill(ev.isBoss ?? false, ev.isElite ?? false);
          }
          break;
        case 'gold': audio.playGold(); break;
        case 'buffApply':
          audio.playBuffApply({
            buffId: ev.buffId,
            skillKind: ev.skillKind,
            hasAtk: ev.hasAtk,
            hasDef: ev.hasDef,
            hasSpd: ev.hasSpd,
          });
          break;
        case 'debuffApply':
          audio.playDebuffApply(ev.debuffId);
          break;
        case 'cleanse':
          audio.playCleanse(ev.charId);
          break;
        case 'touch': audio.playTouch(ev.powerTier ?? 0); break;
        case 'encounter': audio.playEncounter(); break;
        case 'gem': audio.playGemPickup(); break;
      }
    };

    this.renderer = new AdventureRenderer(this.canvas);
    this.panels = new PanelManager(
      root,
      () => this.save,
      () => this.adv,
      () => this.syncParty(),
    );
    setWarehouseAlertHandler(msg => this.panels.showWarehouseAlert(msg));
    this.tutorial = new TutorialOverlay(
      root,
      () => this.save,
      tab => {
        if (tab === 'settings') this.panels.openSettingsPanel();
        else this.panels.switchTab(tab as TabId);
      },
    );
    setSaveErrorHandler(msg => this.panels.showToast(msg, false));
    activeGame = this;
    this.wasAtLodging = this.adv.isAtLodging();
    if (this.wasAtLodging) {
      requestAnimationFrame(() => {
        this.panels.goToLodgingPanel('hub');
      });
    }
    this.lastPanelGold = this.save.gold;

    this.bindTouch();
    this.bindPotion();
    this.bindBossFlee();
    this.bindRest();
    this.bindAudioUnlock();
    this.resize();
    const syncViewportHeight = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-vh', `${Math.round(h)}px`);
      this.resize();
    };
    syncViewportHeight();
    const onViewportChange = () => {
      syncViewportHeight();
    };
    window.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('scroll', onViewportChange);
    if (isStandalonePwa()) {
      document.documentElement.classList.add('pwa-standalone');
    }
    audio.applySettings(this.save);
    refreshBgm();

    if (offlinePreview.exp > 0 || offlinePreview.gold > 0
      || offlinePreview.bossPaceSec > 0 || offlinePreview.codexDiscoveries > 0) {
      this.pendingOffline = offlinePreview;
    }

    void this.startGameLoop();

    requestAnimationFrame(() => {
      if (this.save.rebirthMigrationPending) {
        const n = this.save.rebirthMarks?.length ?? 0;
        const names = (this.save.rebirthMarks ?? [])
          .map(id => CHAR_MAP[id]?.name ?? id)
          .slice(0, 4)
          .join(', ');
        const more = n > 4 ? ` 외 ${n - 4}명` : '';
        this.panels.showToast(
          `🔄 v2.0 밸런스 업데이트 — 새로 시작합니다! ${n}명에게 ♻️환생의 마크(+30% EXP): ${names}${more}`,
          true,
        );
        this.save.rebirthMigrationPending = false;
        saveGame(this.save);
      }
      if (this.pendingOffline) {
        this.showOfflinePreview(this.pendingOffline);
        setTimeout(() => {
          if (this.pendingOffline) this.showOfflinePopup(this.pendingOffline);
        }, 1400);
      }
      this.tutorial.update();
      this.scheduleRetroactiveAugmentPicks();
    });
  }

  /** 기존 유저 — 도달·클리어한 층 소급 증강 선택 시작 */
  startRetroactiveAugmentPicks(floors?: number[]): void {
    if (!this.adv.isAtLodging() || this.adv.isInExpedition()) {
      this.panels.showToast('숙소에서만 증강을 선택할 수 있습니다', false);
      return;
    }
    if (this.adv.augmentPickPending) return;
    this.retroAugmentIsReroll = false;
    this.retroAugmentQueue = floors ?? getPendingAugmentFloors(this.save);
    this.drainRetroactiveAugmentQueue();
  }

  /** 잼 100 — 보유 증강 전체 리롤 */
  rerollAllAugmentsWithGems(): void {
    if (!this.adv.isAtLodging() || this.adv.isInExpedition()) {
      this.panels.showToast('숙소에서만 증강을 다시 돌릴 수 있습니다', false);
      return;
    }
    if (this.adv.augmentPickPending || this.retroAugmentModalOpen) return;

    const count = this.save.augments?.picked?.length ?? 0;
    if (count === 0) {
      this.panels.showToast('다시 돌릴 증강이 없습니다', false);
      return;
    }
    if (this.save.gems < GEM_COST.augmentRerollAll) {
      this.panels.showToast(`💎 잼이 부족합니다 (필요: ${GEM_COST.augmentRerollAll})`, false);
      return;
    }
    showConfirmModal(document.getElementById('game-root') ?? document.body, {
      title: '증강 리롤',
      message: `보유 증강 ${count}개를 초기화하고 층별로 다시 선택합니다.<br/>💎 잼 ${GEM_COST.augmentRerollAll}개를 사용할까요?`,
      confirmLabel: '리롤',
      onConfirm: () => this.doAugmentRerollAll(count),
    });
  }

  private doAugmentRerollAll(count: number): void {
    const floors = tryGemAugmentRerollAll(this.save);
    if (!floors?.length) {
      this.panels.showToast('증강 리롤에 실패했습니다', false);
      return;
    }
    saveGame(this.save);
    this.syncParty();
    this.updateHud();
    this.panels.showToast(`🔄 증강 리롤 — ${floors.length}층 재선택 (💎-${GEM_COST.augmentRerollAll})`, true);
    this.retroAugmentIsReroll = true;
    this.retroAugmentQueue = floors;
    this.panels.render();
    this.drainRetroactiveAugmentQueue();
  }

  private scheduleRetroactiveAugmentPicks(): void {
    if (this.retroAugmentScheduled) return;
    if (!getPendingAugmentFloors(this.save).length) return;
    if (!this.adv.isAtLodging() || this.adv.isInExpedition()) return;
    this.retroAugmentScheduled = true;
    window.setTimeout(() => {
      this.retroAugmentScheduled = false;
      if (!this.adv.isAtLodging() || this.adv.isInExpedition()) return;
      if (document.querySelector('.offline-popup, #expedition-settlement-modal, #augment-pick-modal, #rival-duel-result-modal')) return;
      this.startRetroactiveAugmentPicks();
    }, 600);
  }

  private drainRetroactiveAugmentQueue(): void {
    if (this.retroAugmentModalOpen) return;
    if (!this.adv.isAtLodging() || this.adv.isInExpedition()) return;
    if (this.adv.augmentPickPending) return;
    if (!this.retroAugmentQueue.length) {
      this.retroAugmentQueue = getPendingAugmentFloors(this.save);
    }
    while (this.retroAugmentQueue.length) {
      const floorId = this.retroAugmentQueue[0]!;
      if (hasAugmentForFloor(this.save, floorId)) {
        this.retroAugmentQueue.shift();
        continue;
      }
      const pick = buildAugmentPickForFloor(this.save, floorId);
      if (!pick) {
        markAugmentFloorSkipped(this.save, floorId);
        saveGame(this.save);
        this.retroAugmentQueue.shift();
        continue;
      }
      this.showRetroactiveAugmentModal({
        ...pick,
        retroactive: true,
        reroll: this.retroAugmentIsReroll,
        queueRemaining: this.retroAugmentQueue.length - 1,
      });
      return;
    }
  }

  private showRetroactiveAugmentModal(pick: AugmentPickState): void {
    this.retroAugmentModalOpen = true;
    audio.playUpgrade();
    showAugmentPickModal(this.root, this.save, pick, (id) => {
      if (!pickAugment(this.save, id, pick.floorId, pick.choiceIds)) return;
      saveGame(this.save);
      const def = AUGMENT_MAP[id];
      if (def) this.panels.showToast(`✨ 증강: ${def.icon} ${def.name}`, true);
      this.syncParty();
      this.retroAugmentModalOpen = false;
      if (this.retroAugmentQueue.length && this.retroAugmentQueue[0] === pick.floorId) {
        this.retroAugmentQueue.shift();
      }
      this.panels.render();
      window.setTimeout(() => this.drainRetroactiveAugmentQueue(), 280);
    });
  }

  private unlockAudio() {
    void audio.unlock().then(() => refreshBgm());
  }

  private buildBgmContext() {
    const panel = this.panels.getBgmPanelState();
    const inSpire = this.adv.isInSpireRun();
    return {
      atLodging: this.adv.isAtLodging(),
      phase: this.adv.phase,
      regionId: this.save.currentRegion,
      isBossFight: this.adv.isBossFight,
      isEliteFight: this.adv.isEliteFight,
      isReturningToLodging: this.adv.isReturningToLodging,
      isDefeatRest: this.adv.isDefeatRestActive(),
      worldSub: panel.worldSub,
      campSub: panel.campSub,
      isInSpireRun: inSpire,
      spireFloor: inSpire ? (this.save.spireRun?.floor ?? 1) : undefined,
    };
  }

  private bindAudioUnlock() {
    const unlock = () => this.unlockAudio();
    this.root.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock, { once: true });
  }

  private syncParty() {
    if (!this.panels) return;
    const inFight = this.adv.phase === 'combat' || this.adv.phase === 'boss';
    if (inFight && this.adv.party.length > 0) {
      this.refreshPartyHpInCombat();
    } else {
      this.adv.party = buildPartyCombatants(this.save);
    }
    this.lastPanelGold = this.save.gold;
    this.updatePotionBtn();
    this.updateHud();
    const lightRefresh = this.adv.isInExpedition()
      && (this.adv.phase === 'loot' || this.adv.phase === 'travel');
    if (lightRefresh) {
      this.panels.updateGoldDisplay(this.save.gold);
      return;
    }
    if (this.adv.isInExpedition() && this.panels.refreshLiveWidgets()) {
      this.panels.updateGoldDisplay(this.save.gold);
      return;
    }
    if (this.adv.isAtLodging() && this.adv.isLodgingResting && this.panels.refreshLiveWidgets()) {
      this.panels.updateGoldDisplay(this.save.gold);
      return;
    }
    this.panels.render();
  }

  /** 전투 중 onSave — HP만 반영, 타이머·버프·디버프 유지 */
  private refreshPartyHpInCombat() {
    for (const p of this.adv.party) {
      const saved = this.save.combatHp?.[p.id];
      if (saved != null) p.hp = Math.min(saved, p.maxHp);
    }
  }

  private updateHud() {
    const homeEl = this.root.querySelector('#hud-home');
    const locEl = this.root.querySelector('#hud-location') ?? this.root.querySelector('#hud-region');
    const goldEl = this.root.querySelector('#hud-gold');
    const gemsEl = this.root.querySelector('#hud-gems');
    const home = getHomeStationLabel(this.save);
    const nick = getPlayerNickname(this.save);
    if (homeEl) {
      const team = getAdventureTeamName(this.save);
      const identity = home
        ? (nick ? `${team} · ${nick}` : team)
        : team;
      homeEl.textContent = identity || '';
      homeEl.classList.toggle('hidden', !identity);
    }
    if (locEl) locEl.textContent = this.adv.getCurrentLocationLabel();
    if (goldEl) goldEl.textContent = `🪙 ${this.save.gold.toLocaleString()}`;
    if (gemsEl) gemsEl.textContent = `💎 ${this.save.gems}`;
  }

  private updateBattleHud() {
    const inFight = this.adv.isCombatSkillBarActive();
    const adventureArea = this.root.querySelector('#adventure-area');
    adventureArea?.classList.toggle('in-combat', inFight);
    this.adventureStage.classList.toggle('combat-active', inFight);
    if (inFight !== this.lastInFightLayout) {
      this.lastInFightLayout = inFight;
      requestAnimationFrame(() => {
        this.resize();
        requestAnimationFrame(() => this.resize());
      });
    }
  }

  private updatePotionBtn() {
    const btn = this.root.querySelector('#potion-btn') as HTMLButtonElement | null;
    const costEl = this.root.querySelector('#potion-cost');
    if (!btn) return;
    const n = this.adv.isInExpedition()
      ? getExpeditionPotions(this.save)
      : getPotionStock(this.save);
    if (costEl) costEl.textContent = `×${n}`;
    btn.title = this.adv.isInExpedition()
      ? `HP 포션 — 생존자 +10,000 (휴대 ${n}/${EXPEDITION_POTION_CARRY})`
      : `숙소 창고 💊 ${n}/${MAX_POTION_STOCK} — 원정 시 최대 3개 지참`;
    btn.disabled = n <= 0 || this.adv.isAtLodging() || this.adv.isDefeatRestActive()
      || this.adv.isTraveling() || this.adv.isResting;
  }

  private bindRest() {
    const wrap = this.root.querySelector('#return-lodge-wrap') as HTMLLabelElement | null;
    const check = this.root.querySelector('#return-lodge-pending') as HTMLInputElement | null;
    const openLodgingShop = () => {
      this.unlockAudio();
      this.panels.goToLodgingPanel('trade');
      audio.playTownOpen();
    };
    const toggleReturnPending = () => {
      this.unlockAudio();
      if (!check || this.adv.isAtLodging()) {
        check && (check.checked = false);
        return;
      }
      if (this.adv.isDefeatRestActive() || this.adv.isReturningToLodging) {
        check.checked = this.adv.isPendingReturnToLodging() || this.adv.isReturningToLodging;
        return;
      }
      const on = !check.checked;
      check.checked = on;
      if (this.adv.setPendingReturnToLodging(on)) {
        if (on && this.adv.isReturningToLodging) audio.playTownOpen();
        this.panels.render();
        this.updateHud();
        this.updateLodgingUi();
      } else {
        check.checked = false;
        audio.playFail();
      }
    };
    bindTap(wrap, (e) => {
      if (this.adv.isAtLodging()) {
        e.preventDefault();
        openLodgingShop();
        return;
      }
      if (!check || check.disabled) return;
      e.preventDefault();
      toggleReturnPending();
    });
    check?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
    });
    check?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  private updateLodgingUi() {
    const wrap = this.root.querySelector('#return-lodge-wrap') as HTMLElement | null;
    const check = this.root.querySelector('#return-lodge-pending') as HTMLInputElement | null;
    const label = this.root.querySelector('#return-lodge-label') as HTMLElement | null;
    const hint = this.root.querySelector('.touch-hint');
    const atLodging = this.adv.isAtLodging();
    const returning = this.adv.isReturningToLodging;
    const pending = this.adv.isPendingReturnToLodging();

    if (wrap && check && label) {
      wrap.classList.toggle('lodging-shop-mode', atLodging);
      check.classList.toggle('hidden', atLodging);
      label.textContent = atLodging ? '🏠 상점' : '🏠 마을';
      if (!atLodging) {
        check.disabled = this.adv.isDefeatRestActive() || returning;
        check.checked = returning || pending;
      }
      wrap.title = atLodging
        ? '숙소 상점 열기'
        : returning
          ? '숙소 귀환 중…'
          : pending
            ? '전투 종료 후 숙소로 이동 예약됨'
            : '체크하면 전투가 끝난 뒤 숙소로 이동합니다';
    }
    if (hint) {
      const inFight = this.adv.phase === 'combat' || this.adv.phase === 'boss';
      hint.classList.toggle('hidden', inFight || atLodging);
      if (!inFight && !atLodging) {
        hint.textContent = pending
          ? '전투 후 숙소 이동'
          : returning
            ? '숙소 귀환 중'
            : '연타로 추가 피해';
      }
    }
  }

  private bindBossFlee() {
    bindTap(this.root.querySelector('#boss-flee-btn'), () => {
      this.unlockAudio();
      if (this.adv.fleeBoss()) {
        audio.playFail();
        this.updateBossFleeBtn();
        this.updateHud();
      }
    });
  }

  private updateBossFleeBtn() {
    const btn = this.root.querySelector('#boss-flee-btn') as HTMLButtonElement | null;
    if (!btn) return;
    const show = this.adv.canFleeBoss();
    btn.classList.toggle('hidden', !show);
    if (show) {
      const sec = Math.floor(this.adv.getBossFightElapsedSec());
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      btn.title = `보스전 ${m}:${String(s).padStart(2, '0')} — 전투 포기하고 탐색 재개`;
    }
  }

  isInExpedition(): boolean {
    return this.adv.isInExpedition();
  }

  beginRivalDuel(rival: LeaderboardEntry): { ok: boolean; message: string } {
    const res = this.adv.startRivalDuel(rival);
    if (res.ok) {
      saveGame(this.save);
      this.panels.enterDungeonRun();
      this.syncParty();
      this.updateHud();
      refreshBgm();
      audio.playUpgrade();
      return { ok: true, message: `⚔️ ${rival.nickname} 모험단과 조우!` };
    }
    return { ok: false, message: res.reason ?? '라이벌 격파 시작 실패' };
  }

  private bindPotion() {
    bindTap(this.root.querySelector('#potion-btn'), () => {
      this.unlockAudio();
      if (this.adv.usePotion()) {
        audio.playUpgrade();
        saveGame(this.save);
        this.syncParty();
        this.updatePotionBtn();
      } else {
        audio.playFail();
        this.panels.showToast(this.adv.getPotionFailReason());
      }
    });
    this.updatePotionBtn();
  }

  private resize() {
    const rect = this.adventureStage.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    this.renderer.resize(rect.width, rect.height);
    const partySize = this.save.party.length;
    const skillBarEl = this.root.querySelector('#combat-skill-bar') as HTMLElement | null;
    const measuredBar = skillBarEl && !skillBarEl.classList.contains('hidden')
      ? skillBarEl.getBoundingClientRect().height
      : 0;
    const barH = Math.max(combatSkillBarHeightPx(rect.height, partySize), measuredBar);
    const dock = this.root.querySelector('#combat-skill-bar-dock') as HTMLElement | null;
    dock?.style.setProperty('--combat-skill-bar-h', `${barH}px`);
  }

  private bindTouch() {
    const handler = (e: Event) => {
      if (this.adv.augmentPickPending) return;
      this.unlockAudio();
      this.tutorial.onTouch();
      const dmg = this.adv.touchBurst();
      if (dmg > 0) {
        if (this.save.settings.vibration !== false) void hapticLight();
        saveGame(this.save);
      }
      e.stopPropagation();
    };
    this.canvas.addEventListener('pointerdown', handler);
  }

  private showAssetLoading(show: boolean) {
    const existing = this.root.querySelector('#asset-loading');
    if (!show) {
      existing?.remove();
      return;
    }
    if (existing) return;
    const el = document.createElement('div');
    el.id = 'asset-loading';
    el.className = 'asset-loading-overlay';
    el.innerHTML = '<p class="asset-loading-text">리소스 로딩 중…</p>';
    this.root.appendChild(el);
  }

  private async startGameLoop() {
    this.showAssetLoading(true);
    try {
      await preloadGameAssets(this.save);
    } catch (err) {
      console.warn('[Game] asset preload failed', err);
    }
    this.showAssetLoading(false);
    this.updateHud();
    this.updateLodgingUi();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  /** 백그라운드·화면 꺼짐 시 루프 정지 (자동 잠금·배터리) */
  pauseLoop(): void {
    if (!this.loopActive) return;
    this.loopActive = false;
    cancelAnimationFrame(this.raf);
    this.pauseAndSave();
    audio.stopBGM();
  }

  resumeLoop(): void {
    if (this.loopActive) return;
    this.loopActive = true;
    this.lastTime = performance.now();
    refreshBgm();
    this.loop(this.lastTime);
  }

  private loop(now: number) {
    if (!this.loopActive) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (!this.loopActive) return;
    this.save.stats.playTime += dt;
    this.adv.update(dt);
    this.updateLodgingUi();
    this.updateBattleHud();
    this.skillBar.update(this.save, this.adv);
    if (this.adv.isCombatSkillBarActive()) this.resize();
    this.renderer.render(this.adv, dt);
    this.statusHud.update(this.save, this.adv);
    if (now - this.lastCampTickMs >= 800) {
      tickCampProduction(this.save);
      tickTycoon(this.save, (now - this.lastCampTickMs) / 1000, this.adv.isAtLodging(), this.adv.isInExpedition());
      this.lastCampTickMs = now;
    }
    if (this.panels.needsLiveRefresh() && now - this.lastLivePanelMs >= (this.adv.isCombatPerfLite() ? 480 : 200)) {
      this.lastLivePanelMs = now;
      if (!this.panels.refreshLiveWidgets()) this.panels.render();
    }
    if (now - this.lastBgmSyncMs >= 2800) {
      this.lastBgmSyncMs = now;
      refreshBgm();
    }
    const saveIntervalMs = this.adv.isCombatPerfLite() ? 12000 : 5000;
    if (Math.floor(now / saveIntervalMs) !== Math.floor((now - dt * 1000) / saveIntervalMs)) {
      this.pauseAndSave();
      this.updatePotionBtn();
    }
    this.updateHud();
    this.updateBossFleeBtn();
    if (this.save.gold !== this.lastPanelGold) {
      this.lastPanelGold = this.save.gold;
      this.updatePotionBtn();
      this.panels.updateGoldDisplay(this.save.gold);
    }
    if (this.loopActive) {
      this.raf = requestAnimationFrame(t => this.loop(t));
    }
  }

  private showOfflinePreview(offline: OfflineResult) {
    const el = document.createElement('div');
    el.className = 'offline-preview';
    const parts: string[] = [];
    if (offline.exp > 0) parts.push(`EXP +${offline.exp.toLocaleString()}`);
    if (offline.gold > 0) parts.push(`🪙 +${offline.gold.toLocaleString()}`);
    if (offline.bossPaceSec > 0) parts.push(`보스대기 +${Math.floor(offline.bossPaceSec / 60)}분`);
    el.innerHTML = `<div class="offline-preview-box">
      <span>🌙 ${offline.hours}시간 오프라인</span>
      <strong>${parts.join(' · ')}</strong>
    </div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  private showOfflinePopup(offline: OfflineResult) {
    const el = document.createElement('div');
    el.className = 'offline-popup';
    const expLine = offline.exp > 0
      ? `<p class="offline-reward-exp">✨ EXP <strong>+${offline.exp.toLocaleString()}</strong> (파티에 적용됨)</p>`
      : '';
    const goldLine = offline.gold > 0
      ? `<p class="offline-reward-gold">🪙 골드 <strong>+${offline.gold.toLocaleString()}</strong> (적용됨)</p>`
      : '';
    const paceLine = offline.bossPaceSec > 0
      ? `<p class="hint">⏳ 보스 대기 <strong>+${Math.floor(offline.bossPaceSec / 60)}분</strong> 충전</p>`
      : '';
    const codexLine = offline.codexDiscoveries > 0
      ? `<p class="hint">📖 도감 자동 발견 <strong>+${offline.codexDiscoveries}</strong>종</p>`
      : '';
    el.innerHTML = `
      <div class="offline-box">
        <h3>🌙 오프라인 보상</h3>
        <p class="hint">${offline.hours}시간 동안 자동 성장</p>
        ${expLine}
        ${goldLine}
        ${paceLine}
        ${codexLine}
        <p class="hint offline-cap-hint">최대 12시간까지 누적 · 과도한 보상은 제한됩니다</p>
        <button class="btn-sm gold" id="offline-claim">확인</button>
      </div>`;
    document.body.appendChild(el);
    const refreshAfterOffline = () => {
      this.lastPanelGold = this.save.gold;
      this.panels.updateGoldDisplay(this.save.gold);
      this.syncParty();
      this.updateHud();
    };
    bindTap(el.querySelector('#offline-claim'), () => {
      audio.playGold();
      this.pendingOffline = null;
      refreshAfterOffline();
      el.remove();
      this.scheduleRetroactiveAugmentPicks();
    });
    setTimeout(() => el.remove(), 12000);
  }

  pauseAndSave(): void {
    this.adv.flushPendingSave();
  }

  destroyWithoutSave() {
    cancelAnimationFrame(this.raf);
    audio.stopBGM();
    if (activeGame === this) activeGame = null;
    setSaveErrorHandler(null);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    audio.stopBGM();
    if (!isResetToStarterPending()) this.pauseAndSave();
    if (activeGame === this) activeGame = null;
    setSaveErrorHandler(null);
  }
}
