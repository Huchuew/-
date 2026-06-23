import type { GameSave } from '../../types';
import { CHAR_MAP } from '../../data/characters';
import { ELEMENT_ICON } from '../../data/elemental';
import { getRiftFloor, RIFT_DAILY_KEYS, RIFT_MAX_FLOOR } from '../../data/endgame/riftFloors';
import { RELICS } from '../../data/endgame/relics';
import {
  getSpireFloorDps, getSpireWeekId, getWeeklySpireModifier, SPIRE_DAILY_ATTEMPTS,
} from '../../data/endgame/spire';
import {
  ensureEndgame, getEndgameLockHint, getEndgameProgressSummary, getRelicBonuses, isAscended, isEndgameUnlocked,
} from '../../systems/EndgameSystem';
import {
  canAttemptRift, getRiftCombatSetup, resolveRiftCombat,
} from '../../systems/RiftSystem';
import { canAttemptSpire, getSpireCombatSetup, resolveSpireCombat } from '../../systems/SpireSystem';
import {
  attemptAscension, canAscend, getAscensionCostText, hasPrestigeComplete,
} from '../../systems/AscensionSystem';
import { getPartyDps } from '../../systems/StatCalculator';
import { audio } from '../../core/AudioManager';
import { bindTap } from '../../utils/bindTap';
import { runRiftCombatOverlay } from '../RiftCombatOverlay';
import { runSpireCombatOverlay } from '../SpireCombatOverlay';
import type { PanelHost } from './PanelHost';

export function renderEndgamePanel(host: PanelHost, save: GameSave, prefix = ''): void {
  if (!isEndgameUnlocked(save)) {
    host.panelEl.innerHTML = `${prefix}
      <div class="panel-header"><h3>🌌 차원</h3></div>
      <div class="endgame-locked">
        <p class="endgame-lock-icon">🔒</p>
        <p><strong>엔드 콘텐츠 잠김</strong></p>
        <p class="hint">${getEndgameLockHint(save)} 후 해금</p>
        <p class="hint">현재 · 지역 ${save.maxRegion}/18 · 18층 배지 ${save.badges.includes(18) ? '✅' : '❌'} · 최종보스 ${(save.codex.boss_final?.kills ?? 0) > 0 ? '✅' : '❌'}</p>
      </div>`;
    return;
  }

  ensureEndgame(save);
  const eg = save.endgame!;
  const nav = host.subTabs(host.endgameSub, [
    { id: 'rift', label: '🌌 균열' },
    { id: 'spire', label: '🗼 탑' },
    { id: 'relics', label: '💎 유물' },
    { id: 'ascend', label: '✨ 각성' },
  ]);
  const summary = getEndgameProgressSummary(save);
  const voidN = save.materials.void_shard ?? 0;
  const crystalN = save.materials.rift_crystal ?? 0;
  let body = '';

  if (host.endgameSub === 'rift') {
    const next = eg.riftCleared + 1;
    const floor = getRiftFloor(next);
    const dps = floor ? getPartyDps(save, Math.floor(40 + next * 8)) : 0;
    const can = canAttemptRift(save);
    const cleared = eg.riftCleared >= RIFT_MAX_FLOOR;
    body = `
      <div class="endgame-card">
        <h4>차원 균열 · ${eg.riftCleared}/${RIFT_MAX_FLOOR}층</h4>
        <p class="hint">일일 열쇠 ${eg.riftKeys}/${RIFT_DAILY_KEYS} · 공허 ${voidN} · 결정 ${crystalN}</p>
        ${cleared
          ? '<p class="endgame-done">🏆 모든 층을 정복했습니다!</p>'
          : floor ? `
            <p><strong>${next}층 ${floor.name}</strong> · ${floor.zone} ${ELEMENT_ICON[floor.element]}</p>
            <p class="hint">필요 DPS ${floor.requiredDps.toLocaleString()} · 현재 ${dps.toLocaleString()}</p>
            <p class="hint">보상 🪙${floor.gold.toLocaleString()} · 공허×${floor.voidShards}${floor.riftCrystals ? ` · 결정×${floor.riftCrystals}` : ''}</p>
            <p class="hint">균열 진입 시 10초 미니 전투 — 투닥으로 화력 보조!</p>
            <button class="btn-sm gold" id="rift-attempt" ${can.ok ? '' : 'disabled'}>균열 진입 (열쇠 1)</button>
            ${!can.ok ? `<p class="hint warn">${can.reason}</p>` : ''}
          ` : ''}
      </div>`;
  } else if (host.endgameSub === 'spire') {
    const week = getSpireWeekId();
    const mod = getWeeklySpireModifier(week);
    const next = eg.spireBest + 1;
    const required = getSpireFloorDps(next, week);
    const dps = getPartyDps(save, Math.floor(30 + next * 5));
    const can = canAttemptSpire(save);
    body = `
      <div class="endgame-card">
        <h4>무한의 탑 · 최고 ${eg.spireBest}층</h4>
        <p class="hint">이번 주 [${mod.name}] ${mod.desc}</p>
        <p class="hint">주간 최고 ${eg.spireWeekBest}층 · 오늘 도전 ${eg.spireAttempts}/${SPIRE_DAILY_ATTEMPTS}</p>
        <p><strong>다음 ${next}층</strong> · 필요 DPS ${required.toLocaleString()} · 현재 ${dps.toLocaleString()}</p>
        <p class="hint">탑 진입 시 10초 등반 미니 전투 — 투닥으로 화력 보조!</p>
        <button class="btn-sm gold" id="spire-attempt" ${can.ok ? '' : 'disabled'}>탑 진입 (도전 1)</button>
        ${!can.ok ? `<p class="hint warn">${can.reason}</p>` : ''}
      </div>`;
  } else if (host.endgameSub === 'relics') {
    const relicB = getRelicBonuses(save);
    const bonusLine = [
      relicB.atk ? `ATK+${Math.round(relicB.atk * 100)}%` : '',
      relicB.hp ? `HP+${Math.round(relicB.hp * 100)}%` : '',
      relicB.def ? `DEF+${Math.round(relicB.def * 100)}%` : '',
      relicB.crit ? `치명+${Math.round(relicB.crit * 100)}%` : '',
      relicB.spd ? `공속+${Math.round(relicB.spd * 100)}%` : '',
      relicB.exp ? `EXP+${Math.round(relicB.exp * 100)}%` : '',
      relicB.gold ? `골드+${Math.round(relicB.gold * 100)}%` : '',
    ].filter(Boolean).join(' · ') || '보너스 없음';
    const rows = RELICS.map(r => {
      const owned = eg.relics.includes(r.id);
      return `<div class="relic-row ${owned ? 'owned' : 'locked'}">
        <span>${owned ? '💎' : '🔒'}</span>
        <div><strong>${r.name}</strong><p class="hint">${r.desc} · ${r.source}</p></div>
      </div>`;
    }).join('');
    body = `
      <p class="hint">유물 ${eg.relics.length}/${RELICS.length} · 합산: ${bonusLine}</p>
      <div class="relic-list">${rows}</div>`;
  } else {
    if (!save.owned.includes(host.ascendCharId)) {
      host.ascendCharId = save.owned[0] ?? 'mujang';
    }
    const charId = host.ascendCharId;
    const def = CHAR_MAP[charId]!;
    const st = save.chars[charId];
    const ascended = isAscended(save, charId);
    const can = canAscend(save, charId);
    const cards = save.owned.map(id => {
      const d = CHAR_MAP[id]!;
      const done = isAscended(save, id);
      return `<button class="char-tab ${id === charId ? 'active' : ''}" data-achar="${id}">${d.name}${done ? ' ✨' : ''}</button>`;
    }).join('');
    body = `
      <div class="char-tabs">${cards}</div>
      <div class="endgame-card">
        <h4>${def.name} 전설 각성</h4>
        <p class="hint">${getAscensionCostText()}</p>
        <p class="hint">Lv.${st?.level ?? 0} · 전직 ${hasPrestigeComplete(st!, charId) ? '✅' : '❌'} · 균열 ${eg.riftCleared}층</p>
        ${ascended
          ? '<p class="endgame-done">✨ 각성 완료 — 전 스탯 +28%</p>'
          : `<button class="btn-sm gold" id="ascend-btn" ${can.ok ? '' : 'disabled'}>전설 각성</button>
             ${!can.ok ? `<p class="hint warn">${can.reason}</p>` : ''}`}
      </div>`;
  }

  host.panelEl.innerHTML = `${prefix}
    <div class="panel-header">
      <h3>🌌 차원</h3>
      <span class="badge">${summary}</span>
    </div>
    ${nav}${body}`;
  bindEndgameActions(host);
}

