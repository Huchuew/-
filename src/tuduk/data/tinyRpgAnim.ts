/**
 * Tiny RPG Asset Pack — 4x HD 400×400 프레임, 크롭/보정 없음
 */
import { assetUrl } from '../assets/AssetLoader';
import { getMonsterBattleSpriteSize, GROUND_Y_RATIO } from './pipoyaMap';

let tinyFrameW = 400;
let tinyFrameH = 400;

export const MUJANG_FRAME_W = 400;
export const MUJANG_FRAME_H = 400;

/** 모험 캔버스 ≈ 뷰포트 30% — 목표는 전체 화면 높이 대비 비율 */
const ADVENTURE_VIEWPORT_SHARE = 0.24;

/** 모험단(플레이어) 전투 스프라이트 표시 배율 — 레이아웃·근접 돌진·VFX가 allyW 기준으로 연동됨 */
export const PARTY_SPRITE_DISPLAY_MULT = 2;

/** 전체 화면(뷰포트) 높이 대비 목표 비율 — nearest-neighbor 선명도용 step 스냅 */
export const SPRITE_VIEWPORT_HEIGHT = {
  player: 0.20,
  monster: 0.22,
  boss: 0.22 * 1.65,
} as const;

export type SpriteBattleRole = keyof typeof SPRITE_VIEWPORT_HEIGHT;

type AnimClip = { frames: number; files: string[] };
type EntityClips = Record<string, AnimClip>;

interface TinyManifest {
  frame_size: [number, number];
  assets: {
    characters: Record<string, EntityClips>;
    monsters: Record<string, EntityClips>;
    projectiles?: Record<string, Record<string, AnimClip>>;
  };
}

export type ProjectileKind = 'arrow' | 'orb' | 'holy' | 'heal';

export interface CombatProjectileDef {
  kind: ProjectileKind;
  flightFrames: string[];
  impactFrames: string[];
}

let manifest: TinyManifest | null = null;

/**
 * 게임 캐릭터 id → Tiny RPG characters/ 폴더명
 * 팩에 캐릭터 9종만 있어 11명 중 2쌍은 스프라이트 공유 불가피.
 * 큐티·히든은 서로 다른 팩 + 버퍼 4인과도 겹치지 않게 배정.
 */
export const CHAR_TINY_MAP: Record<string, string> = {
  mujang: 'soldier',
  seoyoung: 'knight',
  ujang: 'swordsman',
  dung: 'archer',
  huchu: 'wizard',
  yujin: 'priest',
  lesford: 'lancer',
  teso: 'knight_templar',
  ampa: 'armored_axeman',
};

/** 몬스터 팩을 플레이어 스프라이트로 사용 */
export const CHAR_MONSTER_PACK: Record<string, string> = {
  cutie: 'greatsword_skeleton',
  hidden: 'werewolf',
  horangi: 'werebear',
  hyesung: 'elite_orc',
  isanim: 'slime',
  sanjeok: 'orc',
  sodia: 'skeleton_archer',
  jimjimi: 'orc_rider',
  danjong: 'armored_skeleton',
  hyeoni: 'skeleton',
  pocket: 'armored_orc',
};

