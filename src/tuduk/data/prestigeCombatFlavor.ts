import type { PrestigeSfxTheme } from './prestigeBranchForks';

/** 전직 단계별 전투 연출 색·강도 */
const PRESTIGE_SLASH_COLORS = [
  { main: '#ffffff', accent: '#ffee66' },
  { main: '#aaddff', accent: '#66ccff' },
  { main: '#cc88ff', accent: '#ff88ff' },
  { main: '#ffd700', accent: '#ff6644' },
] as const;

const THEME_SLASH_COLORS: Record<PrestigeSfxTheme, { main: string; accent: string }> = {
  guardian: { main: '#88bbdd', accent: '#ccddee' },
  berserker: { main: '#ff6644', accent: '#ffaa44' },
  arcane: { main: '#cc66ff', accent: '#ff88ff' },
  frost: { main: '#88ddff', accent: '#aaeeff' },
  blade: { main: '#ffdd88', accent: '#ffffff' },
  holy: { main: '#ffeeaa', accent: '#ffffcc' },
  shadow: { main: '#9966cc', accent: '#442266' },
  ranger: { main: '#66cc88', accent: '#aaffcc' },
  beast: { main: '#ff8844', accent: '#ffcc66' },
  support: { main: '#66ddaa', accent: '#ccffee' },
  lancer: { main: '#ffaa66', accent: '#ffdd99' },
  royal: { main: '#ddcc44', accent: '#ffff88' },
};

export function getPrestigeSlashColors(
  prestige: number,
  crit: boolean,
  theme?: PrestigeSfxTheme | null,
): { main: string; accent: string } {
  if (theme && prestige > 0) {
    const base = THEME_SLASH_COLORS[theme];
    const boost = Math.min(3, prestige);
    if (boost >= 3) return { main: base.accent, accent: base.main };
    if (crit) return { main: base.accent, accent: base.main };
    return base;
  }
  const tier = Math.min(PRESTIGE_SLASH_COLORS.length - 1, Math.max(0, prestige));
  const base = PRESTIGE_SLASH_COLORS[tier]!;
  if (!crit && prestige <= 0) return { main: '#ffffff', accent: '#ffee66' };
  return base;
}

export function getPrestigeSkillHueShift(prestige: number, theme?: PrestigeSfxTheme | null): number {
  const themeShift: Partial<Record<PrestigeSfxTheme, number>> = {
    frost: 40, arcane: 72, holy: 18, shadow: 88, beast: 12, support: 55,
  };
  const base = Math.min(84, prestige * 28);
  return base + (theme ? (themeShift[theme] ?? 0) : 0);
}

export function getPrestigePitchBonus(prestige: number, theme?: PrestigeSfxTheme | null): number {
  const themeBonus: Partial<Record<PrestigeSfxTheme, number>> = {
    berserker: 0.04, frost: -0.03, shadow: -0.02, royal: 0.03,
  };
  return prestige * 0.07 + (theme ? (themeBonus[theme] ?? 0) : 0);
}
