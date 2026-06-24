import type { GameSave } from '../../types';
import type { GrowthNode } from '../../types';
import { CHAR_MAP } from '../../data/characters';
import { formatElementBadge } from '../../data/elemental';
import { getCharElement } from '../../data/equipmentCatalog';
import { PRESTIGE_BRANCH_DEFS } from '../../data/prestigeBranchData';
import { PRESTIGE_FORK_META } from '../../data/prestigeBranchForks';
import { PRESTIGE_TIER_LEVELS } from '../../data/prestigeJobBalance';
import { getCharGrowth, getNodeBonusWithSkill } from '../../data/growthTrees';
import {
  canAttemptLearn, formatPityBonus, getPityHint, getActivePrestigePath, getCharGrowthTrees, getGrowthFails,
  getGrowthLineProgress, getLearnRate, isNodeLocked, isNodeOwned, nodeMatchesActivePath,
} from '../../systems/GrowthSystem';
import { isCharGrowthBlocked } from '../../systems/PrestigeGateSystem';

import { isCharPrestigeGated } from '../../systems/PrestigeGateSystem';

export function renderGrowthCharPicker(
  save: GameSave,
  activeCharId: string,
): string {
  const activeDef = CHAR_MAP[activeCharId];
  const activeSt = save.chars[activeCharId];

  const renderPick = (id: string) => {
    const def = CHAR_MAP[id];
    const tabGate = isCharPrestigeGated(save.chars[id], id);
    return `<button type="button" class="growth-char-pick ${tabGate ? 'gate' : ''}"
      data-char="${id}" role="tab" aria-selected="false"
      style="--pick-color:${def?.color ?? '#556'};--pick-accent:${def?.accent ?? '#88a'}"
      title="${def?.name ?? id}">
      <span class="growth-char-pick-frame">
        <span class="growth-char-pick-clip">
          <canvas class="growth-char-pick-portrait" data-char-id="${id}" aria-hidden="true"></canvas>
        </span>
        ${tabGate ? '<span class="growth-char-pick-gate">⚔️</span>' : ''}
      </span>
      <span class="growth-char-pick-name">${def?.name ?? id}</span>
    </button>`;
  };

  const others = save.owned.filter(id => id !== activeCharId);
  const rosterHtml = others.length
    ? `<div class="growth-char-roster-grid" role="tablist" aria-label="다른 캐릭터">${others.map(renderPick).join('')}</div>`
    : '';

  return `<div class="growth-char-spotlight">
    <div class="growth-char-spotlight-row">
      <div class="growth-char-hero" style="--pick-color:${activeDef?.color ?? '#556'};--pick-accent:${activeDef?.accent ?? '#88a'}">
        <div class="growth-char-hero-frame">
          <span class="growth-char-hero-clip">
            <canvas class="growth-char-hero-portrait" data-char-id="${activeCharId}" aria-hidden="true"></canvas>
          </span>
        </div>
      </div>
      ${rosterHtml}
    </div>
    <div class="growth-char-spotlight-meta">
      <strong class="growth-char-spotlight-name">${activeDef?.name ?? activeCharId}</strong>
      <span class="job-tag">${getCharDisplayJobLabel(save, activeCharId)}</span>
      <span class="growth-char-spotlight-lv">Lv.${activeSt?.level ?? 1}</span>
      <span class="char-element-badge">${formatElementBadge(getCharElement(activeCharId))}</span>
    </div>
  </div>`;
}

export function getOwnedPrestigePathNames(save: GameSave, charId: string): string[] {
  const st = save.chars[charId];
  if (!st) return [];
  return getCharGrowth(charId)
    .filter(n => n.branchGroup && isNodeOwned(st, n.id))
    .sort((a, b) => (a.branchTier ?? 0) - (b.branchTier ?? 0))
    .map(n => n.name);
}

/** 전직 진행에 따른 표시 직업명 — 미전직 시 기본 jobLabel */
export function getCharDisplayJobLabel(save: GameSave, charId: string): string {
  const owned = getOwnedPrestigePathNames(save, charId);
  if (owned.length) return owned[owned.length - 1]!;
  return CHAR_MAP[charId]?.jobLabel ?? '';
}

export function findSpotlightSkill(save: GameSave, charId: string): GrowthNode | null {
  if (isCharGrowthBlocked(save, charId)) return null;
  const st = save.chars[charId];
  if (!st) return null;
  const nodes = getCharGrowth(charId);
  for (const tree of getCharGrowthTrees(charId)) {
    const lp = getGrowthLineProgress(st, tree, nodes);
    if (lp.branchChoices?.length || lp.allDone || !lp.next) continue;
    const n = lp.next;
    if (n.branchGroup || isNodeLocked(st, n)) continue;
    if (!canAttemptLearn(save, charId, n)) continue;
    return n;
  }
  return null;
}

