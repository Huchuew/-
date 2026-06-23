import { assetUrl } from '../assets/AssetLoader';
import { CHAR_MAP } from '../data/characters';
import { REGIONS } from '../data/regions';
import {
  formatStarterSimMeta, getStarterProfile, renderStarterRatingRows,
} from '../data/starterBalance';
import {
  COMBAT_OPTIONS,
  formatHomeStationBonus,
  getPrimaryRecommendation,
  normalizeTeamIdentity,
  validateTeamIdentity,
  getRegionName,
  getStationIcon,
  MOTIVATION_OPTIONS,
  PACE_OPTIONS,
  PLAYSTYLE_OPTIONS,
  recommendStarterChars,
  SURVEY_STORY,
  type CombatPrefId,
  type MotivationId,
  type PaceId,
  type PlaystyleId,
  type StarterSurveyAnswers,
  type SurveyOption,
} from '../data/starterSurvey';
import { loadTinyRpgManifest } from '../data/tinyRpgAnim';
import { STUDIO_NAME } from '../config/release';
import { paintSurveyPortraits } from '../render/FormationPortrait';
import type { EquipRole } from '../types';
import type { StarterSaveOpts } from '../core/SaveManager';
import { STARTER_CHAR_IDS } from './StarterSelect';
import { attachPanelPointerGuard } from '../utils/panelPointerGuard';

const ROLE_TAG: Record<EquipRole, string> = {
  tank: '탱커', dps: '딜러', healer: '힐러', bruiser: '브루저', support: '서포트',
};

const SURVEY_STEPS = [
  'intro', 'motivation', 'playstyle', 'pace', 'combat', 'station', 'team', 'character',
] as const;
type SurveyStep = typeof SURVEY_STEPS[number];

function renderCharCard(id: string, opts: { featured?: boolean; rank?: number } = {}): string {
  const c = CHAR_MAP[id]!;
  const role = ROLE_TAG[c.equipRole] ?? c.jobLabel;
  const profile = getStarterProfile(id);
  const simMeta = formatStarterSimMeta(id);
  const ratings = renderStarterRatingRows(id);
  const featured = opts.featured ? ' survey-char-card--featured' : '';
  const rankBadge = opts.rank != null
    ? `<span class="survey-rec-badge">추천 ${opts.rank}</span>`
    : '';
  return `
    <button class="survey-char-card${featured}" data-starter="${id}" type="button">
      ${rankBadge}
      <canvas class="survey-portrait" data-char-id="${id}" width="72" height="72" aria-hidden="true"></canvas>
      <span class="survey-char-name">${c.name}</span>
      <span class="survey-char-job">${c.jobLabel} · ${role}</span>
      ${ratings}
      <span class="starter-sim-meta">${simMeta}</span>
      <span class="survey-char-desc">${profile?.hint ?? c.desc}</span>
    </button>`;
}

function renderStepDots(step: SurveyStep): string {
  const idx = SURVEY_STEPS.indexOf(step);
  return SURVEY_STEPS.map((s, i) => {
    const cls = i === idx ? 'active' : i < idx ? 'done' : '';
    return `<span class="survey-dot ${cls}" title="${i + 1}단계"></span>`;
  }).join('');
}

function renderStoryLead(text: string): string {
  return `<p class="survey-story-lead">${text}</p>`;
}

function renderOptionList(
  options: SurveyOption[],
  dataAttr: string,
  selectedId: string | null,
): string {
  return options.map(o => `
    <button class="survey-opt${selectedId === o.id ? ' selected' : ''}"
      data-${dataAttr}="${o.id}" type="button">
      <span class="survey-opt-icon">${o.icon}</span>
      <span class="survey-opt-text">
        <strong>${o.title}</strong>
        <span>${o.desc}</span>
      </span>
    </button>`).join('');
}

