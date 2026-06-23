/** UI 숫자 표기 — 최대 maxDecimals자리, 부동소수 잡음·불필요한 0 제거 */
export function formatStatNum(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return '0';
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(value * factor) / factor;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(maxDecimals).replace(/\.?0+$/, '');
}

/** 장비 레시피 기본 스탯 한 줄 */
export function formatRecipeStatLine(stats: {
  atk: number;
  def: number;
  hp: number;
  atkSpd?: number;
  crit?: number;
}): string {
  const parts = [`ATK+${stats.atk}`, `DEF+${stats.def}`, `HP+${stats.hp}`];
  if (stats.atkSpd) parts.push(`공속+${formatStatNum(stats.atkSpd)}`);
  if (stats.crit) parts.push(`치명+${formatStatNum(stats.crit)}`);
  return parts.join(' ');
}
