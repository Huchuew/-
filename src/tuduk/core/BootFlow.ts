import { applyPendingRebirthMarksToSave } from '../systems/RebirthMarkSystem';
import { showStarterSurvey } from '../ui/StarterSurvey';
import type { GameSave } from '../types';
import { bindTap } from '../utils/bindTap';
import { registerPlayerProfile } from '../services/PlayerProfileService';
import {
  clearResetToStarterFlag,
  createStarterSave,
  isResetToStarterPending,
  loadSave,
  saveGame,
  type StarterSaveOpts,
} from './SaveManager';

function showBootError(container: HTMLElement, msg: string) {
  container.innerHTML = `
    <div class="boot-error">
      <p>${msg}</p>
      <button type="button" id="boot-retry">다시 시도</button>
    </div>`;
  bindTap(container.querySelector('#boot-retry'), () => location.reload());
}

export function renderAppShell(container: HTMLElement) {
  container.innerHTML = `
    <div id="tuduk-app">
      <div id="adventure-area">
        <div class="adventure-hud">
          <div class="hud-left">
            <span class="hud-home" id="hud-home"></span>
            <span class="hud-location" id="hud-location">📍 모험 중</span>
          </div>
          <div class="hud-actions">
            <div class="hud-resources">
              <span id="hud-gold">🪙 0</span>
              <span id="hud-gems">💎 0</span>
            </div>
            <div class="battle-controls">
              <label class="return-lodge-check" id="return-lodge-wrap" title="체크 시 전투가 끝나면 숙소로 이동">
                <input type="checkbox" id="return-lodge-pending" />
                <span class="return-lodge-label" id="return-lodge-label">🏠 마을</span>
              </label>
              <button id="hud-settings-btn" class="hud-settings-btn hud-ctrl-btn" type="button" title="설정">⚙️</button>
              <button id="boss-flee-btn" class="boss-flee-btn hud-ctrl-btn hidden" type="button" title="보스전 3분 이상 시 도망">🏃 도망</button>
              <button id="potion-btn" class="potion-btn hud-potion-btn" type="button" title="HP 포션">
                <span class="potion-icon">💊</span>
                <span class="potion-cost" id="potion-cost">×3</span>
              </button>
            </div>
          </div>
        </div>
        <div class="adventure-stage">
          <div class="adventure-canvas-layer">
            <canvas id="adventure-canvas"></canvas>
          </div>
          <div class="adventure-ui-layer">
            <div id="combo-hud" class="combo-hud hidden"></div>
            <div class="touch-hint"></div>
          </div>
        </div>
        <div id="combat-skill-bar-dock" class="combat-skill-bar-dock"></div>
      </div>
      <div id="ui-area">
        <div id="panel-content"></div>
        <nav id="bottom-nav">
          <button class="nav-btn active" data-tab="party"><span class="icon">⚔️</span>모험단</button>
          <button class="nav-btn" data-tab="growth"><span class="icon">⬆️</span>강해지기</button>
          <button class="nav-btn" data-tab="town"><span class="icon">🏘️</span>마을</button>
        </nav>
      </div>
    </div>`;
}

export function startGame(container: HTMLElement, save: GameSave) {
  void import('../Game').then(({ TudakGame }) => {
    try {
      renderAppShell(container);
      const game = new TudakGame(container, save);
      window.addEventListener('beforeunload', () => game.destroy());
    } catch (err) {
      console.error('startGame failed', err);
      showBootError(container, '게임을 시작하지 못했습니다.');
    }
  }).catch((err) => {
    console.error('startGame module load failed', err);
    showBootError(container, '게임을 시작하지 못했습니다.');
  });
}

let surveyCleanup: (() => void) | null = null;

function onStarterPicked(container: HTMLElement, starterId: string, opts?: StarterSaveOpts) {
  try {
    const save = createStarterSave(starterId, opts);
    applyPendingRebirthMarksToSave(save);
    clearResetToStarterFlag();
    saveGame(save);
    void registerPlayerProfile(save).then(res => {
      if (!res.ok) console.warn('[Leaderboard]', res.message);
    });
    startGame(container, save);
  } catch (err) {
    console.error('starter pick failed', err);
    showBootError(container, '캐릭터 선택에 실패했습니다. 새로고침 후 다시 시도해 주세요.');
  }
}

export function showStarterPick(container: HTMLElement) {
  surveyCleanup?.();
  surveyCleanup = showStarterSurvey(container, (starterId, opts) => {
    surveyCleanup?.();
    surveyCleanup = null;
    onStarterPicked(container, starterId, opts);
  });
}

export function continueBoot(container: HTMLElement) {
  try {
    if (isResetToStarterPending() || !loadSave()) {
      showStarterPick(container);
      return;
    }
    const save = loadSave()!;
    void registerPlayerProfile(save).then(res => {
      if (!res.ok && res.message) console.warn('[Leaderboard]', res.message);
    });
    startGame(container, save);
  } catch (err) {
    console.error('continueBoot failed', err);
    showStarterPick(container);
  }
}

/** 설정 → 진행 초기화: 저장 삭제 후 캐릭터 선택 화면 */
export function returnToStarterSelect(container: HTMLElement) {
  void import('../Game').then(({ getActiveGame }) => {
    getActiveGame()?.destroyWithoutSave();
    container.innerHTML = '';
    showStarterPick(container);
  });
}
