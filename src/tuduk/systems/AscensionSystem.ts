import type { GameSave } from '../types';
import { CHAR_MAP } from '../data/characters';
import { GROWTH_NODES } from '../data/growthTrees';
import { ensureEndgame, isEndgameUnlocked } from './EndgameSystem';
import { saveGame } from '../core/SaveManager';

const ASCEND_MIN_LEVEL = 80;
const ASCEND_MIN_RIFT = 8;
const ASCEND_GOLD = 250_000;
const ASCEND_VOID = 25;
const ASCEND_CRYSTAL = 3;

export function hasPrestigeComplete(st: { unlockedNodes: string[] }, charId: string): boolean {
  const prNodes = GROWTH_NODES.filter(n => n.charId === charId && n.id.includes('_pr_'));
  if (!prNodes.length) return true;
  const final = prNodes[prNodes.length - 1]!;
  return st.unlockedNodes.includes(final.id);
}

export function canAscend(save: GameSave, charId: string): { ok: boolean; reason?: string } {
  if (!isEndgameUnlocked(save)) return { ok: false, reason: '엔드 콘텐츠 해금 필요' };
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
    return { ok: false, reason: '전직 트리 최종 노드 습득 필요' };
  }
  if (save.endgame!.riftCleared < ASCEND_MIN_RIFT) {
    return { ok: false, reason: `차원 균열 ${ASCEND_MIN_RIFT}층 이상 필요` };
  }
  if (save.gold < ASCEND_GOLD) return { ok: false, reason: `골드 ${ASCEND_GOLD.toLocaleString()} 필요` };
  if ((save.materials.void_shard ?? 0) < ASCEND_VOID) {
    return { ok: false, reason: `공허 파편 ×${ASCEND_VOID} 필요` };
  }
  if ((save.materials.rift_crystal ?? 0) < ASCEND_CRYSTAL) {
    return { ok: false, reason: `균열 결정 ×${ASCEND_CRYSTAL} 필요` };
  }
  return { ok: true };
}

export function attemptAscension(save: GameSave, charId: string): { ok: boolean; message: string } {
  const check = canAscend(save, charId);
  if (!check.ok) return { ok: false, message: check.reason! };

  ensureEndgame(save);
  save.gold -= ASCEND_GOLD;
  save.materials.void_shard = (save.materials.void_shard ?? 0) - ASCEND_VOID;
  save.materials.rift_crystal = (save.materials.rift_crystal ?? 0) - ASCEND_CRYSTAL;
  save.endgame!.ascended.push(charId);

  const st = save.chars[charId]!;
  st.prestige = Math.max(st.prestige, 4);

  saveGame(save);
  const name = CHAR_MAP[charId]?.name ?? charId;
  return { ok: true, message: `✨ ${name} 전설 각성! 전 스탯 +28%` };
}

export function getAscensionCostText(): string {
  return `🪙${ASCEND_GOLD.toLocaleString()} · 공허×${ASCEND_VOID} · 결정×${ASCEND_CRYSTAL} · Lv.${ASCEND_MIN_LEVEL}+ · 균열 ${ASCEND_MIN_RIFT}층+`;
}
