import { isTankChar } from '../data/characters';

/** 몬스터 타겟 — 어그로(위협) 기반만 사용 */
export type MonsterTargetPattern = 'threat';

export function resolveMonsterTargetPattern(): MonsterTargetPattern {
  return 'threat';
}

/** 대열 N번째(0=선봉) 캐릭터 ID */
export function getFormationCharAt(save: { partyFormation?: string[]; party: string[] }, index: number): string | null {
  const order = save.partyFormation ?? save.party;
  return order[index] ?? null;
}

export function isTankCharId(charId: string): boolean {
  return isTankChar(charId);
}
