import type { CharState, GameSave } from '../types';
import { MAX_PARTY_SIZE } from '../types';
import { ensurePotionInventory } from '../systems/PotionInventory';
import { CHARACTERS } from '../data/characters';
import { isSupportChar } from '../systems/StatCalculator';
import { RECIPE_MAP } from '../data/equipment';
import { reconcileBattleBuffs } from '../systems/LodgingShopSystem';
import { reconcileRecruitGuarantee } from '../systems/BulletinBoardSystem';
import { getStarterRecipeId } from '../data/equipmentCatalog';
import { normalizeGrade } from '../data/equipGrades';
import { reconcileFormation } from '../systems/FormationSystem';
import { GROWTH_NODES } from '../data/growthTrees';
import { isPrestigeNodeId } from '../data/prestigeBranchBuilder';
import { ensureLeaderboardState } from '../systems/LeaderboardSystem';
import { ensureRivalDuel } from '../systems/RivalDuelSystem';
import { reconcileSpireAccess } from '../systems/SpireRunSystem';
import { scheduleProfileSync } from '../services/PlayerProfileService';
import { PRESTIGE_BRANCH_DEFS } from '../data/prestigeBranchData';
import { normalizeBagItemSlots, sanitizeEquipment } from '../systems/EquipmentSystem';
import { COMBAT_HP_SCALE } from '../data/combatBalance';
import { MAX_DUNGEON_FLOOR } from '../data/regions';
import { ensureEndgame, hasClearedEndgameDungeonBoss } from '../systems/EndgameSystem';
import { ensureCamp } from '../systems/TycoonSystem';
import { ensureLocation } from '../systems/LodgingSystem';
import { ensureBulletin } from '../systems/BulletinBoardSystem';
import { ensureLodgingEconomy } from '../systems/LodgingEconomySystem';
import { ensureDungeonShortcuts, reconcileShortcutDevelopment } from '../systems/DungeonShortcutSystem';
import { ensureTycoon } from '../systems/TycoonExpansionSystem';
import { ensureCharStatus } from '../systems/CharacterStatusSystem';
import { defaultOnboarding, ensureOnboarding } from '../systems/OnboardingSystem';
import { REBIRTH_MIGRATION_SAVE_VERSION, applyRebirthV7Migration, collectAllRebirthMarks, stashRebirthMarksForFreshStart } from '../systems/RebirthMarkSystem';
import { applySeasonLeaderboardClamp } from '../systems/seasonLeaderboardClamp';

export const SAVE_VERSION = '7.0.0';
export const MIN_SAVE_VERSION = '3.2.0';
export const STARTER_GOLD = 35_000;
const KEY = 'tuduk_rpg_save';
const RESET_TO_STARTER_KEY = 'tuduk_reset_to_starter';

/** 멀티탭 — 다른 탭이 먼저 저장한 lastOnline 반영 (오프라인 중복 방지) */
export function refreshLastOnlineFromStorage(save: GameSave): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const stored = JSON.parse(raw) as Partial<GameSave>;
    const storedLast = Number(stored.lastOnline ?? 0);
    if (Number.isFinite(storedLast) && storedLast > (save.lastOnline ?? 0)) {
      save.lastOnline = storedLast;
    }
  } catch { /* ignore */ }
}

export function isResetToStarterPending(): boolean {
  try {
    return sessionStorage.getItem(RESET_TO_STARTER_KEY) === '1';
  } catch {
    return false;
  }
}

export function markResetToStarter(): void {
  try {
    sessionStorage.setItem(RESET_TO_STARTER_KEY, '1');
  } catch { /* ignore */ }
}

export function clearResetToStarterFlag(): void {
  try {
    sessionStorage.removeItem(RESET_TO_STARTER_KEY);
  } catch { /* ignore */ }
}

let saveErrorHandler: ((msg: string) => void) | null = null;

export function setSaveErrorHandler(handler: ((msg: string) => void) | null): void {
  saveErrorHandler = handler;
}

