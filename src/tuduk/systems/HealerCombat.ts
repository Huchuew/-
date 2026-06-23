import type { CombatEntity, GameSave } from '../types';
import { CHAR_MAP, isHealerChar } from '../data/characters';
import { cleanseCombatDebuffs } from './monsterDebuffs';
import { HEAL_ATK_COEFF, HEAL_AMOUNT_GLOBAL_MULT, HEAL_COOLDOWN_MS } from '../data/combatBalance';

/** 힐러별 전투 회복 배율 (힐량만 — 빈도와 분리) */
const HEALER_MULT: Record<string, number> = {
  yujin: 0.92,
  isanim: 0.86,
  hidden: 0.88,
};

/** @deprecated — HEAL_COOLDOWN_MS(combatBalance) 사용 */
export { HEAL_COOLDOWN_MS };

/** 스킬 1회 치유 대상 수 (광역 힐 제한) */
export const HEAL_TARGETS_PER_PROC = 2;

/** @deprecated — HEAL_SKILL_PROC_MULT(combatBalance) 사용 */
export const HEAL_PROC_MULT = 0.38;

/** 2·3·4차 전직 — 빈도(proc·쿨)와 힐량(amount) 분리 */
export function getHealerPrestigeBonuses(prestige = 0): {
  amountMult: number;
  procMult: number;
  cooldownMult: number;
  maxTargetsBonus: number;
  pityReduction: number;
} {
  const p = Math.min(3, Math.max(0, prestige));
  const fourth = p >= 3 ? 1 : 0;
  return {
    amountMult: 1 + p * 0.16 + fourth * 0.3,
    procMult: 1 + p * 0.45 + fourth * 0.38,
    cooldownMult: 1 / (1 + p * 0.34 + fourth * 0.12),
    maxTargetsBonus: p >= 3 ? 2 : p >= 2 ? 1 : p >= 1 ? 1 : 0,
    pityReduction: p,
  };
}

export function getHealerCombatMult(charId: string, prestige = 0): number {
  if (!isHealerChar(charId)) return 1;
  const base = HEALER_MULT[charId] ?? 1.0;
  return base * getHealerPrestigeBonuses(prestige).amountMult;
}

export function getHealerCooldownMs(prestige = 0): number {
  return Math.floor(HEAL_COOLDOWN_MS * getHealerPrestigeBonuses(prestige).cooldownMult);
}

export function canHealerProcNow(
  st: { lastHealMs?: number; prestige?: number },
  now: number = Date.now(),
): boolean {
  const last = st.lastHealMs ?? 0;
  return now - last >= getHealerCooldownMs(st.prestige ?? 0);
}

export function markHealerProc(st: { lastHealMs?: number }, now: number = Date.now()): void {
  st.lastHealMs = now;
}

/** 파티에 치유가 필요한지 (힐러 스킬 우선 판단용) */
export function partyNeedsHeal(party: CombatEntity[], threshold = 0.82): boolean {
  const alive = party.filter(p => p.hp > 0);
  if (!alive.length) return false;
  return alive.some(p => p.hp / Math.max(1, p.maxHp) < threshold);
}

export interface HealTargetDetail {
  charId: string;
  charName: string;
  amount: number;
  hpAfter: number;
  maxHp: number;
}

export interface CleanseTargetDetail {
  charId: string;
  charName: string;
  removed: string[];
}

export function applyCombatHeal(
  party: CombatEntity[],
  healPct: number,
  healScale: number,
  healerId: string,
  maxTargets = HEAL_TARGETS_PER_PROC,
  prestige = 0,
): { total: number; details: HealTargetDetail[] } {
  const bon = getHealerPrestigeBonuses(prestige);
  const mult = getHealerCombatMult(healerId, prestige);
  const healer = party.find(p => p.id === healerId);
  const healerAtk = healer?.atk ?? 0;
  let total = 0;
  const details: HealTargetDetail[] = [];
  const targetCap = Math.max(1, maxTargets + bon.maxTargetsBonus);
  const candidates = party
    .filter(p => p.hp > 0 && p.hp < p.maxHp)
    .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))
    .slice(0, targetCap);

  for (const ally of candidates) {
    const base = ally.maxHp * healPct + healerAtk * HEAL_ATK_COEFF;
    const amt = Math.floor(base * healScale * mult * HEAL_AMOUNT_GLOBAL_MULT);
    if (amt <= 0) continue;
    const before = ally.hp;
    ally.hp = Math.min(ally.maxHp, ally.hp + amt);
    const gained = ally.hp - before;
    if (gained <= 0) continue;
    total += gained;
    details.push({
      charId: ally.id,
      charName: ally.name,
      amount: gained,
      hpAfter: ally.hp,
      maxHp: ally.maxHp,
    });
  }
  return { total, details };
}

export function applyCombatCleanse(
  party: CombatEntity[],
  maxRemovals: number,
  clearDots: boolean,
  save?: GameSave,
): CleanseTargetDetail[] {
  const details: CleanseTargetDetail[] = [];
  for (const ally of party) {
    if (ally.hp <= 0) continue;
    const removed = cleanseCombatDebuffs(ally, maxRemovals, clearDots, save);
    if (removed.length) {
      details.push({ charId: ally.id, charName: ally.name, removed });
    }
  }
  return details;
}
