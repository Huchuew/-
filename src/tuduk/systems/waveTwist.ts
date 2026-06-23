export type WaveTwistId = 'fury' | 'brittle' | 'bounty' | 'swift';

export interface WaveTwist {
  id: WaveTwistId;
  label: string;
  banner: string;
  enemyAtkMult: number;
  enemyDefMult: number;
  goldMult: number;
  matMult: number;
}

const WAVE_TWISTS: WaveTwist[] = [
  { id: 'fury', label: '분노', banner: '🔥 분노 — 적 공격↑', enemyAtkMult: 1.18, enemyDefMult: 1, goldMult: 1.12, matMult: 1 },
  { id: 'brittle', label: '허약', banner: '🧊 허약 — 적 방어↓', enemyAtkMult: 1, enemyDefMult: 0.88, goldMult: 1, matMult: 1.08 },
  { id: 'bounty', label: '풍요', banner: '✨ 풍요 — 드랍↑', enemyAtkMult: 1, enemyDefMult: 1, goldMult: 1.25, matMult: 1.35 },
  { id: 'swift', label: '돌풍', banner: '💨 돌풍 — 적 속도↑', enemyAtkMult: 1.08, enemyDefMult: 1, goldMult: 1.05, matMult: 1.05 },
];

/** 보스·에픽·엘리트 제외 — 가끔 패턴 변화 */
export function rollWaveTwist(isBoss: boolean, isElite: boolean, isEpic: boolean): WaveTwist | null {
  if (isBoss || isElite || isEpic) return null;
  if (Math.random() > 0.14) return null;
  return WAVE_TWISTS[Math.floor(Math.random() * WAVE_TWISTS.length)]!;
}
