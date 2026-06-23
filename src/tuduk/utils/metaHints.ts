import type { GameSave } from '../types';
import { MATERIAL_LABELS } from '../data/equipment';
import { getCharGrowth } from '../data/growthTrees';
import { hasMaterials, getGrowthLineProgress, getCharGrowthTrees, isNodeLocked } from '../systems/GrowthSystem';
import { getWarehouseFullness, formatWarehousePanelStats } from '../systems/WarehouseSystem';

/** 창고 만석·임박 알림 (없으면 null) */
export function getWarehouseBannerHint(save: GameSave): string | null {
  const fullness = getWarehouseFullness(save);
  if (fullness.fullKinds >= 2) {
    return `📦 창고 만석 ${fullness.fullKinds}종 — 초과분은 자동매각·설정 확인`;
  }
  if (fullness.maxFillPct >= 88) {
    const { fullestLabel } = formatWarehousePanelStats(save);
    return `📦 창고 ${Math.round(fullness.maxFillPct * 100)}% (${fullestLabel}) — 한도 임박`;
  }
  return null;
}

/** 성장 스킬 재료 부족 알림 */
export function getMaterialShortageHint(save: GameSave): string | null {
  for (const charId of save.party) {
    const st = save.chars[charId];
    if (!st) continue;
    const nodes = getCharGrowth(charId);
    for (const tree of getCharGrowthTrees(charId)) {
      const lp = getGrowthLineProgress(st, tree, nodes);
      if (lp.branchChoices?.length || lp.allDone || !lp.next) continue;
      const n = lp.next;
      if (n.branchGroup || isNodeLocked(st, n)) continue;
      if (save.gold < n.cost) continue;
      if (!hasMaterials(save, n.materials) && n.materials) {
        const missing = Object.entries(n.materials)
          .filter(([mat, need]) => (save.materials[mat] ?? 0) < need)
          .slice(0, 2)
          .map(([mat, need]) => `${MATERIAL_LABELS[mat] ?? mat} ${save.materials[mat] ?? 0}/${need}`)
          .join(', ');
        if (missing) return `🧪 재료 부족 — ${missing}`;
      }
    }
  }
  return null;
}

export function getMetaBannerHints(save: GameSave): string[] {
  return [getWarehouseBannerHint(save)].filter(
    (h): h is string => !!h,
  );
}

export function renderMetaBannerHtml(save: GameSave): string {
  const hints = getMetaBannerHints(save);
  if (!hints.length) return '';
  return `<div class="meta-banner">${hints.map(h => `<p class="hint warn meta-banner-line">${h}</p>`).join('')}</div>`;
}
