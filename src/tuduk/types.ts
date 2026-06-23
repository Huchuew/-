export type JobClass =
  | 'warrior' | 'archer' | 'mage' | 'lancer' | 'berserker'
  | 'buffer_atk' | 'buffer_spd' | 'buffer_crit' | 'buffer_exp'
  | 'fighter' | 'chef' | 'healer';

export type EquipSlot = 'weapon' | 'armor' | 'ring' | 'necklace' | 'relic';
export type EquipGrade =
  | 'f' | 'e' | 'd' | 'c' | 'b' | 'a' | 's' | 'sr' | 'ssr' | 'ur'
  | 'u1' | 'u2' | 'u3' | 'u4' | 'u5' | 'u6' | 'u7' | 'u8' | 'u9' | 'ua';
export type EquipRole = 'tank' | 'dps' | 'healer' | 'bruiser' | 'support';
export type CookType = 'bbq' | 'spicy' | 'feast';
export type AdventurePhase = 'walk' | 'encounter' | 'combat' | 'loot' | 'boss' | 'defeat' | 'travel';
export type GameLocation = 'dungeon' | 'lodging';
export type GaugeType = 'mana' | 'fury';

export const MAX_POTION_STOCK = 100;
/** 원정(던전) 휴대 한도 */
export const EXPEDITION_POTION_CARRY = 3;
/** @deprecated — MAX_POTION_STOCK 사용 */
export const MAX_POTIONS = MAX_POTION_STOCK;
export const MAX_PARTY_SIZE = 4;

export type ElementType = 'none' | 'fire' | 'water' | 'thunder' | 'poison';

export interface StatusEffect {
  element: ElementType;
  damagePerTick: number;
  ticksLeft: number;
  interval: number;
  elapsed: number;
  sourceName: string;
  /** 도트 시전자 — 기여도 집계용 */
  sourceCharId?: string;
}

/** 전투 중 시간제 버프·디버프 */
export interface TimedCombatEffect {
  id: string;
  name: string;
  kind: 'buff' | 'debuff';
  icon: string;
  duration: number;
  elapsed: number;
  atkMult?: number;
  defMult?: number;
  spdMult?: number;
  damagePerTick?: number;
  tickInterval?: number;
  tickElapsed?: number;
  desc: string;
  sourceName: string;
  appliedAt?: number;
}

export interface CharRunCombatStats {
  damageDealt: number;
  damageTaken: number;
  healDone: number;
}

export interface AdventureRunStats {
  goldEarned: number;
  damageDealt: number;
  damageTaken: number;
  kills: number;
  touchDamage: number;
  /** 이번 원정에서 획득한 재료 */
  matsGained: Record<string, number>;
  /** 캐릭터별 전투 기록 (이번 원정) */
  byChar: Record<string, CharRunCombatStats>;
}

/** 전투 중 활성 몬스터 슬롯 */
export interface EncounterSlot {
  uid: string;
  def: MonsterDef;
  entity: CombatEntity;
  slot: number;
  bossPhase?: number;
  /** 정예·레어 — 투지 게이지 & 특수공격 */
  isElite?: boolean;
  /** 10층+ 보스 직전 에픽 */
  isEpic?: boolean;
  spiritGauge?: number;
}

export interface DefeatLog {
  goldLost: number;
  sessionGoldForfeited: number;
  penaltyGold: number;
  stats: AdventureRunStats;
  regionName?: string;
  affixName?: string;
  affixTip?: string;
  lastHit?: { attacker: string; target: string; damage: number };
  aggroTip?: string;
  synergyLines?: string[];
  enemyCount?: number;
  /** 전멸 시 전투력 구성 스냅샷 */
  powerSnapshot?: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }[];
}

export type WeaponKind = 'sword' | 'bow' | 'staff' | 'spear' | 'axe' | 'fist' | 'wand' | 'cleaver';
export type ArmorKind = 'plate' | 'leather' | 'robe' | 'cloth';

export interface CharDef {
  id: string;
  name: string;
  job: JobClass;
  jobLabel: string;
  desc: string;
  cost: number;
  recruitRate: number;
  color: string;
  accent: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseMdef: number;
  atkSpd: number;
  critRate: number;
  critMult: number;
  aoe: boolean;
  pierce: boolean;
  berserk: boolean;
  bufferType?: 'atk' | 'spd' | 'crit' | 'exp';
  /** 장비 시너지·대열 역할 */
  equipRole: EquipRole;
}

