import type { GameSave } from '../types';
import { calcRecruitGoldCost } from '../data/economyPricing';
import { getHomeStationClearBonus, getRegionName } from '../data/starterSurvey';
import { saveGame } from '../core/SaveManager';
import { RETURN_DURATION_MULT } from './adventure/travelFlow';
import type { AdventureSystem } from './AdventureSystem';

export const GUIDE_CHAPTER_COUNT = 3;
export const ONBOARDING_REWARD_GOLD = 15_000;
export const MUJANG_DISCOUNT_COST = 8_000;

export const CHAPTER_TITLES = [
  '첫 전투',
  '보상과 성장',
  '다음 층으로',
] as const;

export const CHAPTER_REWARDS = [15_000, 8_000, 12_000] as const;

/** 1~3층 보스 최초 클리어 일회성 골드 */
export const FLOOR_FIRST_CLEAR_GOLD: Record<number, number> = {
  1: 2_500,
  2: 3_500,
  3: 5_000,
};

/** 5층 보스 최초 클리어 — 여관 건설 지원 */
export const FLOOR5_INN_BONUS_GOLD = 12_000;

export interface OnboardingQuest {
  id: string;
  label: string;
  hint: string;
  done: boolean;
}

export function defaultOnboarding() {
  return {
    expedition: false,
    materials: false,
    returned: false,
    sold: false,
    growth: false,
    rewardClaimed: false,
    returnSkipsUsed: 0,
    mujangDiscountAvailable: false,
    chapterClaims: [] as number[],
    errandCompletedOnce: false,
    bountyClaimedOnce: false,
    restTipClaimedOnce: false,
    floorClearBonus: {} as Record<string, boolean>,
    floor5InnBonus: false,
    totalSoldGold: 0,
    dispatchOnce: false,
    contractOnce: false,
    guideMigrated3: false,
    shopBuyOnce: false,
    floor10IntroSeen: false,
    dailyBonusClaimDay: '',
    homeStationBonusClaimed: false,
  };
}

export function ensureOnboarding(save: GameSave) {
  if (!save.onboarding) save.onboarding = defaultOnboarding();
  const o = save.onboarding;
  if (o.returnSkipsUsed == null) o.returnSkipsUsed = 0;
  if (o.mujangDiscountAvailable == null) o.mujangDiscountAvailable = false;
  if (!o.chapterClaims) o.chapterClaims = o.rewardClaimed ? [1] : [];
  if (o.errandCompletedOnce == null) o.errandCompletedOnce = false;
  if (o.bountyClaimedOnce == null) o.bountyClaimedOnce = false;
  if (o.restTipClaimedOnce == null) o.restTipClaimedOnce = false;
  if (!o.floorClearBonus) o.floorClearBonus = {};
  if (o.floor5InnBonus == null) o.floor5InnBonus = false;
  if (o.totalSoldGold == null) o.totalSoldGold = 0;
  if (o.dispatchOnce == null) o.dispatchOnce = false;
  if (o.contractOnce == null) o.contractOnce = false;
  if (o.shopBuyOnce == null) o.shopBuyOnce = false;
  if (o.floor10IntroSeen == null) o.floor10IntroSeen = false;
  if (o.dailyBonusClaimDay == null) o.dailyBonusClaimDay = '';
  if (o.homeStationBonusClaimed == null) o.homeStationBonusClaimed = false;

  // 6챕터 → 3챕터 마이그레이션 (기존 세이브 호환)
  if (!o.guideMigrated3) {
    const claims = o.chapterClaims ?? [];
    if (claims.some(c => c > 3)) {
      o.chapterClaims = [1, 2, 3];
    }
    o.guideMigrated3 = true;
  }

  // 4층 이상 진행 유저 — 가이드 미완료여도 탭 잠금 방지 (기능 상실 방지)
  const claims = o.chapterClaims ?? [];
  const guideIncomplete = !claims.includes(1) || !claims.includes(2) || !claims.includes(3);
  if ((save.maxRegion ?? 1) >= 4 && guideIncomplete) {
    o.chapterClaims = [1, 2, 3];
  }

  // 챕터 가이드 진행 중 — 구 튜토리얼 오버레이 생략 (중복 온보딩 방지)
  const guideClaims = o.chapterClaims ?? [];
  const guideActive = !guideClaims.includes(1) || !guideClaims.includes(2) || !guideClaims.includes(3);
  if (guideActive && (save.tutorialStep ?? 0) < 99) {
    save.tutorialStep = 99;
  }
}

/** 1~3 = 진행 중 챕터, 0 = 전체 완료 */
export function getGuideChapter(save: GameSave): number {
  ensureOnboarding(save);
  const claims = save.onboarding!.chapterClaims!;
  if (!claims.includes(1)) return 1;
  for (let c = 2; c <= GUIDE_CHAPTER_COUNT; c++) {
    if (!claims.includes(c)) return c;
  }
  return 0;
}