/** 게임 몬스터 id → Tiny RPG monsters/ 폴더명 */
export const MONSTER_TINY_MAP: Record<string, string> = {
  goblin: 'orc',
  goblin_rare: 'elite_orc',
  slime_green: 'slime',
  slime_blue: 'slime',
  ice_slime: 'slime',
  star_slime: 'slime',
  flower_mon: 'slime',
  fish: 'slime',
  frog: 'slime',
  skeleton: 'skeleton',
  bat: 'orc_rider',
  bat_rare: 'skeleton_archer',
  ghost: 'skeleton',
  shadow: 'skeleton',
  bee: 'skeleton',
  wolf: 'werewolf',
  bear: 'werebear',
  treant: 'werebear',
  mage_slime: 'slime',
  soldier: 'armored_orc',
  archer_mob: 'skeleton_archer',
  orc_rider: 'orc_rider',
  golem: 'armored_skeleton',
  jade_golem: 'armored_skeleton',
  demon: 'elite_orc',
  dragon: 'armored_orc',
  dragon_rare: 'armored_orc',
  boss_goblin_chief: 'orc',
  boss_iron_knight: 'armored_skeleton',
  boss_wolf_king: 'werewolf',
  boss_lich: 'greatsword_skeleton',
  boss_arcane: 'elite_orc',
  boss_kraken: 'slime',
  boss_treant: 'werebear',
  boss_shadow: 'skeleton',
  boss_frost: 'armored_skeleton',
  boss_rose: 'slime',
  boss_brass: 'armored_orc',
  boss_river: 'slime',
  boss_general: 'armored_orc',
  boss_stellar: 'skeleton',
  boss_sage: 'greatsword_skeleton',
  boss_forest: 'werewolf',
  boss_jade: 'armored_skeleton',
  boss_final: 'elite_orc',
};

const ATTACK_KEYS = ['attack01', 'attack', 'attack02', 'attack03', 'attack3', 'shadow_attack2'] as const;

const SKILL_ANIM_TIERS: Record<number, string[]> = {
  1: ['attack01', 'attack'],
  2: ['attack02', 'shadow_attack2', 'attack'],
  3: ['attack03', 'attack3', 'shadow_attack2', 'attack02'],
};
const WALK_KEYS = ['walk', 'walk01', 'walk02'] as const;

export interface CharAnimPickOpts {
  slot: number;
  animTime: number;
  inCombat: boolean;
  flash: number;
  dashProg: number;
  dashSlot: number | null;
  hp?: number;
  dieAnimProgress?: number;
  /** 스킬 발동 시 재생할 공격 클립 */
  strikeAnimKey?: string | null;
  /** 교전 중 대기 자세 (공격 스윙 사이) */
  meleeEngaged?: boolean;
}

export interface MonsterAnimPickOpts {
  animTime: number;
  flash: number;
  hp: number;
  maxHp: number;
  inCombat: boolean;
  strikeProg?: number;
  dieAnimProgress?: number;
}

export const DIE_ANIM_FPS = 10;

export function getCharDieFrameCount(charId: string): number {
  const clips = getCharPackClips(charId);
  if (!clips) return 6;
  const die = clipFiles(clips, 'die');
  return die.length || 6;
}

export function markEntityKnockdown(entity: { hp: number; dieAnimProgress?: number }, prevHp: number) {
  if (entity.hp <= 0 && prevHp > 0) entity.dieAnimProgress = 0;
}

export function tickEntityDieAnim(
  entity: { hp: number; dieAnimProgress?: number },
  dt: number,
  frameCount: number,
) {
  if (entity.hp > 0) {
    entity.dieAnimProgress = undefined;
    return;
  }
  const dur = Math.max(0.01, frameCount / DIE_ANIM_FPS);
  entity.dieAnimProgress = Math.min(1, (entity.dieAnimProgress ?? 0) + dt / dur);
}

export async function loadTinyRpgManifest(): Promise<TinyManifest> {
  if (manifest) return manifest;
  const res = await fetch(assetUrl('assets/tiny-rpg/manifest.json'));
  manifest = await res.json() as TinyManifest;
  if (manifest.frame_size?.[0] && manifest.frame_size?.[1]) {
    tinyFrameW = manifest.frame_size[0];
    tinyFrameH = manifest.frame_size[1];
  }
  return manifest!;
}

export function getTinyFrameSize(): { w: number; h: number } {
  return { w: tinyFrameW, h: tinyFrameH };
}

export function getTinyManifest(): TinyManifest | null {
  return manifest;
}

export function tinyAssetPath(rel: string): string {
  return `assets/tiny-rpg/${rel.replace(/\\/g, '/')}`;
}

