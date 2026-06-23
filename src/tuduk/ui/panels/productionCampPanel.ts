import type { GameSave } from '../../types';
import type { CampBuildingDef } from '../../data/campBuildings';
import {
  CAMP_BUILDINGS, CAMP_PRODUCTION_BUILDINGS, formatInterval, formatIntervalSec,
  getBuildingOutputAmount, isBuildingUnlocked, type CampBuildingId,
} from '../../data/campBuildings';
import { MATERIAL_LABELS } from '../../data/equipment';
import {
  canUpgradeBuilding, formatBuildingStatus, getBuildingProgress,
  isBuildingPausedForMaterials,
} from '../../systems/TycoonSystem';
import {
  ensureTycoon,
} from '../../systems/TycoonExpansionSystem';
import { formatWarehousePanelDetail, formatWarehousePanelStats, getWarehouseFullness } from '../../systems/WarehouseSystem';
import { formatCampProduceOutput } from './minimalCamp';

const PROD_CHAIN = [...CAMP_PRODUCTION_BUILDINGS]
  .sort((a, b) => a.unlockRegion - b.unlockRegion)
  .map(b => b.id);

function countReadyProduction(save: GameSave): number {
  return CAMP_PRODUCTION_BUILDINGS.filter(b => {
    const p = getBuildingProgress(save, b.id);
    return p.level > 0 && p.ready && !isBuildingPausedForMaterials(save, b.id);
  }).length;
}

function renderWarehouseStrip(save: GameSave, maxRegion: number): string {
  const def = CAMP_BUILDINGS.find(b => b.id === 'warehouse')!;
  const unlocked = isBuildingUnlocked(save, def.id);
  const prog = getBuildingProgress(save, def.id);
  const canUp = canUpgradeBuilding(save, def.id);
  const wh = formatWarehousePanelDetail(prog.level, save, save.tycoon?.autoSellOverflow ?? true);
  const stats = formatWarehousePanelStats(save);
  const fullness = getWarehouseFullness(save);
  const fillPct = fullness.maxFillPct;
  const capTone = fullness.fullKinds > 0 ? 'full' : fullness.nearFullKinds > 0 ? 'warn' : 'ok';
  const capLabel = fullness.fullKinds > 0
    ? `만석 ${fullness.fullKinds}종`
    : fillPct >= 85
      ? `임박 ${fillPct}%`
      : `여유 · ${stats.totalKinds}종`;
  const tycoon = ensureTycoon(save);

  if (!unlocked) {
    return `<div class="prod-camp-warehouse prod-camp-warehouse--locked">
      <span>📦 창고</span>
      <span class="hint">🔒 ${def.unlockRegion}층 해금 · 재료 보관</span>
    </div>`;
  }

  return `<div class="prod-camp-warehouse" data-camp-building="warehouse">
    <div class="prod-camp-warehouse-head">
      <span class="prod-camp-warehouse-title">📦 창고 <em>Lv.${prog.level}</em></span>
      <span class="prod-camp-warehouse-cap ${capTone}">${capLabel}</span>
    </div>
    <div class="prod-camp-warehouse-bar">
      <div class="prod-camp-warehouse-fill ${capTone}" style="width:${fillPct}%"></div>
    </div>
    <p class="hint prod-camp-warehouse-meta">${wh.headline} · 총 ${stats.totalQty.toLocaleString()}개</p>
    <div class="prod-camp-warehouse-foot">
      <label class="prod-camp-check"><input type="checkbox" id="warehouse-auto" ${tycoon.autoSellOverflow ? 'checked' : ''}/> 가득 차면 자동 매각</label>
      <button type="button" class="btn-sm gold" data-camp-upgrade="warehouse" ${canUp.ok ? '' : 'disabled'}>
        ${prog.level <= 0 ? '건설' : '확장'} 🪙${canUp.cost.toLocaleString()}
      </button>
    </div>
    ${!canUp.ok && canUp.reason ? `<p class="hint warn">${canUp.reason}</p>` : ''}
  </div>`;
}

