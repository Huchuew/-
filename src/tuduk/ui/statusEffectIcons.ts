import type { CookType, ElementType, TimedCombatEffect } from '../types';
import { getSkillForNode } from '../data/combatSkills';

const DEBUFF_ICON: Record<string, string> = {
  weakness: '📉',
  armor_break: '🔨',
  slow: '🐢',
  poison: '☢️',
  curse: '🌑',
  bleed: '🩸',
  shock: '⚡',
  silence: '🤐',
};

const SIGNATURE_ICON: Record<string, string> = {
  sig_mujang: '📣',
  sig_huchu: '🔮',
  sig_dung: '🌪️',
  sig_ujang: '⚔️',
  sig_lesford: '🔱',
  sig_ampa: '😤',
  sig_yujin: '✨',
  sig_seoyoung: '🛡️',
  sig_teso: '☀️',
  sig_horangi: '🐯',
  sig_hyesung: '☄️',
  sig_isanim: '💧',
  sig_sanjeok: '🏴‍☠️',
  sig_sodia: '🎯',
  sig_jimjimi: '🐎',
  sig_danjong: '👑',
  sig_hyeoni: '👻',
  sig_pocket: '🧱',
  sig_cutie: '💀',
  sig_hidden: '🍲',
};

const ROSTER_PROC_ICON: Record<string, string> = {
  mj_shield: '🛡️',
  uj_combo: '⚔️',
  dg_snipe: '🎯',
  ls_pierce: '🔱',
  am_rage: '😤',
  yj_heal: '💚',
  sy_guard: '🔰',
  bh_holy: '☀️',
  hg_claw: '🐾',
  hs_meteor: '☄️',
  mn_split: '🧬',
  cl_loot: '💰',
  sd_poison: '☢️',
  tn_charge: '🐎',
  dj_crown: '👑',
  hv_curse: '👁️',
  pk_wall: '🧱',
  ct_void: '💀',
  hd_feast: '🍖',
};

const BUFF_STAT_ICON_POOL = ['💪', '🌟', '🔥', '💨', '🗡️', '🎺', '🦅', '♨️', '🌀', '💎'] as const;

const DOT_HUD_ICON: Record<ElementType, string> = {
  none: '💢',
  fire: '🔥',
  water: '❄️',
  thunder: '⚡',
  poison: '☢️',
};

const COOK_HUD_ICON: Record<CookType, string> = {
  bbq: '🥩',
  spicy: '🌶️',
  feast: '🍱',
};

function hashPick(seed: string, pool: readonly string[]): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

function rosterProcKey(id: string): string | null {
  const m = id.match(/^([a-z]{2}_[a-z]+)_/);
  return m?.[1] ?? null;
}

function skillNodeIdFromModId(id: string): string | null {
  if (id.startsWith('skill_')) return id.slice('skill_'.length);
  if (id.startsWith('block_')) return id.slice('block_'.length);
  return null;
}

function skillHudIcon(nodeId: string, mod: TimedCombatEffect): string {
  if (SIGNATURE_ICON[nodeId]) return SIGNATURE_ICON[nodeId];
  const skill = getSkillForNode(nodeId);
  if (skill) {
    if (skill.skillKind === 'block') return '🛡️';
    if (skill.skillKind === 'heal') return '💚';
    if (skill.skillKind === 'cleanse') return '🧹';
    if (skill.buffDefMult && skill.buffAtkMult) return hashPick(nodeId, ['⚔️', '🔱', '🛡️']);
    if (skill.buffDefMult) return '🛡️';
    if (skill.buffSpdMult && !skill.buffAtkMult) return '💨';
    if (skill.buffAtkMult && skill.buffSpdMult) return '🔥';
    if (skill.buffAtkMult) return '🗡️';
    const el = DOT_HUD_ICON[skill.element];
    if (skill.element !== 'none') return el;
  }
  if (mod.id.startsWith('block_')) return '🛡️';
  return hashPick(nodeId, BUFF_STAT_ICON_POOL);
}

function debuffStatIcon(mod: TimedCombatEffect): string {
  if (mod.damagePerTick) return '🩸';
  if (mod.spdMult && mod.spdMult < 1 && mod.atkMult && mod.atkMult < 1) return '⚡';
  if (mod.spdMult && mod.spdMult < 1) return '🐢';
  if (mod.atkMult && mod.atkMult < 1 && mod.defMult && mod.defMult < 1) return '🌑';
  if (mod.atkMult && mod.atkMult < 1) return '📉';
  if (mod.defMult && mod.defMult < 1) return '🔨';
  return '⛔';
}

function buffStatIcon(mod: TimedCombatEffect): string {
  if (mod.defMult && mod.defMult > 1 && mod.atkMult && mod.atkMult > 1) return '⚔️';
  if (mod.defMult && mod.defMult > 1) return '🛡️';
  if (mod.spdMult && mod.spdMult > 1 && mod.atkMult && mod.atkMult > 1) return '🔥';
  if (mod.spdMult && mod.spdMult > 1) return '💨';
  if (mod.atkMult && mod.atkMult > 1) return '🗡️';
  return hashPick(mod.id, BUFF_STAT_ICON_POOL);
}

/** HUD 칩용 — 효과별 구분 아이콘 */
export function resolveStatusHudIcon(mod: TimedCombatEffect): string {
  if (DEBUFF_ICON[mod.id]) return DEBUFF_ICON[mod.id];

  const procKey = rosterProcKey(mod.id);
  if (procKey && ROSTER_PROC_ICON[procKey]) return ROSTER_PROC_ICON[procKey];

  const nodeId = skillNodeIdFromModId(mod.id);
  if (nodeId) return skillHudIcon(nodeId, mod);

  if (mod.kind === 'debuff') return debuffStatIcon(mod);
  return buffStatIcon(mod);
}

export function resolveDotHudIcon(element: ElementType): string {
  return DOT_HUD_ICON[element] ?? '💢';
}

export function resolveCookHudIcon(type: CookType): string {
  return COOK_HUD_ICON[type] ?? '🍳';
}
