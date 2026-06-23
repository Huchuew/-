import type { ElementType, EquipRole, GameSave } from '../types';
import { CHAR_MAP } from '../data/characters';
import { CHAR_TRAITS } from '../data/traitSynergy';
import { RECIPE_MAP } from '../data/equipment';
import { ELEMENT_LABEL } from '../data/elemental';
import type { AugmentDef } from '../data/augments';
import { AUGMENT_MAP } from '../data/augments';
import type { AugmentMods } from '../data/augmentMods';
import { getPickedAugments } from './AugmentSystem';

export interface AugmentCharImpact {
  charId: string;
  name: string;
  inParty: boolean;
  role: EquipRole;
  lines: string[];
  active: boolean;
  inactiveReason?: string;
}

export interface AugmentImpactDetail {
  augmentId: string;
  metaLines: string[];
  partyCombatLines: string[];
  chars: AugmentCharImpact[];
  conditionMet: boolean;
  conditionHint?: string;
  claimedFloor: number | null;
}

export interface PartyAugmentSummaryRow {
  charId: string;
  name: string;
  inParty: boolean;
  effects: { augmentName: string; icon: string; lines: string[] }[];
}

function pct(mult: number): string {
  return `${mult >= 1 ? '+' : ''}${Math.round((mult - 1) * 100)}%`;
}

function pctReduce(mult: number): string {
  return `−${Math.round((1 - mult) * 100)}%`;
}

function roleLabel(role: EquipRole): string {
  const map: Record<EquipRole, string> = {
    tank: '탱커', dps: '딜러', healer: '힐러', bruiser: '브루저', support: '서포트',
  };
  return map[role];
}

function hasTriangle(save: GameSave): boolean {
  const roles = new Set(save.party.map(id => CHAR_MAP[id]?.equipRole).filter(Boolean));
  return roles.has('tank') && roles.has('healer')
    && (roles.has('dps') || roles.has('bruiser'));
}

function partyTraitKinds(save: GameSave): number {
  return new Set(save.party.flatMap(id => CHAR_TRAITS[id] ?? [])).size;
}

function charElements(save: GameSave, charId: string): ElementType[] {
  const st = save.chars[charId];
  if (!st) return [];
  const els: ElementType[] = [];
  for (const uid of Object.values(st.equipped)) {
    if (!uid) continue;
    const item = save.bag.find(b => b.uid === uid);
    const el = item ? RECIPE_MAP[item.id]?.element : undefined;
    if (el && el !== 'none') els.push(el);
  }
  return els;
}

function uniformElementCount(els: ElementType[]): number {
  if (!els.length) return 0;
  const counts = new Map<ElementType, number>();
  for (const el of els) counts.set(el, (counts.get(el) ?? 0) + 1);
  return Math.max(...counts.values());
}

function isBackline(save: GameSave, charId: string): boolean {
  const order = save.partyFormation ?? save.party;
  const idx = order.indexOf(charId);
  if (idx < 0) return false;
  return idx >= Math.ceil(order.length * 0.66);
}

export function getAugmentClaimedFloor(save: GameSave, augmentId: string): number | null {
  const floor = save.augments?.pickedAtFloor?.[augmentId];
  if (floor != null) return floor;
  const idx = save.augments?.picked?.indexOf(augmentId) ?? -1;
  if (idx < 0) return null;
  const floors = [...(save.augments?.claimedFloors ?? [])].sort((a, b) => a - b);
  return floors[idx] ?? null;
}

