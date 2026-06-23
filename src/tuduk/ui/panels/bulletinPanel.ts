import type { GameSave } from '../../types';
import type { CharDef, EquipRole } from '../../types';
import { CHARACTERS, CHAR_MAP } from '../../data/characters';
import { getRecruitRosterPriceMult } from '../../data/economyPricing';
import {
  BULLETIN_RECRUIT_RATE,
  BULLETIN_RECRUIT_MAX_RATE,
  BULLETIN_RECRUIT_PITY_STEP,
  getBulletinRecruitCost,
  getBulletinRecruitPityInfo,
  hasRecruitGuaranteeFor,
  isOnBulletin,
} from '../../systems/BulletinBoardSystem';
import { GEM_COST, canPurchaseRecruitGuarantee } from '../../systems/GemShop';

const ROLE_TAG: Record<EquipRole, string> = {
  tank: '탱커',
  dps: '딜러',
  healer: '힐러',
  bruiser: '브루저',
  support: '서포트',
};

const ROLE_ICON: Record<EquipRole, string> = {
  tank: '🛡️',
  dps: '⚔️',
  healer: '💚',
  bruiser: '🪓',
  support: '✨',
};

function recruitableChars(): CharDef[] {
  return CHARACTERS.filter(c => c.cost > 0);
}

function rosterDisplayName(c: CharDef, owned: boolean, onBoard: boolean): string {
  if (c.id === 'hidden' && !owned && !onBoard) return '???';
  return c.name;
}

function renderRecruitPityBar(save: GameSave, charId: string): string {
  const info = getBulletinRecruitPityInfo(save, charId);
  const basePct = Math.round(BULLETIN_RECRUIT_RATE * 100);
  const maxPct = Math.round(BULLETIN_RECRUIT_MAX_RATE * 100);
  const fill = maxPct > basePct
    ? Math.min(100, Math.round(((info.ratePct - basePct) / (maxPct - basePct)) * 100))
    : 100;
  const hint = info.atMax
    ? '최대 확률 도달'
    : info.fails > 0
      ? `실패 ${info.fails}회 · 최대까지 ${info.failsToMax}회`
      : `기본 ${basePct}% · 실패 시 +${Math.round(BULLETIN_RECRUIT_PITY_STEP * 100)}%p`;
  return `<div class="recruit-pity-bar-wrap" title="영입 실패 시 확률 상승 (최대 ${maxPct}%)">
    <div class="recruit-pity-bar"><div class="recruit-pity-fill" style="width:${fill}%"></div></div>
    <span class="recruit-pity-hint">${hint}</span>
  </div>`;
}

function renderRecruitRateBar(save: GameSave, charId: string, guaranteed: boolean): string {
  if (guaranteed) {
    return `<div class="recruit-btn-rate recruit-btn-rate--guaranteed">
      <span class="recruit-rate-pill">✨ 다음 영입 <strong>100%</strong></span>
      <span class="recruit-rate-extra">확정 예약</span>
    </div>`;
  }
  const info = getBulletinRecruitPityInfo(save, charId);
  const rosterMult = save.owned.length > 1 ? getRecruitRosterPriceMult(save.owned.length) : 0;
  const extras: string[] = [];
  if (info.fails > 0) extras.push(`실패 ${info.fails}회`);
  if (!info.atMax) extras.push(`최대까지 ${info.failsToMax}회`);
  if (rosterMult > 1) extras.push(`보유 ${save.owned.length}명 ×${rosterMult.toFixed(1)}`);
  return `<div class="recruit-btn-rate">
    <span class="recruit-rate-pill"><span class="recruit-rate-label">성공률</span><strong>${info.ratePct}%</strong></span>
    ${extras.length ? `<span class="recruit-rate-extra">${extras.join(' · ')}</span>` : ''}
    ${renderRecruitPityBar(save, charId)}
  </div>`;
}

function renderRecruitAttemptButton(
  save: GameSave,
  id: string,
  recruitCost: number,
  canAfford: boolean,
  guaranteed: boolean,
  discount: boolean,
): string {
  const tags: string[] = [];
  if (discount) tags.push('할인');
  return `<button type="button" class="recruit-attempt-btn" data-bulletin-recruit="${id}" ${canAfford ? '' : 'disabled'}>
    ${renderRecruitRateBar(save, id, guaranteed)}
    <div class="recruit-btn-body">
      <span class="recruit-btn-cost">🪙 ${recruitCost.toLocaleString()}</span>
      <span class="recruit-btn-sep" aria-hidden="true"></span>
      <span class="recruit-btn-label">영입 시도</span>
      ${tags.length ? `<span class="recruit-btn-tag">${tags.join(' · ')}</span>` : ''}
    </div>
  </button>`;
}

