/** UI 표시용 재료 티어 — 실제 인벤토리 키는 유지 */
export const MATERIAL_TIER_GROUPS = [
  {
    id: 'ore',
    label: '광석',
    icon: '⛏️',
    keys: ['iron_ore', 'rare_ore'] as const,
  },
  {
    id: 'essence',
    label: '정수',
    icon: '💧',
    keys: ['slime_gel', 'legend_scale', 'void_shard'] as const,
  },
  {
    id: 'craft',
    label: '가공',
    icon: '✨',
    keys: ['magic_dust', 'spirit_thread', 'beast_fang'] as const,
  },
  {
    id: 'field',
    label: '채집',
    icon: '🌿',
    keys: ['wood_chip', 'healing_herb', 'shadow_wing'] as const,
  },
  {
    id: 'rift',
    label: '균열',
    icon: '🌀',
    keys: ['rift_crystal'] as const,
  },
] as const;

export function sumTierMaterials(materials: Record<string, number>, keys: readonly string[]): number {
  return keys.reduce((n, k) => n + (materials[k] ?? 0), 0);
}
