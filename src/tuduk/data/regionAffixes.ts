import type { ElementType } from '../types';
import { getDeepFloorArc } from './regionArcs';

export interface RegionAffix {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** 다중 출현 확률 가산 */
  spawnBonus: number;
  /** 몬스터 공속 배율 */
  monSpdMult: number;
  /** 몬스터 방어 배율 */
  monDefMult: number;
  /** 몬스터 공격 배율 */
  monAtkMult: number;
  /** 회복 효율 (1=정상) */
  healMult: number;
  /** 어그로 변동 배율 — 높을수록 딜러가 맞기 쉬움 */
  aggroVolatility: number;
  /** 약점 무효 */
  noWeakness: boolean;
  /** 주기 독 도트 */
  poisonTick?: { dmg: number; interval: number };
  /** 피격 반사 */
  reflectPct: number;
}

const AFFIX_POOL: RegionAffix[] = [
  {
    id: 'calm', name: '평온', desc: '특별 효과 없음', icon: '🌤',
    spawnBonus: 0, monSpdMult: 1, monDefMult: 1, monAtkMult: 1,
    healMult: 1, aggroVolatility: 1, noWeakness: false, reflectPct: 0,
  },
  {
    id: 'poison_mist', name: '독안개', desc: '전투 중 독 도트 · 회복 -15%', icon: '☠',
    spawnBonus: 0.05, monSpdMult: 1, monDefMult: 1, monAtkMult: 1,
    healMult: 0.85, aggroVolatility: 1.2, noWeakness: false, reflectPct: 0,
    poisonTick: { dmg: 3, interval: 2.5 },
  },
  {
    id: 'frenzy', name: '광폭', desc: '몬스터 공속 +18%', icon: '💢',
    spawnBonus: 0.08, monSpdMult: 1.18, monDefMult: 1, monAtkMult: 1.05,
    healMult: 1, aggroVolatility: 1.4, noWeakness: false, reflectPct: 0,
  },
  {
    id: 'iron_wall', name: '철벽', desc: '몬스터 방어 +22%', icon: '🛡',
    spawnBonus: 0.04, monSpdMult: 0.95, monDefMult: 1.22, monAtkMult: 1,
    healMult: 1, aggroVolatility: 1, noWeakness: false, reflectPct: 0,
  },
  {
    id: 'aggro_chaos', name: '혼란의 전장', desc: '어그로 변동 2배 — 탱커·대열 필수', icon: '🌀',
    spawnBonus: 0.1, monSpdMult: 1.08, monDefMult: 1, monAtkMult: 1.08,
    healMult: 0.92, aggroVolatility: 2, noWeakness: false, reflectPct: 0,
  },
  {
    id: 'swarm', name: '떼 습격', desc: '다중 출현 +30% · 개체 HP 감소', icon: '🐝',
    spawnBonus: 0.3, monSpdMult: 1.1, monDefMult: 0.92, monAtkMult: 1,
    healMult: 1, aggroVolatility: 1.3, noWeakness: false, reflectPct: 0,
  },
  {
    id: 'thorns', name: '가시 덤불', desc: '피격 시 6% 반사 피해', icon: '🌿',
    spawnBonus: 0.06, monSpdMult: 1, monDefMult: 1.08, monAtkMult: 1,
    healMult: 1, aggroVolatility: 1.1, noWeakness: false, reflectPct: 0.06,
  },
  {
    id: 'element_lock', name: '속성 봉인', desc: '약점 보너스 무효 · 속성 통일 추천', icon: '🔒',
    spawnBonus: 0.05, monSpdMult: 1, monDefMult: 1.1, monAtkMult: 1.12,
    healMult: 1, aggroVolatility: 1.2, noWeakness: true, reflectPct: 0,
  },
  {
    id: 'blood_moon', name: '혈월', desc: '몬스터 공격 +15% · 처치 골드 +20%', icon: '🌙',
    spawnBonus: 0.07, monSpdMult: 1.05, monDefMult: 1, monAtkMult: 1.15,
    healMult: 0.9, aggroVolatility: 1.5, noWeakness: false, reflectPct: 0,
  },
  {
    id: 'abyss_pulse', name: '심연의 맥동', desc: '10층+ 디버프 강화 · 회복 -22%', icon: '🕳',
    spawnBonus: 0.12, monSpdMult: 1.12, monDefMult: 1.08, monAtkMult: 1.18,
    healMult: 0.78, aggroVolatility: 1.6, noWeakness: true, reflectPct: 0.04,
    poisonTick: { dmg: 5, interval: 2.2 },
  },
  {
    id: 'boss_trial', name: '시련의 전장', desc: '에픽 등장↑ · 몬스터 방어 +18%', icon: '⚔',
    spawnBonus: 0.14, monSpdMult: 1.06, monDefMult: 1.18, monAtkMult: 1.1,
    healMult: 0.88, aggroVolatility: 1.35, noWeakness: false, reflectPct: 0.08,
  },
];

