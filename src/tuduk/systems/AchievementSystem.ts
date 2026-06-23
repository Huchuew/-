import type { GameSave } from '../types';
import { ACHIEVEMENTS } from '../data/achievements';
import { saveGame } from '../core/SaveManager';

export function isAchievementMet(save: GameSave, id: string): boolean {
  const def = ACHIEVEMENTS.find(a => a.id === id);
  return def ? def.check(save) : false;
}

export function isAchievementClaimed(save: GameSave, id: string): boolean {
  return save.achievements.includes(id);
}

export function canClaimAchievement(save: GameSave, id: string): boolean {
  return isAchievementMet(save, id) && !isAchievementClaimed(save, id);
}

export function claimAchievement(save: GameSave, id: string): { ok: boolean; message: string } {
  const def = ACHIEVEMENTS.find(a => a.id === id);
  if (!def) return { ok: false, message: '알 수 없는 업적' };
  if (isAchievementClaimed(save, id)) return { ok: false, message: '이미 수령함' };
  if (!isAchievementMet(save, id)) return { ok: false, message: '조건 미달성' };

  save.achievements.push(id);
  save.gold += def.reward;
  if (def.gemReward) save.gems += def.gemReward;
  saveGame(save);

  const gems = def.gemReward ? ` 💎${def.gemReward}` : '';
  return { ok: true, message: `🏆 ${def.name} — 🪙${def.reward.toLocaleString()}${gems}` };
}

export function countClaimableAchievements(save: GameSave): number {
  return ACHIEVEMENTS.filter(a => canClaimAchievement(save, a.id)).length;
}

/** 비마일스톤 업적 자동 수령 — 토스트는 첫 3건만 */
export function autoClaimAchievements(save: GameSave): string[] {
  const messages: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!canClaimAchievement(save, a.id)) continue;
    const res = claimAchievement(save, a.id);
    if (res.ok) messages.push(res.message);
  }
  return messages;
}