function clipToPaths(clip: AnimClip | undefined): string[] {
  if (!clip?.files?.length) return [];
  return clip.files.map(f => tinyAssetPath(f));
}

/** 궁수·마법사 등 투사체 스프라이트 (manifest projectiles/) */
export function resolveCombatProjectile(
  charId: string,
  element: 'fire' | 'water' | 'thunder' | 'poison' | 'none' = 'none',
  opts?: { motionKey?: string | null; heal?: boolean },
): CombatProjectileDef | null {
  if (!manifest?.assets.projectiles) return null;
  const proj = manifest.assets.projectiles;
  const motionKey = opts?.motionKey ?? null;

  if (charId === 'dung') {
    const paths = clipToPaths(proj.archer?.arrow02_100x100);
    if (!paths.length) return null;
    return { kind: 'arrow', flightFrames: paths, impactFrames: [] };
  }

  if (charId === 'huchu') {
    let clipKey = 'attack01_effect';
    if (motionKey === 'attack02' || motionKey === 'attack2' || motionKey === 'attack03' || motionKey === 'attack3') {
      clipKey = 'attack02_effect';
    } else if (element === 'water') {
      clipKey = 'attack02_effect';
    }
    const clip = proj.wizard?.[clipKey];
    const all = clipToPaths(clip);
    if (!all.length) return null;
    const split = Math.min(3, all.length - 1);
    return {
      kind: 'orb',
      flightFrames: all.slice(0, Math.max(1, split)),
      impactFrames: all.slice(Math.max(1, split)),
    };
  }

  if (charId === 'yujin') {
    const clip = opts?.heal ? proj.priest?.heal_effect : proj.priest?.attack_effect;
    const all = clipToPaths(clip);
    if (!all.length) return null;
    if (opts?.heal) {
      return { kind: 'heal', flightFrames: all, impactFrames: [] };
    }
    const split = Math.min(2, all.length - 1);
    return {
      kind: 'holy',
      flightFrames: all.slice(0, Math.max(1, split)),
      impactFrames: all.slice(Math.max(1, split)),
    };
  }

  if (charId === 'sodia') {
    const paths = clipToPaths(proj.skeleton_archer?.arrow03_100x100);
    if (!paths.length) return null;
    return { kind: 'arrow', flightFrames: paths, impactFrames: [] };
  }

  if (charId === 'hyeoni') {
    const clipKey = element === 'poison' || element === 'water' ? 'attack02_effect' : 'attack01_effect';
    const clip = proj.wizard?.[clipKey];
    const all = clipToPaths(clip);
    if (!all.length) return null;
    const split = Math.min(3, all.length - 1);
    return {
      kind: 'orb',
      flightFrames: all.slice(0, Math.max(1, split)),
      impactFrames: all.slice(Math.max(1, split)),
    };
  }

  return null;
}

/** 궁수형 몬스터 → 플레이어 쪽 화살 */
export function resolveMonsterProjectile(monId: string): CombatProjectileDef | null {
  if (!manifest?.assets.projectiles) return null;
  const pack = MONSTER_TINY_MAP[monId];
  if (pack !== 'skeleton_archer') return null;
  const paths = clipToPaths(manifest.assets.projectiles.skeleton_archer?.arrow03_100x100);
  if (!paths.length) return null;
  return { kind: 'arrow', flightFrames: paths, impactFrames: [] };
}

function pickAttackKey(clips: EntityClips, preferred?: string | null): string {
  if (preferred && clips[preferred]?.files?.length) return preferred;
  for (const k of ATTACK_KEYS) {
    if (clips[k]?.files?.length) return k;
  }
  return 'attack01';
}

function getCharPackClips(charId: string): EntityClips | null {
  const monsterPack = CHAR_MONSTER_PACK[charId];
  if (monsterPack) return getMonsterClips(monsterPack);
  const packId = CHAR_TINY_MAP[charId];
  return packId ? getCharClips(packId) : null;
}

