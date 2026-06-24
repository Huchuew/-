import type { GameSave } from '../../types';
import {
  buildLeaderboardLocalView,
  claimDailyAllClearBonus,
  claimDailyChallenge,
  claimLeaderboardReward,
  hasClaimableDaily,
} from '../../systems/LeaderboardSystem';
import {
  fetchLeaderboardSnapshot,
  enrichLeaderboardSnapshot,
  type LeaderboardEntry,
  type LeaderboardSnapshot,
} from '../../services/PlayerProfileService';
import { getSpireWeekId } from '../../data/endgame/spire';
import { bindTap } from '../../utils/bindTap';
import { saveGame } from '../../core/SaveManager';
import { audio } from '../../core/AudioManager';
import { LEADERBOARD_RANK_REWARDS } from '../../data/leaderboardData';
import {
  JACKPUB_TABLE_LABEL,
  formatTablePot,
  getOverallPokerTitle,
  getWeeklyPokerTitle,
} from '../../data/jackPubPoker';
import { buildShowdownHeadline } from '../../systems/LeaderboardCompetition';
import { stashLeaderboardRanks } from '../../systems/PubRankToast';
import { beginRivalDuelFromLeaderboard, isGameInExpedition } from '../../Game';
import {
  buildOfflineRivalEntries,
  canStartRivalDuel,
  getRivalDuelHint,
  getRivalDuelButtonLabel,
  getRivalDuelRemaining,
} from '../../systems/RivalDuelSystem';
import { CHAR_MAP } from '../../data/characters';
import { paintLeaderboardPortraits } from '../../render/FormationPortrait';
import { resolveLeaderboardFloor } from '../../systems/leaderboardFloorDisplay';
import type { PanelHost } from './PanelHost';

type LbTab = 'overall' | 'weekly';

type LbRenderOpts = {
  /** 서버에서 랭킹 다시 불러오기 (진입·수동 새로고침) */
  forceRefresh?: boolean;
};

let cachedSnap: LeaderboardSnapshot | null = null;
let cachedTab: LbTab = 'overall';

function rankMedal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}`;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString();
}

function statChips(e: LeaderboardEntry): string {
  const floor = resolveLeaderboardFloor(e);
  return `<span class="lb-stat lb-stat--floor ${floor.isSpire ? 'lb-stat--spire' : ''}" title="${floor.statTitle}">`
    + `<b>${floor.displayFloor}</b><small>${floor.statLabel}</small></span>`
    + `<span class="lb-stat" title="누적 투닥 횟수"><b>${formatCompact(e.touchCount)}</b><small>투닥</small></span>`
    + `<span class="lb-stat" title="출전 파티 전투력 합계"><b>${formatCompact(e.partyDps)}</b><small>전투력</small></span>`
    + `<span class="lb-stat" title="누적 몬스터 처치"><b>${formatCompact(e.totalKills)}</b><small>처치</small></span>`;
}

function renderPartyPortraits(e: LeaderboardEntry): string {
  const elites = e.partyElites?.length ? e.partyElites : [];
  const slotCount = elites.length || Math.min(4, Math.max(1, e.partySize || e.rosterSize));
  const slots = elites.length
    ? elites
    : Array.from({ length: slotCount }, () => null);

  return `<div class="lb-party-portraits ${elites.length ? '' : 'lb-party-portraits--pending'}" aria-label="모험단 에이스">
    ${slots.map((m, i) => {
      if (!m) {
        return `<div class="lb-portrait-slot lb-portrait-slot--ghost" aria-hidden="true">
          <span class="lb-portrait-ghost">?</span>
        </div>`;
      }
      const def = CHAR_MAP[m.charId];
      const color = def?.color ?? '#667788';
      const accent = def?.accent ?? '#99aabb';
      return `<div class="lb-portrait-slot ${i === 0 ? 'lb-portrait-slot--ace' : ''}" style="--char-color:${color};--char-accent:${accent}" title="${escapeHtml(m.name)} Lv.${m.level}">
        <canvas class="lb-portrait" data-char-id="${m.charId}" width="28" height="28" aria-hidden="true"></canvas>
        <span class="lb-portrait-lv">${m.level}</span>
      </div>`;
    }).join('')}
  </div>`;
}

function renderDuelButton(save: GameSave, rival: LeaderboardEntry): string {
  if (rival.isPlayer) return '';
  const inExp = isGameInExpedition();
  const check = canStartRivalDuel(save, rival, inExp);
  const disabled = check.ok ? '' : ' disabled';
  const title = check.ok ? '라이벌 고스트 격파' : (check.reason ?? '');
  const label = getRivalDuelButtonLabel(save);
  return `<button type="button" class="btn-sm rival-duel-btn" data-rival-duel="${escapeHtml(rival.playerId)}"${disabled} title="${escapeHtml(title)}">${label}</button>`;
}

function findRivalEntry(save: GameSave, snap: LeaderboardSnapshot, playerId: string): LeaderboardEntry | null {
  return snap.weekly.find(e => e.playerId === playerId)
    ?? snap.overall.find(e => e.playerId === playerId)
    ?? buildOfflineRivalEntries(save).find(e => e.playerId === playerId)
    ?? null;
}

function renderEntryRow(e: LeaderboardEntry, showWeekly = false, save?: GameSave): string {
  const weekly = showWeekly
    ? `<span class="lb-weekly-sp">${e.weeklyScore.toLocaleString()}<small>SP</small></span>`
    : '';
  const duel = showWeekly && save && !e.isPlayer ? renderDuelButton(save, e) : '';
  return `<article class="lb-row ${e.isPlayer ? 'lb-row--me' : ''}">
    <div class="lb-row-rank">${rankMedal(e.rank)}</div>
    <div class="lb-row-body">
      <div class="lb-row-head">
        <div class="lb-player-meta">
          <strong class="lb-nick">${escapeHtml(e.nickname)}</strong>
          <small class="lb-team">${escapeHtml(e.teamName)}</small>
        </div>
        ${weekly}
        ${duel}
      </div>
      <div class="lb-row-detail">
        ${renderPartyPortraits(e)}
        <div class="lb-stats">${statChips(e)}</div>
      </div>
    </div>
  </article>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