const VALID_NODE_IDS = new Set(GROWTH_NODES.map(n => n.id));

function defaultChar(id: string): CharState {
  return { id, level: 1, exp: 0, unlockedNodes: [], growthFails: {}, agility: 0, threat: 0, prestige: 0, equipped: {} };
}

/** 세이브 내 캐릭터 id 변경 (병훈→테소 등) */
function migrateCharId(save: GameSave, from: string, to: string): void {
  if (from === to) return;
  const hasFrom = !!save.chars[from] || save.owned.includes(from)
    || save.party.includes(from) || save.starterCharId === from;
  if (!hasFrom) return;

  if (save.chars[from]) {
    save.chars[to] = migrateCharState({ ...save.chars[from], id: to });
    delete save.chars[from];
  }
  save.owned = save.owned.map(id => (id === from ? to : id));
  save.party = save.party.map(id => (id === from ? to : id));
  if (save.starterCharId === from) save.starterCharId = to;
  if (save.supportSlot === from) save.supportSlot = to;
  if (save.pendingRecruitGuarantee === from) save.pendingRecruitGuarantee = to;
  if (save.bulletin?.heroIds) {
    save.bulletin.heroIds = save.bulletin.heroIds.map(id => (id === from ? to : id));
  }
  if (save.combatHp?.[from] != null) {
    save.combatHp[to] = save.combatHp[from];
    delete save.combatHp[from];
  }
  if (save.combatGauge?.[from] != null) {
    save.combatGauge[to] = save.combatGauge[from];
    delete save.combatGauge[from];
  }
  ensureCharStatus(save);
  if (save.charStatus?.incapacitatedUntil?.[from]) {
    save.charStatus.incapacitatedUntil[to] = save.charStatus.incapacitatedUntil[from];
    delete save.charStatus.incapacitatedUntil[from];
  }
  for (const item of save.bag) {
    if (!item.uid) item.uid = `eq_${item.id}`;
    if (item.id.startsWith(`${from}_`)) item.id = item.id.replace(`${from}_`, `${to}_`);
    if (item.uid.includes(from)) item.uid = item.uid.split(from).join(to);
  }
  const st = save.chars[to];
  if (st) {
    for (const slot of Object.keys(st.equipped) as (keyof typeof st.equipped)[]) {
      const uid = st.equipped[slot];
      if (uid?.includes(from)) st.equipped[slot] = uid.split(from).join(to);
    }
  }
}

function migrateLegacyPrestigeNodes(st: CharState): CharState {
  const unlockedNodes: string[] = [];
  const growthBranches = { ...st.growthBranches };
  for (const id of st.unlockedNodes ?? []) {
    const legacy = id.match(/^(.+_pr)_(\d+)$/);
    if (legacy && !/_pr_[ab]_/.test(id)) {
      unlockedNodes.push(`${legacy[1]}_a_${legacy[2]}`);
    } else {
      unlockedNodes.push(id);
    }
  }
  for (const def of PRESTIGE_BRANCH_DEFS) {
    const group = `${def.charId}_job`;
    if (growthBranches[group]) continue;
    const hasA = unlockedNodes.some(nid => nid.startsWith(`${def.prefix}_a_`));
    const hasB = unlockedNodes.some(nid => nid.startsWith(`${def.prefix}_b_`));
    if (hasA) growthBranches[group] = 'a';
    else if (hasB) growthBranches[group] = 'b';
  }
  return { ...st, unlockedNodes, growthBranches };
}

function migrateCharState(st: CharState): CharState {
  const withBranches = migrateLegacyPrestigeNodes(st);
  const unlockedNodes = (withBranches.unlockedNodes ?? []).filter(id => VALID_NODE_IDS.has(id));
  return {
    ...withBranches,
    growthFails: withBranches.growthFails ?? {},
    agility: withBranches.agility ?? 0,
    threat: withBranches.threat ?? 0,
    unlockedNodes,
    prestige: unlockedNodes.filter(id => isPrestigeNodeId(id)).length,
  };
}

