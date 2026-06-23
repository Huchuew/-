import type { GameSave } from '../types';
import { getEndgameUnlockHint } from '../systems/playerGuide';
import { getAdventureTeamName } from '../data/starterSurvey';
import { bindTap } from '../utils/bindTap';

export interface Floor18ClearModalOpts {
  firstClear?: boolean;
}

/** 18층 최종 클리어 축하 모달 */
export function showFloor18ClearModal(
  root: HTMLElement,
  save: GameSave,
  onReturnTown: () => void,
  opts?: Floor18ClearModalOpts,
): void {
  root.querySelector('#floor18-clear-modal')?.remove();

  const firstClear = opts?.firstClear !== false;
  const team = getAdventureTeamName(save);

  const overlay = document.createElement('div');
  overlay.id = 'floor18-clear-modal';
  overlay.className = 'settlement-modal floor18-clear-modal';
  overlay.innerHTML = firstClear
    ? `
    <div class="settlement-panel floor18-clear-panel floor18-clear-panel--legend" role="dialog" aria-modal="true">
      <header class="settlement-head floor18-clear-head">
        <div>
          <p class="floor18-clear-icon" aria-hidden="true">👑</p>
          <p class="floor18-clear-rank">1등 · 극</p>
          <h2>전설 달성!</h2>
          <p class="floor18-clear-lead">지하철 던전 18층 완전 정복</p>
        </div>
      </header>
      <div class="settlement-body floor18-clear-body">
        <p class="floor18-clear-msg">
          <strong>${team}</strong>이(가) 모란 최종 보스를 격파했습니다!<br/>
          당신은 이 던전을 끝까지 돌파한 <b>최초의 1등</b> 모험단입니다.
        </p>
        <p class="hint floor18-clear-hint">
          🏅 붉은꽃의 배지 · 18층 올클리어 · 엔드게임 해금
        </p>
        <p class="hint floor18-endgame-hint">${getEndgameUnlockHint(save)}</p>
      </div>
      <footer class="settlement-foot floor18-clear-foot">
        <button type="button" class="btn-primary floor18-return-btn">🏠 마을로 돌아가기</button>
      </footer>
    </div>`
    : `
    <div class="settlement-panel floor18-clear-panel" role="dialog" aria-modal="true">
      <header class="settlement-head floor18-clear-head">
        <div>
          <p class="floor18-clear-icon" aria-hidden="true">🏆</p>
          <h2>18층 모란 정복!</h2>
        </div>
      </header>
      <div class="settlement-body floor18-clear-body">
        <p class="floor18-clear-msg">${team} — 모란 보스를 격파했습니다.</p>
      </div>
      <footer class="settlement-foot floor18-clear-foot">
        <button type="button" class="btn-primary floor18-return-btn">🏠 마을로 돌아가기</button>
      </footer>
    </div>`;

  bindTap(overlay.querySelector('.floor18-return-btn'), () => {
    overlay.remove();
    onReturnTown();
  });

  root.appendChild(overlay);
}