function bindEndgameActions(host: PanelHost): void {
  bindTap(host.panelEl.querySelector('#rift-attempt'), () => {
    const save = host.getSave();
    const setup = getRiftCombatSetup(save);
    if (!setup) {
      audio.playFail();
      host.showToast('균열에 진입할 수 없습니다', false);
      return;
    }
    void runRiftCombatOverlay(setup, (result) => {
      const res = resolveRiftCombat(save, result.damageDealt, result.tapCount);
      if (!res.ok) { audio.playFail(); host.showToast(res.message, false); return; }
      if (res.win) { audio.playUpgrade(); host.showToast(res.message); }
      else { audio.playFail(); host.showToast(res.message, false); }
      host.onRefresh();
      host.render();
    });
  });
  bindTap(host.panelEl.querySelector('#spire-attempt'), () => {
    const save = host.getSave();
    const setup = getSpireCombatSetup(save);
    if (!setup) {
      audio.playFail();
      host.showToast('탑에 진입할 수 없습니다', false);
      return;
    }
    void runSpireCombatOverlay(setup, (result) => {
      const res = resolveSpireCombat(save, result.damageDealt, result.tapCount);
      if (!res.ok) { audio.playFail(); host.showToast(res.message, false); return; }
      if (res.win) { audio.playUpgrade(); host.showToast(res.message); }
      else { audio.playFail(); host.showToast(res.message, false); }
      host.onRefresh();
      host.render();
    });
  });
  bindTap(host.panelEl.querySelector('#ascend-btn'), () => {
    const save = host.getSave();
    const res = attemptAscension(save, host.ascendCharId);
    if (res.ok) { audio.playUpgrade(); host.showToast(res.message); }
    else { audio.playFail(); host.showToast(res.message, false); }
    host.onRefresh();
    host.render();
  });
  host.panelEl.querySelectorAll('[data-achar]').forEach(btn => {
    bindTap(btn, () => {
      host.ascendCharId = (btn as HTMLElement).dataset.achar!;
      host.render();
    });
  });
}