export interface CharState {
  id: string;
  level: number;
  exp: number;
  unlockedNodes: string[];
  /** 스킬 습득 실패 횟수 (노드별 · 확률 보정) */
  growthFails?: Record<string, number>;
  /** 민첩 강화 레벨 — 공속 상승 */
  agility?: number;
  /** 탱커 어그로 강화 레벨 — 위협 배율 상승 (민첩 강화와 함께 성장) */
  threat?: number;
  /** 민첩 무료 강화 쿨다운 (ms) */
  lastAgilityMs?: number;
  /** 힐 쿨다운 (ms) */
  lastHealMs?: number;
  /** 환생의 마크 — v2.0 이전 키운 캐릭터 영구 EXP +30% */
  rebirthMark?: boolean;
  prestige: number;
  /** 전직 분기 선택 — branchGroup → path key (a/b) */
  growthBranches?: Record<string, string>;
  equipped: Partial<Record<EquipSlot, string>>;
}

export interface MonsterDef {
  id: string;
  name: string;
  regionId: number;
  hp: number;
  atk: number;
  def: number;
  mdef: number;
  gold: number;
  exp: number;
  isBoss: boolean;
  isRare: boolean;
  rareChance: number;
  drops: string[];
  /** 마법 공격 — 플레이어 마방으로 방어 */
  isMagic?: boolean;
  /** 몬스터 속성 — 공격 시 도트 부여 */
  element?: ElementType;
}

export interface RegionDef {
  id: number;
  name: string;
  badge: string;
  badgeName: string;
  bgTop: string;
  bgBottom: string;
  ground: string;
  monsterIds: string[];
  bossId: string;
}

export interface GrowthNode {
  id: string;
  charId: string;
  tree: string;
  name: string;
  desc: string;
  cost: number;
  reqLevel: number;
  reqNode?: string;
  atk?: number;
  def?: number;
  hp?: number;
  atkSpd?: number;
  crit?: number;
  aoeBonus?: number;
  /** 파티 버프 강화 (버퍼/요리사) */
  buffAtk?: number;
  buffSpd?: number;
  buffCrit?: number;
  buffExp?: number;
  offlineBonus?: number;
  /** 기본 습득 확률 (0~1) */
  successRate: number;
  /** 습득 시도에 필요한 재료 */
  materials?: Record<string, number>;
  /** 전직 분기 그룹 (동일 그룹 내 경로는 상호 배타) */
  branchGroup?: string;
  /** 분기 경로 키 (a/b) */
  branchPath?: string;
  /** 분기 단계 1=2차 · 2=3차 · 3=4차 */
  branchTier?: number;
}

export interface BagItem {
  uid: string;
  id: string;
  grade: EquipGrade;
  slot: EquipSlot;
  level: number;
  /** UR 각성 단계 (0~3) */
  awakenLevel?: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  reward: number;
  gemReward?: number;
  check: (s: GameSave) => boolean;
}

export interface TycoonDispatchState {
  regionId: number;
  matKey: string;
  qty: number;
  endsAt: number;
  /** 파견 시작 시각 — 진행률 계산용 (구세이브는 endsAt에서 역산) */
  startedAt?: number;
  /** 파견 총 소요(ms) — 시작 시 고정 (길드 Lv 변경·밸런스 패치와 무관) */
  durationMs?: number;
  heroes: string[];
}

export interface TycoonSettlement {
  gold: number;
  mats: Record<string, number>;
  dispatchMats: Record<string, number>;
  /** 원정 복귀 캐러밴 보너스 골드 */
  caravanGold?: number;
  supplyBoostPct?: number;
}

export interface ExpeditionRuntime {
  isReturningToLodging?: boolean;
  returnTripQueue?: number[];
  isLodgingResting?: boolean;
  pendingTravelRegion?: number | null;
  pendingReturnToLodging?: boolean;
  travelFromId?: number;
  travelToId?: number;
  travelDurationSec?: number;
  returnWalkSec?: number;
  phase?: AdventurePhase;
  phaseTimer?: number;
}

export interface TycoonState {
  marketDay: string;
  marketMods: Record<string, number>;
  autoSellOverflow: boolean;
  /** 자동 파견·수령·창고 매각 */
  autoManage: boolean;
  /** 급여 미지급 시 직원 생산 보너스 중단 */
  staffSuspended?: boolean;
  zones: string[];
  staff: Record<string, string>;
  dispatch: TycoonDispatchState | null;
  contractWeek: string;
  contractMat: string;
  contractQty: number;
  contractDelivered: number;
  contractReward: number;
  contractRep: number;
  activeEvent: { id: string; until: number; label: string } | null;
  remodelTier: number;
  lastInnTick: number;
  lastStaffWageTick: number;
  /** 원정 중 적립된 타이쿤 수익 (귀환 시 정산) */
  pendingGold: number;
  pendingMats: Record<string, number>;
  /** 던전 복귀 공급 부스트 만료 시각 */
  supplyBoostUntil?: number;
  /** 공급 부스트 배율 (1.0~1.55) */
  supplyBoostMult?: number;
}

