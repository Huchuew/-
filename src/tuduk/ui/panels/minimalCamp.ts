import type { GameSave } from '../../types';
import {
  CAMP_BUILDINGS, CAMP_PRODUCTION_BUILDINGS, formatInterval,
  getBuildingLevel, getBuildingOutputAmount, isBuildingUnlocked, type CampBuildingId,
} from '../../data/campBuildings';
import { MATERIAL_LABELS } from '../../data/equipment';
import { getCampSummary, getBuildingProgress } from '../../systems/TycoonSystem';
import { getDungeonCampBonuses } from '../../systems/dungeonCampBonuses';
import { getTycoonIncomeRates } from '../../systems/TycoonExpansionSystem';

export function formatCampProduceOutput(produce: string | undefined, amount: number): string {
  if (!produce) return `생산 +${amount}`;
  if (produce === 'potion') return `포션 +${amount}`;
  const name = MATERIAL_LABELS[produce] ?? produce;
  return `${name} +${amount}`;
}

function sumLevels(save: GameSave, ids: CampBuildingId[]): number {
  return ids.reduce((n, id) => n + getBuildingLevel(save, id), 0);
}

function maxLevels(ids: CampBuildingId[]): number {
  return ids.reduce((n, id) => {
    const def = CAMP_BUILDINGS.find(b => b.id === id);
    return n + (def?.maxLevel ?? 0);
  }, 0);
}

function gaugePct(level: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((level / max) * 100));
}

export function renderMinimalCampPanel(save: GameSave, maxRegion: number): string {
  const prodIds = CAMP_PRODUCTION_BUILDINGS.map(b => b.id);
  const buffIds: CampBuildingId[] = ['inn', 'kitchen', 'clinic', 'warehouse', 'guild'];
  const prepIds = CAMP_BUILDINGS.filter(b => b.kind === 'dungeon').map(b => b.id);

  const prodLv = sumLevels(save, prodIds);
  const prodMax = maxLevels(prodIds);
  const buffLv = sumLevels(save, buffIds);
  const buffMax = maxLevels(buffIds);
  const prepLv = sumLevels(save, prepIds);
  const prepMax = maxLevels(prepIds);
  const rates = getTycoonIncomeRates(save);
  const hourly = rates.innGoldPerHour + rates.kitchenGoldPerHour + rates.warehouseGoldPerHour;
  const prep = getDungeonCampBonuses(save);
  const prepBonus = Math.max(0, Math.round(
    (prep.atkMult - 1 + prep.defMult - 1 + prep.expMult - 1) * 100,
  ));

  const prodRows = CAMP_PRODUCTION_BUILDINGS
    .filter(b => isBuildingUnlocked(save, b.id))
    .slice(0, 4)
    .map(b => {
      const lv = getBuildingLevel(save, b.id);
      const prog = getBuildingProgress(save, b.id);
      const out = getBuildingOutputAmount(b, lv);
      const outputLabel = formatCampProduceOutput(b.produce, out);
      const status = prog.ready
        ? '✨ 수령 가능'
        : `<span class="camp-mini-timer">${formatInterval(prog.remainingMs)}</span><span class="camp-mini-output">${outputLabel}</span>`;
      return `<div class="camp-mini-row" data-camp-mini="${b.id}">
        <span>${b.icon} ${b.name} <em>Lv${lv}</em></span>
        <span class="camp-mini-status" data-camp-mini-status="${b.id}">${status}</span>
      </div>`;
    }).join('') || '<p class="hint">2층+ 해금 · 광산·약초원 등</p>';

  const prepRows = CAMP_BUILDINGS
    .filter(b => b.kind === 'dungeon' && isBuildingUnlocked(save, b.id))
    .slice(0, 4)
    .map(b => {
      const lv = getBuildingLevel(save, b.id);
      return `<span class="camp-tag">${b.icon} ${b.name} Lv${lv}</span>`;
    }).join('') || '<span class="hint">훈련장 Lv2+ · 캠프 던전 탭에서 관리</span>';

  return `
    <p class="lodging-intro minimal-camp-intro">${getCampSummary(save)}</p>
    <div class="camp-category-grid">
      <section class="camp-category-card">
        <header><span>💰 수입</span><strong>${gaugePct(prodLv, prodMax)}%</strong></header>
        <div class="camp-gauge"><div class="camp-gauge-fill" style="width:${gaugePct(prodLv, prodMax)}%"></div></div>
        <p class="hint">시간당 약 🪙${hourly.toLocaleString()}</p>
        <div class="camp-mini-list">${prodRows}</div>
      </section>
      <section class="camp-category-card">
        <header><span>💚 생존</span><strong>${gaugePct(buffLv, buffMax)}%</strong></header>
        <div class="camp-gauge"><div class="camp-gauge-fill camp-gauge-heal" style="width:${gaugePct(buffLv, buffMax)}%"></div></div>
        <p class="hint">여관·치료소 — 귀환 회복↑</p>
      </section>
      <section class="camp-category-card">
        <header><span>🗺️ 원정 준비</span><strong>+${prepBonus}%</strong></header>
        <div class="camp-gauge"><div class="camp-gauge-fill camp-gauge-prep" style="width:${gaugePct(prepLv, prepMax)}%"></div></div>
        <div class="camp-tag-row">${prepRows}</div>
      </section>
    </div>`;
}
