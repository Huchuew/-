import type { GameSave } from '../types';
import { CHAR_MAP } from './characters';

/** 캐릭터별 특성 태그 (롤토체식 — 여러 특성 중첩 가능) */
export const CHAR_TRAITS: Record<string, string[]> = {
  mujang: ['guardian', 'warrior'],
  seoyoung: ['guardian', 'warrior'],
  teso: ['guardian', 'warrior'],
  danjong: ['guardian', 'warrior', 'undead'],
  pocket: ['guardian', 'warrior', 'skirmish'],
  huchu: ['arcane', 'artillery'],
  hyeoni: ['arcane', 'undead'],
  yujin: ['arcane', 'heal'],
  dung: ['artillery'],
  sodia: ['artillery', 'undead'],
  ujang: ['skirmish'],
  hyesung: ['skirmish'],
  lesford: ['lancer'],
  jimjimi: ['lancer', 'skirmish'],
  ampa: ['fury'],
  horangi: ['fury'],
  sanjeok: ['fury'],
  cutie: ['fury', 'undead'],
  isanim: ['heal', 'support'],
  hidden: ['heal', 'support'],
};

export interface TraitTierBonus {
  count: number;
  atk?: number;
  def?: number;
  hp?: number;
  atkSpd?: number;
  crit?: number;
  heal?: number;
  desc: string;
}

export interface TraitDef {
  id: string;
  name: string;
  icon: string;
  tiers: TraitTierBonus[];
}

export const TRAIT_DEFS: TraitDef[] = [
  {
    id: 'guardian',
    name: '수호자',
    icon: '🛡',
    tiers: [
      { count: 2, def: 0.10, desc: '방어 +10%' },
      { count: 3, def: 0.16, hp: 0.05, desc: '방어 +16%, HP +5%' },
      { count: 4, def: 0.22, hp: 0.10, heal: 0.05, desc: '방어 +22%, HP +10%, 힐 +5%' },
    ],
  },
  {
    id: 'arcane',
    name: '마도',
    icon: '🔮',
    tiers: [
      { count: 2, atk: 0.10, desc: '공격 +10%' },
      { count: 3, atk: 0.16, crit: 0.05, desc: '공격 +16%, 치명 +5%' },
      { count: 4, atk: 0.22, crit: 0.08, atkSpd: 0.06, desc: '공격 +22%, 치명 +8%, 공속 +6%' },
    ],
  },
  {
    id: 'artillery',
    name: '사격',
    icon: '🏹',
    tiers: [
      { count: 2, atkSpd: 0.08, crit: 0.05, desc: '공속 +8%, 치명 +5%' },
      { count: 3, atkSpd: 0.14, atk: 0.08, crit: 0.07, desc: '공속 +14%, 공격 +8%' },
    ],
  },
  {
    id: 'fury',
    name: '광전',
    icon: '⚔',
    tiers: [
      { count: 2, atk: 0.12, desc: '공격 +12%' },
      { count: 3, atk: 0.20, atkSpd: 0.10, crit: 0.04, desc: '공격 +20%, 공속 +10%' },
      { count: 4, atk: 0.26, atkSpd: 0.14, crit: 0.06, desc: '공격 +26%, 공속 +14%' },
    ],
  },
  {
    id: 'heal',
    name: '치유',
    icon: '💚',
    tiers: [
      { count: 2, heal: 0.14, hp: 0.04, desc: '힐 +14%, HP +4%' },
      { count: 3, heal: 0.22, hp: 0.08, def: 0.06, desc: '힐 +22%, HP +8%' },
    ],
  },
  {
    id: 'skirmish',
    name: '기동',
    icon: '💨',
    tiers: [
      { count: 2, atkSpd: 0.10, crit: 0.04, desc: '공속 +10%, 치명 +4%' },
      { count: 3, atkSpd: 0.16, atk: 0.06, crit: 0.06, desc: '공속 +16%, 공격 +6%' },
      { count: 4, atkSpd: 0.22, atk: 0.10, desc: '공속 +22%, 공격 +10%' },
    ],
  },
  {
    id: 'lancer',
    name: '창술',
    icon: '🗡',
    tiers: [
      { count: 2, atk: 0.10, def: 0.05, desc: '공격 +10%, 방어 +5%' },
      { count: 3, atk: 0.18, atkSpd: 0.10, crit: 0.04, desc: '공격 +18%, 공속 +10%' },
      { count: 4, atk: 0.24, atkSpd: 0.14, def: 0.06, desc: '공격 +24%, 공속 +14%' },
    ],
  },
  {
    id: 'undead',
    name: '망령',
    icon: '💀',
    tiers: [
      { count: 2, atk: 0.08, def: 0.06, desc: '공격 +8%, 방어 +6%' },
      { count: 3, atk: 0.14, crit: 0.06, hp: 0.05, desc: '공격 +14%, 치명 +6%' },
    ],
  },
  {
    id: 'warrior',
    name: '기사',
    icon: '⚔️',
    tiers: [
      { count: 2, def: 0.08, hp: 0.04, desc: '방어 +8%, HP +4%' },
      { count: 3, def: 0.12, atk: 0.06, desc: '방어 +12%, 공격 +6%' },
      { count: 4, def: 0.16, atk: 0.10, hp: 0.06, desc: '방어 +16%, 공격 +10%' },
    ],
  },
  {
    id: 'support',
    name: '지원',
    icon: '✨',
    tiers: [
      { count: 2, atkSpd: 0.08, heal: 0.10, desc: '공속 +8%, 힐 +10%' },
    ],
  },
];

