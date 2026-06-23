import { loadImage, preloadKeyedFrames } from './AssetLoader';
import { backgroundIndexForRegion, STAGE_BACKGROUNDS, stageBackgroundPaths } from '../data/stageBackgrounds';
import { PIPOYA_MONSTER_BINDINGS } from '../data/pipoyaMonsters';
import { monsterAssetPath } from '../data/pipoyaMap';
import {
  CHAR_MONSTER_PACK,
  CHAR_TINY_MAP,
  collectTinyPreloadPaths,
  loadTinyRpgManifest,
  tinyAssetPath,
} from '../data/tinyRpgAnim';
import { LODGING_BG_PATH } from '../systems/LodgingSystem';
import type { GameSave } from '../types';

const BATCH = 10;

async function loadImagesBatched(paths: Iterable<string>, concurrency = BATCH): Promise<void> {
  const queue = [...new Set(paths)];
  if (!queue.length) return;
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (idx < queue.length) {
      const path = queue[idx++]!;
      await loadImage(path);
    }
  });
  await Promise.all(workers);
}

function addPackPaths(paths: Set<string>, packId: string, manifest: Awaited<ReturnType<typeof loadTinyRpgManifest>>) {
  const clips = manifest.assets.characters[packId] ?? manifest.assets.monsters[packId];
  if (!clips) return;
  for (const clip of Object.values(clips)) {
    for (const f of clip.files) paths.add(tinyAssetPath(f));
  }
}

/** 파티·숙소·현재 층 배경 — 게임 시작 전 우선 로드 */
function collectPriorityPaths(save: GameSave | undefined, manifest: Awaited<ReturnType<typeof loadTinyRpgManifest>>): string[] {
  const paths = new Set<string>();
  paths.add(LODGING_BG_PATH);
  if (save) {
    for (const id of new Set([...save.party, ...save.owned])) {
      const pack = CHAR_TINY_MAP[id] ?? CHAR_MONSTER_PACK[id];
      if (pack) addPackPaths(paths, pack, manifest);
    }
    const bg = STAGE_BACKGROUNDS[backgroundIndexForRegion(save.currentRegion)];
    if (bg) paths.add(bg.file);
    const next = STAGE_BACKGROUNDS[backgroundIndexForRegion(save.currentRegion + 1)];
    if (next) paths.add(next.file);
  }
  return [...paths];
}

export async function preloadGameAssets(save?: GameSave): Promise<void> {
  const manifest = await loadTinyRpgManifest();

  const all = new Set<string>();
  for (const p of collectTinyPreloadPaths()) all.add(p);
  for (const p of stageBackgroundPaths()) all.add(p);
  for (const id of Object.keys(PIPOYA_MONSTER_BINDINGS)) all.add(monsterAssetPath(id));
  all.add(LODGING_BG_PATH);

  const priority = new Set(collectPriorityPaths(save, manifest));
  const rest = [...all].filter(p => !priority.has(p));

  await loadImagesBatched(priority, 12);
  await loadImagesBatched(rest, BATCH);
  preloadKeyedFrames([...all].filter(p => p.startsWith('assets/monsters/')));
}
