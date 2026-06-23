import type { SpireCombatSetup } from '../systems/SpireSystem';
import { audio } from '../core/AudioManager';
import { bindTap } from '../utils/bindTap';

export interface SpireCombatResult {
  damageDealt: number;
  tapCount: number;
}

const COMBAT_DURATION_SEC = 10;

/** 무한의 탑 10초 미니 전투 — 균열과 동일 패턴 */
export function runSpireCombatOverlay(
  setup: SpireCombatSetup,
  onComplete: (result: SpireCombatResult) => void,
): Promise<void> {
  return new Promise(resolve => {
    const root = document.createElement('div');
    root.className = 'rift-combat-overlay spire-combat-overlay';
    root.innerHTML = `
      <div class="rift-combat-card">
        <h3>🗼 ${setup.floorName}</h3>
        <p class="rift-combat-sub">${setup.modIcon} ${setup.modName} · ${COMBAT_DURATION_SEC}초 등반</p>
        <div class="rift-enemy-hp">
          <div class="rift-enemy-hp-fill" style="width:100%"></div>
        </div>
        <p class="rift-hp-label">층 저항 <span class="rift-hp-num">${setup.enemyHp.toLocaleString()}</span></p>
        <div class="rift-timer-bar">
          <div class="rift-timer-fill"></div>
        </div>
        <p class="rift-timer-label"><span class="rift-time-left">${COMBAT_DURATION_SEC.toFixed(1)}</span>초</p>
        <p class="rift-dmg-label">누적 화력 <span class="rift-dmg-num">0</span></p>
        <button type="button" class="rift-tap-btn">투닥!</button>
        <p class="hint">자동 DPS + 투닥으로 등반 화력 보조</p>
      </div>`;
    document.body.appendChild(root);

    let elapsed = 0;
    let damage = 0;
    let taps = 0;
    let running = true;
    let lastTick = performance.now();

    const hpFill = root.querySelector('.rift-enemy-hp-fill') as HTMLElement;
    const hpNum = root.querySelector('.rift-hp-num') as HTMLElement;
    const timerFill = root.querySelector('.rift-timer-fill') as HTMLElement;
    const timeLeft = root.querySelector('.rift-time-left') as HTMLElement;
    const dmgNum = root.querySelector('.rift-dmg-num') as HTMLElement;
    const tapBtn = root.querySelector('.rift-tap-btn') as HTMLButtonElement;

    const finish = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
      root.classList.add('rift-combat-out');
      setTimeout(() => {
        root.remove();
        onComplete({ damageDealt: Math.floor(damage), tapCount: taps });
        resolve();
      }, 280);
    };

    const addTapDamage = () => {
      taps += 1;
      damage += setup.tapDamage;
      audio.playTab();
      root.classList.add('rift-tap-flash');
      setTimeout(() => root.classList.remove('rift-tap-flash'), 80);
      updateUi();
      if (damage >= setup.enemyHp) finish();
    };

    bindTap(tapBtn, addTapDamage);

    const updateUi = () => {
      const remainHp = Math.max(0, setup.enemyHp - damage);
      const hpPct = Math.max(0, (remainHp / setup.enemyHp) * 100);
      hpFill.style.width = `${hpPct}%`;
      hpNum.textContent = remainHp.toLocaleString();
      dmgNum.textContent = Math.floor(damage).toLocaleString();
      const timeRemain = Math.max(0, COMBAT_DURATION_SEC - elapsed);
      timeLeft.textContent = timeRemain.toFixed(1);
      timerFill.style.width = `${(elapsed / COMBAT_DURATION_SEC) * 100}%`;
    };

    let rafId = 0;
    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - lastTick) / 1000);
      lastTick = now;
      elapsed += dt;
      damage += setup.dpsPerSec * dt;
      updateUi();
      if (damage >= setup.enemyHp || elapsed >= COMBAT_DURATION_SEC) {
        finish();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    updateUi();
  });
}
