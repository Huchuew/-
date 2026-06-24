import type { GameSave, CharState } from '../types';
import { CHAR_MAP } from '../data/characters';
import { ensureEndgame, isEndgameUnlocked } from './EndgameSystem';
import { getPrestigeMilestoneInfo } from './GrowthSystem';
import { saveGame } from '../core/SaveManager';

const ASCEND_MIN_LEVEL = 80;
const ASCEND_MIN_SPIRE_BEST = 30;
const ASCEND_GOLD = 480_000;
const ASCEND_LEGEND_SCALE = 10;
const ASCEND_VOID = 20;
const ASCEND_SPIRE_ESSENCE = 4;

export function hasPrestigeComplete(st: CharState, charId: string): boolean {
  return getPrestigeMilestoneInfo(st, charId)?.allDone ?? false;
}

export function canAscend(save: GameSave, charId: string): { ok: boolean; reason?: string } {
  if (!isEndgameUnlocked(save)) return { ok: false, reason: '야탑 해금 조건 미달 (18층 정복)' };
  if (!save.owned.includes(charId)) return { ok: false, reason: '미보유 캐릭터' };
  ensureEndgame(save);
  if (save.endgame!.ascended.includes(charId)) return { ok: false, reason: '이미 각성 완료' };

  const st = save.chars[charId];
  const def = CHAR_MAP[charId];
  if (!st || !def) return { ok: false, reason: '캐릭터 없음' };
  if (st.level < ASCEND_MIN_LEVEL) {
    return { ok: false, reason: `레벨 ${ASCEND_MIN_LEVEL} 이상 필요 (현재 ${st.level})` };
  }
  if (!hasPrestigeComplete(st, charId)) {
    return { ok: false, reason: '4차 전직 완료 필요' };
  }
  if (save.endgame!.spireBest < ASCEND_MIN_SPIRE_BEST) {
    return { ok: false, reason: `야탑 ${ASCEND_MIN_SPIRE_BEST}층 기록 필요 (현재 ${save.endgame!.spireBest}층)` };
  }
  if (save.gold < ASCEND_GOLD) return { ok: false, reason: `골드 ${ASCEND_GOLD.toLocaleString()} 필요` };
  if ((save.materials.legend_scale ?? 0) < ASCEND_LEGEND_SCALE) {
    return { ok: false, reason: `전설 비늘 ×${ASCEND_LEGEND_SCALE} 필요` };
  }
  if ((save.materials.void_shard ?? 0) < ASCEND_VOID) {
    return { ok: false, reason: `공허 파편 ×${ASCEND_VOID} 필요` };
  }
  if ((save.materials.spire_essence ?? 0) < ASCEND_SPIRE_ESSENCE) {
    return { ok: false, reason: `탑의 심핵 ×${ASCEND_SPIRE_ESSENCE} 필요 (야탑 30층+ 클리어)` };
  }
  return { ok: true };
}

export function attemptAscension(save: GameSave, charId: string): { ok: boolean; message: string } {
  const check = canAscend(save, charId);
  if (!check.ok) return { ok: false, message: check.reason! };

  ensureEndgame(save);
  save.gold -= ASCEND_GOLD;
  save.materials.legend_scale = (save.materials.legend_scale ?? 0) - ASCEND_LEGEND_SCALE;
  save.materials.void_shard = (save.materials.void_shard ?? 0) - ASCEND_VOID;
  save.materials.spire_essence = (save.materials.spire_essence ?? 0) - ASCEND_SPIRE_ESSENCE;
  save.endgame!.ascended.push(charId);

  const st = save.chars[charId]!;
  st.prestige = Math.max(st.prestige, 4);

  saveGame(save);
  const name = CHAR_MAP[charId]?.name ?? charId;
  return { ok: true, message: `✨ ${name} 전설 각성! 전 스탯 +28%` };
}

export function getAscensionCostText(): string {
  return `🪙${ASCEND_GOLD.toLocaleString()} · 비늘×${ASCEND_LEGEND_SCALE} · 공허×${ASCEND_VOID} · 심핵×${ASCEND_SPIRE_ESSENCE} · Lv.${ASCEND_MIN_LEVEL}+ · 야탑 ${ASCEND_MIN_SPIRE_BEST}층+ · 25/30/35/40층·주간미션`;
}
