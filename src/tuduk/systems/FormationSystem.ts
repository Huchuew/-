import type { CombatEntity, GameSave } from '../types';
import { CHAR_MAP, isTankChar } from '../data/characters';
import { MAX_PARTY_SIZE } from '../types';

/** 저장 데이터 대열 정규화 — party와 동일 멤버, 탱커 우선 기본 배치 */
export function reconcileFormation(save: GameSave): void {
  const party = save.party.filter(id => save.owned.includes(id));
  const prev = save.partyFormation?.filter(id => party.includes(id)) ?? [];

  const missing = party.filter(id => !prev.includes(id));
  let formation = [...prev, ...missing];

  if (formation.length !== party.length) {
    formation = sortFormationDefault(party);
  }

  save.partyFormation = formation.slice(0, MAX_PARTY_SIZE);
}

function sortFormationDefault(party: string[]): string[] {
  const tanks = party.filter(id => isTankChar(id));
  const others = party.filter(id => !isTankChar(id));
  return [...tanks, ...others];
}

export function moveFormationFront(save: GameSave, charId: string): boolean {
  if (!save.party.includes(charId)) return false;
  reconcileFormation(save);
  const f = save.partyFormation!.filter(id => id !== charId);
  save.partyFormation = [charId, ...f];
  return true;
}

export function moveFormationBack(save: GameSave, charId: string): boolean {
  if (!save.party.includes(charId)) return false;
  reconcileFormation(save);
  const f = save.partyFormation!.filter(id => id !== charId);
  save.partyFormation = [...f, charId];
  return true;
}

/** 몬스터가 공격할 대상 — 대열 앞(탱킹) 우선 */
export function pickMonsterTarget(party: CombatEntity[], save: GameSave): CombatEntity | undefined {
  reconcileFormation(save);
  for (const id of save.partyFormation ?? []) {
    const p = party.find(x => x.id === id && x.hp > 0);
    if (p) return p;
  }
  return party.find(p => p.hp > 0);
}

export function getFormationLabel(save: GameSave): string {
  reconcileFormation(save);
  return (save.partyFormation ?? [])
    .map((id, i) => {
      const name = CHAR_MAP[id]?.name ?? id;
      const role = i === 0 ? '선봉' : i === (save.partyFormation!.length - 1) ? '후방' : '중열';
      return `${role}:${name}`;
    })
    .join(' → ');
}

/** 화면 배치: 후방(왼쪽) → 선봉(오른쪽·적 인접) */
export function getVisualPartyOrder(save: GameSave): string[] {
  reconcileFormation(save);
  return [...(save.partyFormation ?? save.party)].reverse();
}

/** UI 목록 순서: 선봉 → 후방 (대열 패널과 동일) */
export function getFormationDisplayOrder(save: GameSave): string[] {
  reconcileFormation(save);
  return [...(save.partyFormation ?? save.party)];
}

export function getFormationRoleLabel(index: number, total: number): string {
  if (index === 0) return '선봉';
  if (index === total - 1) return '후방';
  return '중열';
}

/** 전투 스프라이트·VFX 슬롯 (0=후방 왼쪽) */
export function getVisualSlotIndex(save: GameSave, charId: string): number {
  const idx = getVisualPartyOrder(save).indexOf(charId);
  return idx >= 0 ? idx : 0;
}

/** 전투 플로팅 텍스트 X (0~1) */
export function getPartySlotEventX(slot: number, partySize: number): number {
  const span = partySize <= 3 ? 0.078 : 0.062;
  const base = partySize <= 3 ? 0.13 : 0.10;
  return base + slot * span;
}