/** 스킬 등급 → 팩별 공격 모션 키 */
export function getSkillAttackAnimKey(charId: string, animTier: number, motionKey?: string | null): string | null {
  const clips = getCharPackClips(charId);
  if (!clips || !manifest) return null;
  if (motionKey && clips[motionKey]?.files?.length) return motionKey;
  const tier = Math.max(1, Math.min(3, animTier));
  const candidates = SKILL_ANIM_TIERS[tier] ?? SKILL_ANIM_TIERS[1]!;
  for (const k of candidates) {
    if (clips[k]?.files?.length) return k;
  }
  return pickAttackKey(clips);
}

export function getSkillMotionKey(charId: string, animTier: number, motionKey?: string | null): string | null {
  return getSkillAttackAnimKey(charId, animTier, motionKey);
}

function pickWalkKey(clips: EntityClips): string {
  for (const k of WALK_KEYS) {
    if (clips[k]?.files?.length) return k;
  }
  return 'walk';
}

function clipFiles(clips: EntityClips, folder: string): string[] {
  const clip = clips[folder];
  if (!clip?.files?.length) return [];
  return clip.files.map(tinyAssetPath);
}

function pickFromFiles(files: string[], animTime: number, fps: number): string {
  if (!files.length) return '';
  const idx = Math.floor(animTime * fps) % files.length;
  return files[idx]!;
}

function pickFromProgress(files: string[], t: number): string {
  if (!files.length) return '';
  const idx = Math.min(files.length - 1, Math.floor(t * files.length));
  return files[idx]!;
}

function getCharClips(packId: string): EntityClips | null {
  return manifest?.assets.characters[packId] ?? null;
}

function getMonsterClips(packId: string): EntityClips | null {
  return manifest?.assets.monsters[packId] ?? null;
}

export function hasCharAnim(charId: string): boolean {
  return charId in CHAR_TINY_MAP || charId in CHAR_MONSTER_PACK;
}

export function hasMonsterAnim(monsterId: string): boolean {
  return monsterId in MONSTER_TINY_MAP;
}

export function buildCharMeleeMotionPool(charId: string, unlockedSkillCount: number): string[] {
  const clips = getCharPackClips(charId);
  if (!clips) return ['attack01'];
  const ordered = ['attack01', 'attack02', 'attack03', 'attack', 'shadow_attack2', 'block'];
  const available = ordered.filter(k => clips[k]?.files?.length);
  if (!available.length) return ['attack01'];
  const tier = Math.min(
    available.length,
    1 + Math.floor(unlockedSkillCount / 2) + (unlockedSkillCount >= 8 ? 1 : 0),
  );
  return available.slice(0, Math.max(1, tier));
}

export function pickCharFramePath(charId: string, opts: CharAnimPickOpts): string | null {
  if (!manifest) return null;
  const clips = getCharPackClips(charId);
  if (!clips) return null;

  const idle = clipFiles(clips, 'idle');
  const walk = clipFiles(clips, pickWalkKey(clips));
  const hit = clipFiles(clips, 'hit');
  const die = clipFiles(clips, 'die');
  if (opts.hp !== undefined && opts.hp <= 0 && die.length) {
    const prog = opts.dieAnimProgress ?? 1;
    return pickFromProgress(die, prog);
  }
  if (opts.flash > 0.15 && hit.length) {
    return pickFromProgress(hit, 1 - opts.flash);
  }
  if (opts.inCombat && opts.dashSlot === opts.slot && opts.dashProg > 0) {
    const attackKey = pickAttackKey(clips, opts.strikeAnimKey);
    const attack = clipFiles(clips, attackKey);
    if (attack.length) {
      return pickFromProgress(attack, Math.min(1, opts.dashProg * 1.12));
    }
  }
  if (opts.inCombat && opts.meleeEngaged && opts.dashSlot === opts.slot) {
    const readyKey = pickAttackKey(clips, opts.strikeAnimKey);
    const attack = clipFiles(clips, readyKey);
    if (attack.length) {
      return pickFromProgress(attack, Math.min(1, (opts.dashProg ?? 0.5) * 1.08));
    }
  }
  if (!opts.inCombat && walk.length) {
    return pickFromFiles(walk, opts.animTime, 14);
  }
  if (idle.length) {
    return pickFromFiles(idle, opts.animTime, 6);
  }
  return null;
}