/** 주간 시드 — 같은 주에는 동일 어픽스 로테이션 */
export function getWeeklyAffixIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.floor((now.getTime() - start.getTime()) / (7 * 86400000));
  return week % AFFIX_POOL.length;
}

export function getWeeklyAffixLabel(): string {
  const idx = getWeeklyAffixIndex();
  const a = AFFIX_POOL[idx]!;
  return `${a.icon} 이번 주 필드: ${a.name}`;
}

export function getRegionAffix(regionId: number): RegionAffix {
  if (regionId <= 2) return AFFIX_POOL[0]!;

  const arc = getDeepFloorArc(regionId);
  if (arc) {
    const base = AFFIX_POOL.find(a => a.id === arc.affixId) ?? AFFIX_POOL[0]!;
    const tier = (regionId - 18) * 0.85;
    const atkBoost = 1 + tier * 0.032;
    const defBoost = 1 + tier * 0.026;
    const poison = base.poisonTick ?? { dmg: 4 + tier * 1.8, interval: 2.3 };
    return {
      ...base,
      name: `${arc.name} · ${base.name}`,
      desc: `${arc.lore} · ${base.desc}`,
      monAtkMult: base.monAtkMult * atkBoost,
      monDefMult: base.monDefMult * defBoost,
      monSpdMult: base.monSpdMult * (1 + tier * 0.018),
      healMult: Math.max(0.72, base.healMult - tier * 0.016),
      aggroVolatility: base.aggroVolatility * (1 + tier * 0.03),
      spawnBonus: base.spawnBonus + 0.04,
      ...(base.poisonTick || poison
        ? {
          poisonTick: {
            dmg: Math.floor((base.poisonTick?.dmg ?? poison.dmg) * (1 + tier * 0.2) + regionId * 0.3),
            interval: Math.max(1.2, (base.poisonTick?.interval ?? poison.interval) - tier * 0.05),
          },
        }
        : {}),
    };
  }

  const weekIdx = getWeeklyAffixIndex();
  const base = AFFIX_POOL[(regionId - 1 + weekIdx) % AFFIX_POOL.length]!;
  if (regionId < 10) return base;

  const tier = (regionId - 9) * (regionId <= 12 ? 0.55 : 1);
  const atkBoost = 1 + tier * 0.028;
  const defBoost = 1 + tier * 0.022;
  const poison = base.poisonTick ?? (regionId >= 12
    ? { dmg: 3 + tier * 1.6, interval: 2.4 }
    : undefined);

  return {
    ...base,
    desc: `${base.desc} · ${regionId}층 강화`,
    monAtkMult: base.monAtkMult * atkBoost,
    monDefMult: base.monDefMult * defBoost,
    monSpdMult: base.monSpdMult * (1 + tier * 0.015),
    healMult: Math.max(0.76, base.healMult - tier * 0.014),
    aggroVolatility: base.aggroVolatility * (1 + tier * 0.028),
    poisonTick: poison
      ? {
          dmg: Math.floor(poison.dmg * (1 + tier * 0.22) + regionId * 0.35),
          interval: Math.max(1.25, poison.interval - tier * 0.06),
        }
      : undefined,
  };
}

export function formatAffixTip(affix: RegionAffix): string {
  return `${affix.icon} ${affix.name} — ${affix.desc}`;
}

export function getAffixGoldMult(affix: RegionAffix): number {
  return affix.id === 'blood_moon' ? 1.2 : 1;
}

export function getEffectiveWeaknessMult(
  attackEl: ElementType,
  targetEl: ElementType,
  affix: RegionAffix,
  baseMult: number,
): number {
  if (affix.noWeakness && baseMult > 1) return 1;
  return baseMult;
}
