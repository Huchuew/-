export interface RelicDef {
  id: string;
  name: string;
  desc: string;
  /** 공격력 % */
  atkPct?: number;
  hpPct?: number;
  defPct?: number;
  critPct?: number;
  spdPct?: number;
  expPct?: number;
  goldPct?: number;
  source: string;
}

export const RELICS: RelicDef[] = [
  { id: 'relic_rift_5', name: '폐역의 티켓 조각', desc: '공격력 +3%', atkPct: 0.03, source: '차원 균열 5층' },
  { id: 'relic_rift_10', name: '유령 역명판', desc: 'HP +4%', hpPct: 0.04, source: '차원 균열 10층' },
  { id: 'relic_rift_15', name: '끊긴 신호등', desc: '치명타 +2%', critPct: 0.02, source: '차원 균열 15층' },
  { id: 'relic_rift_20', name: '폐역 지도', desc: '공격력 +5%', atkPct: 0.05, source: '차원 균열 20층' },
  { id: 'relic_rift_25', name: '거울 파편', desc: '공속 +4%', spdPct: 0.04, source: '차원 균열 25층' },
  { id: 'relic_rift_30', name: '반전 배지', desc: '방어 +5%', defPct: 0.05, source: '차원 균열 30층' },
  { id: 'relic_rift_35', name: '왜곡 나침반', desc: '경험치 +6%', expPct: 0.06, source: '차원 균열 35층' },
  { id: 'relic_rift_40', name: '이중 환승권', desc: '공격력 +7%', atkPct: 0.07, source: '차원 균열 40층' },
  { id: 'relic_rift_45', name: '심연의 등불', desc: 'HP +8%', hpPct: 0.08, source: '차원 균열 45층' },
  { id: 'relic_rift_50', name: '후추랩 실험 코어', desc: '전 스탯 +5%', atkPct: 0.05, hpPct: 0.05, defPct: 0.05, source: '차원 균열 50층' },
  { id: 'relic_spire_10', name: '무한 계단', desc: '공격력 +2%', atkPct: 0.02, source: '무한의 탑 10층' },
  { id: 'relic_spire_25', name: '시간의 모래', desc: '골드 +5%', goldPct: 0.05, source: '무한의 탑 25층' },
  { id: 'relic_spire_50', name: '천공의 눈', desc: '치명타 +4%', critPct: 0.04, source: '무한의 탑 50층' },
  { id: 'relic_spire_75', name: '별의 잔향', desc: '공속 +6%', spdPct: 0.06, source: '무한의 탑 75층' },
  { id: 'relic_spire_100', name: '탑의 정점', desc: '전 스탯 +8%', atkPct: 0.08, hpPct: 0.08, defPct: 0.08, source: '무한의 탑 100층' },
  { id: 'relic_codex', name: '완전 도감 인장', desc: '공격력 +4%', atkPct: 0.04, source: '전 지역 도감 100%' },
  { id: 'relic_ascend3', name: '각성의 증표', desc: '경험치 +8%', expPct: 0.08, source: '전설 각성 3명' },
  { id: 'relic_ascend_all', name: '전설 모험단', desc: '전 스탯 +10%', atkPct: 0.1, hpPct: 0.1, defPct: 0.1, source: '전원 전설 각성' },
];

export const RELIC_MAP = Object.fromEntries(RELICS.map(r => [r.id, r]));