export interface EndgameState {
  riftCleared: number;
  riftKeys: number;
  riftKeysDay: string;
  spireBest: number;
  spireWeek: string;
  spireWeekBest: number;
  spireAttempts: number;
  spireAttemptsDay: string;
  relics: string[];
  ascended: string[];
}

export type ShopBattleBuffKind =
  | 'trail_rations'
  | 'battle_elixir'
  | 'spirit_stew'
  | 'guard_broth'
  | 'vitality_pill'
  | 'swift_tonic'
  | 'focus_draught';

export interface BattleBuffEntry {
  kind: ShopBattleBuffKind;
  atk?: number;
  def?: number;
  hp?: number;
  spd?: number;
  crit?: number;
  until: number;
  durationMs: number;
}

export interface GameSave {
  version: string;
  gold: number;
  gems: number;
  currentRegion: number;
  maxRegion: number;
  /** 현재 위치 — 숙소 또는 던전 */
  location?: GameLocation;
  /** 던전 원정 중 (숙소 복귀 시 종료·1층부터 재시작) */
  inExpedition?: boolean;
  badges: number[];
  party: string[];
  /** 최초 선택 스타터 — 성장·난이도 보정용 */
  starterCharId?: string;
  /** 설문에서 선택한 본인 지점 (층 id) */
  homeStationId?: number;
  /** 설문에서 정한 모험단 이름 */
  adventureTeamName?: string;
  /** HUD에 표시할 대표 닉네임 */
  playerNickname?: string;
  /** 18층 최초 정복 축하 연출 완료 */
  floor18ClearCelebrated?: boolean;
  /** 캐릭터 생성 설문 응답 */
  starterSurvey?: {
    motivation: string;
    playstyle: string;
    pace: string;
    combat: string;
    homeStationId: number;
  };
  /** 전투 대열 — 앞(탱킹) → 뒤 순서. 몬스터가 우선 공격 */
  partyFormation?: string[];
  /** 버퍼/요리사 전용 서포트 슬롯 (전투 안 나감, 버프 100%) */
  supportSlot: string | null;
  owned: string[];
  chars: Record<string, CharState>;
  codex: Record<string, { kills: number; discovered: boolean }>;
  /** 도감 100% 보상 수령한 지역 */
  codexRewards: number[];
  achievements: string[];
  bag: BagItem[];
  materials: Record<string, number>;
  recruitFails: Record<string, number>;
  /** 지역별 보스 등장 실패 횟수 (도감 100% 후 피티) */
  bossPity?: Record<number, number>;
  /** 층별 첫 클리어 진행 — 보스 등장 게이트용 활동 시간 */
  floorPacing?: Record<number, { activeSec: number }>;
  /** 원정 중 캐릭터별 지속 디버프·버프 (전투 종료 후에도 시간 만료까지) */
  expeditionModifiers?: Record<string, TimedCombatEffect[]>;
  /** 층별 보스 전 에픽 클리어 여부 (원정 중만) */
  expeditionBossGate?: Record<number, { epicCleared: boolean }>;
  /** 던전 시설 게이지 충전 (출발 시 소모 → expeditionDungeonBuffs) */
  dungeonPrepStacks?: Partial<Record<string, number>>;
  /** 원정 1회 적용 던전 시설 보너스 */
  expeditionDungeonBuffs?: {
    atkMult: number;
    defMult: number;
    expMult: number;
    goldMult: number;
    critBonus: number;
    matDropMult: number;
    waveHealPct: number;
  };
  /** 전투 간 유지 HP */
  combatHp: Record<string, number>;
  /** combatHp 배율 마이그레이션용 */
  combatHpScale?: number;
  /** 숙소 포션 창고 (최대 MAX_POTION_STOCK) */
  potionStock?: number;
  /** 원정 휴대 포션 (최대 EXPEDITION_POTION_CARRY, 숙소에서는 0) */
  potions: number;
  /** 캐릭터별 필살기 게이지 (0~1) */
  combatGauge: Record<string, number>;
  /** 상점 공격 버프 (도시락·비약 등 동시 적용) */
  battleBuffs?: BattleBuffEntry[];
  /** @deprecated battleBuffs 로 이전 — 레거시 호환 */
  battleBuffUntil?: number;
  battleBuffAtk?: number;
  battleBuffKind?: ShopBattleBuffKind;
  battleBuffDurationMs?: number;
  /** 요리 버프 만료 시각 (ms) */
  cookBuffUntil: number;
  cookBuffType: CookType | null;
  /** 젬으로 구매한 다음 스킬 습득 확률 부스트 대상 노드 */
  pendingGrowthBoost: string | null;
  /** 젬 확정 영입 — 다음 🪙 영입 시도 100% (벽보) */
  pendingRecruitGuarantee?: string | null;
  /** 튜토리얼 진행 (≥99 완료) */
  tutorialStep: number;
  /** 초반 온보딩 퀘스트 */
  onboarding?: {
    expedition: boolean;
    materials: boolean;
    returned: boolean;
    sold: boolean;
    growth: boolean;
    rewardClaimed: boolean;
    returnSkipsUsed: number;
    mujangDiscountAvailable: boolean;
    chapterClaims?: number[];
    errandCompletedOnce?: boolean;
    bountyClaimedOnce?: boolean;
    restTipClaimedOnce?: boolean;
    floorClearBonus?: Record<string, boolean>;
    floor5InnBonus?: boolean;
    totalSoldGold?: number;
    dispatchOnce?: boolean;
    contractOnce?: boolean;
    shopBuyOnce?: boolean;
    guideMigrated3?: boolean;
    floor10IntroSeen?: boolean;
    dailyBonusClaimDay?: string;
    /** 본인 지점 최초 클리어 보너스 수령 여부 */
    homeStationBonusClaimed?: boolean;
  };
  /** 2배속 부스트 만료 시각 (ms) — 광고 보상 */
  speedBoostUntil: number;
  /** 💎 광고 보상 재시청 가능 시각 (ms) */
  gemAdUntil?: number;
  /** @deprecated 전멸 즉시 귀환 — 레거시 세이브 호환용 */
  defeatUntil?: number;
  /** 전멸 직후 토스트·로그용 (숙소 도착 시 초기화) */
  defeatLog?: DefeatLog;
  /** 캐릭터 상태 (행동불능 등) */
  charStatus?: {
    incapacitatedUntil: Record<string, number>;
  };
  /** v2.0 — 이전에 키운 캐릭터 id (영입 시 환생의 마크) */
  rebirthMarks?: string[];
  /** v2.0 마이그레이션 안내 1회 */
  rebirthMigrationPending?: boolean;
  stats: {
    totalKills: number;
    totalGold: number;
    touchCount: number;
    playTime: number;
    recruitAttempts: number;
    potionsUsed: number;
    cooksDone: number;
    adsWatched: number;
    defeatCount: number;
    /** 주간 미션 — 재료 판매 누적 */
    materialsSold?: number;
    /** 주간 미션 — 보스 격파 누적 */
    bossClears?: number;
    /** 주간 미션 — 일일 대결 클리어 누적 */
    rivalDailyClears?: number;
  };
  /** 엔드게임 (차원 균열·무한의 탑·유물·각성) */
  endgame?: EndgameState;
  /** 숙소 벽보 — 랜덤 용사 영입 */
  bulletin?: {
    heroIds: string[];
    rotatedAt: number;
    rerollCount: number;
  };
  /** 숙소 부가 수입 (사냥 수당·일일 의뢰 등) */
  lodgingEconomy?: {
    huntBountyAt: number;
    /** 벽보에서 수령 — 원정 중 적립된 사냥 골드 */
    pendingKillGold?: number;
    pendingKillCount?: number;
    errandDay: string;
    errandMat: string;
    errandQty: number;
    errandReward: number;
    errandDone: boolean;
    restTipDay?: string;
    restTipCount?: number;
    /** 상점 일일 구매 한도 */
    shopDay?: string;
    shopBought?: Record<string, number>;
    /** 상점 진열 — 30분마다 2~4종 랜덤 */
    shopRotatedAt?: number;
    shopProductIds?: string[];
    /** 허브 오늘의 특가 */
    hubSpecialDay?: string;
    hubSpecialBought?: boolean;
  };
  /** 던전 층 숏컷 — 숙소에서 해당 층 바로 출발 */
  dungeonShortcuts?: {
    floors: Record<string, { ready?: boolean; developingUntil?: number }>;
    clearCounts?: Record<string, number>;
  };
  /** 모험 캠프 시설 */
  camp?: {
    mineLevel: number;
    mineLastTick: number;
    labLevel: number;
    labLastTick: number;
    herbLevel: number;
    herbLastTick: number;
    smelterLevel: number;
    smelterLastTick: number;
    rare_mineLevel?: number;
    rare_mineLastTick?: number;
    clinicLevel: number;
    innLevel?: number;
    kitchenLevel?: number;
    warehouseLevel?: number;
    guildLevel?: number;
    marketLevel?: number;
    trainingLevel?: number;
    armoryLevel?: number;
    libraryLevel?: number;
    shrineLevel?: number;
    watchtowerLevel?: number;
    workshopLevel?: number;
    springLevel?: number;
    trainingLastTick?: number;
    armoryLastTick?: number;
    libraryLastTick?: number;
    shrineLastTick?: number;
    watchtowerLastTick?: number;
    workshopLastTick?: number;
    springLastTick?: number;
    /** v5.1 마이그레이션용 */
    lastTick?: number;
  };
  /** 타이쿤 확장 — 시장·파견·계약·이벤트 */
  tycoon?: TycoonState;
  /** 원정 런타임 (앱 재시작 시 복원) */
  expeditionRuntime?: ExpeditionRuntime;
  /** 층별 첫 클리어 증강 */
  augments?: {
    picked: string[];
    claimedFloors: number[];
    /** 증강 id → 획득 층 */
    pickedAtFloor?: Record<string, number>;
  };
  /** 숙소 허브 — 최근 원정 요약 카드 */
  lastExpeditionHighlight?: {
    kind: 'return' | 'defeat';
    matQty: number;
    goldEarned: number;
    at: number;
    dismissed?: boolean;
  };
  /** 주간 미션 진행 (시즌 주차별) */
  weeklyMissions?: {
    weekId: string;
    baseline: Record<string, number>;
    claimed: string[];
  };
  /** 가상 CPU 길드 주간 랭크 */
  rivalLeague?: {
    weekId: string;
    baseline: { maxRegion: number; totalKills: number; achievements: number; touchCount: number };
    rewardClaimed: boolean;
    lastRank?: number;
    dailyRankSnapshot?: number;
    dailyRankDay?: string;
    mainRivalId: string;
    winStreak?: number;
    seasonWins?: number;
    bonusSp?: number;
    headToHeadDays?: number;
    lastHeadToHeadDay?: string;
    surgeRivalId?: string;
    surgeDayKey?: string;
    daily?: {
      dayKey: string;
      baseline: { kills: number; touches: number; totalGold: number };
      claimed: string[];
      allClearClaimed?: boolean;
    };
  };
  lastOnline: number;
  settings: {
    sfx: boolean;
    bgm: boolean;
    vibration: boolean;
    /** 체크 시 보스 처치 후 다음 층으로 자동 이동 안 함 */
    holdFloorAdvance?: boolean;
    battleSpeed: 1 | 2;
    fastWalk: boolean;
    /** 클리어 층 속파 — 빠른 이동·루트 스킵 */
    speedFarmMode?: boolean;
    /** 궁극기 게이지 100% 시 자동 발동 */
    autoUltimate?: boolean;
    /** 0~1 배경음 볼륨 */
    bgmVolume?: number;
    /** 0~1 효과음 볼륨 */
    sfxVolume?: number;
    /** 전투 연출 프리셋 — rich=풀연출, balanced=속파경량, lite=경량+숫자유지 */
    combatFeedbackPreset?: 'rich' | 'balanced' | 'lite';
  };
}