export function pickMonsterFramePath(monsterId: string, opts: MonsterAnimPickOpts): string | null {
  const packId = MONSTER_TINY_MAP[monsterId];
  if (!packId || !manifest) return null;
  const clips = getMonsterClips(packId);
  if (!clips) return null;

  const idle = clipFiles(clips, 'idle');
  const walk = clipFiles(clips, pickWalkKey(clips));
  const hit = clipFiles(clips, 'hit');
  const die = clipFiles(clips, 'die');
  const attack = clipFiles(clips, pickAttackKey(clips));

  if (opts.hp <= 0 && die.length) {
    const prog = opts.dieAnimProgress ?? 1;
    return pickFromProgress(die, prog);
  }
  if (opts.flash > 0.15 && hit.length) {
    return pickFromProgress(hit, 1 - opts.flash);
  }
  if (opts.inCombat && (opts.strikeProg ?? 0) > 0 && attack.length) {
    return pickFromProgress(attack, Math.min(1, opts.strikeProg! * 1.05));
  }
  if (!opts.inCombat && walk.length) {
    return pickFromFiles(walk, opts.animTime, 12);
  }
  if (idle.length) {
    return pickFromFiles(idle, opts.animTime, 5);
  }
  return null;
}

export function getCharAnimFramePath(charId: string, opts: CharAnimPickOpts): string | null {
  return pickCharFramePath(charId, opts);
}

/** UI 초상화 — idle 첫 프레임 */
export function getCharPortraitPath(charId: string): string | null {
  if (!manifest) return null;
  const clips = getCharPackClips(charId);
  if (!clips) return null;
  const idle = clipFiles(clips, 'idle');
  if (idle.length) return idle[0]!;
  const walk = clipFiles(clips, pickWalkKey(clips));
  if (walk.length) return walk[0]!;
  return null;
}

/** 400px 소스 기준 — 0.25 step 스케일로 nearest-neighbor 깨짐 완화 */
function snapBattleSpriteScale(scale: number): number {
  const step = 0.25;
  return Math.max(step, Math.round(scale / step) * step);
}

/** 화면·HUD·지면을 고려한 전투 스프라이트 표시 크기 (nearest-neighbor) */
export function getBattleSpriteSize(
  canvasW: number,
  canvasH: number,
  hudH: number,
  groundY: number,
  role: SpriteBattleRole,
): { w: number; h: number } {
  const { w: fw, h: fh } = getTinyFrameSize();
  const isPlayer = role === 'player';
  const displayMult = isPlayer ? PARTY_SPRITE_DISPLAY_MULT : 1;
  const viewportRatio = SPRITE_VIEWPORT_HEIGHT[role] * displayMult;
  const canvasRatio = viewportRatio / ADVENTURE_VIEWPORT_SHARE;
  let targetH = canvasH * canvasRatio;
  const maxW = isPlayer
    ? canvasW * Math.min(0.58, 0.30 * displayMult)
    : canvasW * 0.36;
  const maxAvailH = Math.max(48, (groundY - hudH - 8) * (isPlayer ? 0.98 : 0.92));
  targetH = Math.min(targetH, maxAvailH);
  const rawScale = Math.min(targetH / fh, maxW / fw);
  const scale = snapBattleSpriteScale(rawScale);
  return { w: Math.round(fw * scale), h: Math.round(fh * scale) };
}

export interface BattleLayout {
  enemyX: number;
  partyBaseX: number;
  partyGap: number;
  dashMaxDist: number;
}

/** 다중 몬스터 X 좌표 (오른쪽부터 펼침) */
export function getEnemySlotXs(baseX: number, spriteW: number, count: number): number[] {
  if (count <= 1) return [baseX];
  const gap = Math.round(spriteW * 0.48);
  return Array.from({ length: count }, (_, i) => baseX - i * gap);
}

