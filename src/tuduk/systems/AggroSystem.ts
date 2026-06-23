import type { CombatEntity, EquipRole, GameSave } from '../types';
import { CHAR_MAP, isTankChar } from '../data/characters';
import { reconcileFormation } from './FormationSystem';
import type { RegionAffix } from '../data/regionAffixes';
import { getTankThreatMult } from './AgilitySystem';

/** 탱커가 넣은 피해 — 몬스터가 느끼는 위협 배율 (딜러 대비 어그로 확보) */
export const TANK_DAMAGE_THREAT_MULT = 62;

/** 전투 시작 시 탱커 기본 위협 (선봉일수록 높음) */
const TANK_BASE_THREAT = 5200;
const FRONT_FORMATION_THREAT = 780;
const TANK_THREAT_BIAS = 15800;
/** 후방일수록 몬스터 타겟 선정 가중 감소 (0=선봉, 1=후방) */
const BACK_AGGRO_DEPTH_PENALTY = 0.90;

/** 타겟 선정 시 비탱커 위협 가중 (딜러 딜량이 높아도 탱커가 끌어당김) */
const ROLE_PICK_THREAT_MULT: Record<EquipRole, number> = {
  tank: 1,
  bruiser: 0.10,
  dps: 0.018,
  healer: 0.042,
  support: 0.038,
};

/** 역할별 딜 → 위협 변환 (탱커 제외 1 = 실제 피해량 그대로) */
const ROLE_DAMAGE_THREAT_MULT: Record<EquipRole, number> = {
  tank: TANK_DAMAGE_THREAT_MULT,
  bruiser: 0.68,
  dps: 0.48,
  healer: 0.38,
  support: 0.32,
};

/** 생존 탱커가 있을 때 탱커 고정 확률 (딜러가 극단적 위협이 아니면) */
const TANK_STICKY_CHANCE = 0.93;
/** 딜러가 탱커를 이기려면 필요한 위협 배수 */
const DPS_OVERTAKE_TANK_MULT = 14;

export interface AggroSnapshot {
  enemyUid: string;
  enemyName: string;
  rows: { charId: string; name: string; pct: number; color: string }[];
}

export class AggroTracker {
  /** 몬스터별 캐릭터 누적 위협 (주로 가한 피해량 기반) */
  private tables = new Map<string, Record<string, number>>();
  private tauntUntil = new Map<string, number>();

  reset(enemyUids: string[], save: GameSave) {
    this.tables.clear();
    this.tauntUntil.clear();
    reconcileFormation(save);
    const order = save.partyFormation ?? save.party;
    for (const uid of enemyUids) {
      const table: Record<string, number> = {};
      for (let i = 0; i < order.length; i++) {
        const charId = order[i]!;
        let base = 0;
        if (isTankChar(charId)) {
          base = TANK_BASE_THREAT + Math.max(0, (order.length - 1 - i)) * 110;
        } else {
          base = Math.max(0, (order.length - 1 - i)) * 85;
        }
        table[charId] = base;
      }
      this.tables.set(uid, table);
    }
  }

  /** 가한 피해만큼 위협 누적 — 탱커는 ×48 (+ 어그로 강화) */
  addDamageThreat(
    enemyUid: string,
    charId: string,
    damage: number,
    affix: RegionAffix,
    save: GameSave,
  ) {
    if (damage <= 0) return;
    const table = this.tables.get(enemyUid);
    if (!table) return;
    const role = CHAR_MAP[charId]?.equipRole ?? 'dps';
    let mult = ROLE_DAMAGE_THREAT_MULT[role];
    if (role === 'tank') {
      mult *= getTankThreatMult(save.chars[charId] ?? {});
    }
    mult *= affix.aggroVolatility;
    table[charId] = (table[charId] ?? 0) + Math.floor(damage * mult);
  }

  addHealThreat(charId: string, healAmount: number, affix: RegionAffix) {
    if (healAmount <= 0) return;
    const role = CHAR_MAP[charId]?.equipRole ?? 'dps';
    const healThreat = role === 'healer' || role === 'support' ? 0.22 : 0.35;
    const threat = Math.floor(healAmount * healThreat * affix.aggroVolatility);
    for (const table of this.tables.values()) {
      table[charId] = (table[charId] ?? 0) + threat;
    }
  }

  applyTaunt(charId: string, durationSec = 4) {
    const until = Date.now() + durationSec * 1000;
    this.tauntUntil.set(charId, until);
    for (const table of this.tables.values()) {
      const max = Math.max(...Object.values(table), 1);
      table[charId] = max + 12000;
    }
  }