export function isOnboardingComplete(save: GameSave): boolean {
  return getGuideChapter(save) === 0;
}

function materialTotal(save: GameSave): number {
  return Object.values(save.materials).reduce((a, b) => a + b, 0);
}

function unlockedSkillCount(save: GameSave): number {
  let n = 0;
  for (const id of save.owned) {
    n += save.chars[id]?.unlockedNodes.length ?? 0;
  }
  return n;
}

export function refreshOnboardingFlags(save: GameSave, adv?: AdventureSystem): void {
  ensureOnboarding(save);
  const o = save.onboarding!;
  if (adv?.isInExpedition() || save.inExpedition) o.expedition = true;
  if (materialTotal(save) >= 5) o.materials = true;
  if (save.location === 'lodging' && o.expedition) o.returned = true;
}

function chapter1Quests(save: GameSave, adv?: AdventureSystem): OnboardingQuest[] {
  refreshOnboardingFlags(save, adv);
  const o = save.onboarding!;
  return [
    { id: 'expedition', label: '⚔️ 모험 출발', hint: '월드 → 던전 → 모험 출발', done: o.expedition },
    { id: 'returned', label: '🏠 숙소 귀환', hint: '상단 🏠 마을 체크 → 전투 끝 후 귀환', done: o.returned },
    { id: 'growth', label: '⬆️ 성장 1회', hint: '성장 탭 → 스킬 습득 또는 빠른 레벨업', done: o.growth },
  ];
}

function chapter2Quests(save: GameSave): OnboardingQuest[] {
  const o = save.onboarding!;
  const maxR = save.maxRegion ?? 1;
  return [
    { id: 'materials', label: '📦 재료 5개 모으기', hint: '던전에서 잡템 수집', done: materialTotal(save) >= 5 },
    { id: 'sold', label: '💰 상점에서 판매', hint: '마을 → 거래 → 재료 판매 (던전 재료가 주 골드 수입)', done: o.sold },
    { id: 'floor2', label: '🏅 2층 보스 클리어', hint: '2층 보스 처치 후 3층 해금', done: maxR >= 3 },
  ];
}

function chapter3Quests(save: GameSave): OnboardingQuest[] {
  const maxR = save.maxRegion ?? 1;
  const o = save.onboarding!;
  return [
    { id: 'floor3', label: '🏅 3층 보스 클리어', hint: '3층 보스 처치 후 4층 해금', done: maxR >= 4 },
    { id: 'skills2', label: '✨ 스킬 2개 이상', hint: '성장 탭에서 스킬 습득', done: unlockedSkillCount(save) >= 2 },
    { id: 'retry', label: '🔁 원정 재도전', hint: '귀환 후 다시 모험을 떠나 보세요', done: maxR >= 4 && o.returned && o.expedition },
  ];
}

export function getOnboardingQuests(save: GameSave, adv?: AdventureSystem): OnboardingQuest[] {
  const ch = getGuideChapter(save);
  switch (ch) {
    case 1: return chapter1Quests(save, adv);
    case 2: return chapter2Quests(save);
    case 3: return chapter3Quests(save);
    default: return [];
  }
}

export function getChapterRewardGold(chapter: number): number {
  return CHAPTER_REWARDS[chapter - 1] ?? 0;
}

export function canClaimOnboardingReward(save: GameSave, adv?: AdventureSystem): boolean {
  const ch = getGuideChapter(save);
  if (ch === 0) return false;
  return getOnboardingQuests(save, adv).every(q => q.done);
}

export function claimOnboardingReward(save: GameSave, adv?: AdventureSystem): boolean {
  if (!canClaimOnboardingReward(save, adv)) return false;
  ensureOnboarding(save);
  const o = save.onboarding!;
  const ch = getGuideChapter(save);
  const gold = getChapterRewardGold(ch);
  o.chapterClaims!.push(ch);
  if (ch === 3 || getGuideChapter(save) === 0) {
    save.tutorialStep = 99;
  }
  if (ch === 1) {
    o.rewardClaimed = true;
    o.mujangDiscountAvailable = true;
  }
  save.gold += gold;
  save.stats.totalGold += gold;
  saveGame(save);
  return true;
}