function renderRecruitGemButton(save: GameSave, id: string, guaranteed: boolean): string {
  const canGem = canPurchaseRecruitGuarantee(save, id);
  if (guaranteed) {
    return `<button type="button" class="recruit-gem-btn is-booked" data-bulletin-gem="${id}" disabled>
      <span class="recruit-gem-label">✨ 확정 예약됨</span>
    </button>`;
  }
  return `<button type="button" class="recruit-gem-btn" data-bulletin-gem="${id}" ${canGem ? '' : 'disabled'}>
    <span class="recruit-gem-cost">💎 ${GEM_COST.recruitGuarantee}</span>
    <span class="recruit-gem-sep" aria-hidden="true"></span>
    <span class="recruit-gem-label">다음 100% 확정</span>
  </button>`;
}

function miniStatLine(c: CharDef): string {
  const role = ROLE_TAG[c.equipRole] ?? c.jobLabel;
  const tags: string[] = [role];
  if (c.aoe) tags.push('광역');
  if (c.pierce) tags.push('관통');
  if (c.berserk) tags.push('광폭');
  return tags.join(' · ');
}

export function renderBulletinStatsStrip(save: GameSave, heroIds: string[]): string {
  const pool = recruitableChars();
  const ownedRecruitable = pool.filter(c => save.owned.includes(c.id)).length;
  const maxPct = Math.round(BULLETIN_RECRUIT_MAX_RATE * 100);
  const pityStep = Math.round(BULLETIN_RECRUIT_PITY_STEP * 100);
  return `<div class="bulletin-stats-strip">
    <span class="bulletin-stat"><strong>${pool.length}</strong>명 명단</span>
    <span class="bulletin-stat-dot">·</span>
    <span class="bulletin-stat">보유 <strong>${ownedRecruitable}</strong></span>
    <span class="bulletin-stat-dot">·</span>
    <span class="bulletin-stat">오늘 모집 <strong>${heroIds.length}</strong></span>
    <span class="bulletin-stat-dot">·</span>
    <span class="bulletin-stat bulletin-pity-hint" title="실패할 때마다 확률 상승">피티 +${pityStep}%p (최대 ${maxPct}%)</span>
  </div>`;
}

export function renderBulletinRecruitCard(save: GameSave, id: string): string {
  const c = CHAR_MAP[id];
  if (!c) return '';
  const recruitCost = getBulletinRecruitCost(save, id);
  const discount = id === 'mujang' && save.onboarding?.mujangDiscountAvailable;
  const canAfford = save.gold >= recruitCost;
  const guaranteed = hasRecruitGuaranteeFor(save, id);
  const role = ROLE_TAG[c.equipRole] ?? c.jobLabel;
  const roleIcon = ROLE_ICON[c.equipRole] ?? '⚔️';

  return `<article class="bulletin-recruit-card ${guaranteed ? 'bulletin-guaranteed' : ''}" data-bulletin-hero="${id}">
    <div class="bulletin-recruit-portrait-wrap" style="--hero-accent:${c.color}">
      <canvas class="bulletin-portrait" data-char-id="${id}" aria-hidden="true"></canvas>
      <span class="bulletin-recruit-role">${roleIcon} ${role}</span>
    </div>
    <div class="bulletin-recruit-body">
      <div class="bulletin-recruit-head">
        <div class="bulletin-recruit-title-row">
          <strong class="bulletin-recruit-name">${c.name}</strong>
          ${guaranteed
            ? '<span class="bulletin-status-badge guarantee">✨ 확정</span>'
            : '<span class="bulletin-status-badge spotlight">모집 중</span>'}
        </div>
        <span class="bulletin-recruit-job">${c.jobLabel}</span>
      </div>
      <p class="bulletin-recruit-desc">${c.desc}</p>
      <p class="bulletin-recruit-meta">${miniStatLine(c)}</p>
      <div class="bulletin-recruit-actions">
        ${renderRecruitAttemptButton(save, id, recruitCost, canAfford, guaranteed, !!discount)}
        ${renderRecruitGemButton(save, id, guaranteed)}
      </div>
    </div>
  </article>`;
}

export function renderBulletinRecruitGrid(save: GameSave, heroIds: string[]): string {
  if (!heroIds.length) {
    return `<div class="bulletin-recruit-empty">
      <p class="lodging-empty">지금은 모집 게시가 비었어요.</p>
      <p class="hint">모두 영입했거나 30분 후 새 용사가 찾아옵니다 · 아래 명단에서 기다리는 동료를 확인하세요.</p>
    </div>`;
  }
  const cards = heroIds.map(id => renderBulletinRecruitCard(save, id)).join('');
  return `<div class="bulletin-recruit-grid">${cards}</div>`;
}

