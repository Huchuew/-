import type { AchievementDef, GameSave } from '../types';
import { MONSTERS } from './monsters';
import { REGIONS } from './regions';
import { CHARACTERS } from './characters';

function codexRatio(s: { codex: Record<string, { kills: number; discovered: boolean }> }) {
  const total = MONSTERS.length;
  const found = Object.values(s.codex).filter(c => c.discovered).length;
  return found / total;
}

const CORE_ACHIEVEMENTS: AchievementDef[] = [
  // ── 캐릭터·성장 ──
  { id: 'mj_lv50', name: '무쟁 반백', desc: '무쟁 레벨 50', reward: 1500, gemReward: 3,
    check: s => (s.chars.mujang?.level ?? 0) >= 50 },
  { id: 'mj_lv100', name: '무쟁 100레벨', desc: '무쟁을 레벨 100까지 육성', reward: 5000, gemReward: 10,
    check: s => (s.chars.mujang?.level ?? 0) >= 100 },
  { id: 'hc_lv50', name: '후추의 각성', desc: '후추 레벨 50', reward: 1500, gemReward: 3,
    check: s => (s.chars.huchu?.level ?? 0) >= 50 },
  { id: 'hc_prestige', name: '후추 전직', desc: '후추 1차 전직 달성', reward: 2000, gemReward: 5,
    check: s => (s.chars.huchu?.prestige ?? 0) >= 1 },
  { id: 'hc_prestige2', name: '후추 재전직', desc: '후추 2차 전직 달성', reward: 5000, gemReward: 10,
    check: s => (s.chars.huchu?.prestige ?? 0) >= 2 },
  { id: 'any_lv80', name: '베테랑', desc: '아무 캐릭터 레벨 80', reward: 3000, gemReward: 5,
    check: s => Object.values(s.chars).some(c => c.level >= 80) },
  { id: 'party2', name: '2인 파티', desc: '파티원 2명', reward: 800,
    check: s => s.party.length >= 2 },
  { id: 'party3', name: '3인 파티', desc: '파티원 3명', reward: 1500,
    check: s => s.party.length >= 3 },
  { id: 'support_set', name: '서포트 배치', desc: '서포트 슬롯에 캐릭터 배치', reward: 1000, gemReward: 2,
    check: s => !!s.supportSlot },
  { id: 'recruit5', name: '첫 영입', desc: '영입 시도 5회', reward: 500,
    check: s => s.stats.recruitAttempts >= 5 },
  { id: 'recruit20', name: '영입 전문가', desc: '영입 시도 20회', reward: 2000,
    check: s => s.stats.recruitAttempts >= 20 },
  { id: 'recruit50', name: '스카우터', desc: '영입 시도 50회', reward: 5000, gemReward: 8,
    check: s => s.stats.recruitAttempts >= 50 },
  { id: 'owned6', name: '6인 모험단', desc: '캐릭터 6명 보유', reward: 3000, gemReward: 5,
    check: s => s.owned.length >= 6 },
  { id: 'all_chars', name: '모험단 완성', desc: '모든 캐릭터 영입', reward: 50_000, gemReward: 30,
    check: s => s.owned.length >= CHARACTERS.length },

  // ── 투닥·전투 ──
  { id: 'touch10', name: '첫 투닥', desc: '터치 10회', reward: 200,
    check: s => s.stats.touchCount >= 10 },
  { id: 'touch100', name: '투닥투닥!', desc: '터치 100회', reward: 500,
    check: s => s.stats.touchCount >= 100 },
  { id: 'touch500', name: '연타의 달인', desc: '터치 500회', reward: 1500, gemReward: 3,
    check: s => s.stats.touchCount >= 500 },
  { id: 'touch2000', name: '손가락의 전설', desc: '터치 2000회', reward: 4000, gemReward: 8,
    check: s => s.stats.touchCount >= 2000 },
  { id: 'touch10000', name: '투닥 마스터', desc: '터치 10000회', reward: 15000, gemReward: 20,
    check: s => s.stats.touchCount >= 10000 },
  { id: 'kills10', name: '첫 사냥', desc: '몬스터 10마리 처치', reward: 300,
    check: s => s.stats.totalKills >= 10 },
  { id: 'kills100', name: '초보 사냥꾼', desc: '몬스터 100마리 처치', reward: 1000,
    check: s => s.stats.totalKills >= 100 },
  { id: 'kills500', name: '숙련 사냥꾼', desc: '몬스터 500마리 처치', reward: 2000, gemReward: 3,
    check: s => s.stats.totalKills >= 500 },
  { id: 'kills1000', name: '사냥꾼', desc: '몬스터 1000마리 처치', reward: 3000, gemReward: 5,
    check: s => s.stats.totalKills >= 1000 },
  { id: 'kills5000', name: '학살자', desc: '몬스터 5000마리 처치', reward: 8000, gemReward: 12,
    check: s => s.stats.totalKills >= 5000 },
  { id: 'kills10000', name: '몬스터 헌터', desc: '몬스터 10000마리 처치', reward: 20000, gemReward: 25,
    check: s => s.stats.totalKills >= 10000 },
  { id: 'potions5', name: '포션 입문', desc: 'HP 포션 5회 사용', reward: 500,
    check: s => s.stats.potionsUsed >= 5 },
  { id: 'potions50', name: '포션 중독', desc: 'HP 포션 50회 사용', reward: 3000, gemReward: 5,
    check: s => s.stats.potionsUsed >= 50 },
  { id: 'defeat1', name: '첫 전멸', desc: '전멸 1회 경험 (실패는 성공의 어머니)', reward: 500,
    check: s => (s.stats.defeatCount ?? 0) >= 1 },
  { id: 'defeat5', name: '불굴의 의지', desc: '전멸 5회 후에도 계속', reward: 2000, gemReward: 5,
    check: s => (s.stats.defeatCount ?? 0) >= 5 },

  // ── 골드·젬 ──
  { id: 'gold500k', name: '첫 저축', desc: '누적 골드 50만', reward: 3000,
    check: s => s.stats.totalGold >= 500_000 },
  { id: 'gold2m', name: '부자', desc: '누적 골드 200만', reward: 8000,
    check: s => s.stats.totalGold >= 2_000_000 },
  { id: 'gold5m', name: '대부호', desc: '누적 골드 500만', reward: 15_000, gemReward: 8,
    check: s => s.stats.totalGold >= 5_000_000 },
  { id: 'gold10m', name: '황금 제국', desc: '누적 골드 1000만', reward: 30_000, gemReward: 15,
    check: s => s.stats.totalGold >= 10_000_000 },
  { id: 'gems10', name: '젬 수집', desc: '보유 젬 10개', reward: 1000, gemReward: 2,
    check: s => s.gems >= 10 },
  { id: 'gems50', name: '젬 부자', desc: '보유 젬 50개', reward: 5000, gemReward: 5,
    check: s => s.gems >= 50 },

  // ── 지역·배지 ──
  { id: 'region3', name: '여행자', desc: '3번째 지역 해금', reward: 1500, gemReward: 3,
    check: s => (s.maxRegion ?? s.currentRegion) >= 3 },
  { id: 'region5', name: '모험가', desc: '5번째 지역 해금', reward: 2000, gemReward: 5,
    check: s => (s.maxRegion ?? s.currentRegion) >= 5 },
  { id: 'region10', name: '대륙 횡단', desc: '10번째 지역 해금', reward: 6000, gemReward: 10,
    check: s => (s.maxRegion ?? s.currentRegion) >= 10 },
  { id: 'region15', name: '끝없는 길', desc: '15번째 지역 해금', reward: 10000, gemReward: 15,
    check: s => (s.maxRegion ?? s.currentRegion) >= 15 },
  { id: 'region18', name: '모란 정복', desc: '18층 모란 해금', reward: 20000, gemReward: 25,
    check: s => (s.maxRegion ?? s.currentRegion) >= REGIONS.length },
  { id: 'badge5', name: '배지 입문', desc: '배지 5개 획득', reward: 1500,
    check: s => s.badges.length >= 5 },
  { id: 'badge10', name: '배지 수집가', desc: '배지 10개 획득', reward: 3000, gemReward: 8,
    check: s => s.badges.length >= 10 },
  { id: 'badge18', name: '배지 마스터', desc: '모든 배지 수집', reward: 15000, gemReward: 20,
    check: s => s.badges.length >= REGIONS.length },

  // ── 도감 ──
  { id: 'codex10', name: '도감 시작', desc: '몬스터 도감 10% 완성', reward: 500,
    check: s => codexRatio(s) >= 0.1 },
  { id: 'codex25', name: '관찰자', desc: '몬스터 도감 25% 완성', reward: 1200,
    check: s => codexRatio(s) >= 0.25 },
  { id: 'codex50', name: '도감 수집', desc: '몬스터 도감 50% 완성', reward: 2500, gemReward: 5,
    check: s => codexRatio(s) >= 0.5 },
  { id: 'codex75', name: '박식한 사냥꾼', desc: '몬스터 도감 75% 완성', reward: 5000, gemReward: 10,
    check: s => codexRatio(s) >= 0.75 },
  { id: 'codex100', name: '도감 완성', desc: '몬스터 도감 100% 완성', reward: 15000, gemReward: 20,
    check: s => codexRatio(s) >= 1 },
  { id: 'codex_region1', name: '첫 지역 완성', desc: '지역 도감 1개 완성 보상', reward: 1500, gemReward: 3,
    check: s => (s.codexRewards?.length ?? 0) >= 1 },
  { id: 'codex_region3', name: '지역 도감왕', desc: '지역 도감 3개 완성', reward: 4000, gemReward: 10,
    check: s => (s.codexRewards?.length ?? 0) >= 3 },
  { id: 'codex_region6', name: '도감 전문가', desc: '지역 도감 6개 완성', reward: 8000, gemReward: 15,
    check: s => (s.codexRewards?.length ?? 0) >= 6 },
  { id: 'rare_first', name: '희귀 발견', desc: '희귀 몬스터 최초 처치', reward: 1000, gemReward: 3,
    check: s => Object.keys(s.codex).some(id => MONSTERS.find(m => m.id === id)?.isRare && s.codex[id].kills > 0) },
  { id: 'boss_final', name: '최종 보스', desc: '파멸의 군주 처치', reward: 50000, gemReward: 50,
    check: s => (s.codex.boss_final?.kills ?? 0) > 0 },

  // ── 요리·숙소·타이쿤 ──
  { id: 'cook10', name: '요리사의 길', desc: '요리 10회', reward: 2500, gemReward: 8,
    check: s => s.stats.cooksDone >= 10 },
  { id: 'cook50', name: '미슐랭 지망', desc: '요리 50회', reward: 6000, gemReward: 12,
    check: s => s.stats.cooksDone >= 50 },
  { id: 'tycoon_zone', name: '영지 개척', desc: '타이쿤 구역 1개 해금', reward: 2000, gemReward: 3,
    check: s => (s.tycoon?.zones.length ?? 0) >= 1 },
  { id: 'tycoon_remodel', name: '숙소 리모델링', desc: '숙소 리모델 1단계', reward: 3000, gemReward: 5,
    check: s => (s.tycoon?.remodelTier ?? 0) >= 1 },

  // ── 플레이 시간·광고 ──
  { id: 'play10m', name: '따끈따끈', desc: '플레이 10분', reward: 300,
    check: s => s.stats.playTime >= 600 },
  { id: 'play1h', name: '장기 모험', desc: '플레이 1시간', reward: 1500, gemReward: 5,
    check: s => s.stats.playTime >= 3600 },
  { id: 'play3h', name: '밤샘 모험', desc: '플레이 3시간', reward: 4000, gemReward: 8,
    check: s => s.stats.playTime >= 10800 },
  { id: 'play10h', name: '투닥 중독', desc: '플레이 10시간', reward: 12000, gemReward: 15,
    check: s => s.stats.playTime >= 36000 },
  { id: 'ads5', name: '광고 시청자', desc: '광고 5회 시청', reward: 1000, gemReward: 3,
    check: s => (s.stats.adsWatched ?? 0) >= 5 },
  { id: 'ads20', name: '광고 마니아', desc: '광고 20회 시청', reward: 4000, gemReward: 8,
    check: s => (s.stats.adsWatched ?? 0) >= 20 },

  // ── 엔드게임 ──
  { id: 'spire10', name: '탑 입문', desc: '무한의 탑 10층 돌파', reward: 5000, gemReward: 8,
    check: s => (s.endgame?.spireBest ?? 0) >= 10 },
  { id: 'spire25', name: '탑 등반가', desc: '무한의 탑 25층 돌파', reward: 12000, gemReward: 20,
    check: s => (s.endgame?.spireBest ?? 0) >= 25 },
  { id: 'spire50', name: '천공의 지배자', desc: '무한의 탑 50층 돌파', reward: 40000, gemReward: 40,
    check: s => (s.endgame?.spireBest ?? 0) >= 50 },
  { id: 'ascend1', name: '전설의 시작', desc: '캐릭터 전설 각성 1회', reward: 15000, gemReward: 25,
    check: s => (s.endgame?.ascended?.length ?? 0) >= 1 },
  { id: 'relic5', name: '유물 발견', desc: '유물 5개 수집', reward: 8000, gemReward: 12,
    check: s => (s.endgame?.relics?.length ?? 0) >= 5 },
  { id: 'relic10', name: '유물 수집가', desc: '유물 10개 수집', reward: 20000, gemReward: 30,
    check: s => (s.endgame?.relics?.length ?? 0) >= 10 },
];