function formatGrowthNews(e: LeaderboardEntry): { ago: string; text: string } {
  const ago = e.updatedAt ? formatRelativeTime(e.updatedAt) : '방금';
  const floor = resolveLeaderboardFloor(e);
  const dps = formatCompact(e.partyDps);
  if (floor.isSpire) {
    return {
      ago,
      text: `<strong>${escapeHtml(e.nickname)}</strong>님이 🗼 야탑 <em>${floor.displayFloor}층</em>까지 등반`,
    };
  }
  if (floor.displayFloor >= 10) {
    return { ago, text: `<strong>${escapeHtml(e.nickname)}</strong>님이 <em>${floor.displayFloor}층</em>·전투력 ${dps}로 성장` };
  }
  if (e.weeklyScore > 0) {
    return { ago, text: `<strong>${escapeHtml(e.nickname)}</strong>님이 주간 <em>${e.weeklyScore.toLocaleString()} SP</em> 달성` };
  }
  return { ago, text: `<strong>${escapeHtml(e.nickname)}</strong>님이 <em>${floor.displayFloor}층</em>으로 성장` };
}

function renderShowdownCard(save: GameSave, snap: LeaderboardSnapshot, tab: LbTab): string {
  if (tab !== 'weekly') return '';
  const rivals = snap.weeklyRivals.length
    ? snap.weeklyRivals
    : buildOfflineRivalEntries(save).map((e, i) => ({
      rank: e.rank,
      nickname: e.nickname,
      teamName: e.teamName,
      weeklyScore: e.weeklyScore,
      maxRegion: e.maxRegion,
      gapSp: Math.abs(e.weeklyScore - (snap.myEntry?.weeklyScore ?? 0)),
      direction: (i % 2 === 0 ? 'above' : 'below') as 'above' | 'below',
      isShowdown: true,
    }));
  if (!rivals.length) return '';

  const headline = buildShowdownHeadline(snap.weeklyRivals, snap.myWeeklyRank);
  const rows = rivals.map(r => {
    const rivalEntry = snap.weekly.find(e => e.rank === r.rank)
      ?? buildOfflineRivalEntries(save).find(e => e.rank === r.rank);
    const rivalFloor = resolveLeaderboardFloor({
      maxRegion: r.maxRegion,
      spireBest: rivalEntry?.spireBest ?? 0,
    });
    const floorLabel = rivalFloor.isSpire
      ? `야탑 ${rivalFloor.displayFloor}층`
      : `${r.maxRegion}층`;
    const duelBtn = rivalEntry ? renderDuelButton(save, rivalEntry) : '';
    return `<div class="lb-rival-row ${r.isShowdown ? 'lb-rival-row--showdown' : ''}">
    <span class="lb-rival-rank">#${r.rank}</span>
    <div class="lb-rival-body">
      <strong>${escapeHtml(r.nickname)}</strong>
      <small>${escapeHtml(r.teamName)} · ${floorLabel}</small>
    </div>
    <span class="lb-rival-gap">${r.direction === 'above' ? '↑' : '↓'} ${r.gapSp.toLocaleString()} SP</span>
    ${r.isShowdown ? '<span class="lb-showdown-badge">접전</span>' : ''}
    ${duelBtn}
  </div>`;
  }).join('');
  return `<section class="lb-showdown-card">
    <h4>⚔️ 주간 라이벌</h4>
    <p class="hint lb-duel-hint">${getRivalDuelHint(save)} · 남은 ${getRivalDuelRemaining(save)}회</p>
    ${headline ? `<p class="lb-showdown-headline">${headline}</p>` : '<p class="hint">주간 SP ±3위 안의 모험단 · 오프라인은 연습 고스트</p>'}
    <div class="lb-rival-list">${rows}</div>
  </section>`;
}