function renderProductionCard(save: GameSave, def: CampBuildingDef, maxRegion: number): string {
  const unlocked = isBuildingUnlocked(save, def.id);
  const prog = getBuildingProgress(save, def.id);
  const canUp = canUpgradeBuilding(save, def.id);
  const paused = isBuildingPausedForMaterials(save, def.id);
  const pct = Math.round(prog.progress * 100);
  const built = prog.level > 0;
  const outputAmt = built ? getBuildingOutputAmount(def, prog.level) : 0;
  const outputLabel = formatCampProduceOutput(def.produce, outputAmt);

  if (!unlocked) {
    return `<article class="prod-camp-card prod-camp-card--locked">
      <span class="prod-camp-card-icon">${def.icon}</span>
      <div class="prod-camp-card-body">
        <strong>${def.name}</strong>
        <p class="hint">🔒 ${def.unlockRegion}층 해금 (현재 ${maxRegion}층)</p>
      </div>
    </article>`;
  }

  const consumeHint = def.consume
    ? Object.entries(def.consume).map(([k, n]) => `${MATERIAL_LABELS[k] ?? k}×${n}`).join(' + ')
    : '';

  const gauge = built ? `
    <div class="prod-camp-gauge ${prog.ready && !paused ? 'ready' : ''} ${paused ? 'paused' : ''}">
      <div class="prod-camp-gauge-fill" style="width:${paused ? 100 : pct}%"></div>
      <span class="prod-camp-gauge-pct">${paused ? '⏸ 재료 부족' : prog.ready ? '✨ 생산!' : `${pct}%`}</span>
    </div>
    <p class="hint prod-camp-timer">
      ${paused
    ? `필요: ${consumeHint}`
    : prog.ready
      ? `지금 ${outputLabel} 생산 중`
      : `${formatIntervalSec(prog.remainingMs)} 후 · ${outputLabel}`}
    </p>` : `<p class="hint prod-camp-timer">건설하면 ${formatInterval(def.baseIntervalMs ?? 0)}마다 자동 생산</p>`;

  return `<article class="prod-camp-card ${built ? 'prod-camp-card--built' : ''} ${prog.ready ? 'prod-camp-card--ready' : ''}" data-camp-building="${def.id}">
    <header class="prod-camp-card-head">
      <span class="prod-camp-card-icon">${def.icon}</span>
      <div class="prod-camp-card-title">
        <strong>${def.name}${built ? ` Lv.${prog.level}` : ''}</strong>
        <p class="hint">${def.desc}</p>
      </div>
    </header>
    ${built ? `<p class="prod-camp-output">${outputLabel} / ${formatInterval(prog.intervalMs)}${consumeHint ? ` · 소모 ${consumeHint}` : ''}</p>` : ''}
    ${gauge}
    <footer class="prod-camp-card-foot">
      <button type="button" class="btn-sm gold" data-camp-upgrade="${def.id}" ${canUp.ok ? '' : 'disabled'}>
        ${built ? '업그레이드' : '건설'} 🪙${canUp.cost.toLocaleString()}
      </button>
      ${built ? `<span class="hint prod-camp-status">${formatBuildingStatus(save, def.id)}</span>` : ''}
    </footer>
    ${!canUp.ok && canUp.reason && built ? `<p class="hint warn">${canUp.reason}</p>` : ''}
  </article>`;
}

/** 생산 중심 캠프 — 탭 없이 한 화면 */
export function renderProductionCampPanel(save: GameSave, maxRegion: number): string {
  const ready = countReadyProduction(save);
  const builtCount = CAMP_PRODUCTION_BUILDINGS.filter(b => getBuildingProgress(save, b.id).level > 0).length;

  const chain = PROD_CHAIN.map(id => {
    const def = CAMP_BUILDINGS.find(b => b.id === id)!;
    const lv = getBuildingProgress(save, id).level;
    const on = lv > 0;
    return `<span class="prod-camp-chain-step ${on ? 'on' : ''}">${def.icon}</span>`;
  }).join('<span class="prod-camp-chain-arrow">→</span>');

  const cards = [...CAMP_PRODUCTION_BUILDINGS]
    .sort((a, b) => {
      const la = getBuildingProgress(save, a.id).level > 0 ? 0 : 1;
      const lb = getBuildingProgress(save, b.id).level > 0 ? 0 : 1;
      if (la !== lb) return la - lb;
      return a.unlockRegion - b.unlockRegion;
    })
    .map(def => renderProductionCard(save, def, maxRegion))
    .join('');

  return `
    <p class="prod-camp-intro">던전에서 모은 재료를 <b>자동 가공</b>합니다. 오프라인·대기 중에도 돌아가요.</p>
    <div class="prod-camp-stats">
      <span class="prod-camp-stat">🏭 가동 ${builtCount}/${CAMP_PRODUCTION_BUILDINGS.length}</span>
      ${ready > 0 ? `<span class="prod-camp-stat prod-camp-stat--ready">✨ 생산 대기 ${ready}</span>` : ''}
    </div>
    <div class="prod-camp-chain" aria-label="생산 흐름">${chain}</div>
    ${renderWarehouseStrip(save, maxRegion)}
    <div class="prod-camp-list">${cards}</div>`;
}

export function productionCampBuildingIds(): CampBuildingId[] {
  return [...CAMP_PRODUCTION_BUILDINGS.map(b => b.id), 'warehouse'];
}
