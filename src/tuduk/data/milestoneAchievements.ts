/** UI에 노출할 핵심 마일스톤 업적 — 나머지는 자동 수령 */
export const MILESTONE_ACHIEVEMENT_IDS = [
  'kills10',
  'kills1000',
  'region3',
  'region5',
  'region10',
  'region18',
  'party3',
  'party4',
  'recruit5',
  'recruit20',
  'hc_prestige',
  'hc_prestige2',
  'enh3',
  'gold500k',
  'gold2m',
  'gold10m',
  'touch500',
  'touch2000',
  'potions50',
  'defeat5',
  'all_chars',
  'spire5',
  'spire10',
  'gems10',
  'gems50',
  'owned6',
  'support_set',
] as const;

export function isMilestoneAchievement(id: string): boolean {
  return (MILESTONE_ACHIEVEMENT_IDS as readonly string[]).includes(id);
}