export function getStarterWeaponId(charId: string): string | null {
  return getStarterRecipeId(charId, 'weapon');
}

export function reconcileSave(save: GameSave): GameSave {
  if (!Array.isArray(save.owned)) {
    save.owned = save.party?.length ? [...save.party] : ['huchu'];
  }
  if (!Array.isArray(save.party)) save.party = [];
  if (!Array.isArray(save.bag)) save.bag = [];
  if (!Number.isFinite(save.gold)) save.gold = 0;
  if (!Number.isFinite(save.gems)) save.gems = 5;
  if (!Number.isFinite(save.lastOnline) || save.lastOnline <= 0 || save.lastOnline > Date.now() + 60_000) {
    save.lastOnline = Date.now();
  }
  const badgeMax = (save.badges?.length ?? 0) > 0
    ? Math.max(...save.badges.map(b => b + 1))
    : 1;
  const endgameCap = hasClearedEndgameDungeonBoss(save) ? MAX_DUNGEON_FLOOR + 1 : MAX_DUNGEON_FLOOR;
  const cappedBadgeMax = Math.min(badgeMax, endgameCap);
  save.maxRegion = Math.max(save.maxRegion ?? 1, save.currentRegion ?? 1, cappedBadgeMax);
  save.maxRegion = Math.min(save.maxRegion, endgameCap);
  if ((save.currentRegion ?? 1) > MAX_DUNGEON_FLOOR) {
    save.currentRegion = MAX_DUNGEON_FLOOR;
  }
  if (save.currentRegion > save.maxRegion) save.currentRegion = save.maxRegion;
  if (!save.party?.length) {
    const fallback = save.owned?.find(id => !isSupportChar(id)) ?? save.owned?.[0];
    if (fallback) save.party = [fallback];
  }
  save.party = save.party.filter(id => save.owned.includes(id) && save.chars[id]);
  if (!save.party.length) {
    const fallback = save.owned?.find(id => !isSupportChar(id)) ?? save.owned?.[0];
    if (fallback) save.party = [fallback];
  }
  if (!save.starterCharId && save.party[0]) {
    save.starterCharId = save.party[0];
  }
  if (save.party.length > MAX_PARTY_SIZE) {
    save.party = save.party.slice(0, MAX_PARTY_SIZE);
  }
  if (save.supportSlot && save.party.length === 1 && save.party[0] === save.supportSlot) {
    save.supportSlot = null;
  }
  ensurePotionInventory(save);
  if (save.potions == null) save.potions = 0;
  if (!save.combatGauge) save.combatGauge = {};
  if (save.stats.defeatCount == null) save.stats.defeatCount = 0;
  if (save.combatHpScale !== COMBAT_HP_SCALE) {
    const prev = save.combatHpScale ?? 1;
    const factor = prev > 0 ? COMBAT_HP_SCALE / prev : 1;
    if (save.combatHp && factor !== 1) {
      for (const id of Object.keys(save.combatHp)) {
        save.combatHp[id] = Math.floor(save.combatHp[id]! * factor);
      }
    }
    save.combatHpScale = COMBAT_HP_SCALE;
  }
  if (save.settings.holdFloorAdvance == null) {
    const legacy = (save.settings as { autoAdvanceRegion?: boolean }).autoAdvanceRegion;
    save.settings.holdFloorAdvance = legacy === false;
  }
  if (save.settings.bgmVolume == null) save.settings.bgmVolume = 0.82;
  if (save.settings.sfxVolume == null) save.settings.sfxVolume = 0.58;
  if (save.settings.vibration == null) save.settings.vibration = true;
  if (save.settings.combatFeedbackPreset !== 'rich') save.settings.combatFeedbackPreset = 'rich';
  if (save.endgame) ensureEndgame(save);
  ensureCamp(save);
  ensureLocation(save);
  ensureBulletin(save);
  ensureLodgingEconomy(save);
  ensureDungeonShortcuts(save);
  reconcileShortcutDevelopment(save);
  for (const badge of save.badges ?? []) {
    const key = String(badge);
    const counts = save.dungeonShortcuts!.clearCounts!;
    if ((counts[key] ?? 0) < 1) counts[key] = 1;
  }
  if (!save.augments) save.augments = { picked: [], claimedFloors: [] };
  ensureTycoon(save);
  ensureOnboarding(save);
  ensureCharStatus(save);
  if (save.battleBuffAtk != null && save.battleBuffAtk > 1) {
    save.battleBuffAtk = save.battleBuffAtk / 100;
  }
  reconcileBattleBuffs(save);
  reconcileRecruitGuarantee(save);
  if (save.location === 'lodging') {
    save.inExpedition = false;
    if (save.currentRegion > 1) save.currentRegion = 1;
  }
  for (const item of save.bag) {
    item.grade = normalizeGrade(item.grade as string);
  }
  normalizeBagItemSlots(save);
  reconcileFormation(save);
  ensureLeaderboardState(save);
  ensureRivalDuel(save);
  reconcileSpireAccess(save);
  applySeasonLeaderboardClamp(save);
  return save;
}