function describeMetaEffects(e: Partial<AugmentMods>): string[] {
  const lines: string[] = [];
  if (e.potionHealMult && e.potionHealMult !== 1) {
    lines.push(`포션 회복 ${pct(e.potionHealMult)}`);
  }
  if (e.potionHealPenalty && e.potionHealPenalty !== 1) {
    lines.push(`포션 회복 ${pct(e.potionHealPenalty)} (상한 증강)`);
  }
  if (e.expeditionCarryAdd) lines.push(`원정 휴대 포션 +${e.expeditionCarryAdd}개`);
  if (e.expeditionCarryCap) lines.push(`휴대 상한 ${e.expeditionCarryCap}개`);
  if (e.waveHealPct) lines.push(`웨이브 클리어 시 파티 HP +${Math.round(e.waveHealPct * 100)}%`);
  if (e.restSpeedMult && e.restSpeedMult !== 1) lines.push(`숙소 휴식 속도 ${pct(e.restSpeedMult)}`);
  if (e.returnHealBonus) lines.push(`귀환 HP 회복 +${Math.round(e.returnHealBonus * 100)}%`);
  if (e.killGoldMult && e.killGoldMult !== 1) lines.push(`처치 골드 ${pct(e.killGoldMult)}`);
  if (e.matDropMult && e.matDropMult !== 1) lines.push(`재료 드랍 ${pct(e.matDropMult)}`);
  if (e.sellGoldMult && e.sellGoldMult !== 1) lines.push(`재료 판매가 ${pct(e.sellGoldMult)}`);
  if (e.returnGoldMult && e.returnGoldMult !== 1) lines.push(`귀환 정산 골드 ${pct(e.returnGoldMult)}`);
  if (e.campProdMult && e.campProdMult !== 1) lines.push(`캠프 자동 생산 ${pct(e.campProdMult)}`);
  if (e.shopBuffDurMult && e.shopBuffDurMult !== 1) lines.push(`출발 영약 지속 ${pct(e.shopBuffDurMult)}`);
  if (e.shopBuffEffMult && e.shopBuffEffMult !== 1) lines.push(`출발 영약 효과 ${pct(e.shopBuffEffMult)}`);
  if (e.chestChanceAdd) lines.push(`보물상자 확률 +${Math.round(e.chestChanceAdd * 100)}%p`);
  if (e.chestGoldMult && e.chestGoldMult !== 1) lines.push(`보물상자 골드 ${pct(e.chestGoldMult)}`);
  if (e.shortcutDevMult && e.shortcutDevMult !== 1) {
    lines.push(`숏컷 개발 시간 ${e.shortcutDevMult < 1 ? pctReduce(e.shortcutDevMult) : pct(e.shortcutDevMult)}`);
  }
  if (e.tycoonIncomeMult && e.tycoonIncomeMult !== 1) lines.push(`타이쿤 수입 ${pct(e.tycoonIncomeMult)}`);
  if (e.comboGoldMult && e.comboGoldMult !== 1) lines.push(`콤보 3+ 골드 ${pct(e.comboGoldMult)}`);
  return lines;
}

