/** 10층+ 주간 로테이션 에픽 시험 변주 */
export interface EpicVariant {
  id: string;
  name: string;
  tag: string;
  color: string;
  powerMult: number;
  enrageAtk: number;
  enrageAspd: number;
  shieldRatio: number;
  enrageMsg: string;
  shieldMsg: string;
}

const EPIC_VARIANTS: EpicVariant[] = [
  {
    id: 'fury', name: '분노의 시험', tag: '분노', color: '#ff5588',
    powerMult: 1.0, enrageAtk: 1.28, enrageAspd: 1.22,
    enrageMsg: '💥 분노 시험 — 연속 강공!', shieldRatio: 0.10,
    shieldMsg: '🛡 분노 결계 — 보호막!',
  },
  {
    id: 'ward', name: '결계의 시험', tag: '결계', color: '#cc88ff',
    powerMult: 1.05, enrageAtk: 1.15, enrageAspd: 1.10,
    enrageMsg: '⚡ 결계 시험 — 공격 가속!', shieldRatio: 0.18,
    shieldMsg: '🛡 결계 재생 — 두꺼운 보호막!',  },
  {
    id: 'ambush', name: '역습의 시험', tag: '역습', color: '#ffaa44',
    powerMult: 1.08, enrageAtk: 1.32, enrageAspd: 1.25,
    enrageMsg: '🗡 역습 시험 — 급습 연타!', shieldRatio: 0.08,
    shieldMsg: '🛡 역습 방어 — 잠깐 버티기!',  },
  {
    id: 'storm', name: '광폭의 시험', tag: '광폭', color: '#66ccff',
    powerMult: 1.12, enrageAtk: 1.35, enrageAspd: 1.30,
    enrageMsg: '🌩 광폭 시험 — 폭풍 같은 공격!', shieldRatio: 0.12,
    shieldMsg: '🛡 광폭 결계 — 체력 보호!',  },
];

function weekSeed(): number {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d.getTime() - jan1.getTime()) / 604800000);
}

export function getWeeklyEpicVariant(): EpicVariant {
  return EPIC_VARIANTS[weekSeed() % EPIC_VARIANTS.length]!;
}

export function formatEpicVariantLabel(variant = getWeeklyEpicVariant()): string {
  return `★ 이번 주 에픽 — ${variant.name}`;
}
