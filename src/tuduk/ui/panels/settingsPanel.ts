import type { GameSave } from '../../types';
import { resetGameToFreshStart, saveGame } from '../../core/SaveManager';
import { returnToStarterSelect } from '../../core/BootFlow';
import {
  GEM_COST, canGemMaterialCrate, canGemPotion, canGemSpeedBoost,
  spendGemPotion, tryGemMaterialCrate, tryGemSpeedBoost,
} from '../../systems/GemShop';
import { audio } from '../../core/AudioManager';
import { refreshBgm } from '../../core/bgmContext';
import { APP_VERSION, STUDIO_NAME } from '../../config/release';
import { openPrivacyPolicy } from '../../utils/openPrivacy';
import { showConfirmModal } from '../confirmModal';
import { bindTap } from '../../utils/bindTap';
import { hapticLight, setVibrationEnabled } from '../../core/Haptics';
import { getAdventureTeamName, getPlayerNickname, normalizeTeamIdentity, validateTeamIdentity } from '../../data/starterSurvey';
import { updatePlayerIdentity } from '../../services/PlayerProfileService';
import type { PanelHost } from './PanelHost';

function volPct(v: number | undefined, fallback: number): number {
  return Math.round((v ?? fallback) * 100);
}

export function renderSettingsPanel(host: PanelHost, save: GameSave, prefix = ''): void {
  const adv = host.getAdv();
  const gemPotionReady = canGemPotion(save) && adv.canUseFreePotion();
  const bgmVol = volPct(save.settings.bgmVolume, 0.82);
  const sfxVol = volPct(save.settings.sfxVolume, 0.58);

  host.panelEl.innerHTML = `${prefix}
    <div class="panel-header"><h3>설정</h3><span class="badge">💎 ${save.gems}</span></div>
    <div class="settings-section profile-settings">
      <h4>모험단 프로필</h4>
      <p class="hint">닉네임은 전 서버 유일 · 랭킹에 표시됩니다</p>
      <label class="survey-field">
        <span>모험단 이름</span>
        <input type="text" class="survey-input" id="settings-team-name" maxlength="16"
          value="${getAdventureTeamName(save)}" />
      </label>
      <label class="survey-field">
        <span>대표 닉네임</span>
        <input type="text" class="survey-input" id="settings-player-nick" maxlength="10"
          value="${getPlayerNickname(save)}" autocomplete="off" />
      </label>
      <p class="hint">닉네임 변경 시 💎${GEM_COST.nicknameChange} · 모험단 이름은 무료</p>
      <p class="survey-field-error hidden" id="settings-profile-error" role="alert"></p>
      <button type="button" class="btn-sm gold" id="settings-save-profile">프로필 저장 · 랭킹 반영</button>
    </div>
    <div class="settings-section stats-panel">
      <h4>플레이 통계</h4>
      <p class="hint">투닥 ${(save.stats.touchCount ?? 0).toLocaleString()}회 · 처치 ${(save.stats.totalKills ?? 0).toLocaleString()} · 전멸 ${save.stats.defeatCount ?? 0}</p>
      <p class="hint">최고 층 ${save.maxRegion ?? 1} · 업적 ${save.achievements.length} · 플레이 ${Math.floor((save.stats.playTime ?? 0) / 3600)}시간</p>
    </div>
    <div class="settings-section gem-shop-section">
      <h4>젬 상점</h4>
      <div class="gem-shop-grid">
        <button class="btn-sm gold" id="gem-potion" ${gemPotionReady ? '' : 'disabled'}>
          HP 전체 회복 💎${GEM_COST.freePotion}
        </button>
        <button class="btn-sm support" id="gem-speed" ${canGemSpeedBoost(save) ? '' : 'disabled'}>
          2배속 30분 💎${GEM_COST.speedBoost}
        </button>
        <button class="btn-sm support" id="gem-crate" ${canGemMaterialCrate(save) ? '' : 'disabled'}>
          재료 상자 💎${GEM_COST.materialCrate}
        </button>
      </div>
      ${host.panelDetails('기타 젬 소비', `<p class="hint">벽보 확정 💎${GEM_COST.recruitGuarantee} · 새로고침 💎${GEM_COST.bulletinReroll} · 길드 가속 💎${GEM_COST.dispatchRush} · 성장 부스트 💎${GEM_COST.growthBoost}</p>`)}
    </div>
    <div class="settings-section audio-settings">
      <h4>사운드·진동</h4>
      <label class="setting-row"><input type="checkbox" id="bgm" ${save.settings.bgm !== false ? 'checked' : ''}/> 배경음악</label>
      <div class="volume-row">
        <label class="volume-label" for="bgm-volume">배경음 크기</label>
        <input type="range" id="bgm-volume" class="volume-slider" min="0" max="100" value="${bgmVol}" ${save.settings.bgm === false ? 'disabled' : ''}/>
        <span class="volume-value" id="bgm-volume-val">${bgmVol}%</span>
      </div>
      <label class="setting-row"><input type="checkbox" id="sfx" ${save.settings.sfx !== false ? 'checked' : ''}/> 효과음</label>
      <div class="volume-row">
        <label class="volume-label" for="sfx-volume">효과음 크기</label>
        <input type="range" id="sfx-volume" class="volume-slider" min="0" max="100" value="${sfxVol}" ${save.settings.sfx === false ? 'disabled' : ''}/>
        <span class="volume-value" id="sfx-volume-val">${sfxVol}%</span>
      </div>
      <label class="setting-row"><input type="checkbox" id="vibration" ${save.settings.vibration !== false ? 'checked' : ''}/> 진동 (터치·UI 피드백)</label>
    </div>
    <button type="button" class="btn-sm danger" id="reset-save">진행 초기화</button>
    <button type="button" class="btn-sm link-btn privacy-link" id="open-privacy">개인정보처리방침</button>
    <p class="hint settings-version">v${APP_VERSION} · ${STUDIO_NAME}</p>`;

  const bgmSlider = host.panelEl.querySelector('#bgm-volume') as HTMLInputElement | null;
  const sfxSlider = host.panelEl.querySelector('#sfx-volume') as HTMLInputElement | null;
  const bgmVal = host.panelEl.querySelector('#bgm-volume-val');
  const sfxVal = host.panelEl.querySelector('#sfx-volume-val');

  host.panelEl.querySelector('#bgm')?.addEventListener('change', e => {
    const on = (e.target as HTMLInputElement).checked;
    save.settings.bgm = on;
    audio.setBgm(on);
    if (bgmSlider) bgmSlider.disabled = !on;
    if (on) {
      audio.setBgmVolume((save.settings.bgmVolume ?? 0.82));
      void audio.unlock().then(() => refreshBgm());
    }
    saveGame(save);
  });
  bgmSlider?.addEventListener('input', e => {
    const pct = parseInt((e.target as HTMLInputElement).value, 10);
    save.settings.bgmVolume = pct / 100;
    if (bgmVal) bgmVal.textContent = `${pct}%`;
    audio.setBgmVolume(save.settings.bgmVolume);
    saveGame(save);
  });
  host.panelEl.querySelector('#sfx')?.addEventListener('change', e => {
    const on = (e.target as HTMLInputElement).checked;
    save.settings.sfx = on;
    audio.setSfx(on);
    if (sfxSlider) sfxSlider.disabled = !on;
    if (on) audio.setSfxVolume(save.settings.sfxVolume ?? 0.58);
    saveGame(save);
  });
  sfxSlider?.addEventListener('input', e => {
    const pct = parseInt((e.target as HTMLInputElement).value, 10);
    save.settings.sfxVolume = pct / 100;
    if (sfxVal) sfxVal.textContent = `${pct}%`;
    audio.setSfxVolume(save.settings.sfxVolume);
    if (pct > 0) audio.playConfirm();
    saveGame(save);
  });
  host.panelEl.querySelector('#vibration')?.addEventListener('change', e => {
    const on = (e.target as HTMLInputElement).checked;
    save.settings.vibration = on;
    setVibrationEnabled(on);
    saveGame(save);
    if (on) void hapticLight();
  });
  bindTap(host.panelEl.querySelector('#gem-potion'), () => {
    const advRef = host.getAdv();
    if (!canGemPotion(host.getSave())) { audio.playFail(); return; }
    if (!advRef.canUseFreePotion()) {
      audio.playFail();
      host.showToast(advRef.getFreePotionFailReason(), false);
      return;
    }
    const s = host.getSave();
    if (!spendGemPotion(s)) { audio.playFail(); return; }
    if (!advRef.useFreePotion()) {
      s.gems += GEM_COST.freePotion;
      audio.playFail();
      host.showToast(advRef.getFreePotionFailReason(), false);
      saveGame(s);
      host.onRefresh();
      host.render();
      return;
    }
    audio.playUpgrade();
    saveGame(s);
    host.onRefresh();
    host.render();
  });
  bindTap(host.panelEl.querySelector('#gem-speed'), () => {
    const s = host.getSave();
    if (!tryGemSpeedBoost(s)) { audio.playFail(); return; }
    audio.playUpgrade();
    host.showToast('⚡ 2배속 30분 연장!');
    saveGame(s);
    host.onRefresh();
    host.render();
  });
  bindTap(host.panelEl.querySelector('#gem-crate'), () => {
    const s = host.getSave();
    const res = tryGemMaterialCrate(s);
    if (!res.ok) { audio.playFail(); return; }
    audio.playGold();
    host.showToast(res.message);
    saveGame(s);
    host.onRefresh();
    host.render();
  });
  bindTap(host.panelEl.querySelector('#settings-save-profile'), () => {
    const teamInput = host.panelEl.querySelector('#settings-team-name') as HTMLInputElement | null;
    const nickInput = host.panelEl.querySelector('#settings-player-nick') as HTMLInputElement | null;
    const errEl = host.panelEl.querySelector('#settings-profile-error') as HTMLElement | null;
    const err = validateTeamIdentity(teamInput?.value ?? '', nickInput?.value ?? '');
    if (err) {
      if (errEl) { errEl.textContent = err; errEl.classList.remove('hidden'); }
      return;
    }
    const ids = normalizeTeamIdentity(teamInput?.value ?? '', nickInput?.value ?? '', save.homeStationId);
    if (!ids.playerNickname) return;
    const prevNick = getPlayerNickname(save);
    const nickChanged = ids.playerNickname !== prevNick;
    if (nickChanged) {
      if (save.gems < GEM_COST.nicknameChange) {
        if (errEl) {
          errEl.textContent = `닉네임 변경에 💎${GEM_COST.nicknameChange}이 필요합니다 (보유 ${save.gems})`;
          errEl.classList.remove('hidden');
        }
        audio.playFail();
        return;
      }
    }
    if (errEl) errEl.classList.add('hidden');
    const btn = host.panelEl.querySelector('#settings-save-profile') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    void updatePlayerIdentity(save, ids.playerNickname, ids.adventureTeamName).then(res => {
      if (btn) btn.disabled = false;
      if (res.ok) {
        if (nickChanged) save.gems -= GEM_COST.nicknameChange;
        audio.playConfirm();
        host.showToast(res.message, true);
        saveGame(save);
        host.onRefresh();
      } else {
        audio.playFail();
        if (errEl) { errEl.textContent = res.message; errEl.classList.remove('hidden'); }
        host.showToast(res.message, false);
      }
    });
  });
  bindTap(host.panelEl.querySelector('#open-privacy'), () => openPrivacyPolicy());
  bindTap(host.panelEl.querySelector('#reset-save'), () => {
    const root = document.getElementById('game-container') ?? document.body;
    showConfirmModal(root, {
      title: '⚠️ 진행 초기화',
      message: '모든 진행이 삭제되고 캐릭터 선택부터 다시 시작합니다.<br><br>키운 캐릭터는 <b>환생의 마크</b>(+30% EXP)만 유지됩니다.<br><br>정말 초기화할까요?',
      confirmLabel: '예, 초기화',
      cancelLabel: '아니오',
      danger: true,
      onConfirm: () => {
        resetGameToFreshStart();
        if (root instanceof HTMLElement && root.id === 'game-container') returnToStarterSelect(root);
        else location.reload();
      },
    });
  });
}