function renderTableTicker(snap: LeaderboardSnapshot): string {
  if (!snap.recentTable.length) return '';
  const shown = snap.recentTable.slice(0, 2);
  const extra = snap.recentTable.length - shown.length;
  const items = shown.map(e => {
    const news = formatGrowthNews(e);
    return `<div class="lb-growth-item">
      <span class="lb-growth-time">${news.ago}</span>
      <span class="lb-growth-text">${news.text}</span>
    </div>`;
  }).join('');
  const more = extra > 0
    ? `<span class="lb-growth-more">외 ${extra}명</span>`
    : '';
  return `<div class="lb-growth-feed" aria-label="최근 성장 소식">
    <span class="lb-ticker-label">라이브</span>
    <div class="lb-growth-items">${items}</div>
    ${more}
  </div>`;
}

function renderMyCard(
  snap: LeaderboardSnapshot,
  local: ReturnType<typeof buildLeaderboardLocalView>,
  tab: LbTab,
): string {
  const me = snap.myEntry;
  if (!me) return '';
  const rank = tab === 'weekly' ? snap.myWeeklyRank : snap.myOverallRank;
  const rankLabel = rank != null ? `#${rank}` : '—';
  const pokerTitle = tab === 'weekly'
    ? getWeeklyPokerTitle(rank ?? null)
    : getOverallPokerTitle(rank ?? null);
  const myFloor = resolveLeaderboardFloor(me);
  const floorLabel = myFloor.isSpire
    ? `${myFloor.displayFloor}층`
    : `${me.maxRegion}층`;
  return `<div class="lb-my-card">
    <div class="lb-my-head">
      <span>내 순위</span>
      <strong>${rankLabel}</strong>
      <span class="lb-poker-badge" title="${escapeHtml(pokerTitle.flavor)}">${pokerTitle.icon} ${pokerTitle.label}</span>
      <small>${local.playerTeamName}</small>
    </div>
    <div class="lb-my-stats">
      <div><em>${myFloor.isSpire ? '야탑' : '최고층'}</em><strong>${floorLabel}</strong></div>
      <div><em>투닥</em><strong>${formatCompact(me.touchCount)}회</strong></div>
      <div><em>전투력</em><strong>${formatCompact(me.partyDps)}</strong></div>
      <div><em>누적 처치</em><strong>${formatCompact(me.totalKills)}</strong></div>
      <div><em>주간 SP</em><strong>${local.playerScore.toLocaleString()}</strong></div>
    </div>
  </div>`;
}