export function getBattleLayout(
  canvasW: number,
  canvasH: number,
  hudH: number,
  groundY: number,
  partyCount: number,
  inCombat: boolean,
): BattleLayout {
  const playerSize = getBattleSpriteSize(canvasW, canvasH, hudH, groundY, 'player');
  const monsterSize = getMonsterBattleSpriteSize(canvasW, canvasH, hudH, false);
  const enemyMargin = Math.round(monsterSize.w * 0.40 + canvasW * 0.012);
  const enemyX = canvasW - enemyMargin - 30;
  const gapRatio = partyCount >= 4 ? 0.28 : 0.36;
  const partyGap = Math.round(playerSize.w * gapRatio);
  const partyBaseX = Math.max(
    Math.round(playerSize.w * 0.52),
    Math.round(canvasW * 0.1),
  );
  const dashMaxDist = Math.max(
    playerSize.w * 0.5,
    enemyX - partyBaseX - Math.round(playerSize.w * 0.22),
  );
  return { enemyX, partyBaseX, partyGap, dashMaxDist };
}

/** 근접 교전 — 캐릭터 발밑 중앙이 적 스프라이트에 닿을 만큼 전진할 거리 */
export function calcMeleeDashDistance(
  partySlotX: number,
  enemyCenterX: number,
  allyW: number,
  enemyW: number,
): number {
  const stickOverlap = Math.round(allyW * 0.22);
  const targetX = enemyCenterX - enemyW * 0.34 - allyW * 0.46 + stickOverlap;
  return Math.max(0, Math.round(targetX - partySlotX));
}

/** 동일 스프라이트 팩 중복 시 겹침 방지 X 오프셋 */
function charPackKey(charId: string): string {
  return CHAR_MONSTER_PACK[charId] ?? CHAR_TINY_MAP[charId] ?? '';
}

export function getPartySlotStagger(partyIds: string[], slot: number, gap: number): number {
  const pack = charPackKey(partyIds[slot] ?? '');
  if (!pack) return 0;
  let dup = 0;
  for (let i = 0; i < slot; i++) {
    if (charPackKey(partyIds[i] ?? '') === pack) dup++;
  }
  return dup * Math.round(gap * 0.62);
}

/** @deprecated getBattleSpriteSize 사용 */
export function getTinyDrawSize(maxH: number, maxW?: number): { w: number; h: number } {
  const groundY = maxH / GROUND_Y_RATIO;
  return getBattleSpriteSize(maxW ?? maxH * 2, maxH / GROUND_Y_RATIO, 32, groundY, 'player');
}

export function collectTinyPreloadPaths(): string[] {
  if (!manifest) return [];
  const paths = new Set<string>();
  const addClips = (clips: EntityClips) => {
    for (const clip of Object.values(clips)) {
      for (const f of clip.files) paths.add(tinyAssetPath(f));
    }
  };
  for (const packId of new Set(Object.values(CHAR_TINY_MAP))) {
    const c = manifest.assets.characters[packId];
    if (c) addClips(c);
  }
  for (const packId of new Set(Object.values(CHAR_MONSTER_PACK))) {
    const c = manifest.assets.monsters[packId];
    if (c) addClips(c);
  }
  for (const packId of new Set(Object.values(MONSTER_TINY_MAP))) {
    const c = manifest.assets.monsters[packId];
    if (c) addClips(c);
  }
  const proj = manifest.assets.projectiles;
  if (proj) {
    for (const pack of Object.values(proj)) {
      for (const clip of Object.values(pack)) {
        for (const f of clip.files) paths.add(tinyAssetPath(f));
      }
    }
  }
  return [...paths];
}

/** @deprecated collectTinyPreloadPaths 사용 */
export function mujangFramePaths(): string[] {
  return collectTinyPreloadPaths();
}