function matSum(s: GameSave) {
  return Object.values(s.materials ?? {}).reduce((a, b) => a + b, 0);
}

function codexFound(s: GameSave) {
  return Object.values(s.codex).filter(c => c.discovered).length;
}

function maxBagEnhance(s: GameSave) {
  return s.bag.reduce((m, i) => Math.max(m, i.level ?? 0), 0);
}

function charLevelAchievements(): AchievementDef[] {
  const tiers = [
    { lv: 20, reward: 400 },
    { lv: 30, reward: 700 },
    { lv: 40, reward: 1100, gem: 2 },
    { lv: 60, reward: 2200, gem: 4 },
    { lv: 70, reward: 3200, gem: 5 },
    { lv: 90, reward: 6000, gem: 8 },
  ];
  const out: AchievementDef[] = [];
  for (const c of CHARACTERS) {
    for (const t of tiers) {
      if ((c.id === 'mujang' || c.id === 'huchu') && t.lv === 50) continue;
      out.push({
        id: `${c.id}_lv${t.lv}`,
        name: `${c.name} Lv.${t.lv}`,
        desc: `${c.name} 레벨 ${t.lv} 달성`,
        reward: t.reward,
        gemReward: t.gem,
        check: s => (s.chars[c.id]?.level ?? 0) >= t.lv,
      });
    }
  }
  return out;
}