export function showStarterSurvey(
  container: HTMLElement,
  onPick: (charId: string, opts: StarterSaveOpts) => void,
): () => void {
  const bgUrl = assetUrl('assets/starter-survey-bg.png');
  const ac = new AbortController();
  let step: SurveyStep = 'intro';
  let motivation: MotivationId | null = null;
  let playstyle: PlaystyleId | null = null;
  let pace: PaceId | null = null;
  let combat: CombatPrefId | null = null;
  let homeStationId: number | null = null;
  let teamName = '';
  let playerNick = '';
  let charTab: 'recommend' | 'all' = 'recommend';

  void loadTinyRpgManifest().then(() => {
    if (container.querySelector('#starter-survey')) paintSurveyPortraits(container);
  });

  const answers = (): StarterSurveyAnswers | null => {
    if (!motivation || !playstyle || !pace || !combat || !homeStationId) return null;
    return { motivation, playstyle, pace, combat, homeStationId };
  };

  const questionNum = (): number => {
    const qSteps: SurveyStep[] = ['motivation', 'playstyle', 'pace', 'combat', 'station', 'team'];
    const i = qSteps.indexOf(step);
    return i >= 0 ? i + 1 : 0;
  };

  let picked = false;
  const surveyGuard = attachPanelPointerGuard(container);

  const render = () => {
    const dots = renderStepDots(step);
    let body = '';

    if (step === 'intro') {
      const story = SURVEY_STORY.intro;
      body = `
        <div class="survey-story-box">
          <p class="survey-story-tag">— 프롤로그 —</p>
          <h3 class="survey-story-title">${story.title}</h3>
          ${story.lines.map(l => `<p class="survey-story-line">${l}</p>`).join('')}
          <p class="survey-story-quote">${story.quote}</p>
        </div>
        <div class="survey-nav survey-nav--center">
          <button class="survey-btn primary" data-action="intro-next" type="button">모험 준비하기 →</button>
        </div>`;
    } else if (step === 'motivation') {
      const s = SURVEY_STORY.motivation;
      body = `
        <p class="survey-q-num">질문 ${questionNum()} / 5</p>
        ${renderStoryLead(s.lead)}
        <h3 class="survey-q">${s.question}</h3>
        <div class="survey-opt-list">${renderOptionList(MOTIVATION_OPTIONS, 'motivation', motivation)}</div>
        <div class="survey-nav">
          <button class="survey-btn ghost" data-action="back" type="button">← 이전</button>
          <button class="survey-btn primary" data-action="motivation-next" type="button"
            ${motivation ? '' : 'disabled'}>다음 →</button>
        </div>`;
    } else if (step === 'playstyle') {
      const s = SURVEY_STORY.playstyle;
      body = `
        <p class="survey-q-num">질문 ${questionNum()} / 5</p>
        ${renderStoryLead(s.lead)}
        <h3 class="survey-q">${s.question}</h3>
        <div class="survey-opt-list">${renderOptionList(PLAYSTYLE_OPTIONS, 'playstyle', playstyle)}</div>
        <div class="survey-nav">
          <button class="survey-btn ghost" data-action="back" type="button">← 이전</button>
          <button class="survey-btn primary" data-action="playstyle-next" type="button"
            ${playstyle ? '' : 'disabled'}>다음 →</button>
        </div>`;
    } else if (step === 'pace') {
      const s = SURVEY_STORY.pace;
      body = `
        <p class="survey-q-num">질문 ${questionNum()} / 5</p>
        ${renderStoryLead(s.lead)}
        <h3 class="survey-q">${s.question}</h3>
        <div class="survey-opt-list">${renderOptionList(PACE_OPTIONS, 'pace', pace)}</div>
        <div class="survey-nav">
          <button class="survey-btn ghost" data-action="back" type="button">← 이전</button>
          <button class="survey-btn primary" data-action="pace-next" type="button"
            ${pace ? '' : 'disabled'}>다음 →</button>
        </div>`;
    } else if (step === 'combat') {
      const s = SURVEY_STORY.combat;
      body = `
        <p class="survey-q-num">질문 ${questionNum()} / 5</p>
        ${renderStoryLead(s.lead)}
        <h3 class="survey-q">${s.question}</h3>
        <div class="survey-opt-list">${renderOptionList(COMBAT_OPTIONS, 'combat', combat)}</div>
        <div class="survey-nav">
          <button class="survey-btn ghost" data-action="back" type="button">← 이전</button>
          <button class="survey-btn primary" data-action="combat-next" type="button"
            ${combat ? '' : 'disabled'}>다음 →</button>
        </div>`;
    } else if (step === 'station') {
      const s = SURVEY_STORY.station;
      const stations = REGIONS.map(r => `
        <button class="survey-station${homeStationId === r.id ? ' selected' : ''}"
          data-station="${r.id}" type="button">
          <span class="survey-station-icon">${getStationIcon(r.id)}</span>
          <span class="survey-station-floor">${r.id}층</span>
          <span class="survey-station-name">${r.name}</span>
          <span class="survey-station-bonus">클리어 시 ${formatHomeStationBonus(r.id)}</span>
        </button>`).join('');
      body = `
        <p class="survey-q-num">질문 ${questionNum()} / 5</p>
        ${renderStoryLead(s.lead)}
        <h3 class="survey-q">${s.question}</h3>
        <p class="survey-sub">${s.sub}</p>
        <div class="survey-station-grid">${stations}</div>
        <div class="survey-nav">
          <button class="survey-btn ghost" data-action="back" type="button">← 이전</button>
          <button class="survey-btn primary" data-action="station-next" type="button"
            ${homeStationId ? '' : 'disabled'}>동료 추천 받기 →</button>
        </div>`;
    } else if (step === 'team') {
      const s = SURVEY_STORY.team;
      const stationName = homeStationId ? getRegionName(homeStationId) : '투닥';
      const defaultTeam = teamName || `${stationName} 모험단`;
      const defaultNick = playerNick;
      body = `
        <p class="survey-q-num">질문 ${questionNum()} / 6</p>
        ${renderStoryLead(s.lead)}
        <h3 class="survey-q">${s.question}</h3>
        <p class="survey-sub">${s.sub}</p>
        <div class="survey-team-fields">
          <label class="survey-field">
            <span>모험단 이름</span>
            <input type="text" class="survey-input" id="survey-team-name" maxlength="16"
              placeholder="${stationName} 모험단" value="${defaultTeam}" />
          </label>
          <label class="survey-field">
            <span>대표 닉네임</span>
            <input type="text" class="survey-input" id="survey-player-nick" maxlength="10"
              placeholder="닉네임 입력" value="${defaultNick}" required />
          </label>
        </div>
        <p class="survey-field-error hidden" id="survey-team-error" role="alert"></p>
        <div class="survey-nav">
          <button class="survey-btn ghost" data-action="back" type="button">← 이전</button>
          <button class="survey-btn primary" data-action="team-next" type="button">동료 추천 받기 →</button>
        </div>`;
    } else {
      const a = answers()!;
      const recIds = recommendStarterChars(a, 3);
      const primary = getPrimaryRecommendation(a);
      const stationName = getRegionName(homeStationId!);
      const s = SURVEY_STORY.character;
      const recCards = recIds.map((id, i) => renderCharCard(id, { featured: id === primary, rank: i + 1 })).join('');
      const allCards = [...STARTER_CHAR_IDS]
        .sort((x, y) => (getStarterProfile(x)?.simRank ?? 99) - (getStarterProfile(y)?.simRank ?? 99))
        .map(id => renderCharCard(id))
        .join('');
      const showRec = charTab === 'recommend';
      body = `
        ${renderStoryLead(s.lead)}
        <h3 class="survey-q">${s.question}</h3>
        <p class="survey-sub">
          <span class="survey-home-chip">${getStationIcon(homeStationId!)} ${stationName}</span>
          · 본인 지점 최초 클리어 보너스 ${formatHomeStationBonus(homeStationId!)}
        </p>
        <div class="survey-char-tabs">
          <button class="survey-char-tab${showRec ? ' active' : ''}" data-tab="recommend" type="button">
            ⭐ 추천 동료
          </button>
          <button class="survey-char-tab${!showRec ? ' active' : ''}" data-tab="all" type="button">
            🎭 다른 캐릭터 선택
          </button>
        </div>
        <p class="survey-rating-guide">🌱 초반 = 쉬울수록 동그라미 가득 · 📈 후반 = 성장 클수록 가득</p>
        <div class="survey-char-panel${showRec ? '' : ' hidden'}">
          <p class="survey-rec-hint">설문 결과 · 상위 ${recIds.length}명 중 선택하세요</p>
          <div class="survey-char-grid survey-char-grid--rec">${recCards}</div>
        </div>
        <div class="survey-char-panel${showRec ? ' hidden' : ''}">
          <p class="survey-rec-hint">전체 시작 캐릭터 · 원하는 동료를 고르세요</p>
          <div class="survey-char-grid">${allCards}</div>
        </div>
        <div class="survey-nav">
          <button class="survey-btn ghost" data-action="back" type="button">← 이전</button>
        </div>`;
    }

    container.innerHTML = `
      <div id="starter-survey" style="--survey-bg: url('${bgUrl}')">
        <div class="survey-bg"></div>
        <div class="survey-panel">
          <p class="starter-studio">${STUDIO_NAME}</p>
          <h2 class="survey-title">⚔️ 투닥투닥RPG</h2>
          <div class="survey-steps">${dots}</div>
          ${body}
        </div>
      </div>`;

    paintSurveyPortraits(container);
  };

  const prevStep = (s: SurveyStep): SurveyStep | null => {
    const i = SURVEY_STEPS.indexOf(s);
    return i > 0 ? SURVEY_STEPS[i - 1]! : null;
  };

  const onSurveyTap = (e: Event) => {
    if (picked) return;
    const target = e.target as HTMLElement;
    if (surveyGuard.consumeScrollGesture(target, e)) return;
    const t = target;

    if (t.closest('[data-action="intro-next"]')) {
      step = 'motivation';
      render();
      return;
    }

    const motBtn = t.closest<HTMLButtonElement>('[data-motivation]');
    if (motBtn?.dataset.motivation) {
      motivation = motBtn.dataset.motivation as MotivationId;
      container.querySelectorAll('[data-motivation]').forEach(b => {
        b.classList.toggle('selected', (b as HTMLButtonElement).dataset.motivation === motivation);
      });
      const next = container.querySelector<HTMLButtonElement>('[data-action="motivation-next"]');
      if (next) next.disabled = false;
      return;
    }
    if (t.closest('[data-action="motivation-next"]') && motivation) {
      step = 'playstyle';
      render();
      return;
    }

    const playBtn = t.closest<HTMLButtonElement>('[data-playstyle]');
    if (playBtn?.dataset.playstyle) {
      playstyle = playBtn.dataset.playstyle as PlaystyleId;
      container.querySelectorAll('[data-playstyle]').forEach(b => {
        b.classList.toggle('selected', (b as HTMLButtonElement).dataset.playstyle === playstyle);
      });
      const next = container.querySelector<HTMLButtonElement>('[data-action="playstyle-next"]');
      if (next) next.disabled = false;
      return;
    }
    if (t.closest('[data-action="playstyle-next"]') && playstyle) {
      step = 'pace';
      render();
      return;
    }

    const paceBtn = t.closest<HTMLButtonElement>('[data-pace]');
    if (paceBtn?.dataset.pace) {
      pace = paceBtn.dataset.pace as PaceId;
      container.querySelectorAll('[data-pace]').forEach(b => {
        b.classList.toggle('selected', (b as HTMLButtonElement).dataset.pace === pace);
      });
      const next = container.querySelector<HTMLButtonElement>('[data-action="pace-next"]');
      if (next) next.disabled = false;
      return;
    }
    if (t.closest('[data-action="pace-next"]') && pace) {
      step = 'combat';
      render();
      return;
    }

    const combatBtn = t.closest<HTMLButtonElement>('[data-combat]');
    if (combatBtn?.dataset.combat) {
      combat = combatBtn.dataset.combat as CombatPrefId;
      container.querySelectorAll('[data-combat]').forEach(b => {
        b.classList.toggle('selected', (b as HTMLButtonElement).dataset.combat === combat);
      });
      const next = container.querySelector<HTMLButtonElement>('[data-action="combat-next"]');
      if (next) next.disabled = false;
      return;
    }
    if (t.closest('[data-action="combat-next"]') && combat) {
      step = 'station';
      render();
      return;
    }

    const stationBtn = t.closest<HTMLButtonElement>('[data-station]');
    if (stationBtn?.dataset.station) {
      homeStationId = Number(stationBtn.dataset.station);
      container.querySelectorAll('[data-station]').forEach(b => {
        b.classList.toggle('selected', (b as HTMLButtonElement).dataset.station === stationBtn.dataset.station);
      });
      const next = container.querySelector<HTMLButtonElement>('[data-action="station-next"]');
      if (next) next.disabled = false;
      return;
    }
    if (t.closest('[data-action="station-next"]') && homeStationId) {
      const stationName = getRegionName(homeStationId);
      if (!teamName) teamName = `${stationName} 모험단`;
      step = 'team';
      render();
      return;
    }

    if (t.closest('[data-action="team-next"]') && homeStationId) {
      const teamInput = container.querySelector<HTMLInputElement>('#survey-team-name');
      const nickInput = container.querySelector<HTMLInputElement>('#survey-player-nick');
      const errEl = container.querySelector<HTMLElement>('#survey-team-error');
      const rawTeam = teamInput?.value ?? teamName;
      const rawNick = nickInput?.value ?? playerNick;
      const err = validateTeamIdentity(rawTeam, rawNick);
      if (err) {
        if (errEl) {
          errEl.textContent = err;
          errEl.classList.remove('hidden');
        }
        nickInput?.focus();
        return;
      }
      if (errEl) errEl.classList.add('hidden');
      const ids = normalizeTeamIdentity(rawTeam, rawNick, homeStationId);
      if (!ids.playerNickname) return;
      teamName = ids.adventureTeamName;
      playerNick = ids.playerNickname;
      step = 'character';
      charTab = 'recommend';
      render();
      return;
    }

    if (t.closest('[data-action="back"]')) {
      const prev = prevStep(step);
      if (prev) {
        step = prev;
        render();
      }
      return;
    }

    const tabBtn = t.closest<HTMLButtonElement>('[data-tab]');
    if (tabBtn?.dataset.tab === 'recommend' || tabBtn?.dataset.tab === 'all') {
      charTab = tabBtn.dataset.tab;
      render();
      return;
    }

    const charBtn = t.closest<HTMLButtonElement>('[data-starter]');
    const ans = answers();
    if (charBtn?.dataset.starter && ans) {
      picked = true;
      ac.abort();
      container.querySelectorAll('[data-starter]').forEach(b => { (b as HTMLButtonElement).disabled = true; });
      onPick(charBtn.dataset.starter, {
        homeStationId: ans.homeStationId,
        adventureTeamName: teamName || `${getRegionName(ans.homeStationId)} 모험단`,
        playerNickname: playerNick || '단장',
        survey: ans,
      });
    }
  };

  container.addEventListener('pointerup', onSurveyTap, { signal: ac.signal });
  container.addEventListener('click', onSurveyTap, { signal: ac.signal });

  render();
  return () => ac.abort();
}