function equipStarterWeapon(save: GameSave, charId: string) {
  const weaponId = getStarterWeaponId(charId);
  if (!weaponId) return;
  const r = RECIPE_MAP[weaponId];
  if (!r) return;
  const uid = `eq_start_${charId}`;
  if (!save.bag.some(b => b.uid === uid)) {
    save.bag.push({ uid, id: r.id, grade: r.grade, slot: r.slot, level: 0 });
  }
  save.chars[charId]!.equipped.weapon = uid;
}

export interface StarterSaveOpts {
  homeStationId?: number;
  adventureTeamName?: string;
  playerNickname?: string;
  survey?: {
    motivation: string;
    playstyle: string;
    pace: string;
    combat: string;
    homeStationId: number;
  };
}

export function createStarterSave(starterId: string, opts?: StarterSaveOpts): GameSave {
  const chars: Record<string, CharState> = {};
  for (const c of CHARACTERS) chars[c.id] = defaultChar(c.id);

  const save: GameSave = {
    version: SAVE_VERSION,
    gold: STARTER_GOLD,
    gems: 5,
    currentRegion: 1,
    maxRegion: 1,
    location: 'lodging',
    inExpedition: false,
    badges: [],
    party: [starterId],
    starterCharId: starterId,
    homeStationId: opts?.homeStationId ?? opts?.survey?.homeStationId,
    starterSurvey: opts?.survey,
    adventureTeamName: opts?.adventureTeamName,
    playerNickname: opts?.playerNickname,
    supportSlot: null,
    owned: [starterId],
    chars,
    codex: {},
    codexRewards: [],
    achievements: [],
    bag: [],
    materials: { iron_ore: 5, slime_gel: 3, wood_chip: 4, magic_dust: 2 },
    recruitFails: {},
    bossPity: {},
    combatHp: {},
    potionStock: 3,
    potions: 0,
    combatGauge: {},
    cookBuffUntil: 0,
    cookBuffType: null,
    pendingGrowthBoost: null,
    pendingRecruitGuarantee: null,
    rebirthMarks: [],
    tutorialStep: 0,
    onboarding: defaultOnboarding(),
    speedBoostUntil: 0,
    stats: {
      totalKills: 0, totalGold: 0, touchCount: 0, playTime: 0,
      recruitAttempts: 0, potionsUsed: 0, cooksDone: 0,
      adsWatched: 0,
      defeatCount: 0,
    },
    lastOnline: Date.now(),
    settings: {
      sfx: true, bgm: true, vibration: true, holdFloorAdvance: false,
      battleSpeed: 2, fastWalk: true, speedFarmMode: true, autoUltimate: true,
      bgmVolume: 0.82, sfxVolume: 0.58,
    },
  };

  equipStarterWeapon(save, starterId);
  sanitizeEquipment(save);
  return reconcileSave(save);
}