export function renderGrowthSubTabs(
  active: 'upgrade' | 'equipment' | 'augments',
  equipLocked: boolean,
): string {
  return `<div class="sub-tabs growth-main-tabs">
    <button type="button" class="sub-tab ${active === 'upgrade' ? 'active' : ''}" data-sub="upgrade">⚡ 스킬 · 전직</button>
    <button type="button" class="sub-tab ${active === 'equipment' ? 'active' : ''} ${equipLocked ? 'locked' : ''}" data-sub="equipment">${equipLocked ? '🔒 ' : '⚔️ '}장비</button>
    <button type="button" class="sub-tab ${active === 'augments' ? 'active' : ''}" data-sub="augments">✨ 증강</button>
  </div>`;
}

export function renderSkillSpotlight(
  save: GameSave,
  charId: string,
  node: GrowthNode,
  formatMats: (m: Record<string, number>) => string,
  formatShortage: (gold?: number, mats?: Record<string, number>) => string,
): string {
  const st = save.chars[charId]!;
  const locked = isNodeLocked(st, node);
  const canTry = canAttemptLearn(save, charId, node);
  const fails = getGrowthFails(st, node.id);
  const rate = getLearnRate(node, fails);
  const matLine = node.materials ? formatMats(node.materials) : '';
  const shortage = !locked && !canTry ? formatShortage(node.cost, node.materials) : '';
  return `<section class="skill-spotlight ${canTry ? 'ready' : locked ? 'locked' : 'waiting'}">
    <div class="skill-spotlight-kicker">다음 스킬</div>
    <div class="skill-spotlight-main">
      <span class="skill-spotlight-icon">${locked ? '🔒' : '✨'}</span>
      <div class="skill-spotlight-body">
        <strong>${node.name}</strong>
        <p>${node.desc}</p>
        <p class="skill-spotlight-bonus">${getNodeBonusWithSkill(node)}</p>
        <p class="hint">필요 Lv.${node.reqLevel}${matLine ? ` · ${matLine}` : ''}</p>
        <p class="hint">성공률 ${Math.round(rate * 100)}%${fails > 0 ? ` · 실패 ${fails}회 ${formatPityBonus(fails)}` : ''}</p>
        <p class="hint pity-hint">🎯 ${getPityHint(st, node)}</p>
      </div>
    </div>
    <div class="skill-spotlight-action">
      ${locked
        ? `<span class="locked-tag">Lv.${node.reqLevel} 필요</span>`
        : `<button type="button" class="btn-primary skill-spotlight-btn" data-node="${node.id}" ${canTry ? '' : 'disabled'}>
            습득 · 🪙${node.cost.toLocaleString()}${matLine ? ' +재료' : ''}
          </button>`}
      ${shortage ? `<p class="hint warn node-shortage">${shortage}</p>` : ''}
    </div>
  </section>`;
}

export function renderPrestigeShowcase(
  charId: string,
  save: GameSave,
  pathLabels: string[],
  branchKey: string | null,
  milestoneReady: boolean,
  _treeOpen: boolean,
): string {
  const def = CHAR_MAP[charId];
  const branchDef = PRESTIGE_BRANCH_DEFS.find(d => d.charId === charId);
  const st = save.chars[charId];
  const chosen = branchKey === 'b' ? 1 : 0;
  const pathName = branchDef?.paths[chosen]?.label ?? (pathLabels[0] ?? '전직');

  const steps = ['2차', '3차', '4차'].map((label, i) => {
    const tier = i + 1;
    const owned = st && getCharGrowth(charId).some(
      n => n.branchTier === tier && isNodeOwned(st, n.id),
    );
    const active = milestoneReady && !owned && st!.level >= (PRESTIGE_TIER_LEVELS[i] ?? 99);
    return `<span class="prestige-step-pill ${owned ? 'done' : active ? 'active' : ''}">${owned ? '✓ ' : ''}${label}</span>`;
  }).join('<span class="prestige-step-arrow">→</span>');

  const pathTrack = branchKey && pathLabels.length
    ? `<div class="prestige-path-track">${pathLabels.map((n, i) =>
      `<span class="prestige-path-node">${i > 0 ? '→' : ''}${n}</span>`,
    ).join('')}</div>`
    : `<p class="hint prestige-path-pending">Lv.${PRESTIGE_TIER_LEVELS[0]}에 2차 전직 경로를 선택하세요</p>`;

  return `<section class="prestige-showcase prestige-showcase--compact ${milestoneReady ? 'prestige-showcase--ready' : ''}" style="--pc:${def?.color ?? '#aa88ff'}">
    <div class="prestige-showcase-glow" aria-hidden="true"></div>
    <div class="prestige-showcase-head">
      <div>
        <span class="prestige-showcase-badge">⚔️ 전직</span>
        <strong>${branchKey ? pathName : '전직 트리'}</strong>
      </div>
    </div>
    <div class="prestige-step-row">${steps}</div>
    ${pathTrack}
  </section>`;
}