export interface ActiveTrait {
  def: TraitDef;
  count: number;
  tier: TraitTierBonus;
  nextTier: TraitTierBonus | null;
}

export interface TraitBonusTotals {
  atkMult: number;
  defMult: number;
  hpMult: number;
  atkSpdMult: number;
  critBonus: number;
  healMult: number;
  active: ActiveTrait[];
  lines: string[];
}

const TRAIT_MAP = Object.fromEntries(TRAIT_DEFS.map(t => [t.id, t]));

function countTraitsInParty(partyIds: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of partyIds) {
    for (const traitId of CHAR_TRAITS[id] ?? []) {
      counts.set(traitId, (counts.get(traitId) ?? 0) + 1);
    }
  }
  return counts;
}

function pickTier(def: TraitDef, count: number): { tier: TraitTierBonus; next: TraitTierBonus | null } | null {
  let active: TraitTierBonus | null = null;
  let next: TraitTierBonus | null = null;
  for (const t of def.tiers) {
    if (count >= t.count) active = t;
    else if (!next) { next = t; break; }
  }
  if (!active) return null;
  return { tier: active, next };
}

export function computeTraitSynergy(partyIds: string[]): TraitBonusTotals {
  const bonus: TraitBonusTotals = {
    atkMult: 1, defMult: 1, hpMult: 1, atkSpdMult: 1,
    critBonus: 0, healMult: 1, active: [], lines: [],
  };
  const counts = countTraitsInParty(partyIds);

  for (const [traitId, count] of counts) {
    const def = TRAIT_MAP[traitId];
    if (!def) continue;
    const picked = pickTier(def, count);
    if (!picked) continue;
    const { tier, next } = picked;
    if (tier.atk) bonus.atkMult += tier.atk;
    if (tier.def) bonus.defMult += tier.def;
    if (tier.hp) bonus.hpMult += tier.hp;
    if (tier.atkSpd) bonus.atkSpdMult += tier.atkSpd;
    if (tier.crit) bonus.critBonus += tier.crit;
    if (tier.heal) bonus.healMult += tier.heal;
    bonus.active.push({ def, count, tier, nextTier: next });
    bonus.lines.push(`${def.icon}${def.name}(${count}) ${tier.desc}`);
  }

  bonus.active.sort((a, b) => b.count - a.count || b.tier.count - a.tier.count);
  return bonus;
}

export function computeTraitSynergyFromSave(save: GameSave): TraitBonusTotals {
  return computeTraitSynergy(save.party.filter(id => CHAR_MAP[id]));
}