function regionUnlockAchievements(): AchievementDef[] {
  return REGIONS.map((r, i) => {
    const n = i + 1;
    return {
      id: `region_unlock_${n}`,
      name: `${r.name} 도달`,
      desc: `${n}층 ${r.name} 해금`,
      reward: 300 + n * 120,
      gemReward: n >= 10 ? 3 : n >= 5 ? 2 : undefined,
      check: (s: GameSave) => (s.maxRegion ?? s.currentRegion) >= n,
    };
  });
}

function campAchievements(): AchievementDef[] {
  const buildings: { key: keyof NonNullable<GameSave['camp']>; label: string }[] = [
    { key: 'mineLevel', label: '광산' },
    { key: 'labLevel', label: '연구소' },
    { key: 'herbLevel', label: '약초밭' },
    { key: 'smelterLevel', label: '제련소' },
    { key: 'clinicLevel', label: '치료소' },
    { key: 'innLevel', label: '여관' },
    { key: 'kitchenLevel', label: '주방' },
    { key: 'warehouseLevel', label: '창고' },
    { key: 'guildLevel', label: '길드' },
    { key: 'springLevel', label: '치유 샘' },
  ];
  const tiers = [
    { lv: 1, reward: 500 },
    { lv: 3, reward: 1200, gem: 2 },
    { lv: 5, reward: 2500, gem: 3 },
    { lv: 8, reward: 4500, gem: 5 },
  ];
  const out: AchievementDef[] = [];
  for (const b of buildings) {
    for (const t of tiers) {
      out.push({
        id: `camp_${String(b.key)}_${t.lv}`,
        name: `${b.label} Lv.${t.lv}`,
        desc: `숙소 ${b.label} ${t.lv}단계`,
        reward: t.reward,
        gemReward: t.gem,
        check: s => ((s.camp?.[b.key] as number | undefined) ?? 0) >= t.lv,
      });
    }
  }
  return out;
}