export function createDefaultSave(): GameSave {
  return createStarterSave('huchu');
}

function parseVersion(v: string): number {
  const clean = (v.split('-')[0] ?? v).trim();
  const parts = clean.split('.').map(Number);
  if (parts.some(p => !Number.isFinite(p))) return 0;
  return (parts[0] ?? 0) * 10000 + (parts[1] ?? 0) * 100 + (parts[2] ?? 0);
}

function isSaveVersionValid(version: string | undefined): boolean {
  const parsed = parseVersion(version ?? '0');
  if (!Number.isFinite(parsed) || parsed <= 0) return false;
  return parsed >= parseVersion(MIN_SAVE_VERSION);
}

function migrateSave(parsed: Partial<GameSave>, starterId: string): GameSave {
  const oldVer = parseVersion(parsed.version ?? '1.0.0');

  if (oldVer < parseVersion(REBIRTH_MIGRATION_SAVE_VERSION) && oldVer >= parseVersion(MIN_SAVE_VERSION)) {
    return applyRebirthV7Migration(parsed, starterId);
  }

  const base = createStarterSave(starterId);
  const save: GameSave = {
    ...base,
    ...parsed,
    version: SAVE_VERSION,
    chars: { ...base.chars, ...parsed.chars },
    stats: { ...base.stats, ...parsed.stats },
    settings: { ...base.settings, ...parsed.settings },
    materials: { ...parsed.materials ?? base.materials },
    recruitFails: { ...base.recruitFails, ...parsed.recruitFails },
    bossPity: { ...base.bossPity, ...parsed.bossPity },
    combatHp: { ...parsed.combatHp ?? {} },
    potions: parsed.potions ?? base.potions,
    potionStock: parsed.potionStock ?? base.potionStock,
    combatGauge: { ...parsed.combatGauge ?? base.combatGauge },
    battleBuffs: parsed.battleBuffs,
    battleBuffUntil: parsed.battleBuffUntil,
    battleBuffAtk: parsed.battleBuffAtk,
    battleBuffKind: parsed.battleBuffKind,
    battleBuffDurationMs: parsed.battleBuffDurationMs,
    codexRewards: parsed.codexRewards ?? base.codexRewards,
    bag: parsed.bag?.map(b => ({ ...b, uid: b.uid ?? `eq_${b.id}`, level: b.level ?? 0 })) ?? base.bag,
    supportSlot: parsed.supportSlot ?? base.supportSlot,
    cookBuffUntil: parsed.cookBuffUntil ?? 0,
    cookBuffType: parsed.cookBuffType ?? null,
    pendingGrowthBoost: parsed.pendingGrowthBoost ?? null,
    pendingRecruitGuarantee: parsed.pendingRecruitGuarantee ?? null,
    tutorialStep: parsed.tutorialStep ?? 0,
    speedBoostUntil: parsed.speedBoostUntil ?? 0,
    gemAdUntil: parsed.gemAdUntil,
    endgame: parsed.endgame,
    camp: parsed.camp,
    rebirthMarks: parsed.rebirthMarks ?? [],
    rebirthMigrationPending: parsed.rebirthMigrationPending,
  };

  if (!save.rebirthMarks) save.rebirthMarks = [];
  for (const id of save.rebirthMarks) {
    if (save.chars[id]) save.chars[id]!.rebirthMark = true;
  }

  const legacyAuto = (parsed.settings as { autoAdvanceRegion?: boolean } | undefined)?.autoAdvanceRegion;
  if (save.settings.holdFloorAdvance == null) {
    save.settings.holdFloorAdvance = legacyAuto === false;
  }

  if (save.endgame) ensureEndgame(save);
  ensureCamp(save);

  for (const id of Object.keys(save.chars)) {
    save.chars[id] = migrateCharState(save.chars[id]!);
  }
  sanitizeEquipment(save);

  if (oldVer < parseVersion('2.0.0') && save.tutorialStep === 0) {
    save.tutorialStep = 99;
  }
  if (oldVer < parseVersion('2.0.0')) {
    if (save.gold > 1_000_000) save.gold = STARTER_GOLD;
    save.settings.battleSpeed = save.settings.battleSpeed ?? 2;
    save.settings.fastWalk = save.settings.fastWalk ?? true;
    save.settings.speedFarmMode = save.settings.speedFarmMode ?? true;
    save.settings.autoUltimate = save.settings.autoUltimate ?? true;
    save.stats.adsWatched = save.stats.adsWatched ?? 0;
    if (save.gems < 5) save.gems = 5;
  }

  if (oldVer < parseVersion('6.1.0')) {
    migrateCharId(save, 'byunghoon', 'teso');
  }
  if (oldVer < parseVersion('6.1.1')) {
    migrateCharId(save, 'tani', 'jimjimi');
    migrateCharId(save, 'meonji', 'isanim');
    migrateCharId(save, 'cola', 'sanjeok');
  }
  if (oldVer < parseVersion('6.2.0')) {
    for (const id of Object.keys(save.chars)) {
      save.chars[id] = migrateCharState(save.chars[id]!);
    }
  }
  if (oldVer < parseVersion('6.3.0')) {
    if (save.tycoon) {
      save.tycoon.supplyBoostMult = save.tycoon.supplyBoostMult ?? 1;
      save.tycoon.supplyBoostUntil = save.tycoon.supplyBoostUntil ?? 0;
    }
  }

  if (oldVer < parseVersion('5.0.0')) {
    const validIds = new Set(Object.keys(RECIPE_MAP));
    save.bag = save.bag.filter(b => validIds.has(b.id));
    for (const cid of save.owned) {
      const st = save.chars[cid];
      if (!st) continue;
      for (const slot of Object.keys(st.equipped)) {
        const uid = st.equipped[slot as keyof typeof st.equipped];
        if (uid && !save.bag.some(b => b.uid === uid)) {
          delete st.equipped[slot as keyof typeof st.equipped];
        }
      }
      if (!st.equipped.weapon) equipStarterWeapon(save, cid);
    }
    save.combatHp = {};
    save.partyFormation = undefined;
  }

  return reconcileSave(save);
}

