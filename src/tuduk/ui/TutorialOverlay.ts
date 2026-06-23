import type { GameSave } from '../types';
import { MAX_PARTY_SIZE } from '../types';
import { saveGame } from '../core/SaveManager';
import { getGuideChapter } from '../systems/OnboardingSystem';
import { bindTap } from '../utils/bindTap';


const STEPS: { title: string; body: string; tab?: string; highlight?: string }[] = [

  {

    title: '투닥투닥 RPG',

    body: '상단 화면을 연타하면 추가 피해! 지금 한번 터치해 보세요.',

    highlight: '#adventure-canvas',

  },

  {

    title: `모험단 (최대 ${MAX_PARTY_SIZE}명)`,

    body: '[모험단]에서 동료 영입·파티 편성. 조합 힌트를 참고하고 버퍼·서포트를 섞어보세요.',

    tab: 'party',

  },

  {

    title: '강해지기 & 장비',

    body: '[강해지기]에서 스킬 습득·장비 제작. 속성 스킬은 약점 몬스터에 1.32배 피해!',

    tab: 'growth',

  },

  {

    title: '던전 · 숙소 루프',

    body: '[마을]에서 던전 출발 → 재료 수집 → 🛏️ 숙소 귀환 → [거래]에서 판매! 마을 홈에서 완전 휴식.',

    tab: 'town',

    highlight: '#return-lodge-wrap',

  },

  {

    title: '젬 & 편의',

    body: '상단 ⚙️에서 💎 젬으로 포션·2배속·재료 상자를 사용할 수 있어요. [소식]에서 확정 영입도 가능!',

    tab: 'settings',

  },

];



export function isTutorialDone(save: GameSave): boolean {

  return (save.tutorialStep ?? 0) >= STEPS.length;

}



export class TutorialOverlay {

  private el: HTMLElement | null = null;



  constructor(

    private root: HTMLElement,

    private getSave: () => GameSave,

    private onStep: (tab?: string) => void,

  ) {}



  update(trigger?: 'touch' | 'tab') {

    const save = this.getSave();

    const step = save.tutorialStep ?? 0;

    if (getGuideChapter(save) > 0) {
      this.hide();
      return;
    }

    if (step >= STEPS.length) {

      this.hide();

      return;

    }



    if (step === 0 && trigger !== 'touch') {

      this.show(STEPS[0]!, step);

      return;

    }

    if (step > 0 && trigger === 'touch' && step === 1) return;

    if (step > 0 && !trigger) {

      this.show(STEPS[step]!, step);

    }

  }



  advance() {

    const save = this.getSave();

    const step = save.tutorialStep ?? 0;

    if (step >= STEPS.length) return;

    const cur = STEPS[step];

    save.tutorialStep = step + 1;
    saveGame(save);

    if (cur?.tab) this.onStep(cur.tab);

    this.hide();

    if (save.tutorialStep < STEPS.length) {

      setTimeout(() => this.update(), 400);

    }

  }



  onTouch() {

    const save = this.getSave();

    if ((save.tutorialStep ?? 0) === 0) {

      save.tutorialStep = 1;
      saveGame(save);

      this.hide();

      setTimeout(() => this.update(), 500);

    }

  }



  private show(step: typeof STEPS[number], index: number) {

    this.hide();

    const el = document.createElement('div');

    el.className = 'tutorial-overlay';

    el.innerHTML = `

      <div class="tutorial-card">

        <span class="tutorial-step">${index + 1} / ${STEPS.length}</span>

        <h3>${step.title}</h3>

        <p>${step.body}</p>

        <button type="button" class="btn-sm gold tutorial-next">다음</button>

      </div>`;

    bindTap(el.querySelector('.tutorial-next'), () => this.advance());

    document.body.appendChild(el);

    this.el = el;

    if (step.highlight) {

      const target = document.querySelector(step.highlight);

      target?.classList.add('tutorial-highlight');

    }

  }



  hide() {

    document.querySelectorAll('.tutorial-highlight').forEach(e => e.classList.remove('tutorial-highlight'));

    this.el?.remove();

    this.el = null;

  }

}

