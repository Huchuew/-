import type { GameSave } from '../../types';
import { formatSpireBasementFloor } from '../../data/endgame/spireDepth';
import { CHAR_MAP } from '../../data/characters';
import { RELICS } from '../../data/endgame/relics';
import {
  getSpireWeekId, getWeeklySpireModifier, SPIRE_DAILY_ATTEMPTS,
} from '../../data/endgame/spire';
import {
  ensureEndgame, getEndgameLockHint, getEndgameProgressSummary, getEndgameTeaserLore,
  getEndgameTeaserProgress, getRelicBonuses, isAscended, isEndgameTeaserVisible, isEndgameUnlocked,
} from '../../systems/EndgameSystem';
import { isSpireTestBypass } from '../../data/endgame/spireTest';
import { canAttemptSpire, SPIRE_ATTEMPT_CHARGE_FLOOR } from '../../systems/SpireRunSystem';
import {
  attemptAscension, canAscend, getAscensionCostText, hasPrestigeComplete,
} from '../../systems/AscensionSystem';
import { getPartyDps } from '../../systems/StatCalculator';
import { MATERIAL_LABELS } from '../../data/equipment';
import { audio } from '../../core/AudioManager';
import { bindTap } from '../../utils/bindTap';
import type { PanelHost } from './PanelHost';

const ACTIVE_RELICS = RELICS.filter(r => !r.id.includes('rift'));

export function renderEndgamePanel(host: PanelHost, save: GameSave, prefix = ''): void {
  const spireTest = isSpireTestBypass();
  const unlocked = isEndgameUnlocked(save);

  if (!unlocked && !spireTest) {
    const teaser = isEndgameTeaserVisible(save) ? getEndgameTeaserProgress(save) : null;
    const lore = teaser ? getEndgameTeaserLore(save) : '';
    const maxR = save.maxRegion ?? 1;
    host.panelEl.innerHTML = `${prefix}
      <div class="panel-header"><h3>🗼 야탑</h3></div>
      <div class="endgame-locked endgame-teaser-panel">
        <p class="endgame-lock-icon">${teaser ? '🌫️' : '🔒'}</p>
        <p><strong>${teaser ? '야탑의 문 — 곧 열립니다' : '야탑 잠김'}</strong></p>
        ${teaser
          ? `<p class="endgame-teaser-lore">${lore}</p>
             <div class="endgame-teaser-progress">
               <div class="endgame-teaser-bar"><div class="endgame-teaser-fill" style="width:${teaser.progressPct}%"></div></div>
               <p class="hint">현재 ${maxR}층 · ${getEndgameLockHint(save)}</p>
             </div>
             <p class="hint">18층 정복 시 무한의 탑 · 유물 · 전설 각성이 열립니다</p>`
          : `<p class="hint">${getEndgameLockHint(save) || '15층 클리어 후 힌트가 공개됩니다'}</p>`}
      </div>`;
    return;
  }

  ensureEndgame(save);
  const eg = save.endgame!;

  if (!unlocked && spireTest) {
    host.endgameSub = 'spire';
  }

  const summary = getEndgameProgressSummary(save);
  const nav = host.subTabs(host.endgameSub, [
    { id: 'spire', label: '🗼 야탑' },
    { id: 'relics', label: '💎 유물' },
    { id: 'ascend', label: '✨ 각성' },
  ]);
  const essenceN = save.materials.spire_essence ?? 0;
  let body = '';

  if (host.endgameSub === 'spire') {
    const week = getSpireWeekId();
    const mod = getWeeklySpireModifier(week);
    const dps = getPartyDps(save, Math.floor(30 + Math.max(1, eg.spireBest) * 5));
    const can = canAttemptSpire(save);
    body = `
      <div class="endgame-card">
        <h4>지하 야탑 · 최심층 ${formatSpireBasementFloor(eg.spireBest)}</h4>
        <p class="hint">문 너머는 위가 아니라 아래. B1부터 심연으로 하강합니다.</p>
        <p class="hint">이번 주 [${mod.name}] ${mod.desc}</p>
        <p class="hint">주간 최심층 ${formatSpireBasementFloor(eg.spireWeekBest)} · 오늘 도전 ${eg.spireAttempts}/${SPIRE_DAILY_ATTEMPTS}</p>
        <p class="hint">${MATERIAL_LABELS.spire_essence} ${essenceN}개 · B25/30/35/40 클리어 시 1개씩 · 주간 미션 전부 클리어 시 +1</p>
        <p><strong>매 도전 B1부터</strong> · ${SPIRE_ATTEMPT_CHARGE_FLOOR}층+ 또는 기록 갱신 시 시도권 차감</p>
        <p class="hint">B20+ 심연 — BGM 소거 · 스킬바 숨김 · 투닥만 남습니다</p>
        <p class="hint">현재 전투력 ${dps.toLocaleString()} · 스크롤 전투로 무한 하강</p>
        <button class="btn-sm gold" id="spire-attempt" ${can.ok ? '' : 'disabled'}>야탑 하강 (1회)</button>
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
    const rows = ACTIVE_RELICS.map(r => {
      const owned = eg.relics.includes(r.id);
      return `<div class="relic-row ${owned ? 'owned' : 'locked'}">
        <span>${owned ? '💎' : '🔒'}</span>
        <div><strong>${r.name}</strong><p class="hint">${r.desc} · ${r.source}</p></div>
      </div>`;
    }).join('');
    body = `
      <p class="hint">유물 ${eg.relics.length}/${ACTIVE_RELICS.length} · 합산: ${bonusLine}</p>
      <p class="hint">야탑·도감·각성 마일스톤으로 획득 · 전설 장신구는 던전 극희귀 드랍</p>
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
        <p class="hint">Lv.${st?.level ?? 0} · 4차전직 ${hasPrestigeComplete(st!, charId) ? '✅' : '❌'} · 야탑 ${formatSpireBasementFloor(eg.spireBest)} · 심핵 ${essenceN}개</p>
        ${ascended
          ? '<p class="endgame-done">✨ 각성 완료 — 전 스탯 +28%</p>'
          : `<button class="btn-sm gold" id="ascend-btn" ${can.ok ? '' : 'disabled'}>전설 각성</button>
             ${!can.ok ? `<p class="hint warn">${can.reason}</p>` : ''}`}
      </div>`;
  }

  host.panelEl.innerHTML = `${prefix}
    <div class="panel-header">
      <h3>🗼 야탑</h3>
      <span class="badge">${summary}</span>
    </div>
    ${nav}${body}`;
  bindEndgameActions(host);
}

function bindEndgameActions(host: PanelHost): void {
  bindTap(host.panelEl.querySelector('#spire-attempt'), () => {
    const save = host.getSave();
    const check = canAttemptSpire(save);
    if (!check.ok) {
      audio.playFail();
      host.showToast(check.reason ?? '야탑에 진입할 수 없습니다', false);
      return;
    }
    if (host.getAdv().startSpireExpedition()) {
      audio.playUpgrade();
      host.enterDungeonRun();
    } else {
      audio.playFail();
      host.showToast('야탑 시작 실패', false);
    }
  });
  bindTap(host.panelEl.querySelector('#ascend-btn'), () => {
    const save = host.getSave();
    const charId = host.ascendCharId;
    const res = attemptAscension(save, charId);
    if (res.ok) {
      audio.playAscension(charId);
      host.showToast(res.message);
    } else {
      audio.playFail();
      host.showToast(res.message, false);
    }
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
