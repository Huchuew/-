import type { GameSave } from '../../types';
import type { AdventureSystem } from '../../systems/AdventureSystem';
import { REGIONS } from '../../data/regions';
import { formatAffixTip, getRegionAffix, getWeeklyAffixLabel } from '../../data/regionAffixes';
import { formatEpicVariantLabel } from '../../data/epicVariants';
import { getRegionStory } from '../../data/regionStories';
import { getMinLevelForFloor } from '../../data/floorProgression';
import { getReadinessGradeInfo, isLateGameFloor } from '../../data/lateGameBalance';
import { shouldShowFloor10Intro } from '../../systems/floor10Intro';
import {
  canStartExpedition, hasPartyIncapacitated,
} from '../../systems/CharacterStatusSystem';
import { isPartyFullyHealed } from '../../systems/RestHealingSystem';
import { hasAnyDungeonCampBonus, formatDungeonBonusSummary } from '../../systems/dungeonCampBonuses';
import { getPendingTycoonSummary } from '../../systems/TycoonExpansionSystem';
import {
  canDepartAtFloor,
  canStartShortcutDev,
  formatShortcutDevDuration,
  getFloorClearCount,
  getShortcutClearRequired,
  getShortcutDevGoldCost,
  getShortcutDevDurationSec,
  getShortcutDevRemainSec,
  isShortcutDeveloping,
  isShortcutReady,
  reconcileShortcutDevelopment,
} from '../../systems/DungeonShortcutSystem';

function renderDepartReadiness(save: GameSave, floor: number): string {
  if (!isLateGameFloor(floor)) return '';
  const g = getReadinessGradeInfo(save, floor);
  return `<div class="readiness-grade-card depart-readiness ${g.cssClass}">
      <div class="readiness-grade-head">
        <span>준비도</span>
        <strong>${g.label}</strong>
        <span class="readiness-grade-score">${g.score}%</span>
      </div>
      ${g.issues.length ? `<p class="hint">${g.issues.slice(0, 2).join(' · ')}</p>` : ''}
    </div>`;
}

function renderDepartFloorMeta(floor: number): string {
  const minLv = getMinLevelForFloor(floor);
  const affix = getRegionAffix(floor);
  const weekly = floor >= 3 ? getWeeklyAffixLabel() : '';
  const story = getRegionStory(floor);
  const epicHint = floor >= 10 ? `<p class="hint depart-epic-variant">${formatEpicVariantLabel()}</p>` : '';
  return `<div class="depart-floor-meta">
    ${story ? `<p class="depart-floor-story">${story}</p>` : ''}
    <p class="hint depart-floor-stats">권장 Lv.<b>${minLv}</b> · ${formatAffixTip(affix)}</p>
    ${weekly ? `<p class="hint depart-weekly-affix">${weekly}</p>` : ''}
    ${epicHint}
  </div>`;
}