/** 보스 최초 클리어 보너스 — 지급 골드·메시지 (없으면 null) */
export function grantBossFirstClearBonus(save: GameSave, regionId: number): string | null {
  ensureOnboarding(save);
  const o = save.onboarding!;
  const parts: string[] = [];

  const floorBonus = o.floorClearBonus!;
  if (regionId <= 3) {
    const key = String(regionId);
    if (!floorBonus[key]) {
      const bonus = FLOOR_FIRST_CLEAR_GOLD[regionId] ?? 0;
      if (bonus > 0) {
        floorBonus[key] = true;
        save.gold += bonus;
        save.stats.totalGold += bonus;
        parts.push(`🎁 ${regionId}층 최초 클리어 🪙${bonus.toLocaleString()}`);
      }
    }
  }

  if (regionId === 5 && !o.floor5InnBonus) {
    o.floor5InnBonus = true;
    save.gold += FLOOR5_INN_BONUS_GOLD;
    save.stats.totalGold += FLOOR5_INN_BONUS_GOLD;
    parts.push(`🛏️ 5층 돌파 여관 지원금 🪙${FLOOR5_INN_BONUS_GOLD.toLocaleString()}`);
  }

  if (save.homeStationId === regionId && !o.homeStationBonusClaimed) {
    o.homeStationBonusClaimed = true;
    const bonus = getHomeStationClearBonus(regionId);
    save.gold += bonus;
    save.stats.totalGold += bonus;
    const name = getRegionName(regionId);
    parts.push(`🏠 ${name} 본인 지점 클리어 보너스 🪙${bonus.toLocaleString()}`);
  }

  if (!parts.length) return null;
  saveGame(save);
  return parts.join(' · ');
}


export function onExpeditionStarted(save: GameSave): void {
  ensureOnboarding(save);
  save.onboarding!.expedition = true;
}

export function onMaterialSold(save: GameSave, gold = 0): void {
  ensureOnboarding(save);
  save.onboarding!.sold = true;
  if (gold > 0) save.onboarding!.totalSoldGold = (save.onboarding!.totalSoldGold ?? 0) + gold;
}

export function onGrowthAction(save: GameSave): void {
  ensureOnboarding(save);
  save.onboarding!.growth = true;
}

export function onLodgingArrival(save: GameSave): void {
  ensureOnboarding(save);
  if (save.onboarding!.expedition) save.onboarding!.returned = true;
}

export function onErrandCompleted(save: GameSave): void {
  ensureOnboarding(save);
  save.onboarding!.errandCompletedOnce = true;
}

export function onBountyClaimed(save: GameSave): void {
  ensureOnboarding(save);
  save.onboarding!.bountyClaimedOnce = true;
}

export function onRestTipClaimed(save: GameSave): void {
  ensureOnboarding(save);
  save.onboarding!.restTipClaimedOnce = true;
}

export function onDispatchClaimed(save: GameSave): void {
  ensureOnboarding(save);
  save.onboarding!.dispatchOnce = true;
}

export function onShopBuy(save: GameSave): void {
  ensureOnboarding(save);
  save.onboarding!.shopBuyOnce = true;
}

export function onContractDelivered(save: GameSave): void {
  ensureOnboarding(save);
  save.onboarding!.contractOnce = true;
}

export function useReturnSkip(save: GameSave): boolean {
  ensureOnboarding(save);
  const o = save.onboarding!;
  if (o.returnSkipsUsed >= 3) return false;
  o.returnSkipsUsed += 1;
  return true;
}

export function getReturnWalkSec(save: GameSave, regionId: number): number {
  const base = 1.8 + Math.min(2.2, regionId * 0.18);
  ensureOnboarding(save);
  let sec: number;
  if (save.onboarding!.returnSkipsUsed <= 3) sec = Math.min(base, 1.1);
  else if (regionId <= 3) sec = base * 0.45;
  else sec = base;
  return sec * RETURN_DURATION_MULT;
}

export function getReturnTravelMult(save: GameSave): number {
  ensureOnboarding(save);
  let mult: number;
  if (save.onboarding!.returnSkipsUsed <= 3) mult = 0.22;
  else {
    const maxR = save.maxRegion ?? 1;
    if (maxR <= 3) mult = 0.38;
    else mult = 0.65;
  }
  return mult * RETURN_DURATION_MULT;
}

/** 무장 영입 기본 cost (할인 전) — calcRecruitGoldCost로 최종가 산출 */
export function getMujangRecruitBaseCost(save: GameSave): number {
  ensureOnboarding(save);
  const o = save.onboarding!;
  if (o.mujangDiscountAvailable) return MUJANG_DISCOUNT_COST;
  return 12000;
}

/** @deprecated getMujangRecruitBaseCost + calcRecruitGoldCost */
export function getMujangRecruitCost(save: GameSave): number {
  return calcRecruitGoldCost(save, getMujangRecruitBaseCost(save));
}

export function consumeMujangDiscount(save: GameSave): void {
  ensureOnboarding(save);
  save.onboarding!.mujangDiscountAvailable = false;
}