export function renderHeroRosterGrid(save: GameSave, heroIds: string[]): string {
  const onBoard = new Set(heroIds);
  const chars = recruitableChars().slice().sort((a, b) => {
    const aOwned = save.owned.includes(a.id) ? 0 : 1;
    const bOwned = save.owned.includes(b.id) ? 0 : 1;
    if (aOwned !== bOwned) return aOwned - bOwned;
    const aSpot = onBoard.has(a.id) ? 0 : 1;
    const bSpot = onBoard.has(b.id) ? 0 : 1;
    if (aSpot !== bSpot) return aSpot - bSpot;
    return a.cost - b.cost;
  });

  const tiles = chars.map(c => {
    const owned = save.owned.includes(c.id);
    const spotlight = onBoard.has(c.id);
    const hidden = c.id === 'hidden' && !owned && !spotlight;
    const role = ROLE_TAG[c.equipRole] ?? c.jobLabel;
    const status = owned
      ? '<span class="hero-roster-status owned">보유</span>'
      : spotlight
        ? '<span class="hero-roster-status spotlight">모집 중</span>'
        : '<span class="hero-roster-status waiting">대기</span>';
    const stateClass = owned ? 'owned' : spotlight ? 'spotlight' : 'waiting';
    const portraitId = hidden ? '' : c.id;

    return `<div class="hero-roster-tile ${stateClass}" style="--hero-accent:${c.color}">
      <div class="hero-roster-portrait-wrap">
        ${portraitId
          ? `<canvas class="hero-roster-portrait" data-char-id="${portraitId}" aria-hidden="true"></canvas>`
          : '<span class="hero-roster-mystery" aria-hidden="true">?</span>'}
        ${spotlight && !owned ? '<span class="hero-roster-pin">📌</span>' : ''}
      </div>
      <div class="hero-roster-info">
        <div class="hero-roster-title-row">
          <strong>${rosterDisplayName(c, owned, spotlight)}</strong>
          ${status}
        </div>
        <span class="hero-roster-role">${c.jobLabel} · ${role}</span>
        <p class="hero-roster-desc">${hidden ? '벽보에 올라오면 정체가 밝혀집니다…' : c.desc}</p>
        ${!owned && !hidden
          ? (() => {
            const pity = spotlight ? getBulletinRecruitPityInfo(save, c.id) : null;
            const pityLine = pity && pity.fails > 0
              ? ` · 실패 ${pity.fails}회 → ${pity.ratePct}%`
              : spotlight
                ? ` · 영입 ${getBulletinRecruitPityInfo(save, c.id).ratePct}%`
                : '';
            return `<span class="hero-roster-cost hint">예상 🪙${getBulletinRecruitCost(save, c.id).toLocaleString()}${pityLine}${isOnBulletin(save, c.id) ? '' : ' · 모집 대기'}</span>`;
          })()
          : ''}
      </div>
    </div>`;
  }).join('');

  return `<div class="hero-roster-section">
    <div class="hero-roster-headline">
      <h4>📜 모험단 영웅 명단</h4>
      <p class="hint">숙소 게시판에 올라온 용사만 🪙영입할 수 있어요. 갱신·새로고침으로 모집 라인업을 바꿀 수 있습니다.</p>
      ${!save.owned.includes('hidden') ? '<p class="hint">??? 히든카드 — 영입 풀 랜덤 등장 · 실패 시 확률↑ (최대 28%) · 💎확정 가능</p>' : ''}
    </div>
    <div class="hero-roster-grid">${tiles}</div>
  </div>`;
}

export function renderBulletinRerollRow(rerollCost: number, canReroll: boolean, canGemReroll: boolean): string {
  return `<div class="bulletin-reroll-row">
    <button type="button" class="tuku-split-btn tuku-split-btn--warn" id="bulletin-reroll" ${canReroll ? '' : 'disabled'}>
      <span class="tuku-split-top">🔄 모집 새로고침</span>
      <span class="tuku-split-main">
        <span class="tuku-split-cost">🪙 ${rerollCost.toLocaleString()}</span>
      </span>
    </button>
    <button type="button" class="recruit-gem-btn" id="bulletin-gem-reroll" ${canGemReroll ? '' : 'disabled'}>
      <span class="recruit-gem-cost">💎 ${GEM_COST.bulletinReroll}</span>
      <span class="recruit-gem-sep" aria-hidden="true"></span>
      <span class="recruit-gem-label">즉시 새로고침</span>
    </button>
  </div>`;
}