function describePartyCombatEffects(save: GameSave, e: Partial<AugmentMods>): string[] {
  const lines: string[] = [];
  if (e.touchDmgMult && e.touchDmgMult !== 1) lines.push(`투닥 피해 ${pct(e.touchDmgMult)}`);
  if (e.touchCdMult && e.touchCdMult !== 1) {
    lines.push(`투닥 쿨 ${e.touchCdMult < 1 ? pctReduce(e.touchCdMult) : pct(e.touchCdMult)}`);
  }
  if (e.comboAtkMult && e.comboAtkMult !== 1) lines.push(`콤보 3+ ATK ${pct(e.comboAtkMult)}`);
  if (e.gaugeGainMult && e.gaugeGainMult !== 1) lines.push(`스킬 게이지 충전 ${pct(e.gaugeGainMult)}`);
  if (e.ultMult && e.ultMult !== 1) lines.push(`궁극기 피해·힐 ${pct(e.ultMult)}`);
  if (e.executeDmgMult && e.executeDmgMult !== 1) lines.push(`적 HP 30% 이하 딜러 피해 ${pct(e.executeDmgMult)}`);
  if (e.bossDmgMult && e.bossDmgMult !== 1) lines.push(`보스·엘리트 피해 ${pct(e.bossDmgMult)}`);
  if (e.bossHealMult && e.bossHealMult !== 1) lines.push(`보스전 힐량 ${pct(e.bossHealMult)}`);
  if (e.skillChainDmg) lines.push(`스킬 연속 발동 피해 +${Math.round(e.skillChainDmg * 100)}%/중첩`);
  if (e.ignoreResistWeakness) lines.push('일반몹 속성 약점 항상 적용');
  if (e.bossStartInvulnSec) lines.push(`보스전 시작 ${e.bossStartInvulnSec}초 무적`);
  if (e.bossStartAtkSpdMult && e.bossStartAtkSpdMult !== 1) {
    lines.push(`보스전 시작 공속 ${pct(e.bossStartAtkSpdMult)}`);
  }
  if (e.weaknessDmgMult && e.weaknessDmgMult !== 1) lines.push(`속성 약점 피해 ${pct(e.weaknessDmgMult)}`);

  if (e.trianglePartyAtk || e.trianglePartyDef || e.trianglePartyHp) {
    if (hasTriangle(save)) {
      const parts: string[] = [];
      if (e.trianglePartyAtk) parts.push(`ATK ${pct(1 + e.trianglePartyAtk)}`);
      if (e.trianglePartyDef) parts.push(`DEF ${pct(1 + e.trianglePartyDef)}`);
      if (e.trianglePartyHp) parts.push(`HP ${pct(1 + e.trianglePartyHp)}`);
      lines.push(`삼각 편성 보너스: ${parts.join(' · ')}`);
    } else {
      lines.push('삼각 편성 보너스 (탱·딜·힐 필요 — 현재 비활성)');
    }
  }

  if (e.traitQuadBonus && partyTraitKinds(save) >= 4) {
    lines.push(`특성 4종+ ATK/DEF/HP ${pct(1 + e.traitQuadBonus)}`);
  } else if (e.traitQuadBonus) {
    lines.push(`특성 4종+ 보너스 (현재 ${partyTraitKinds(save)}종 — 비활성)`);
  }

  return lines;
}

