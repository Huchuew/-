export type StatusVfxRing = 'heal' | 'shield' | 'buff' | 'debuff_dot' | 'debuff_stat' | 'debuff_shock' | 'debuff_curse';

export interface StatusVfxSpec {
  ring: StatusVfxRing;
  color: string;
  glow: string;
  particle?: string;
  duration: number;
}

const DEBUFF_VFX: Record<string, StatusVfxSpec> = {
  weakness: { ring: 'debuff_stat', color: '#aa99cc', glow: '#7766aa', particle: '⬇', duration: 0.72 },
  armor_break: { ring: 'debuff_stat', color: '#cc8866', glow: '#aa6644', particle: '💥', duration: 0.78 },
  slow: { ring: 'debuff_stat', color: '#66aadd', glow: '#4488cc', particle: '❄', duration: 0.7 },
  poison: { ring: 'debuff_dot', color: '#55cc44', glow: '#338822', particle: '☠', duration: 0.85 },
  curse: { ring: 'debuff_curse', color: '#aa44ff', glow: '#6622aa', particle: '💀', duration: 0.9 },
  bleed: { ring: 'debuff_dot', color: '#ff4455', glow: '#cc2233', particle: '🩸', duration: 0.75 },
  shock: { ring: 'debuff_shock', color: '#ffee44', glow: '#ddcc22', particle: '⚡', duration: 0.65 },
  silence: { ring: 'debuff_stat', color: '#8899bb', glow: '#556688', particle: '🔇', duration: 0.8 },
};

export function resolveDebuffVfx(debuffId: string): StatusVfxSpec {
  return DEBUFF_VFX[debuffId] ?? { ring: 'debuff_stat', color: '#cc88ff', glow: '#8844cc', particle: '✦', duration: 0.7 };
}

export function resolveBuffVfx(opts: {
  skillKind?: string;
  hasAtk?: boolean;
  hasDef?: boolean;
  hasSpd?: boolean;
}): StatusVfxSpec {
  if (opts.skillKind === 'block') {
    return { ring: 'shield', color: '#88aaff', glow: '#4466cc', particle: '🛡', duration: 0.62 };
  }
  if (opts.skillKind === 'heal') {
    return { ring: 'heal', color: '#55ff99', glow: '#22cc66', particle: '💚', duration: 0.7 };
  }
  if (opts.skillKind === 'cleanse') {
    return { ring: 'heal', color: '#aaddff', glow: '#66aaff', particle: '✨', duration: 0.68 };
  }
  if (opts.hasSpd && !opts.hasAtk && !opts.hasDef) {
    return { ring: 'buff', color: '#ffdd66', glow: '#ccaa22', particle: '⚡', duration: 0.6 };
  }
  if (opts.hasDef && !opts.hasAtk) {
    return { ring: 'shield', color: '#aaccff', glow: '#6688dd', particle: '🛡', duration: 0.58 };
  }
  if (opts.hasAtk) {
    return { ring: 'buff', color: '#ffaa55', glow: '#dd7722', particle: '🔥', duration: 0.6 };
  }
  return { ring: 'buff', color: '#ffee88', glow: '#ddcc44', particle: '✨', duration: 0.58 };
}