function renderDailySection(local: ReturnType<typeof buildLeaderboardLocalView>): string {
  const dailyHtml = local.dailyRows.map(r => {
    const pct = Math.round((r.cur / r.target) * 100);
    return `<div class="lb-duel-row ${r.done ? 'done' : ''} ${r.claimed ? 'claimed' : ''}">
      <div class="lb-duel-head"><span>${r.icon} ${r.label}</span><span>${r.cur}/${r.target}</span></div>
      <div class="lb-duel-bar"><div class="lb-duel-fill" style="width:${pct}%"></div></div>
      ${r.claimed
        ? '<span class="hint">✓ 수령함</span>'
        : r.done
          ? `<button type="button" class="btn-sm gold lb-duel-claim" data-duel-claim="${r.id}">+${r.spReward} SP</button>`
          : `<span class="hint">+${r.spReward} SP</span>`}
    </div>`;
  }).join('');

  const allClearBtn = local.dailyAllClearReady
    ? '<button type="button" class="btn-sm support lb-allclear-btn" id="lb-allclear">🎯 일일 완료 +90 SP</button>'
    : local.dailyAllClearClaimed
      ? '<p class="hint">✅ 오늘 일일 미션 보너스 수령 완료</p>'
      : '';

  return `<section class="lb-daily-section">
    <h4>📋 오늘의 일일 미션</h4>
    <p class="hint">클리어 시 주간 SP 보너스</p>
    ${dailyHtml}
    ${allClearBtn}
  </section>`;
}

function isLeaderboardMounted(host: PanelHost): boolean {
  return !!host.panelEl.querySelector('.lb-list, .lb-offline-card');
}

function paintPanel(
  host: PanelHost,
  save: GameSave,
  snap: LeaderboardSnapshot,
  tab: LbTab,
  prefix: string,
): void {
  const scrollTop = host.panelEl.scrollTop;
  renderContent(host, save, snap, buildLeaderboardLocalView(save), tab, prefix);
  requestAnimationFrame(() => {
    host.panelEl.scrollTop = scrollTop;
  });
}

function bindPanelActions(
  host: PanelHost,
  save: GameSave,
  snap: LeaderboardSnapshot,
  tab: LbTab,
  prefix: string,
): void {
  bindTap(host.panelEl.querySelector('#lb-refresh'), () => {
    renderLeaderboardPanel(host, save, prefix, tab, { forceRefresh: true });
  });

  host.panelEl.querySelectorAll('[data-lb-tab]').forEach(btn => {
    bindTap(btn, () => {
      const next = (btn as HTMLElement).dataset.lbTab as LbTab;
      cachedTab = next;
      if (cachedSnap) {
        paintPanel(host, save, cachedSnap, next, prefix);
      } else {
        renderLeaderboardPanel(host, save, prefix, next, { forceRefresh: true });
      }
    });
  });

  bindTap(host.panelEl.querySelector('#lb-claim-reward'), () => {
    const rank = snap.myWeeklyRank ?? 99;
    const res = claimLeaderboardReward(save, rank);
    if (res.ok) {
      audio.playUpgrade();
      host.showToast(res.message, true);
      saveGame(save);
      host.onRefresh();
      if (cachedSnap) paintPanel(host, save, cachedSnap, tab, prefix);
    } else {
      audio.playFail();
      host.showToast(res.message, false);
    }
  });

  host.panelEl.querySelectorAll('[data-duel-claim]').forEach(btn => {
    bindTap(btn, () => {
      const id = (btn as HTMLElement).dataset.duelClaim!;
      const res = claimDailyChallenge(save, id);
      if (res.ok) {
        audio.playGold();
        host.showToast(res.message, true);
        saveGame(save);
        host.onRefresh();
        if (cachedSnap) paintPanel(host, save, cachedSnap, tab, prefix);
      } else {
        audio.playFail();
        host.showToast(res.message, false);
      }
    });
  });

  host.panelEl.querySelectorAll('[data-rival-duel]').forEach(btn => {
    bindTap(btn, () => {
      const playerId = (btn as HTMLElement).dataset.rivalDuel!;
      const rival = findRivalEntry(save, snap, playerId);
      if (!rival) {
        host.showToast('라이벌 정보를 찾을 수 없어요', false);
        return;
      }
      const inExp = isGameInExpedition();
      const check = canStartRivalDuel(save, rival, inExp);
      if (!check.ok) {
        audio.playFail();
        host.showToast(check.reason ?? '격파 불가', false);
        return;
      }
      const res = beginRivalDuelFromLeaderboard(rival);
      if (res.ok) {
        audio.playUpgrade();
        host.showToast(res.message, true);
        host.onRefresh();
      } else {
        audio.playFail();
        host.showToast(res.message, false);
      }
    });
  });

  bindTap(host.panelEl.querySelector('#lb-allclear'), () => {
    const res = claimDailyAllClearBonus(save);
    if (res.ok) {
      audio.playUpgrade();
      host.showToast(res.message, true);
      saveGame(save);
      host.onRefresh();
      if (cachedSnap) paintPanel(host, save, cachedSnap, tab, prefix);
    } else {
      audio.playFail();
      host.showToast(res.message, false);
    }
  });
}