function describeCharCombatLines(
  save: GameSave,
  e: Partial<AugmentMods>,
  charId: string,
  inParty: boolean,
): { lines: string[]; active: boolean; inactiveReason?: string } {
  const def = CHAR_MAP[charId];
  if (!def) return { lines: [], active: false };

  if (!inParty) {
    return { lines: [], active: false, inactiveReason: '비출전 — 전투 스탯·스킬 증강 미적용' };
  }

  const lines: string[] = [];
  let active = false;
  const role = def.equipRole;

  if (role === 'tank') {
    if (e.tankDefMult && e.tankDefMult !== 1) { lines.push(`DEF ${pct(e.tankDefMult)}`); active = true; }
    if (e.tankDmgTakenMult && e.tankDmgTakenMult !== 1) {
      lines.push(`받는 피해 ${pctReduce(e.tankDmgTakenMult)}`); active = true;
    }
    if (e.tankHpMult && e.tankHpMult !== 1) { lines.push(`HP ${pct(e.tankHpMult)}`); active = true; }
    if (e.tankThreatMult && e.tankThreatMult !== 1) {
      lines.push(`위협(어그로) ${pct(e.tankThreatMult)}`); active = true;
    }
    if (e.tankReviveOnce) { lines.push('전멸 시 1회 부활'); active = true; }
  }

  if (role === 'dps' || role === 'bruiser') {
    if (e.dpsAtkMult && e.dpsAtkMult !== 1) { lines.push(`ATK ${pct(e.dpsAtkMult)}`); active = true; }
    if (e.dpsAtkSpdMult && e.dpsAtkSpdMult !== 1) { lines.push(`공속 ${pct(e.dpsAtkSpdMult)}`); active = true; }
    if (e.dpsCritBonus) { lines.push(`치명 +${Math.round(e.dpsCritBonus * 100)}%p`); active = true; }
    if (e.executeDmgMult && e.executeDmgMult !== 1) {
      lines.push(`처형 피해 ${pct(e.executeDmgMult)} (HP 30% 이하)`); active = true;
    }
  }

  if (role === 'healer') {
    if (e.healerHealMult && e.healerHealMult !== 1) { lines.push(`힐량 ${pct(e.healerHealMult)}`); active = true; }
    if (e.healerDefBuff) { lines.push(`힐 대상 DEF +${Math.round(e.healerDefBuff * 100)}%`); active = true; }
  }

  if (role === 'support') {
    if (e.supportBuffDurMult && e.supportBuffDurMult !== 1) {
      lines.push(`버프 지속 ${pct(e.supportBuffDurMult)}`); active = true;
    }
  }

  if (e.supportPartyAtk) {
    lines.push(`파티 ATK ${pct(1 + e.supportPartyAtk)}`); active = true;
  }

  if (e.traitSynergyMult && e.traitSynergyMult !== 1) {
    lines.push(`특성 시너지 ${pct(e.traitSynergyMult)} (파티 전체)`); active = true;
  }

  if (e.traitQuadBonus && partyTraitKinds(save) >= 4) {
    lines.push(`특성 4종+ 스탯 ${pct(1 + e.traitQuadBonus)}`); active = true;
  }

  if ((e.trianglePartyAtk || e.trianglePartyDef || e.trianglePartyHp) && hasTriangle(save)) {
    const parts: string[] = [];
    if (e.trianglePartyAtk) parts.push(`ATK ${pct(1 + e.trianglePartyAtk)}`);
    if (e.trianglePartyDef) parts.push(`DEF ${pct(1 + e.trianglePartyDef)}`);
    if (e.trianglePartyHp) parts.push(`HP ${pct(1 + e.trianglePartyHp)}`);
    lines.push(`삼각 편성: ${parts.join(' · ')}`); active = true;
  }

  if ((e.backlineDefMult || e.backlineHealMult) && isBackline(save, charId)) {
    if (e.backlineDefMult && e.backlineDefMult !== 1) {
      lines.push(`후열 DEF ${pct(e.backlineDefMult)}`); active = true;
    }
    if (e.backlineHealMult && e.backlineHealMult !== 1) {
      lines.push(`받는 힐 ${pct(e.backlineHealMult)}`); active = true;
    }
  }

  const els = charElements(save, charId);
  for (const el of els) {
    const mult = el === 'fire' ? e.fireDmgMult
      : el === 'thunder' ? e.thunderDmgMult
        : el === 'poison' ? e.poisonDmgMult
          : el === 'water' ? e.waterDmgMult : 1;
    if (mult && mult !== 1) {
      lines.push(`${ELEMENT_LABEL[el]} 피해 ${pct(mult)}`); active = true;
    }
  }

  if (e.uniformElementAtk && uniformElementCount(els) >= 2) {
    lines.push(`속성 통일 ATK ${pct(1 + e.uniformElementAtk)}`); active = true;
  } else if (e.uniformElementAtk) {
    lines.push('속성 통일 ATK (같은 속성 장비 2개+ 필요)');
  }

  if (e.gaugeGainMult && e.gaugeGainMult !== 1 && !lines.some(l => l.includes('게이지'))) {
    lines.push(`스킬 게이지 ${pct(e.gaugeGainMult)}`); active = true;
  }
  if (e.touchDmgMult && e.touchDmgMult !== 1) { lines.push(`투닥 피해 ${pct(e.touchDmgMult)}`); active = true; }
  if (e.comboAtkMult && e.comboAtkMult !== 1) { lines.push(`콤보 ATK ${pct(e.comboAtkMult)}`); active = true; }
  if (e.ultMult && e.ultMult !== 1) { lines.push(`궁극기 ${pct(e.ultMult)}`); active = true; }
  if (e.bossDmgMult && e.bossDmgMult !== 1) { lines.push(`보스 피해 ${pct(e.bossDmgMult)}`); active = true; }
  if (e.ignoreResistWeakness) { lines.push('약점 항상 적용'); active = true; }

  if (!lines.length) {
    return { lines: [`${roleLabel(role)} — 이 증강의 전투 보너스 없음`], active: false };
  }
  return { lines, active };
}