export function formatTraitSynergyHud(save: GameSave): string {
  const t = computeTraitSynergyFromSave(save);
  if (!t.active.length) return '특성 시너지 없음 — 태그 조합을 맞춰보세요';
  return t.active
    .slice(0, 5)
    .map(a => `${a.def.icon}${a.def.name} ${a.count}/${a.nextTier?.count ?? a.tier.count}`)
    .join(' · ');
}

export function formatTraitSynergyDetail(save: GameSave): string {
  const t = computeTraitSynergyFromSave(save);
  if (!t.lines.length) return '활성 특성 없음';
  return t.lines.join(' · ');
}

export function getCharTraitLabels(charId: string): string[] {
  return (CHAR_TRAITS[charId] ?? [])
    .map(id => TRAIT_MAP[id])
    .filter(Boolean)
    .map(t => `${t!.icon}${t!.name}`);
}

/** 유대 — 특정 2~3인 고정 조합 (추가 보너us) */
interface BondDef {
  chars: string[];
  name: string;
  icon: string;
  atk?: number;
  def?: number;
  heal?: number;
  hp?: number;
  atkSpd?: number;
  crit?: number;
}

const BOND_SYNERGIES: BondDef[] = [
  // ── 2인 인연 ──
  { chars: ['mujang', 'seoyoung'], name: '철벽 콤비', icon: '🛡️', def: 0.06 },
  { chars: ['mujang', 'ujang'], name: '전사 형제', icon: '⚔️', atk: 0.04, def: 0.03 },
  { chars: ['mujang', 'pocket'], name: '경계 파수', icon: '🧱', atk: 0.05, def: 0.05 },
  { chars: ['mujang', 'lesford'], name: '전선 돌파', icon: '🔱', atk: 0.06, atkSpd: 0.03 },
  { chars: ['seoyoung', 'pocket'], name: '철벽 자매', icon: '🛡️', def: 0.07, hp: 0.03 },
  { chars: ['seoyoung', 'yujin'], name: '수호 사제', icon: '💚', heal: 0.07, def: 0.04 },
  { chars: ['teso', 'seoyoung'], name: '이중 방패', icon: '🔰', def: 0.08 },
  { chars: ['teso', 'danjong'], name: '성역과 망령', icon: '☀️', def: 0.05, atk: 0.04 },
  { chars: ['teso', 'yujin'], name: '성역 수호', icon: '✨', heal: 0.08, def: 0.04 },
  { chars: ['huchu', 'dung'], name: '원거리 화력', icon: '🏹', atk: 0.05, crit: 0.03 },
  { chars: ['huchu', 'hyeoni'], name: '마도 쌍성', icon: '🔮', atk: 0.06, crit: 0.04 },
  { chars: ['huchu', 'yujin'], name: '성역 마도', icon: '🌟', atk: 0.05, heal: 0.05 },
  { chars: ['dung', 'sodia'], name: '저격 듀오', icon: '🎯', atk: 0.05, crit: 0.05 },
  { chars: ['dung', 'lesford'], name: '원거리 창술', icon: '🏹', atk: 0.04, atkSpd: 0.04 },
  { chars: ['ujang', 'hyesung'], name: '검풍 쌍둥이', icon: '💨', atkSpd: 0.06, crit: 0.04 },
  { chars: ['ujang', 'sanjeok'], name: '연타 도적', icon: '🗡️', atk: 0.05, atkSpd: 0.05 },
  { chars: ['lesford', 'yujin'], name: '창기사 호위', icon: '🔱', atk: 0.05, def: 0.04 },
  { chars: ['lesford', 'jimjimi'], name: '창기 연대', icon: '🐎', atk: 0.05, atkSpd: 0.04 },
  { chars: ['ampa', 'horangi'], name: '광야의 포효', icon: '🐯', atk: 0.07, atkSpd: 0.04 },
  { chars: ['ampa', 'sanjeok'], name: '약탈 광전', icon: '💢', atk: 0.06, crit: 0.03 },
  { chars: ['horangi', 'sanjeok'], name: '야수 도적', icon: '🐾', atk: 0.05, atkSpd: 0.05 },
  { chars: ['hyesung', 'jimjimi'], name: '기동 창검', icon: '☄️', atkSpd: 0.06, atk: 0.04 },
  { chars: ['hyesung', 'pocket'], name: '기동 쌍벽', icon: '💨', atkSpd: 0.05, crit: 0.03 },
  { chars: ['sodia', 'hyeoni'], name: '망령 사격', icon: '👻', atk: 0.05, crit: 0.04 },
  { chars: ['sanjeok', 'ampa'], name: '광전 쌍검', icon: '⚔️', atk: 0.06, atkSpd: 0.04 },
  { chars: ['sanjeok', 'cutie'], name: '망령 도적', icon: '💀', atk: 0.06, def: 0.03 },
  { chars: ['cutie', 'hyeoni'], name: '망령 마창', icon: '🌑', atk: 0.06, crit: 0.04 },
  { chars: ['cutie', 'danjong'], name: '망령 왕검', icon: '👑', atk: 0.05, def: 0.04 },
  { chars: ['danjong', 'pocket'], name: '철갑 망령', icon: '🛡️', def: 0.07, atk: 0.03 },
  { chars: ['isanim', 'hidden'], name: '비밀 지원', icon: '🍳', heal: 0.10, atkSpd: 0.05 },
  { chars: ['isanim', 'yujin'], name: '성역 지원', icon: '💚', heal: 0.06, atkSpd: 0.03 },
  { chars: ['yujin', 'hidden'], name: '치유 셰프', icon: '🥘', heal: 0.08, hp: 0.04 },
  // ── 3인 인연 ──
  { chars: ['mujang', 'teso', 'seoyoung'], name: '방패 삼중', icon: '🛡️', def: 0.08 },
  { chars: ['mujang', 'sanjeok', 'yujin'], name: '광전 대열', icon: '🔥', atk: 0.05, atkSpd: 0.03 },
  { chars: ['mujang', 'pocket', 'danjong'], name: '삼중 철벽', icon: '🧱', def: 0.09, hp: 0.04 },
  { chars: ['huchu', 'hyeoni', 'yujin'], name: '마도 삼위', icon: '🔮', atk: 0.06, heal: 0.05 },
  { chars: ['dung', 'sodia', 'huchu'], name: '원거리 삼각', icon: '🏹', atk: 0.05, crit: 0.05 },
  { chars: ['ujang', 'hyesung', 'sanjeok'], name: '속검 삼진', icon: '⚡', atkSpd: 0.07, atk: 0.04 },
  { chars: ['lesford', 'jimjimi', 'mujang'], name: '돌격 대열', icon: '🔱', atk: 0.06, def: 0.04 },
  { chars: ['ampa', 'horangi', 'cutie'], name: '광전 삼형제', icon: '😤', atk: 0.07, atkSpd: 0.05 },
  { chars: ['isanim', 'hidden', 'yujin'], name: '회복 삼각', icon: '💚', heal: 0.10, hp: 0.05 },
  { chars: ['teso', 'seoyoung', 'pocket'], name: '수호 삼각', icon: '🔰', def: 0.09, heal: 0.04 },
  { chars: ['seoyoung', 'yujin', 'teso'], name: '성역 삼위', icon: '✨', def: 0.06, heal: 0.08 },
  { chars: ['danjong', 'cutie', 'hyeoni'], name: '망령 삼위', icon: '💀', atk: 0.06, def: 0.05 },
  { chars: ['sodia', 'dung', 'lesford'], name: '관통 저격', icon: '🎯', atk: 0.06, crit: 0.04 },
  { chars: ['jimjimi', 'lesford', 'hyesung'], name: '창기 삼진', icon: '🐎', atk: 0.05, atkSpd: 0.06 },
  { chars: ['pocket', 'mujang', 'teso'], name: '철벽 전선', icon: '🛡️', def: 0.07, atk: 0.03 },
];

