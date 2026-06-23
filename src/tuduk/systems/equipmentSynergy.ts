import type { EquipRole, GameSave } from '../types';
import { CHAR_MAP } from '../data/characters';
import { RECIPE_MAP, type EquipRecipe } from '../data/equipment';
import { getCharEquipRole } from '../data/equipmentCatalog';

export interface SynergyReport {
  atkMult: number;
  defMult: number;
  hpMult: number;
  spdMult: number;
  critBonus: number;
  lines: string[];
}

export function computeEquipSynergy(save: GameSave, charId: string): SynergyReport {
  const rep: SynergyReport = {
    atkMult: 1, defMult: 1, hpMult: 1, spdMult: 1, critBonus: 0, lines: [],
  };
  const charRole = CHAR_MAP[charId]?.equipRole ?? getCharEquipRole(charId);
  const st = save.chars[charId];
  if (!st) return rep;

  const equipped: { recipe: EquipRecipe; slot: string }[] = [];
  for (const [slot, uid] of Object.entries(st.equipped)) {
    if (!uid) continue;
    const item = save.bag.find(b => b.uid === uid);
    const recipe = item ? RECIPE_MAP[item.id] : undefined;
    if (recipe) equipped.push({ recipe, slot });
  }
  if (!equipped.length) return rep;

  const setIds = new Set(equipped.map(e => e.recipe.setId).filter(Boolean));
  for (const setId of setIds) {
    const pieces = equipped.filter(e => e.recipe.setId === setId);
    if (pieces.length >= 2) {
      rep.atkMult *= 1.06;
      rep.defMult *= 1.06;
      rep.lines.push('2세트: ATK/DEF +6%');
    }
    if (pieces.length >= 3) {
      rep.atkMult *= 1.1;
      rep.hpMult *= 1.08;
      rep.critBonus += 0.03;
      rep.lines.push('3세트: ATK +10% · HP +8% · 치명 +3%');
    }
  }

  let roleMatch = 0;
  let roleMismatch = 0;
  for (const { recipe } of equipped) {
    if (!recipe.prefRole) continue;
    if (recipe.prefRole === charRole) roleMatch++;
    else roleMismatch++;
  }
  if (roleMatch > 0) {
    const bonus = 1 + roleMatch * 0.04;
    if (charRole === 'tank') rep.defMult *= bonus;
    else if (charRole === 'dps') rep.atkMult *= bonus;
    else if (charRole === 'healer' || charRole === 'support') rep.hpMult *= bonus;
    else rep.atkMult *= 1 + roleMatch * 0.03;
    rep.lines.push(`역할 일치 ${roleMatch} · 주 스탯 +${roleMatch * 4}%`);
  }
  if (roleMismatch > 0) {
    rep.spdMult *= Math.max(0.82, 1 - roleMismatch * 0.06);
    rep.lines.push(`역할 불일치 ${roleMismatch} · 공속 패널티`);
  }

  const elements = equipped.map(e => e.recipe.element).filter(e => e && e !== 'none');
  const uniqueEl = new Set(elements);
  if (uniqueEl.size === 1 && elements.length >= 2) {
    rep.atkMult *= 1.05;
    rep.lines.push(`속성 통일(${elements[0]}) · ATK +5%`);
  } else if (uniqueEl.size >= 3) {
    rep.atkMult *= 0.92;
    rep.lines.push('속성 혼잡 · ATK -8%');
  }

  const hasPlate = equipped.some(e => e.recipe.armorKind === 'plate');
  const hasRobe = equipped.some(e => e.recipe.armorKind === 'robe');
  if (charRole === 'dps' && hasPlate && !hasRobe) {
    rep.spdMult *= 0.9;
    rep.lines.push('경갑 미착용 딜러 · 공속 -10%');
  }
  if (charRole === 'tank' && hasRobe && !hasPlate) {
    rep.defMult *= 0.88;
    rep.lines.push('판금 미착용 탱커 · DEF -12%');
  }

  return rep;
}

export function formatSynergySummary(save: GameSave, charId: string): string {
  const s = computeEquipSynergy(save, charId);
  if (!s.lines.length) return '시너지 없음 — 전용 장비 제작 권장';
  return s.lines.join(' · ');
}