export function buildAugmentImpact(save: GameSave, augmentId: string): AugmentImpactDetail {
  const def = AUGMENT_MAP[augmentId];
  if (!def) {
    return {
      augmentId, metaLines: [], partyCombatLines: [], chars: [],
      conditionMet: false, claimedFloor: null,
    };
  }
  return buildAugmentImpactFromDef(save, def);
}

function buildAugmentImpactFromDef(save: GameSave, def: AugmentDef): AugmentImpactDetail {
  const e = def.effects;
  const conditionMet = !def.condition || def.condition(save);
  const metaLines = describeMetaEffects(e);
  const partyCombatLines = describePartyCombatEffects(save, e);

  const charIds = [...new Set([...save.party, ...save.owned])];
  const chars: AugmentCharImpact[] = [];

  for (const charId of charIds) {
    const c = CHAR_MAP[charId];
    if (!c) continue;
    const inParty = save.party.includes(charId);
    const combat = describeCharCombatLines(save, e, charId, inParty);
    chars.push({
      charId,
      name: c.name,
      inParty,
      role: c.equipRole,
      lines: combat.lines,
      active: combat.active,
      inactiveReason: !inParty ? combat.inactiveReason
        : !conditionMet && def.conditionHint
          ? `획득 당시 조건 충족 · 현재 파티: ${def.conditionHint}` : combat.inactiveReason,
    });
  }

  chars.sort((a, b) => {
    if (a.inParty !== b.inParty) return a.inParty ? -1 : 1;
    return a.name.localeCompare(b.name, 'ko');
  });

  return {
    augmentId: def.id,
    metaLines,
    partyCombatLines,
    chars,
    conditionMet,
    conditionHint: def.conditionHint,
    claimedFloor: getAugmentClaimedFloor(save, def.id),
  };
}

export function buildPartyAugmentSummary(save: GameSave): PartyAugmentSummaryRow[] {
  const picked = getPickedAugments(save);
  const charIds = [...save.party];
  const rows: PartyAugmentSummaryRow[] = [];

  for (const charId of charIds) {
    const c = CHAR_MAP[charId];
    if (!c) continue;
    const effects: PartyAugmentSummaryRow['effects'] = [];

    for (const def of picked) {
      const impact = buildAugmentImpactFromDef(save, def);
      const charImpact = impact.chars.find(ch => ch.charId === charId);
      if (!charImpact?.active || !charImpact.lines.length) continue;
      const combatLines = charImpact.lines.filter(l => !l.includes('보너스 없음'));
      if (!combatLines.length) continue;
      effects.push({ augmentName: def.name, icon: def.icon, lines: combatLines });
    }

    rows.push({ charId, name: c.name, inParty: true, effects });
  }
  return rows;
}

/** buildAugmentPreview 호환 */
export function buildAugmentPreviewCompat(save: GameSave, augmentId: string) {
  const impact = buildAugmentImpact(save, augmentId);
  const def = AUGMENT_MAP[augmentId];
  const globalLines = def ? [def.desc] : [];
  if (def?.conditionHint && !impact.conditionMet) {
    globalLines.push(`⚠️ ${def.conditionHint}`);
  }
  globalLines.push(...impact.metaLines, ...impact.partyCombatLines);

  return {
    globalLines,
    chars: impact.chars
      .filter(c => c.inParty)
      .map(c => ({
        charId: c.charId,
        name: c.name,
        lines: c.lines,
        active: c.active,
      })),
    conditionMet: impact.conditionMet,
    conditionHint: impact.conditionHint,
  };
}