export function computeBondBonuses(partyIds: string[]): {
  atk: number; def: number; heal: number; hp: number; atkSpd: number; crit: number; lines: string[];
} {
  const set = new Set(partyIds);
  let atk = 0;
  let def = 0;
  let heal = 0;
  let hp = 0;
  let atkSpd = 0;
  let crit = 0;
  const lines: string[] = [];
  for (const b of BOND_SYNERGIES) {
    if (!b.chars.every(c => set.has(c))) continue;
    atk += b.atk ?? 0;
    def += b.def ?? 0;
    heal += b.heal ?? 0;
    hp += b.hp ?? 0;
    atkSpd += b.atkSpd ?? 0;
    crit += b.crit ?? 0;
    lines.push(`${b.icon}${b.name}`);
  }
  return { atk, def, heal, hp, atkSpd, crit, lines };
}

function formatBondEffect(b: BondDef): string {
  const bits: string[] = [];
  if (b.atk) bits.push(`ATK +${Math.round(b.atk * 100)}%`);
  if (b.def) bits.push(`DEF +${Math.round(b.def * 100)}%`);
  if (b.heal) bits.push(`힐 +${Math.round(b.heal * 100)}%`);
  if (b.hp) bits.push(`HP +${Math.round(b.hp * 100)}%`);
  if (b.atkSpd) bits.push(`공속 +${Math.round(b.atkSpd * 100)}%`);
  if (b.crit) bits.push(`치명 +${Math.round(b.crit * 100)}%p`);
  return bits.join(' · ') || '파티 버프';
}

