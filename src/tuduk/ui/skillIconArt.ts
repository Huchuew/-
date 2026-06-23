/**
 * Game Icons (game-icons.net) — CC BY 3.0
 * Extract: node scripts/extract-skill-icons.mjs
 */
import type { ElementType } from '../types';
import type { CombatSkillDef, SkillKind } from '../data/combatSkills';
import { getPrestigeSkillHueShift } from '../data/prestigeCombatFlavor';
import iconPack from '../data/skillGameIcons.json';

type IconEntry = { body: string; w: number; h: number };

const ICONS: Record<string, IconEntry> = iconPack.icons as Record<string, IconEntry>;

const ICON_POOLS: Record<string, string[]> = {
  heal: ['heart-plus', 'healing', 'health-potion', 'magic-potion', 'healing-shield'],
  cleanse: ['broom', 'water-recycling', 'sparkles', 'sunbeams', 'sun-radiations'],
  buff: ['upgrade', 'health-increase', 'muscle-up', 'strong', 'sun'],
  block: ['round-shield', 'bordered-shield', 'bolt-shield', 'shield-reflect', 'attached-shield'],
  fire: ['fireball', 'fire', 'flame', 'fire-bomb', 'campfire'],
  water: ['water-drop', 'droplets', 'water-splash', 'ice-cube', 'water-recycling'],
  thunder: ['chain-lightning', 'lightning-arc', 'thunderball', 'thunder-struck', 'electric'],
  poison: ['poison-bottle', 'poison-cloud', 'acid', 'death-juice', 'potion-of-madness'],
  none: ['crossed-swords', 'sword-clash', 'saber-slash', 'broadsword', 'ancient-sword'],
};

const TINT: Record<string, string> = {
  heal: '#5de89a',
  cleanse: '#7ec8ff',
  buff: '#ffd56a',
  block: '#8eb4ff',
  fire: '#ff7744',
  water: '#55bbff',
  thunder: '#ffe066',
  poison: '#8ddf55',
  none: '#c8d4e8',
};

function variant(nodeId: string, max: number): number {
  let h = 0;
  for (let i = 0; i < nodeId.length; i++) h = (h * 13 + nodeId.charCodeAt(i)) >>> 0;
  return h % max;
}

function poolFor(skill: CombatSkillDef): string[] {
  if (skill.skillKind === 'heal') return ICON_POOLS.heal!;
  if (skill.skillKind === 'cleanse') return ICON_POOLS.cleanse!;
  if (skill.skillKind === 'buff') return ICON_POOLS.buff!;
  if (skill.skillKind === 'block') return ICON_POOLS.block!;
  const el = skill.element as ElementType;
  if (el !== 'none' && ICON_POOLS[el]) return ICON_POOLS[el]!;
  return ICON_POOLS.none!;
}

function iconNameFor(skill: CombatSkillDef): string {
  const pool = poolFor(skill);
  return pool[variant(skill.nodeId, pool.length)] ?? pool[0]!;
}

function tintFor(skill: CombatSkillDef, prestigeLevel = 0): string {
  if (skill.skillKind === 'heal') return shiftTint(TINT.heal!, prestigeLevel);
  if (skill.skillKind === 'cleanse') return shiftTint(TINT.cleanse!, prestigeLevel);
  if (skill.skillKind === 'buff') return shiftTint(TINT.buff!, prestigeLevel);
  if (skill.skillKind === 'block') return shiftTint(TINT.block!, prestigeLevel);
  return shiftTint(TINT[skill.element] ?? TINT.none!, prestigeLevel);
}

function shiftTint(hex: string, prestigeLevel: number): string {
  if (prestigeLevel <= 0) return hex;
  const hueShift = getPrestigeSkillHueShift(prestigeLevel);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r / 255) h = ((g - b) / 255 / d + (g < b ? 6 : 0)) / 6;
    else if (max === g / 255) h = ((b - r) / 255 / d + 2) / 6;
    else h = ((r - g) / 255 / d + 4) / 6;
  }
  h = (h * 360 + hueShift) % 360;
  s = Math.min(1, s + prestigeLevel * 0.08);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let rr = 0; let gg = 0; let bb = 0;
  if (h < 60) { rr = c; gg = x; }
  else if (h < 120) { rr = x; gg = c; }
  else if (h < 180) { gg = c; bb = x; }
  else if (h < 240) { gg = x; bb = c; }
  else if (h < 300) { rr = x; bb = c; }
  else { rr = c; bb = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
}

export function renderSkillIconSvg(skill: CombatSkillDef, prestigeLevel = 0): string {
  const name = iconNameFor(skill);
  const entry = ICONS[name];
  const tint = tintFor(skill, prestigeLevel);
  if (!entry) {
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="${tint}"/></svg>`;
  }
  return `<svg viewBox="0 0 ${entry.w} ${entry.h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="skill-game-icon" style="color:${tint}" role="img">
    <g fill="currentColor">${entry.body}</g>
  </svg>`;
}

export function skillIconBorderColor(skill: CombatSkillDef, prestigeLevel = 0): string {
  return tintFor(skill, prestigeLevel);
}

export function getSkillIconName(skill: CombatSkillDef): string {
  return iconNameFor(skill);
}