export interface CombatEntity {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  mdef: number;
  atkSpd: number;
  critRate: number;
  critMult: number;
  color: string;
  attackTimer: number;
  isPlayer: boolean;
  aoe: boolean;
  aoeBonus: number;
  pierce: boolean;
  berserk: boolean;
  bossShield?: number;
  enraged?: boolean;
  isMagic?: boolean;
  /** 지속 피해 상태 */
  statusEffects?: StatusEffect[];
  /** 전투 버프·디버프 */
  combatModifiers?: TimedCombatEffect[];
  element?: ElementType;
  /** 런타임 — 몬스터 인스턴스 uid */
  instanceUid?: string;
  gauge?: number;
  gaugeMax?: number;
  gaugeType?: GaugeType;
  /** 0~1 — 쓰러짐 애니 진행도 (1이면 마지막 프레임 유지) */
  dieAnimProgress?: number;
}

export interface AdventureEvent {
  type: 'damage' | 'crit' | 'heal' | 'gold' | 'loot' | 'msg' | 'kill';
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  /** 짧은 전투 팝 — 작은 글씨 + 알약 배경 */
  compact?: boolean;
}

export interface PartyDpsEntry {
  id: string;
  name: string;
  jobLabel: string;
  color: string;
  atk: number;
  dmgPerHit: number;
  atkSpd: number;
  dps: number;
  share: number;
}
