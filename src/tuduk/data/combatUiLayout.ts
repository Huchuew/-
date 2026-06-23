/** HTML 스킬 바 높이 */

export const COMBAT_SKILL_BAR_RATIO = 0.13;

export function combatSkillBarHeightPx(canvasH: number, partySize = 4): number {
  const ratio = partySize >= 4 ? 0.145 : partySize >= 3 ? 0.135 : COMBAT_SKILL_BAR_RATIO;
  const base = Math.round(canvasH * ratio);
  const extra = partySize >= 4 ? 20 : partySize >= 3 ? 12 : 0;
  const minH = partySize >= 4 ? 46 : 42;
  return Math.min(Math.max(minH, base + extra), Math.round(canvasH * 0.19));
}