function parseSave(raw: string): GameSave | null {
  try {
    const parsed = JSON.parse(raw) as Partial<GameSave>;
    const starterId = parsed.party?.[0] ?? 'huchu';
    return migrateSave(parsed, starterId);
  } catch { /* ignore */ }
  return null;
}

export function loadSave(): GameSave | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameSave>;
    if (!isSaveVersionValid(parsed.version)) {
      clearSave();
      return null;
    }
    return parseSave(raw);
  } catch { /* ignore */ }
  return null;
}

/** @deprecated boot uses sync loadSave */
export async function loadSaveAsync(): Promise<GameSave | null> {
  return loadSave();
}

export function saveGame(save: GameSave): boolean {
  if (isResetToStarterPending()) return true;
  save.lastOnline = Date.now();
  save.version = SAVE_VERSION;
  const json = JSON.stringify(save);
  try {
    localStorage.setItem(KEY, json);
    scheduleProfileSync(save);
    return true;
  } catch {
    saveErrorHandler?.('저장 실패 — 저장 공간을 확인해 주세요');
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith('tuduk_')) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}

/** 진행 초기화 — 캐릭터 선택부터, 키운 캐릭터는 환생의 마크(+30% EXP) 유지 */
export function resetGameToFreshStart(): void {
  let parsed: Partial<GameSave> = {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) parsed = JSON.parse(raw) as Partial<GameSave>;
  } catch { /* ignore */ }
  const marks = collectAllRebirthMarks(parsed);
  markResetToStarter();
  clearSave();
  stashRebirthMarksForFreshStart(marks);
}
