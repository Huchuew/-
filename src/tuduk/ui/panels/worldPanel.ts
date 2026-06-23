import type { GameSave } from '../../types';
import type { AdventureSystem } from '../../systems/AdventureSystem';
import { REGIONS } from '../../data/regions';
import { formatAffixTip, getRegionAffix, getWeeklyAffixLabel } from '../../data/regionAffixes';
import { formatElementWheelHtml, getRegionElementTip } from '../../data/elemental';
import { formatFloorLevelWallHint } from '../../data/floorProgression';
import { getBossCodexThreshold } from '../../systems/EncounterSystem';
import { formatFloorBossWaitHint, isBossGateReady } from '../../systems/floorPacing';
import { getBossGateFaq } from '../../utils/lockHints';
import { hasAnyDungeonCampBonus, formatDungeonBonusSummary } from '../../systems/dungeonCampBonuses';

export interface DungeonTipsInput {
  save: GameSave;
  adv: AdventureSystem;
  inRun: boolean;
  returning: boolean;
  runRegion: number;
  codexPct: number;
  curCodex: number;
  bossReady: boolean;
  regionCleared: boolean;
  nextFloor: number;
}

export function buildDungeonTips(input: DungeonTipsInput): string {
  const {
    save, inRun, returning, runRegion, codexPct, curCodex, bossReady, regionCleared, nextFloor,
  } = input;
  const bossThresholdPct = Math.floor(getBossCodexThreshold(runRegion) * 100);
  const floorWallHint = !inRun && nextFloor <= (save.maxRegion ?? 1) + 1
    ? formatFloorLevelWallHint(save, nextFloor)
    : null;
  const bossWaitHint = inRun && !returning ? formatFloorBossWaitHint(save, runRegion, codexPct) : null;
  const bossFaq = inRun && !returning && !bossReady
    ? getBossGateFaq(save, runRegion, codexPct)
    : '';
  return [
    inRun && !returning && !bossReady && !regionCleared
      ? `<p class="hint">보스까지 도감 ${curCodex}%/${bossThresholdPct}%</p>` : '',
    bossFaq ? `<p class="hint warn">${bossFaq}</p>` : '',
    floorWallHint ? `<p class="hint">${floorWallHint}</p>` : '',
    bossWaitHint ? `<p class="hint warn">${bossWaitHint}</p>` : '',
    inRun ? `<p class="hint element-tip">${getRegionElementTip(runRegion)}</p>` : '',
    inRun ? `<p class="element-wheel-tip">${formatElementWheelHtml()}</p>` : '',
    inRun ? `<p class="hint">${formatAffixTip(getRegionAffix(runRegion))}</p>` : '',
    inRun ? `<p class="hint">${getWeeklyAffixLabel()}</p>` : '',
    `<p class="hint">보스 클리어 시 다음 층 자동 이동 · 골드는 숙소·캠프에서 회수</p>`,
  ].filter(Boolean).join('');
}

export function buildDungeonFloorStrip(
  save: GameSave,
  adv: AdventureSystem,
  maxRegion: number,
  inRun: boolean,
  runRegion: number,
  codexPct: number,
): string {
  const curCodex = inRun ? Math.floor(codexPct * 100) : 0;
  const nextFloor = Math.min(maxRegion + 1, REGIONS.length);
  const bossReady = inRun && isBossGateReady(save, runRegion, codexPct);
  return REGIONS.filter(r => r.id <= maxRegion).map(r => {
    const hasBadge = save.badges.includes(r.id);
    const codex = Math.floor(adv.getCodexPercent(r.id) * 100);
    const isHere = inRun && runRegion === r.id;
    const isNext = !inRun && r.id === nextFloor && !hasBadge;
    const cleared = hasBadge;
    const bossTag = r.bossId ? '<span class="floor-boss">👑</span>' : '';
    let meta = cleared ? '🏅 클리어' : `📖 ${codex}%`;
    if (isHere && !cleared) meta = bossReady ? '⚔️ 보스' : `📖 ${curCodex}%`;
    if (isNext) meta = '▶ 다음';
    return `<div class="dungeon-floor unlocked ${isHere ? 'current' : ''} ${cleared ? 'cleared' : ''} ${isNext ? 'next' : ''} ${r.bossId ? 'has-boss' : ''}" title="${r.badgeName}">
      ${bossTag}
      <span class="floor-num">${r.id}층</span>
      <span class="floor-name">${r.name}</span>
      <span class="floor-meta">${meta}</span>
    </div>`;
  }).join('');
}

export function buildLodgingDungeonBonusHint(save: GameSave, atLodging: boolean): string {
  return atLodging && hasAnyDungeonCampBonus(save)
    ? `<p class="hint">${formatDungeonBonusSummary(save)}</p>`
    : '';
}