function renderContent(
  host: PanelHost,
  save: GameSave,
  rawSnap: LeaderboardSnapshot,
  local: ReturnType<typeof buildLeaderboardLocalView>,
  tab: LbTab,
  prefix: string,
): void {
  const snap = enrichLeaderboardSnapshot(rawSnap, save);
  const list = tab === 'weekly' ? snap.weekly : snap.overall;
  const emptyMsg = tab === 'weekly'
    ? '이번 주 SP를 올린 모험단이 아직 없습니다. 먼저 도전해 보세요!'
    : '등록된 모험단이 없습니다.';

  const rows = list.length
    ? list.map(e => renderEntryRow(e, tab === 'weekly', save)).join('')
    : `<p class="hint lb-empty">${emptyMsg}</p>`;

  const rewardTier = snap.myWeeklyRank != null
    ? LEADERBOARD_RANK_REWARDS.find(t => snap.myWeeklyRank! <= t.maxRank) ?? null
    : null;

  const rewardBlock = local.rewardClaimed
    ? '<p class="hint lb-reward-done">✅ 이번 주 보상 수령 완료</p>'
    : local.canClaim && rewardTier && snap.myWeeklyRank != null
      ? `<button type="button" class="btn-sm gold lb-claim-btn" id="lb-claim-reward">
          ${rewardTier.label} 수령 (#${snap.myWeeklyRank}) — 🪙${rewardTier.gold.toLocaleString()} 💎${rewardTier.gems}
        </button>`
      : `<p class="hint">주간 SP 40+ 달성 시 보상 수령 (현재 ${local.playerScore} SP)</p>`;

  if (!snap.configured) {
    const offlineRivals = buildOfflineRivalEntries(save);
    const offlineRows = offlineRivals.map(e => `
      <div class="lb-rival-row lb-rival-row--showdown">
        <span class="lb-rival-rank">연습</span>
        <div class="lb-rival-body">
          <strong>${escapeHtml(e.nickname)}</strong>
          <small>${escapeHtml(e.teamName)} · ${e.maxRegion}층</small>
        </div>
        ${renderDuelButton(save, e)}
      </div>`).join('');
    host.panelEl.innerHTML = `${prefix}
      <div class="panel-header lb-header">
        <h3>🏆 잭펍 모험단 랭킹</h3>
      </div>
      <div class="lb-offline-card">
        <p><strong>랭킹 서버 미연결</strong></p>
        <p class="hint">${snap.error ?? 'Supabase 설정이 필요합니다.'}</p>
        <p class="hint">로컬 플레이는 가능하며, 서버 연결 후 랭킹에 반영됩니다.</p>
      </div>
      <section class="lb-showdown-card">
        <h4>⚔️ 라이벌 격파 (연습)</h4>
        <p class="hint lb-duel-hint">${getRivalDuelHint(save)} · 남은 ${getRivalDuelRemaining(save)}회</p>
        <div class="lb-rival-list">${offlineRows}</div>
      </section>
      ${renderDailySection(local)}`;
    bindPanelActions(host, save, snap, tab, prefix);
    return;
  }

  host.panelEl.innerHTML = `${prefix}
    <div class="panel-header lb-header">
      <h3>🏆 잭펍 모험단 랭킹</h3>
      <button type="button" class="btn-sm support" id="lb-refresh">↻ 새로고침</button>
    </div>
    <div class="lb-jackpub-banner">
      <span>${JACKPUB_TABLE_LABEL}</span>
      <small>${formatTablePot(snap.potChips, snap.tablePlayerCount)}</small>
    </div>
    ${renderTableTicker(snap)}
    ${renderMyCard(snap, local, tab)}
    ${renderShowdownCard(save, snap, tab)}
    <div class="lb-tabs">
      <button type="button" class="lb-tab ${tab === 'overall' ? 'active' : ''}" data-lb-tab="overall">🗺️ 종합 랭킹</button>
      <button type="button" class="lb-tab ${tab === 'weekly' ? 'active' : ''}" data-lb-tab="weekly">📈 주간 랭킹</button>
    </div>
    <p class="hint lb-sort-hint">${tab === 'overall'
      ? '야탑 → 최고 층 → 전투력 → 투닥·처치 순'
      : '이번 주 SP 순 — 층 돌파·처치·투닥·업적 반영'}</p>
    <div class="lb-list">${rows}</div>
    ${renderDailySection(local)}
    ${rewardBlock}
    <details class="lb-rules">
      <summary>잭펍 랭킹 규칙</summary>
      <ul class="lb-rule-list">
        <li>🏆 <b>잭펍</b> — 모험단끼리 성장 점수를 겨루는 주간 랭킹</li>
        <li>닉네임은 전 서버 유일 — 다른 모험단과 겹칠 수 없습니다</li>
        <li>종합 랭킹: <b>야탑</b> 기록 → 던전 최고 층 → 전투력 · 투닥·처치</li>
        <li>주간 랭킹: 이번 주 SP — 층·처치·업적·일일 미션</li>
        <li>±3위 라이벌과 SP 80 이내면 <b>접전</b> 표시 · <b>격파</b>로 소량 SP·골드</li>
        <li>랭킹 목록은 <b>탭 진입 시 1회</b> 갱신 · ↻ 버튼으로 수동 새로고침</li>
      </ul>
    </details>`;

  bindPanelActions(host, save, snap, tab, prefix);
  requestAnimationFrame(() => {
    void paintLeaderboardPortraits(host.panelEl);
  });
}

