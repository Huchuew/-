export interface SpireModifier {
  id: string;
  name: string;
  desc: string;
  /** DPS 요구 배율 */
  dpsMult: number;
  /** 보상 배율 */
  rewardMult: number;
}

export const SPIRE_MODIFIERS: SpireModifier[] = [
  { id: 'normal', name: '평온', desc: '특수 규칙 없음', dpsMult: 1, rewardMult: 1 },
  { id: 'burn', name: '화염 주간', desc: '화염 약점 없으면 DPS -15%', dpsMult: 1.12, rewardMult: 1.15 },
  { id: 'flood', name: '침수 주간', desc: '물 속성 적 증가', dpsMult: 1.15, rewardMult: 1.2 },
  { id: 'storm', name: '뇌전 주간', desc: '공속 요구 상승', dpsMult: 1.18, rewardMult: 1.22 },
  { id: 'void', name: '공허 주간', desc: 'HP 회복 불가', dpsMult: 1.22, rewardMult: 1.3 },
  { id: 'mirror', name: '거울 주간', desc: '적 방어 2배', dpsMult: 1.28, rewardMult: 1.35 },
];

export const SPIRE_DAILY_ATTEMPTS = 12;
export const SPIRE_RELIC_MILESTONES = [10, 25, 50, 75, 100] as const;

export function getSpireWeekId(d = new Date()): string {
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

export function getWeeklySpireModifier(weekId: string): SpireModifier {
  let hash = 0;
  for (let i = 0; i < weekId.length; i++) hash = (hash * 31 + weekId.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % SPIRE_MODIFIERS.length;
  return SPIRE_MODIFIERS[idx]!;
}

export function getSpireFloorDps(floor: number, weekId: string): number {
  const mod = getWeeklySpireModifier(weekId);
  const tier = Math.floor(floor / 10);
  const base = 180 + floor * 34 + floor * floor * 1.05 + tier * tier * 120;
  return Math.floor(base * mod.dpsMult);
}

export function getSpireRewards(floor: number, weekId: string): { gold: number; voidShards: number } {
  const mod = getWeeklySpireModifier(weekId);
  return {
    gold: Math.floor((300 + floor * 80) * mod.rewardMult),
    voidShards: Math.floor((1 + Math.floor(floor / 8)) * mod.rewardMult),
  };
}