export function renderLodgingDepartPanel(
  save: GameSave,
  _adv: AdventureSystem,
  selectedFloor: number,
): string {
  reconcileShortcutDevelopment(save);
  const maxR = save.maxRegion ?? 1;
  const expCheck = canStartExpedition(save);
  const floor = Math.min(Math.max(1, selectedFloor), maxR);
  const region = REGIONS.find(r => r.id === floor);
  const departCheck = canDepartAtFloor(save, floor);
  const canDepart = expCheck.ok && departCheck.ok;

  const floorPills = REGIONS.filter(r => r.id <= maxR).map(r => {
    const ready = isShortcutReady(save, r.id);
    const dev = isShortcutDeveloping(save, r.id);
    const active = r.id === floor;
    let tag = '';
    if (r.id === 1) tag = '기본';
    else if (ready) tag = '숏컷';
    else if (dev) tag = '개발';
    else {
      const need = getShortcutClearRequired(r.id);
      const have = getFloorClearCount(save, r.id);
      if (need > 0) tag = `${have}/${need}`;
    }
    return `<button type="button" class="depart-floor-pill ${active ? 'active' : ''} ${ready ? 'ready' : ''} ${dev ? 'dev' : ''}"
      data-depart-floor="${r.id}" aria-pressed="${active}">
      <span class="depart-floor-pill-num">${r.id}</span>
      <span class="depart-floor-pill-name">${r.name}</span>
      ${tag ? `<span class="depart-floor-pill-tag">${tag}</span>` : ''}
    </button>`;
  }).join('');

  let detailBody = '';
  if (floor === 1) {
    detailBody = '<p class="depart-detail-desc">1층부터 일반 원정을 시작합니다. 클리어 후 다음 층으로 진행해요.</p>';
  } else {
    const need = getShortcutClearRequired(floor);
    const have = getFloorClearCount(save, floor);
    const cost = getShortcutDevGoldCost(save, floor);
    const devMin = formatShortcutDevDuration(floor);
    const ready = isShortcutReady(save, floor);
    const dev = isShortcutDeveloping(save, floor);
    const remain = getShortcutDevRemainSec(save, floor);
    const devCheck = canStartShortcutDev(save, floor);
    const totalDev = getShortcutDevDurationSec(floor);

    if (ready) {
      detailBody = `<div class="depart-shortcut-status depart-shortcut-status--ready">
          <span class="depart-shortcut-icon">🛤️</span>
          <div>
            <strong>숏컷 개통 완료</strong>
            <p>출발 시 <b>${floor}층</b>에서 바로 사냥을 시작합니다. 이동 횟수 제한 없음.</p>
          </div>
        </div>`;
    } else if (dev) {
      const m = Math.floor(remain / 60);
      const s = remain % 60;
      const pct = totalDev > 0 ? 1 - remain / totalDev : 0;
      detailBody = `<div class="depart-shortcut-status depart-shortcut-status--dev">
          <span class="depart-shortcut-icon">⏳</span>
          <div>
            <strong>숏컷 개발 중</strong>
            <p>${m}:${String(s).padStart(2, '0')} 후 개통 · 예상 ${devMin}</p>
            <div class="depart-dev-bar"><div class="depart-dev-fill" style="width:${Math.round(Math.max(4, pct * 100))}%"></div></div>
          </div>
        </div>`;
    } else {
      detailBody = `<div class="depart-shortcut-status">
          <span class="depart-shortcut-icon">🪨</span>
          <div>
            <strong>${floor}층 숏컷 뚫기</strong>
            <p>해당 층 보스 클리어 <b>${have}/${need}회</b> · 개발 <b>${devMin}</b> · 🪙<b>${cost.toLocaleString()}</b></p>
            <p class="hint">${devCheck.ok ? '개발을 시작하면 완료 후 해당 층으로 바로 출발할 수 있어요.' : devCheck.reason}</p>
          </div>
        </div>
        <button type="button" class="btn-sm gold depart-shortcut-dev-btn" data-shortcut-dev="${floor}"
          ${devCheck.ok ? '' : 'disabled'}>🛠️ 숏컷 뚫기 (${devMin})</button>`;
    }
  }

  const hpWarn = !isPartyFullyHealed(save)
    ? '<p class="hint warn">⚠️ HP 미회복 — 만피 후 출발을 권장합니다</p>'
    : '';
  const bonusHint = hasAnyDungeonCampBonus(save)
    ? `<p class="hint">${formatDungeonBonusSummary(save)}</p>`
    : '';
  const pending = getPendingTycoonSummary(save);
  const pendingBlock = pending.gold > 0 || pending.matQty > 0
    ? `<div class="tycoon-dash-pending expedition-pending">적립 🪙${pending.gold.toLocaleString()}${pending.matQty > 0 ? ` · 재료 ${pending.matQty}` : ''}</div>`
    : '';

  const departLabel = floor === 1
    ? '1층부터 출발'
    : departCheck.useShortcut
      ? `숏컷 이동 · ${floor}층 출발`
      : `${floor}층 출발`;

  const failReason = !expCheck.ok
    ? expCheck.reason
    : !departCheck.ok
      ? departCheck.reason
      : '';

  const phase2Hint = floor >= 10 && !shouldShowFloor10Intro(save, floor)
    ? `<p class="hint depart-phase2-hint">⚡ 2막 구간 — 준비도·4인 편성·캠프 던전 버프를 챙기세요</p>`
    : '';

  return `<section class="depart-panel">
    <div class="depart-panel-head">
      <h4>출발 층 선택</h4>
      <span class="badge">최고 ${maxR}층</span>
    </div>
    <div class="depart-floor-scroll" role="listbox" aria-label="출발 층">${floorPills}</div>
    <div class="depart-detail-card" style="--floor-accent:${region?.bgBottom ?? '#445'}">
      <div class="depart-detail-top">
        <span class="depart-detail-floor">${floor}층</span>
        <strong>${region?.name ?? ''}</strong>
      </div>
      ${renderDepartFloorMeta(floor)}
      ${renderDepartReadiness(save, floor)}
      ${detailBody}
    </div>
    ${phase2Hint}
    ${hpWarn}
    ${bonusHint}
    ${pendingBlock}
    <button type="button" class="btn-primary expedition-btn depart-main-btn" id="start-expedition"
      data-depart-target="${floor}" ${canDepart ? '' : 'disabled'}>${departLabel}</button>
    ${failReason
      ? `<p class="hint warn depart-fail-reason" ${hasPartyIncapacitated(save) ? 'id="party-expedition-incap"' : ''}>${failReason}</p>`
      : ''}
  </section>`;
}