export function clearLeaderboardPanelCache(): void {
  cachedSnap = null;
}

export function renderLeaderboardPanel(
  host: PanelHost,
  save: GameSave,
  prefix = '',
  tab: LbTab = cachedTab,
  opts?: LbRenderOpts,
): void {
  const force = opts?.forceRefresh ?? false;
  const prevTab = cachedTab;
  cachedTab = tab;

  if (!force && isLeaderboardMounted(host) && cachedSnap) {
    if (tab !== prevTab) {
      paintPanel(host, save, cachedSnap, tab, prefix);
    }
    return;
  }

  if (!force && isLeaderboardMounted(host)) {
    return;
  }

  const scrollTop = host.panelEl.scrollTop;
  host.panelEl.innerHTML = `${prefix}
    <div class="panel-header lb-header"><h3>🏆 잭펍 모험단 랭킹</h3></div>
    <div class="lb-loading"><span class="lb-spinner"></span> 랭킹 불러오는 중…</div>`;

  void fetchLeaderboardSnapshot(save).then(rawSnap => {
    if (!host.panelEl.isConnected) return;
    const snap = enrichLeaderboardSnapshot(rawSnap, save);
    cachedSnap = snap;
    const local = buildLeaderboardLocalView(save);
    stashLeaderboardRanks(snap, local.weekId, local.playerScore);
    renderContent(host, save, snap, local, tab, prefix);
    requestAnimationFrame(() => {
      host.panelEl.scrollTop = scrollTop;
    });
    if (force) host.showToast('랭킹 갱신 완료', true);
  }).catch(err => {
    console.warn('[Leaderboard] panel load failed', err);
    if (!host.panelEl.isConnected) return;
    cachedSnap = null;
    host.panelEl.innerHTML = `${prefix}
      <div class="panel-header lb-header"><h3>🏆 잭펍 모험단 랭킹</h3></div>
      <p class="hint warn">랭킹을 불러오지 못했습니다. 네트워크 확인 후 새로고침해 주세요.</p>
      <button type="button" class="btn-sm support" id="lb-retry">↻ 다시 시도</button>`;
    bindTap(host.panelEl.querySelector('#lb-retry'), () => {
      renderLeaderboardPanel(host, save, prefix, tab, { forceRefresh: true });
    });
  });
}

export function leaderboardHubBadge(save: GameSave): string | undefined {
  const week = getSpireWeekId();
  if (save.rivalLeague?.weekId !== week) return 'NEW';
  if (hasClaimableDaily(save)) return '!';
  const local = buildLeaderboardLocalView(save);
  if (local.canClaim && !local.rewardClaimed) return '!';
  return undefined;
}
