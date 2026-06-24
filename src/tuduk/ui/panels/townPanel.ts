import type { GameSave } from '../../types';
import type { AdventureSystem } from '../../systems/AdventureSystem';
import { countClaimableAchievements } from '../../systems/AchievementSystem';
import { isWorldNavUnlocked } from '../../systems/uiUnlock';
import { getPartyHealPercent } from './contextHints';
import {
  formatPartyIncapBanner, hasPartyIncapacitated,
} from '../../systems/CharacterStatusSystem';
import { isDailyBonusClaimable, renderTownRewardsStrip } from './townRewardsStrip';
import { leaderboardHubBadge } from './leaderboardPanel';
import { renderEndgameHubButton } from './endgameTeaser';
import { renderTownHubWidgets } from './townHubWidgets';

export type TownSub = 'hub' | 'trade' | 'news' | 'camp' | 'records' | 'dungeon' | 'endgame' | 'settings' | 'leaderboard';

type HubCard = {
  sub: TownSub;
  icon: string;
  title: string;
  desc: string;
  tone: string;
  wide?: boolean;
  badge?: string;
};

function hubRecordsRow(save: GameSave, claimable: number | undefined, atLodging: boolean): string {
  const records = hubCard({
    sub: 'records', icon: '📖', title: '기록',
    desc: atLodging ? '도감 · 업적 · 보관함' : '몬스터 수집 기록',
    tone: 'records',
    badge: claimable ? `${claimable}` : undefined,
  });
  if (!atLodging) return records;
  const endgame = renderEndgameHubButton(save);
  if (!endgame) return records;
  return `<div class="town-hub-duo">${records}${endgame}</div>`;
}

function hubCard(c: HubCard): string {
  return `<button type="button" class="town-hub-card town-hub-card--${c.tone}${c.wide ? ' town-hub-card--wide' : ''}" data-town-sub="${c.sub}">
    <span class="town-hub-card-glow" aria-hidden="true"></span>
    <span class="town-hub-icon-wrap">${c.icon}</span>
    <span class="town-hub-card-body">
      <strong>${c.title}${c.badge ? `<em class="town-hub-badge">${c.badge}</em>` : ''}</strong>
      <small>${c.desc}</small>
    </span>
    <span class="town-hub-chevron" aria-hidden="true">›</span>
  </button>`;
}

export function renderTownHub(save: GameSave, adv: AdventureSystem): string {
  const locked = !isWorldNavUnlocked(save);
  if (locked) {
    return `<div class="town-hub locked">
      <div class="panel-header"><h3>🏘️ 마을</h3></div>
      <div class="panel-guide-card warn">
        <strong>🔒 아직 마을이 닫혀 있어요</strong>
        <p>2층에 도달하면 거래·캠프·영입이 열립니다. (현재 최고 ${save.maxRegion ?? 1}층)</p>
      </div>
    </div>`;
  }

  const atLodging = adv.isAtLodging();
  const claimableN = countClaimableAchievements(save);
  const hpPct = getPartyHealPercent(save);
  const dailyBadge = isDailyBonusClaimable(save) ? '!' : undefined;
  const newsBadge = dailyBadge;

  const lbBadge = leaderboardHubBadge(save);

  const lodgingCards: (HubCard | 'records-row')[] = [
    { sub: 'leaderboard', icon: '🏆', title: '잭펍 랭킹', desc: '주간 랭킹 · 라이브 성장 소식', tone: 'leaderboard', badge: lbBadge },
    { sub: 'trade', icon: '💰', title: '거래', desc: '재료 판매(주수입) · 포션·영약 구매', tone: 'trade' },
    { sub: 'news', icon: '📋', title: '소식', desc: '영입 · 일일·주간 보상', tone: 'news', badge: newsBadge },
    { sub: 'camp', icon: '🏕️', title: '캠프', desc: '자동 생산 · 재료 가공', tone: 'camp' },
    'records-row',
    { sub: 'dungeon', icon: '🗺️', title: '던전 출발', desc: '층 선택 후 원정 시작', tone: 'dungeon', wide: true },
  ];

  const expeditionCards: (HubCard | 'records-row')[] = [
    { sub: 'leaderboard', icon: '🏆', title: '잭펍 랭킹', desc: '주간 라이벌 · 성장 소식', tone: 'leaderboard', badge: lbBadge },
    { sub: 'dungeon', icon: '⚔️', title: '원정 현황', desc: '층 정보 · 보스 게이트', tone: 'dungeon', wide: true },
    { sub: 'camp', icon: '🏕️', title: '캠프', desc: '원정 준비 버프 확인', tone: 'camp' },
    'records-row',
  ];

  const cardList = atLodging ? lodgingCards : expeditionCards;
  const cards = cardList.map(c =>
    c === 'records-row'
      ? hubRecordsRow(save, claimableN || undefined, atLodging)
      : hubCard(c),
  ).join('');

  const incapSec = hasPartyIncapacitated(save) ? formatPartyIncapBanner(save) : '';
  const incapBlock = incapSec
    ? `<div class="town-incap-card" id="town-incap-card">
        <p class="hint warn town-incap-banner" data-party-incap-banner>${incapSec}</p>
        <p class="hint town-incap-note">🩹 전멸 후 행동불능 — 숙소 휴식 회복이 멈춥니다</p>
      </div>`
    : '';

  const restInner = adv.isLodgingResting
    ? `<div class="town-rest-card active" id="town-rest-card">
        <div class="town-rest-card-head">
          <span>🛏️ 완전 휴식 중</span>
          <strong id="town-rest-pct">${hpPct}%</strong>
        </div>
        <div class="town-rest-bar-track"><div class="town-rest-fill" id="town-rest-fill" style="width:${hpPct}%"></div></div>
        <p class="hint">${incapSec ? '행동불능 해제 후 HP가 회복됩니다' : '파티 HP가 천천히 회복됩니다'}</p>
        <button type="button" class="btn-sm" id="town-rest-stop">휴식 중단</button>
      </div>`
    : hpPct < 98
      ? `<div class="town-rest-card" id="town-rest-card">
          <div class="town-rest-card-head">
            <span>💚 파티 HP ${hpPct}%</span>
            <span class="hint">귀환 시 일부 회복</span>
          </div>
          <div class="town-rest-bar-track"><div class="town-rest-fill low" id="town-rest-fill" style="width:${hpPct}%"></div></div>
          <button type="button" class="btn-sm gold" id="town-quick-rest">완전 휴식 시작</button>
        </div>`
      : `<p class="town-rest-ready">✨ 파티 HP 충분 — 던전 출발 가능</p>`;

  const restBlock = atLodging ? `${incapBlock}${restInner}` : '';

  return `<div class="town-hub">
    <div class="panel-header town-hub-head">
      <h3>🏘️ 마을</h3>
      <span class="badge town-mode-badge">${atLodging ? '🛏️ 숙소' : '⚔️ 원정 중'}</span>
    </div>
    ${atLodging ? renderTownRewardsStrip(save) : ''}
    ${renderTownHubWidgets(save, atLodging)}
    ${restBlock}
    <div class="town-hub-grid">${cards}</div>
  </div>`;
}

export function townBackButton(): string {
  return `<button type="button" class="town-back-btn" data-town-sub="hub">
    <span class="town-back-icon">←</span> 마을 홈
  </button>`;
}
