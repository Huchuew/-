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
  type LeaderboardEntry,
  type LeaderboardSnapshot,
} from '../../services/PlayerProfileService';
import { getSpireWeekId } from '../../data/endgame/spire';
import { bindTap } from '../../utils/bindTap';
import { saveGame } from '../../core/SaveManager';
import { audio } from '../../core/AudioManager';
import { LEADERBOARD_RANK_REWARDS } from '../../data/leaderboardData';
import type { PanelHost } from './PanelHost';

type LbTab = 'overall' | 'weekly';

function rankMedal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}`;
}

function formatDps(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString();
}

function statChips(e: LeaderboardEntry): string {
  return `<span class="lb-stat" title="최고 층">🗺️ ${e.maxRegion}층</span>`
    + `<span class="lb-stat" title="모험단 규모">👥 ${e.rosterSize}명</span>`
    + `<span class="lb-stat" title="파티 DPS">⚔️ ${formatDps(e.partyDps)}</span>`
    + `<span class="lb-stat" title="탑 DPS">🔥 ${formatDps(e.topDps)}</span>`;
}

function renderEntryRow(e: LeaderboardEntry, showWeekly = false): string {
  const weekly = showWeekly
    ? `<span class="lb-weekly-sp">${e.weeklyScore.toLocaleString()} SP</span>`
    : '';
  return `<div class="lb-row ${e.isPlayer ? 'lb-row--me' : ''}">
    <span class="lb-rank">${rankMedal(e.rank)}</span>
    <div class="lb-player">
      <strong class="lb-nick">${escapeHtml(e.nickname)}</strong>
      <small class="lb-team">${escapeHtml(e.teamName)}</small>
      <div class="lb-stats">${statChips(e)}</div>
    </div>
    ${weekly}
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  return `<div class="lb-my-card">
    <div class="lb-my-head">
      <span>내 순위</span>
      <strong>${rankLabel}</strong>
      <small>${local.playerTeamName}</small>
    </div>
    <div class="lb-my-stats">
      <div><em>최고층</em><strong>${me.maxRegion}F</strong></div>
      <div><em>모험단</em><strong>${me.rosterSize}명</strong></div>
      <div><em>파티 DPS</em><strong>${formatDps(me.partyDps)}</strong></div>
      <div><em>탑 DPS</em><strong>${formatDps(me.topDps)}</strong></div>
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
    <h4>📅 오늘의 랭킹 미션</h4>
    <p class="hint">클리어 시 주간 SP 보너스 — 다른 모험단과 겨룰 화력을 키우세요</p>
    ${dailyHtml}
    ${allClearBtn}
  </section>`;
}

