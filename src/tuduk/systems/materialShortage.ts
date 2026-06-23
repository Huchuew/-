import type { GameSave } from '../types';
import { MATERIAL_LABELS } from '../data/equipment';
import { formatMaterialSourceHint } from '../data/materialSources';

export interface MatShortage {
  key: string;
  label: string;
  need: number;
  have: number;
  short: number;
}

export interface CostShortage {
  goldShort?: number;
  goldNeed?: number;
  mats: MatShortage[];
}

export function getCostShortage(
  save: GameSave,
  mats?: Record<string, number>,
  goldNeed?: number,
): CostShortage {
  const result: CostShortage = { mats: [] };
  if (goldNeed != null && save.gold < goldNeed) {
    result.goldNeed = goldNeed;
    result.goldShort = goldNeed - save.gold;
  }
  if (mats) {
    for (const [key, need] of Object.entries(mats)) {
      if (need <= 0) continue;
      const have = save.materials[key] ?? 0;
      if (have < need) {
        result.mats.push({
          key,
          label: MATERIAL_LABELS[key] ?? key,
          need,
          have,
          short: need - have,
        });
      }
    }
  }
  return result;
}

export function hasCostShortage(shortage: CostShortage): boolean {
  return shortage.goldShort != null || shortage.mats.length > 0;
}

/** UI용 한 줄 — "철광석 2 부족 (1/3) · 골드 1,200 부족" */
export function formatShortageHint(shortage: CostShortage): string {
  const parts: string[] = [];
  for (const m of shortage.mats) {
    parts.push(`${m.label} ${m.short} 부족 (${m.have}/${m.need})`);
  }
  if (shortage.goldShort != null) {
    parts.push(`골드 ${shortage.goldShort.toLocaleString()} 부족`);
  }
  return parts.join(' · ');
}

export function formatShortageHtml(save: GameSave, goldNeed?: number, mats?: Record<string, number>): string {
  const shortage = getCostShortage(save, mats, goldNeed);
  if (!hasCostShortage(shortage)) return '';
  const hints = shortage.mats
    .map(m => {
      const src = formatMaterialSourceHint(m.key);
      return src ? `${m.label}: ${src}` : null;
    })
    .filter(Boolean);
  const lines = [`<p class="hint cost-shortage">${formatShortageHint(shortage)}</p>`];
  if (hints.length) {
    lines.push(`<p class="hint mat-source-hint">📍 ${hints.join(' · ')}</p>`);
  }
  return lines.join('');
}
