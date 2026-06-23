import type { GameSave } from '../../types';
import {
  buildRivalLeagueView, claimRivalLeagueReward, claimDailyChallenge, claimDailyAllClearBonus,
  hasClaimableDaily,
} from '../../systems/RivalLeagueSystem';
import { getSpireWeekId } from '../../data/endgame/spire';
import { RIVAL_SURGE_MULT } from '../../data/rivalLeague';
import { bindTap } from '../../utils/bindTap';
import { saveGame } from '../../core/SaveManager';
import { audio } from '../../core/AudioManager';
import type { PanelHost } from './PanelHost';

export function renderRivalLeaguePanel(host: PanelHost, save: GameSave, prefix = ''): void {
  const view = buildRivalLeagueView(save);
  const weekLabel = view.weekId.replace('-', '년 ').replace('W', '주차 ');

  const rows = view.entries.map((e, i) => {
    const rank = i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
    return `<div class="rival-row ${e.isPlayer ? 'rival-row--player' : ''} ${e.id === view.mainRivalId ? 'rival-row--nemesis' : ''} ${e.surging ? 'rival-row--surge' : ''}">
      <span class="rival-rank">${medal}</span>
      <span class="rival-team">
        <strong>${e.emoji} ${e.name}${e.surging ? ' <em class="rival-surge-tag">서지</em>' : ''}</strong>
        <small>${e.isPlayer ? '당신' : e.tag}${e.id === view.mainRivalId ? ' · 라이벌' : ''}</small>
      </span>
      <span class="rival-score">${e.score.toLocaleString()}<small>SP</small></span>
    </div>`;
  }).join('');

  const gapText = view.mainRivalGap > 0
    ? `라이벌이 <b>${view.mainRivalGap.toLocaleString()} SP</b> 앞서요`
    : view.mainRivalGap < 0
      ? `라이벌보다 <b>${Math.abs(view.mainRivalGap).toLocaleString()} SP</b> 앞섭니다!`
      : '라이벌과 동점 — 지금이 역전 타이밍!';

  const rankMom = view.rankDelta > 0
    ? `<span class="rival-momentum up">▲${view.rankDelta}</span>`
    : view.rankDelta < 0
      ? `<span class="rival-momentum down">▼${Math.abs(view.rankDelta)}</span>`
      : '<span class="rival-momentum flat">—</span>';

  const dailyHtml = view.dailyRows.map(r => {
    const pct = Math.round((r.cur / r.target) * 100);
    return `<div class="rival-duel-row ${r.done ? 'done' : ''} ${r.claimed ? 'claimed' : ''}">
      <div class="rival-duel-head">
        <span>${r.icon} ${r.label}</span>
        <span>${r.cur}/${r.target}</span>
      </div>
      <div class="rival-duel-bar"><div class="rival-duel-fill" style="width:${pct}%"></div></div>
      ${r.claimed
        ? '<span class="hint">✓ 수령함</span>'
        : r.done
          ? `<button type="button" class="btn-sm gold rival-duel-claim" data-duel-claim="${r.id}">+${r.spReward} SP</button>`
          : `<span class="hint">+${r.spReward} SP</span>`}
    </div>`;
  }).join('');

  const allClearBtn = view.dailyAllClearReady
    ? '<button type="button" class="btn-sm support rival-allclear-btn" id="rival-allclear">🎯 일일 완료 보너스 +90 SP</button>'
    : view.dailyAllClearClaimed
      ? '<p class="hint">✅ 오늘 일일 대결 보너스 수령 완료</p>'
      : '';

  const rewardBlock = view.rewardClaimed
    ? '<p class="hint rival-reward-done">✅ 이번 주 보상 수령 완료</p>'
    : view.canClaim && view.rewardTier
      ? `<button type="button" class="btn-sm gold rival-claim-btn" id="rival-claim-reward">
          ${view.rewardTier.label} 수령 — 🪙${view.rewardTier.gold.toLocaleString()} 💎${view.rewardTier.gems}
        </button>`
      : `<p class="hint">점수 40+ 달성 시 주간 보상 수령 (현재 ${view.playerScore} SP)</p>`;

  host.panelEl.innerHTML = `${prefix}
    <div class="panel-header rival-header">
      <h3>🏆 라이벌 리그</h3>
      <span class="badge">${weekLabel}</span>
    </div>
    <div class="rival-mod-card">
      <span>${view.weeklyMod.icon} <strong>${view.weeklyMod.name}</strong></span>
      <p class="hint">${view.weeklyMod.desc}</p>
      ${view.surgeRivalName ? `<p class="rival-surge-alert">⚡ 오늘 <b>${view.surgeRivalName}</b> 서지 — 점수 ×${RIVAL_SURGE_MULT.toFixed(2)}</p>` : ''}
      ${view.revengeActive ? '<p class="rival-revenge-alert">🔥 역전 버프 — 새 층 SP +25% (라이벌에게 밀림)</p>' : ''}
    </div>
    <div class="rival-nemesis-card">
      <div class="rival-nemesis-head">
        <span>⚔️ 이번 주 라이벌</span>
        <span class="rival-timer">${view.daysLeftLabel}</span>
      </div>
      <strong class="rival-nemesis-name">${view.mainRivalName}</strong>
      <p class="rival-taunt">「${view.taunt}」</p>
      <p class="hint rival-gap">${gapText}</p>
    </div>
    <div class="rival-score-card">
      <div class="rival-my-score">
        <span>내 순위 ${rankMom}</span>
        <strong>#${view.playerRank}</strong>
        <small>${view.playerScore.toLocaleString()} SP${view.bonusSp > 0 ? ` · 보너스 +${view.bonusSp}` : ''}</small>
      </div>
      <div class="rival-streak">
        <span>라이벌 격파일</span>
        <strong>${view.headToHeadDays}일</strong>
        <small>우승 ${view.seasonWins}회${view.winStreak > 0 ? ` · 🔥${view.winStreak}연승` : ''}</small>
      </div>
    </div>
    <section class="rival-duel-section">
      <h4>📅 오늘의 라이벌 대결</h4>
      <p class="hint">3개 클리어 시 추가 보너스 — CPU 길드는 자체 리그를 진행 중</p>
      ${dailyHtml}
      ${allClearBtn}
    </section>
    <div class="rival-leaderboard">${rows}</div>
    <details class="rival-rules">
      <summary>점수 규칙</summary>
      <ul class="rival-rule-list">
        <li>새 층 돌파 +260 SP (주간 규칙·역전 버프 적용)</li>
        <li>몬스터 처치 +2.4 SP (주간 상한)</li>
        <li>일일 대결·보너스 SP 즉시 반영</li>
        <li>CPU 길드는 시간에 따라 자동 성장 — 플레이어와 무관한 별도 리그</li>
        <li>열심히 플레이하면 1등도 가능! 주말엔 CPU 점수가 더 오릅니다</li>
      </ul>
    </details>
    ${rewardBlock}`;

  bindTap(host.panelEl.querySelector('#rival-claim-reward'), () => {
    const res = claimRivalLeagueReward(save);
    if (res.ok) {
      audio.playUpgrade();
      host.showToast(res.message, true);
      saveGame(save);
      host.onRefresh();
      host.render();
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
        host.render();
      } else {
        audio.playFail();
        host.showToast(res.message, false);
      }
    });
  });

  bindTap(host.panelEl.querySelector('#rival-allclear'), () => {
    const res = claimDailyAllClearBonus(save);
    if (res.ok) {
      audio.playUpgrade();
      host.showToast(res.message, true);
      saveGame(save);
      host.onRefresh();
      host.render();
    } else {
      audio.playFail();
      host.showToast(res.message, false);
    }
  });
}

export function rivalLeagueHubBadge(save: GameSave): string | undefined {
  const week = getSpireWeekId();
  if (save.rivalLeague?.weekId !== week) return 'NEW';
  if (hasClaimableDaily(save)) return '!';
  const view = buildRivalLeagueView(save);
  if (view.canClaim && !view.rewardClaimed) return '!';
  if (view.playerRank > 5) return '↑';
  return undefined;
}