function bindPanelActions(
  host: PanelHost,
  save: GameSave,
  snap: LeaderboardSnapshot,
  local: ReturnType<typeof buildLeaderboardLocalView>,
  tab: LbTab,
  prefix: string,
): void {
  bindTap(host.panelEl.querySelector('#lb-refresh'), () => {
    renderLeaderboardPanel(host, save, prefix, tab);
  });

  host.panelEl.querySelectorAll('[data-lb-tab]').forEach(btn => {
    bindTap(btn, () => {
      const next = (btn as HTMLElement).dataset.lbTab as LbTab;
      renderLeaderboardPanel(host, save, prefix, next);
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
      renderLeaderboardPanel(host, save, prefix, tab);
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
        renderLeaderboardPanel(host, save, prefix, tab);
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
      renderLeaderboardPanel(host, save, prefix, tab);
    } else {
      audio.playFail();
      host.showToast(res.message, false);
    }
  });
}

function renderContent(
  host: PanelHost,
  save: GameSave,
  snap: LeaderboardSnapshot,
  local: ReturnType<typeof buildLeaderboardLocalView>,
  tab: LbTab,
  prefix: string,
): void {
  const weekLabel = local.weekId.replace('-', '년 ').replace('W', '주차 ');
  const list = tab === 'weekly' ? snap.weekly : snap.overall;
  const emptyMsg = tab === 'weekly'
    ? '이번 주 SP를 올린 모험단이 아직 없습니다. 먼저 도전해 보세요!'
    : '등록된 모험단이 없습니다.';

  const rows = list.length
    ? list.map(e => renderEntryRow(e, tab === 'weekly')).join('')
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
    host.panelEl.innerHTML = `${prefix}
      <div class="panel-header lb-header">
        <h3>🏆 모험단 랭킹</h3>
      </div>
      <div class="lb-offline-card">
        <p><strong>랭킹 서버 미연결</strong></p>
        <p class="hint">${snap.error ?? 'Supabase 설정이 필요합니다.'}</p>
        <p class="hint">로컬 플레이는 가능하며, 서버 연결 후 자동으로 랭킹에 반영됩니다.</p>
      </div>
      ${renderDailySection(local)}`;
    bindPanelActions(host, save, snap, local, tab, prefix);
    return;
  }

  host.panelEl.innerHTML = `${prefix}
    <div class="panel-header lb-header">
      <h3>🏆 모험단 랭킹</h3>
      <button type="button" class="btn-sm support" id="lb-refresh">↻ 새로고침</button>
    </div>
    <div class="lb-mod-card">
      <span>${local.weeklyMod.icon} <strong>${local.weeklyMod.name}</strong></span>
      <p class="hint">${local.weeklyMod.desc} · ${local.daysLeftLabel}</p>
      <span class="badge">${weekLabel}</span>
    </div>
    ${renderMyCard(snap, local, tab)}
    <div class="lb-tabs">
      <button type="button" class="lb-tab ${tab === 'overall' ? 'active' : ''}" data-lb-tab="overall">🗺️ 종합</button>
      <button type="button" class="lb-tab ${tab === 'weekly' ? 'active' : ''}" data-lb-tab="weekly">📈 주간 SP</button>
    </div>
    <p class="hint lb-sort-hint">${tab === 'overall'
      ? '최고 층 → 파티 DPS → 모험단 규모 순'
      : '이번 주 활동 SP 순 — 층 돌파·처치·투닥·업적 반영'}</p>
    <div class="lb-list">${rows}</div>
    ${renderDailySection(local)}
    ${rewardBlock}
    <details class="lb-rules">
      <summary>경쟁 규칙</summary>
      <ul class="lb-rule-list">
        <li>닉네임은 전 서버 유일 — 다른 모험단과 겹칠 수 없습니다</li>
        <li>종합: 최고 층 · 파티 DPS · 영입 인원(모험단 규모)</li>
        <li>탑 DPS: 현재 파티 중 1인 최고 DPS</li>
        <li>주간 SP: 이번 주 새 층·처치·업적·일일 미션 보너스</li>
        <li>숙소 복귀·층 돌파 시 자동 동기화 (약 1~2분 간격)</li>
      </ul>
    </details>`;

  bindPanelActions(host, save, snap, local, tab, prefix);
}

export function renderLeaderboardPanel(
  host: PanelHost,
  save: GameSave,
  prefix = '',
  tab: LbTab = 'overall',
): void {
  host.panelEl.innerHTML = `${prefix}
    <div class="panel-header lb-header"><h3>🏆 모험단 랭킹</h3></div>
    <div class="lb-loading"><span class="lb-spinner"></span> 실시간 랭킹 불러오는 중…</div>`;

  void fetchLeaderboardSnapshot(save).then(snap => {
    if (!host.panelEl.isConnected) return;
    renderContent(host, save, snap, buildLeaderboardLocalView(save), tab, prefix);
  }).catch(err => {
    console.warn('[Leaderboard] panel load failed', err);
    if (!host.panelEl.isConnected) return;
    host.panelEl.innerHTML = `${prefix}
      <div class="panel-header lb-header"><h3>🏆 모험단 랭킹</h3></div>
      <p class="hint warn">랭킹을 불러오지 못했습니다. 네트워크 확인 후 새로고침해 주세요.</p>`;
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