  /** 대열 깊이 — 선봉 1.0, 후방으로 갈수록 타겟 가중 감소 */
  private formationPickMult(formIdx: number, partySize: number, role: EquipRole): number {
    if (formIdx < 0 || partySize <= 1) return 1;
    const depth = formIdx / (partySize - 1);
    if (role === 'tank') {
      return Math.max(0.72, 1.15 - depth * 0.38);
    }
    if (role === 'healer' || role === 'support') {
      return Math.max(0.1, 1 - depth * BACK_AGGRO_DEPTH_PENALTY);
    }
    if (role === 'dps') {
      return Math.max(0.04, 1 - depth * (BACK_AGGRO_DEPTH_PENALTY + 0.12));
    }
    return Math.max(0.22, 1 - depth * (BACK_AGGRO_DEPTH_PENALTY - 0.08));
  }

  private scorePickThreat(
    raw: number,
    role: EquipRole,
    formIdx: number,
    partySize: number,
  ): number {
    let t = raw * ROLE_PICK_THREAT_MULT[role];
    if (role === 'tank') {
      t += TANK_THREAT_BIAS + Math.max(0, (partySize - 1 - formIdx)) * FRONT_FORMATION_THREAT;
    } else if (formIdx === 0 && role === 'bruiser') {
      t += FRONT_FORMATION_THREAT * 0.35;
    }
    return t * this.formationPickMult(formIdx, partySize, role);
  }

  pickTarget(
    enemyUid: string,
    party: CombatEntity[],
    save: GameSave,
    affix: RegionAffix,
  ): CombatEntity | undefined {
    const alive = party.filter(p => p.hp > 0);
    if (alive.length === 0) return undefined;

    const now = Date.now();
    for (const p of alive) {
      const until = this.tauntUntil.get(p.id);
      if (until && until > now) return p;
    }

    const table = this.tables.get(enemyUid);
    if (!table) {
      return this.pickFormationFront(alive, save);
    }

    const order = save.partyFormation ?? save.party;
    let best: CombatEntity | undefined;
    let bestThreat = -1;
    for (const p of alive) {
      const role = CHAR_MAP[p.id]?.equipRole ?? 'dps';
      const formIdx = order.indexOf(p.id);
      const t = this.scorePickThreat(table[p.id] ?? 0, role, formIdx, order.length);
      if (t > bestThreat) {
        bestThreat = t;
        best = p;
      }
    }

    // threat 패턴: 생존 탱커 우선 — 딜러가 극단적 위협이 아니면 탱커 고정
    const tanks = alive.filter(p => isTankChar(p.id));
    if (tanks.length > 0) {
      const tankScores = tanks.map(p => {
        const formIdx = order.indexOf(p.id);
        return {
          p,
          t: this.scorePickThreat(table[p.id] ?? 0, 'tank', formIdx, order.length),
        };
      });
      const bestTank = tankScores.sort((a, b) => b.t - a.t)[0]!;
      const dpsLeads = best != null && !isTankChar(best.id)
        && bestThreat > bestTank.t * DPS_OVERTAKE_TANK_MULT;
      if (!dpsLeads || Math.random() < TANK_STICKY_CHANCE) {
        best = bestTank.p;
        bestThreat = bestTank.t;
      }
    }

    if (bestThreat <= 0) {
      return this.pickFormationFront(alive, save);
    }

    if (affix.aggroVolatility >= 1.8 && Math.random() < 0.01) {
      const dps = alive.filter(p => CHAR_MAP[p.id]?.equipRole === 'dps');
      if (dps.length > 0) return dps[Math.floor(Math.random() * dps.length)]!;
    }

    return best ?? this.pickFormationFront(alive, save);
  }

  private pickFormationFront(alive: CombatEntity[], save: GameSave): CombatEntity | undefined {
    const order = save.partyFormation ?? save.party;
    for (const id of order) {
      const found = alive.find(p => p.id === id);
      if (found) return found;
    }
    return alive[0];
  }

  getSnapshots(save: GameSave, enemyUids: { uid: string; name: string }[]): AggroSnapshot[] {
    const order = save.partyFormation ?? save.party;
    return enemyUids.map(({ uid, name }) => {
      const table = this.tables.get(uid) ?? {};
      const weighted: Record<string, number> = {};
      let total = 0;
      for (const id of save.party) {
        const role = CHAR_MAP[id]?.equipRole ?? 'dps';
        const formIdx = order.indexOf(id);
        const w = this.scorePickThreat(table[id] ?? 0, role, formIdx, order.length);
        weighted[id] = w;
        total += w;
      }
      total = Math.max(1, total);
      const rows = save.party.map(id => {
        const def = CHAR_MAP[id];
        const t = weighted[id] ?? 0;
        return {
          charId: id,
          name: def?.name ?? id,
          pct: Math.round((t / total) * 100),
          color: def?.color ?? '#fff',
        };
      }).sort((a, b) => b.pct - a.pct);
      return { enemyUid: uid, enemyName: name, rows };
    });
  }

  getAggroTip(affix: RegionAffix): string {
    if (affix.aggroVolatility >= 1.8) {
      return '혼란 어픽스 — 가끔 딜러 노리지만 탱 딜×62·도발로 대부분 막기';
    }
    return '몬스터는 위협(딜량) 최고 대상 공격 · 선봉·탱커 우선 · 후방은 어그로↓';
  }
}