const EXTRA_MILESTONES: AchievementDef[] = [
  { id: 'owned2', name: '동료 모집', desc: '캐릭터 2명 보유', reward: 400,
    check: s => s.owned.length >= 2 },
  { id: 'owned4', name: '소규모 파티', desc: '캐릭터 4명 보유', reward: 1200,
    check: s => s.owned.length >= 4 },
  { id: 'owned7', name: '중형 모험단', desc: '캐릭터 7명 보유', reward: 3500, gemReward: 5,
    check: s => s.owned.length >= 7 },
  { id: 'owned9', name: '대형 모험단', desc: '캐릭터 9명 보유', reward: 7000, gemReward: 10,
    check: s => s.owned.length >= 9 },
  { id: 'owned10', name: '거의 완성', desc: '캐릭터 10명 보유', reward: 9000, gemReward: 15,
    check: s => s.owned.length >= 10 },

  { id: 'touch2500', name: '손끝의 열기', desc: '터치 2500회', reward: 2500, gemReward: 4,
    check: s => s.stats.touchCount >= 2500 },
  { id: 'touch7500', name: '터치 폭풍', desc: '터치 7500회', reward: 6000, gemReward: 8,
    check: s => s.stats.touchCount >= 7500 },
  { id: 'touch15000', name: '무한 연타', desc: '터치 15000회', reward: 10000, gemReward: 12,
    check: s => s.stats.touchCount >= 15000 },
  { id: 'touch30000', name: '투닥의 신', desc: '터치 30000회', reward: 18000, gemReward: 18,
    check: s => s.stats.touchCount >= 30000 },
  { id: 'touch50000', name: '손가락 전설 II', desc: '터치 50000회', reward: 30000, gemReward: 25,
    check: s => s.stats.touchCount >= 50000 },

  { id: 'kills250', name: '사냥 입문', desc: '몬스터 250마리 처치', reward: 1500,
    check: s => s.stats.totalKills >= 250 },
  { id: 'kills750', name: '숙련자', desc: '몬스터 750마리 처치', reward: 2500, gemReward: 3,
    check: s => s.stats.totalKills >= 750 },
  { id: 'kills2500', name: '밀림 개척', desc: '몬스터 2500마리 처치', reward: 4500, gemReward: 6,
    check: s => s.stats.totalKills >= 2500 },
  { id: 'kills7500', name: '학살자 II', desc: '몬스터 7500마리 처치', reward: 9000, gemReward: 10,
    check: s => s.stats.totalKills >= 7500 },
  { id: 'kills15000', name: '정화자', desc: '몬스터 15000마리 처치', reward: 14000, gemReward: 15,
    check: s => s.stats.totalKills >= 15000 },
  { id: 'kills25000', name: '몬스터 학살', desc: '몬스터 25000마리 처치', reward: 22000, gemReward: 20,
    check: s => s.stats.totalKills >= 25000 },
  { id: 'kills75000', name: '종말의 사냥꾼', desc: '몬스터 75000마리 처치', reward: 50000, gemReward: 35,
    check: s => s.stats.totalKills >= 75000 },

  { id: 'gold25k', name: '첫 재산', desc: '누적 골드 2.5만', reward: 800,
    check: s => s.stats.totalGold >= 25000 },
  { id: 'gold75k', name: '저축가', desc: '누적 골드 7.5만', reward: 1500,
    check: s => s.stats.totalGold >= 75000 },
  { id: 'gold250k', name: '상인', desc: '누적 골드 25만', reward: 3500, gemReward: 4,
    check: s => s.stats.totalGold >= 250000 },
  { id: 'gold750k', name: '금광 주인', desc: '누적 골드 75만', reward: 7000, gemReward: 8,
    check: s => s.stats.totalGold >= 750000 },
  { id: 'gold2_5m', name: '재벌', desc: '누적 골드 250만', reward: 15000, gemReward: 12,
    check: s => s.stats.totalGold >= 2500000 },
  { id: 'gold5m', name: '황금 왕국', desc: '누적 골드 500만', reward: 25000, gemReward: 18,
    check: s => s.stats.totalGold >= 5000000 },

  { id: 'play30m', name: '워밍업', desc: '플레이 30분', reward: 600,
    check: s => s.stats.playTime >= 1800 },
  { id: 'play2h', name: '오후 모험', desc: '플레이 2시간', reward: 2500, gemReward: 4,
    check: s => s.stats.playTime >= 7200 },
  { id: 'play5h', name: '주말 모험', desc: '플레이 5시간', reward: 6000, gemReward: 8,
    check: s => s.stats.playTime >= 18000 },
  { id: 'play20h', name: '장기전', desc: '플레이 20시간', reward: 18000, gemReward: 15,
    check: s => s.stats.playTime >= 72000 },
  { id: 'play50h', name: '투닥 인생', desc: '플레이 50시간', reward: 40000, gemReward: 30,
    check: s => s.stats.playTime >= 180000 },

  { id: 'cook20', name: '요리 연습', desc: '요리 20회', reward: 1800, gemReward: 4,
    check: s => s.stats.cooksDone >= 20 },
  { id: 'cook30', name: '주방장 보조', desc: '요리 30회', reward: 2800, gemReward: 5,
    check: s => s.stats.cooksDone >= 30 },
  { id: 'cook75', name: '셰프', desc: '요리 75회', reward: 5000, gemReward: 8,
    check: s => s.stats.cooksDone >= 75 },
  { id: 'cook150', name: '미슐랭 셰프', desc: '요리 150회', reward: 9000, gemReward: 12,
    check: s => s.stats.cooksDone >= 150 },
  { id: 'cook300', name: '요리의 신', desc: '요리 300회', reward: 18000, gemReward: 20,
    check: s => s.stats.cooksDone >= 300 },

  { id: 'potions10', name: '포션 애호가', desc: 'HP 포션 10회 사용', reward: 700,
    check: s => s.stats.potionsUsed >= 10 },
  { id: 'potions25', name: '포션 러버', desc: 'HP 포션 25회 사용', reward: 1200,
    check: s => s.stats.potionsUsed >= 25 },
  { id: 'potions100', name: '포션 마니아', desc: 'HP 포션 100회 사용', reward: 5000, gemReward: 6,
    check: s => s.stats.potionsUsed >= 100 },
  { id: 'potions250', name: '포션 중독 II', desc: 'HP 포션 250회 사용', reward: 10000, gemReward: 10,
    check: s => s.stats.potionsUsed >= 250 },

  { id: 'recruit10', name: '영입 입문', desc: '영입 시도 10회', reward: 800,
    check: s => s.stats.recruitAttempts >= 10 },
  { id: 'recruit30', name: '인재 스카우트', desc: '영입 시도 30회', reward: 3000, gemReward: 4,
    check: s => s.stats.recruitAttempts >= 30 },
  { id: 'recruit75', name: '헤드헌터', desc: '영입 시도 75회', reward: 7000, gemReward: 8,
    check: s => s.stats.recruitAttempts >= 75 },
  { id: 'recruit100', name: '영입왕', desc: '영입 시도 100회', reward: 10000, gemReward: 12,
    check: s => s.stats.recruitAttempts >= 100 },

  { id: 'defeat10', name: '끝없는 도전', desc: '전멸 10회', reward: 4000, gemReward: 6,
    check: s => (s.stats.defeatCount ?? 0) >= 10 },
  { id: 'defeat25', name: '불사조', desc: '전멸 25회 후에도 계속', reward: 8000, gemReward: 10,
    check: s => (s.stats.defeatCount ?? 0) >= 25 },

  { id: 'ads50', name: '광고 애호가', desc: '광고 50회 시청', reward: 8000, gemReward: 12,
    check: s => (s.stats.adsWatched ?? 0) >= 50 },
  { id: 'ads100', name: '광고의 신', desc: '광고 100회 시청', reward: 15000, gemReward: 20,
    check: s => (s.stats.adsWatched ?? 0) >= 100 },

  { id: 'gems100', name: '젬 수집가 II', desc: '보유 젬 100개', reward: 8000, gemReward: 8,
    check: s => s.gems >= 100 },
  { id: 'gems200', name: '젬 제왕', desc: '보유 젬 200개', reward: 15000, gemReward: 15,
    check: s => s.gems >= 200 },

  { id: 'codex5', name: '도감 첫걸음', desc: '몬스터 5종 발견', reward: 400,
    check: s => codexFound(s) >= 5 },
  { id: 'codex15', name: '생태 조사', desc: '몬스터 15종 발견', reward: 900,
    check: s => codexFound(s) >= 15 },
  { id: 'codex30', name: '박물관 큐레이터', desc: '몬스터 30종 발견', reward: 2000, gemReward: 4,
    check: s => codexFound(s) >= 30 },
  { id: 'codex_mon50', name: '박사', desc: '몬스터 50종 발견', reward: 4000, gemReward: 8,
    check: s => codexFound(s) >= 50 },
  { id: 'codex_mon75', name: '학자', desc: '몬스터 75종 발견', reward: 7000, gemReward: 12,
    check: s => codexFound(s) >= 75 },

  { id: 'mat100', name: '재료 수집', desc: '재료 100개 누적 보유', reward: 600,
    check: s => matSum(s) >= 100 },
  { id: 'mat500', name: '창고 관리', desc: '재료 500개 누적 보유', reward: 2000, gemReward: 3,
    check: s => matSum(s) >= 500 },
  { id: 'mat2000', name: '대량 비축', desc: '재료 2000개 누적 보유', reward: 5000, gemReward: 6,
    check: s => matSum(s) >= 2000 },
  { id: 'mat5000', name: '비축왕', desc: '재료 5000개 누적 보유', reward: 10000, gemReward: 10,
    check: s => matSum(s) >= 5000 },
  { id: 'mat10000', name: '재료 제국', desc: '재료 10000개 누적 보유', reward: 20000, gemReward: 15,
    check: s => matSum(s) >= 10000 },

  { id: 'enh3', name: '장비 강화', desc: '장비 +3 강화 달성', reward: 2000, gemReward: 3,
    check: s => maxBagEnhance(s) >= 3 },

  { id: 'tycoon_zone2', name: '영지 확장', desc: '타이쿤 구역 2개 해금', reward: 3500, gemReward: 5,
    check: s => (s.tycoon?.zones.length ?? 0) >= 2 },
  { id: 'tycoon_zone3', name: '영지 발전', desc: '타이쿤 구역 3개 해금', reward: 5000, gemReward: 7,
    check: s => (s.tycoon?.zones.length ?? 0) >= 3 },
  { id: 'tycoon_zone4', name: '영지 번영', desc: '타이쿤 구역 4개 해금', reward: 7500, gemReward: 10,
    check: s => (s.tycoon?.zones.length ?? 0) >= 4 },
  { id: 'tycoon_remodel2', name: '숙소 고급화', desc: '숙소 리모델 2단계', reward: 5000, gemReward: 7,
    check: s => (s.tycoon?.remodelTier ?? 0) >= 2 },
  { id: 'tycoon_remodel3', name: '숙소 럭셔리', desc: '숙소 리모델 3단계', reward: 8000, gemReward: 10,
    check: s => (s.tycoon?.remodelTier ?? 0) >= 3 },
  { id: 'tycoon_remodel4', name: '숙소 궁전', desc: '숙소 리모델 4단계', reward: 12000, gemReward: 15,
    check: s => (s.tycoon?.remodelTier ?? 0) >= 4 },
  { id: 'tycoon_contract', name: '파견 개시', desc: '길드 파견 1회 완료', reward: 2500, gemReward: 4,
    check: s => !!s.onboarding?.dispatchOnce },
  { id: 'tycoon_contract5', name: '숙련 파견대', desc: '길드 Lv.2 이상', reward: 6000, gemReward: 8,
    check: s => (s.camp?.guildLevel ?? 0) >= 2 },
  { id: 'tycoon_contract10', name: '길드 베테랑', desc: '길드 Lv.3 이상', reward: 12000, gemReward: 15,
    check: s => (s.camp?.guildLevel ?? 0) >= 3 },

  { id: 'spire5', name: '탑 첫걸음', desc: '무한의 탑 5층 돌파', reward: 2500, gemReward: 4,
    check: s => (s.endgame?.spireBest ?? 0) >= 5 },
  { id: 'spire15', name: '탑 등반 II', desc: '무한의 탑 15층 돌파', reward: 8000, gemReward: 12,
    check: s => (s.endgame?.spireBest ?? 0) >= 15 },
  { id: 'spire30', name: '구름 위', desc: '무한의 탑 30층 돌파', reward: 18000, gemReward: 22,
    check: s => (s.endgame?.spireBest ?? 0) >= 30 },
  { id: 'spire40', name: '하늘 정복', desc: '무한의 탑 40층 돌파', reward: 30000, gemReward: 32,
    check: s => (s.endgame?.spireBest ?? 0) >= 40 },

  { id: 'ascend3', name: '전설의 길', desc: '캐릭터 전설 각성 3회', reward: 30000, gemReward: 35,
    check: s => (s.endgame?.ascended?.length ?? 0) >= 3 },
  { id: 'relic3', name: '유물 입문', desc: '유물 3개 수집', reward: 5000, gemReward: 8,
    check: s => (s.endgame?.relics?.length ?? 0) >= 3 },
  { id: 'relic15', name: '유물 박물관', desc: '유물 15개 수집', reward: 35000, gemReward: 40,
    check: s => (s.endgame?.relics?.length ?? 0) >= 15 },

  { id: 'badge3', name: '배지 수집 시작', desc: '배지 3개 획득', reward: 900,
    check: s => s.badges.length >= 3 },
  { id: 'badge7', name: '배지 애호가', desc: '배지 7개 획득', reward: 2200, gemReward: 5,
    check: s => s.badges.length >= 7 },
  { id: 'badge12', name: '배지 컬렉터', desc: '배지 12개 획득', reward: 5000, gemReward: 10,
    check: s => s.badges.length >= 12 },
  { id: 'badge15', name: '배지 마니아', desc: '배지 15개 획득', reward: 8000, gemReward: 14,
    check: s => s.badges.length >= 15 },

  { id: 'expedition1', name: '첫 원정', desc: '원정 1회 완료 (숙소 복귀)', reward: 500,
    check: s => !!s.onboarding?.returned },
  { id: 'shop_buy', name: '첫 구매', desc: '숙소 상점에서 1회 구매', reward: 600,
    check: s => !!s.onboarding?.shopBuyOnce },
  { id: 'dispatch_once', name: '첫 파견', desc: '파견 1회 완료', reward: 800, gemReward: 2,
    check: s => !!s.onboarding?.dispatchOnce },
  { id: 'contract_once', name: '길드 설립', desc: '모험 길드 건설', reward: 800, gemReward: 2,
    check: s => (s.camp?.guildLevel ?? 0) >= 1 },

  { id: 'party4', name: '4인 파티', desc: '파티원 4명 (최대)', reward: 2500, gemReward: 4,
    check: s => s.party.length >= 4 },
  { id: 'formation_set', name: '대열 편성', desc: '전투 대열 2명 이상 편성', reward: 700,
    check: s => (s.partyFormation?.length ?? 0) >= 2 },

  { id: 'hc_prestige3', name: '후추 대마도사', desc: '후추 3차 전직 달성', reward: 8000, gemReward: 12,
    check: s => (s.chars.huchu?.prestige ?? 0) >= 3 },
  { id: 'mj_prestige1', name: '무쟁 진급', desc: '무쟁 1차 전직 달성', reward: 1500, gemReward: 3,
    check: s => (s.chars.mujang?.prestige ?? 0) >= 1 },

  { id: 'codex_region9', name: '도감 대가', desc: '지역 도감 9개 완성', reward: 12000, gemReward: 18,
    check: s => (s.codexRewards?.length ?? 0) >= 9 },
  { id: 'codex_region12', name: '도감 완성가', desc: '지역 도감 12개 완성', reward: 18000, gemReward: 22,
    check: s => (s.codexRewards?.length ?? 0) >= 12 },
  { id: 'codex_region_all', name: '전 지역 도감왕', desc: '모든 지역 도감 완성', reward: 30000, gemReward: 30,
    check: s => (s.codexRewards?.length ?? 0) >= REGIONS.length },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  ...CORE_ACHIEVEMENTS,
  ...charLevelAchievements(),
  ...regionUnlockAchievements(),
  ...campAchievements(),
  ...EXTRA_MILESTONES,
];