function bondMembersLabel(chars: string[]): string {
  return chars.map(id => CHAR_MAP[id]?.name ?? id).join(' · ');
}

export interface ActiveBondRow {
  id: string;
  name: string;
  icon: string;
  members: string;
  effect: string;
}

/** 현재 파티에서 활성화된 인연만 */
export function getActiveBonds(partyIds: string[]): ActiveBondRow[] {
  const set = new Set(partyIds);
  const rows: ActiveBondRow[] = [];
  for (let i = 0; i < BOND_SYNERGIES.length; i++) {
    const b = BOND_SYNERGIES[i];
    if (!b.chars.every(c => set.has(c))) continue;
    rows.push({
      id: `bond-${i}`,
      name: b.name,
      icon: b.icon,
      members: bondMembersLabel(b.chars),
      effect: formatBondEffect(b),
    });
  }
  return rows;
}

/** 인연 시너지 UI 헤더용 합산 보너스 */
export function getBondPartyBonusSummary(partyIds: string[]): string[] {
  const b = computeBondBonuses(partyIds);
  const bits: string[] = [];
  if (b.atk > 0.001) bits.push(`ATK +${Math.round(b.atk * 100)}%`);
  if (b.def > 0.001) bits.push(`DEF +${Math.round(b.def * 100)}%`);
  if (b.heal > 0.001) bits.push(`힐 +${Math.round(b.heal * 100)}%`);
  if (b.hp > 0.001) bits.push(`HP +${Math.round(b.hp * 100)}%`);
  if (b.atkSpd > 0.001) bits.push(`공속 +${Math.round(b.atkSpd * 100)}%`);
  if (b.crit > 0.001) bits.push(`치명 +${Math.round(b.crit * 100)}%p`);
  return bits;
}

export interface BondOverviewRow {
  id: string;
  name: string;
  icon: string;
  active: boolean;
  have: number;
  need: number;
  effect: string;
  missingLabel: string;
}

/** 파티 기준 인연 목록 — UI용 */
export function getBondOverview(partyIds: string[]): BondOverviewRow[] {
  const set = new Set(partyIds);
  return BOND_SYNERGIES.map((b, i) => {
    const have = b.chars.filter(c => set.has(c)).length;
    const missing = b.chars.filter(c => !set.has(c));
    const missingLabel = missing.length
      ? `${missing.map(id => CHAR_MAP[id]?.name ?? id).join('·')} 필요`
      : '활성';
    return {
      id: `bond-${i}`,
      name: b.name,
      icon: b.icon,
      active: have === b.chars.length,
      have,
      need: b.chars.length,
      effect: formatBondEffect(b),
      missingLabel,
    };
  });
}
