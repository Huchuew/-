import type { GameSave } from '../types';
import { AUGMENT_MAP } from '../data/augments';
import {
  LEADERBOARD_LEVEL_SOFT_CAP,
  LEADERBOARD_RANK_CAP_FLOOR,
} from '../data/leaderboardNormalization';

/** 17층 보스 클리어 이후 증강·진행 롤백 기준층 */
export const SEASON_AUGMENT_ROLLBACK_FROM = 17;

function clampCharLevel(level: number): number {
  if (level <= LEADERBOARD_LEVEL_SOFT_CAP) return level;
  return 270 + (level % 10);
}

function rollbackAugmentsFromFloor(save: GameSave, fromFloor: number): void {
  const aug = save.augments;
  if (!aug) return;

  const keepFloors = new Set(
    (aug.claimedFloors ?? []).filter(f => f < fromFloor),
  );
  const pickedAt = aug.pickedAtFloor ?? {};
  const keepPicked = (aug.picked ?? []).filter((id) => {
    const floor = pickedAt[id];
    return floor == null || floor < fromFloor;
  });

  const nextPickedAt: Record<string, number> = {};
  for (const id of keepPicked) {
    const floor = pickedAt[id];
    if (floor != null) nextPickedAt[id] = floor;
  }

  save.augments = {
    picked: keepPicked,
    claimedFloors: [...keepFloors],
    pickedAtFloor: nextPickedAt,
  };

  const dropLegacy = keepPicked.filter((id) => {
    if (nextPickedAt[id] != null) return false;
    const def = AUGMENT_MAP[id];
    return !!def && def.minFloor >= fromFloor;
  });
  if (dropLegacy.length) {
    save.augments.picked = save.augments.picked.filter(id => !dropLegacy.includes(id));
  }
}

function resetSpireProgress(save: GameSave): void {
  if (save.spireRun?.active) {
    save.spireRun = { ...save.spireRun, active: false };
  }
  if (save.endgame) {
    save.endgame.spireBest = 0;
    save.endgame.spireWeekBest = 0;
    save.endgame.relics = (save.endgame.relics ?? []).filter(id => !id.startsWith('relic_spire_'));
  }
}

/** 과성장·비정상 진행만 롤백 — 정상 야탑 유저(18층+·야탑 기록)는 유지 */
function needsSeasonClamp(save: GameSave): boolean {
  const maxR = save.maxRegion ?? 1;
  const hasOverLevel = Object.values(save.chars).some(c => (c?.level ?? 0) > LEADERBOARD_LEVEL_SOFT_CAP);
  if (hasOverLevel) return true;
  if (maxR > 18) return true;
  if (save.spireRun?.active && hasOverLevel) return true;
  return false;
}

/** 시즌 랭킹 규칙 — 과성장 계정만 롤백 (정상 야탑 플레이는 유지) */
export function applySeasonLeaderboardClamp(save: GameSave): boolean {
  if (!needsSeasonClamp(save)) return false;

  save.badges = (save.badges ?? []).filter(b => b < SEASON_AUGMENT_ROLLBACK_FROM);

  const counts = save.dungeonShortcuts?.clearCounts;
  if (counts) {
    for (const key of Object.keys(counts)) {
      if (Number(key) >= SEASON_AUGMENT_ROLLBACK_FROM) delete counts[key];
    }
  }

  rollbackAugmentsFromFloor(save, SEASON_AUGMENT_ROLLBACK_FROM);
  resetSpireProgress(save);
  save.floor18ClearCelebrated = false;

  for (const st of Object.values(save.chars)) {
    if (!st) continue;
    st.level = clampCharLevel(st.level ?? 1);
  }

  save.maxRegion = Math.min(save.maxRegion ?? 1, LEADERBOARD_RANK_CAP_FLOOR);
  save.currentRegion = Math.min(save.currentRegion ?? 1, save.maxRegion);
  if (save.inExpedition && save.currentRegion > save.maxRegion) {
    save.currentRegion = save.maxRegion;
  }

  return true;
}