export function renderPrestigeTreeFooter(charId: string, save: GameSave, treeOpen: boolean): string {
  return `<section class="prestige-tree-footer">
    <button type="button" class="prestige-tree-toggle" data-prestige-tree-toggle aria-expanded="${treeOpen}">
      <span class="prestige-tree-toggle-chevron" aria-hidden="true">${treeOpen ? '▾' : '▸'}</span>
      <span>전직 트리 확인</span>
    </button>
    <div class="prestige-tree-panel" id="prestige-tree-panel"${treeOpen ? '' : ' hidden'}>
      ${renderPrestigeTreeTable(charId, save)}
    </div>
  </section>`;
}

export function renderPrestigeTreeTable(charId: string, save: GameSave): string {
  const def = PRESTIGE_BRANCH_DEFS.find(d => d.charId === charId);
  if (!def) return '<p class="hint">전직 분기 데이터가 없습니다.</p>';

  const st = save.chars[charId];
  const nodes = getCharGrowth(charId);
  const activePath = st ? getActivePrestigePath(st, charId) : null;
  const activeRoot = activePath?.charAt(0) ?? null;

  const renderForkCell = (
    nodeId: string,
    name: string,
    desc: string,
    pathRoot: 'a' | 'b',
    dimOtherPath: boolean,
  ) => {
    const growthNode = nodes.find(n => n.id === nodeId);
    const owned = growthNode && st && isNodeOwned(st, growthNode.id);
    const onPath = activePath && growthNode
      ? nodeMatchesActivePath(growthNode, activePath)
      : !activePath;
    const dimmed = dimOtherPath || (activeRoot && pathRoot !== activeRoot);
    return `<div class="prestige-fork-cell ${owned ? 'owned' : ''} ${owned && onPath ? 'current' : ''} ${dimmed && !owned ? 'dimmed' : ''}">
      <strong>${name}</strong>
      <small>${desc}</small>
      ${owned ? '<span class="prestige-owned-tag">습득</span>' : ''}
    </div>`;
  };

  const pathBlocks = def.paths.map((path, pi) => {
    const pathKey = path.key as 'a' | 'b';
    const meta = PRESTIGE_FORK_META[charId]?.[pathKey];
    const prefix = def.prefix;
    const t1 = path.nodes[0]!;
    const t1Id = `${prefix}_${pathKey}_1`;
    const dim = !!activeRoot && activeRoot !== pathKey;

    const t2Block = meta
      ? `<div class="prestige-fork-row">
          ${renderForkCell(`${prefix}_${pathKey}1_2`, meta.tier2Names[0]!, meta.tier2Desc[0]!, pathKey, dim)}
          ${renderForkCell(`${prefix}_${pathKey}2_2`, meta.tier2Names[1]!, meta.tier2Desc[1]!, pathKey, dim)}
        </div>`
      : '';

    const t3Block = meta
      ? `<div class="prestige-fork-grid">
          ${renderForkCell(`${prefix}_${pathKey}1x_3`, meta.tier3Names[0]!, meta.tier3Desc[0]!, pathKey, dim)}
          ${renderForkCell(`${prefix}_${pathKey}1y_3`, meta.tier3Names[1]!, meta.tier3Desc[1]!, pathKey, dim)}
          ${renderForkCell(`${prefix}_${pathKey}2x_3`, meta.tier3Names[2]!, meta.tier3Desc[2]!, pathKey, dim)}
          ${renderForkCell(`${prefix}_${pathKey}2y_3`, meta.tier3Names[3]!, meta.tier3Desc[3]!, pathKey, dim)}
        </div>`
      : '';

    return `<div class="prestige-path-block ${activeRoot === pathKey ? 'path-active' : ''} ${dim ? 'path-dimmed' : ''}">
      <header class="prestige-path-head">
        <strong>${path.label}</strong>
        <small>${meta?.tagline ?? path.nodes[0]?.desc ?? ''}</small>
      </header>
      <div class="prestige-tier-block">
        <span class="prestige-tier-label">2차 · Lv.${PRESTIGE_TIER_LEVELS[0]}</span>
        ${renderForkCell(t1Id, t1.name, t1.desc, pathKey, dim)}
      </div>
      <div class="prestige-tier-block">
        <span class="prestige-tier-label">3차 · Lv.${PRESTIGE_TIER_LEVELS[1]}</span>
        ${t2Block}
      </div>
      <div class="prestige-tier-block">
        <span class="prestige-tier-label">4차 · Lv.${PRESTIGE_TIER_LEVELS[2]}</span>
        ${t3Block}
      </div>
    </div>`;
  }).join('');

  return `<div class="prestige-tree-wrap">
    <div class="prestige-tree-dual">${pathBlocks}</div>
  </div>`;
}
