import Phaser from 'phaser';
import { FONTS } from './theme';

/** 히트스톱 — 강한 타격 시 잠깐 멈춤 */
export function hitStop(scene: Phaser.Scene, ms = 80, scale = 0.12) {
  const prev = scene.time.timeScale;
  scene.time.timeScale = scale;
  scene.time.delayedCall(ms, () => { scene.time.timeScale = prev; });
}

/** 화면 플래시 */
export function screenFlash(scene: Phaser.Scene, color = 0xffffff, alpha = 0.35, ms = 100) {
  const flash = scene.add.rectangle(540, 960, 1080, 1920, color, alpha).setDepth(200);
  scene.tweens.add({
    targets: flash, alpha: 0, duration: ms, onComplete: () => flash.destroy(),
  });
}

/** 콤보/핸드 외침 배너 */
export function showBattleCry(scene: Phaser.Scene, text: string, color = '#ffd700', y = 200) {
  const t = scene.add.text(540, y, text, {
    fontFamily: FONTS.title, fontSize: '48px', color, fontStyle: 'bold',
    stroke: '#000', strokeThickness: 6,
  }).setOrigin(0.5).setDepth(180).setScale(0.3);
  scene.tweens.add({
    targets: t, scaleX: 1.1, scaleY: 1.1, duration: 120, ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: t, y: y - 40, alpha: 0, duration: 500, delay: 200,
        onComplete: () => t.destroy(),
      });
    },
  });
}

/** 데미지 숫자 펀치 */
export function punchDamageText(
  scene: Phaser.Scene, x: number, y: number, text: string,
  color = '#ff4444', size = 40, crit = false,
) {
  const t = scene.add.text(x, y, text, {
    fontFamily: FONTS.body, fontSize: `${size}px`, color, fontStyle: 'bold',
    stroke: '#000', strokeThickness: crit ? 6 : 4,
  }).setOrigin(0.5).setDepth(22).setScale(crit ? 1.8 : 1.2);
  scene.tweens.add({
    targets: t,
    y: y - (crit ? 70 : 50),
    scaleX: crit ? 1.4 : 1,
    scaleY: crit ? 1.4 : 1,
    alpha: 0,
    duration: crit ? 900 : 700,
    ease: 'Cubic.easeOut',
    onComplete: () => t.destroy(),
  });
}

/** 보스 등장 배너 */
export function showBossBanner(scene: Phaser.Scene, name: string) {
  screenFlash(scene, 0xff2244, 0.25, 150);
  scene.cameras.main.shake(400, 0.02);
  showBattleCry(scene, `👑 ${name}`, '#ff6644', 160);
}

/** 임팩트 파티클 버스트 */
export function impactBurst(scene: Phaser.Scene, x: number, y: number, tint: number[], qty = 16) {
  const em = scene.add.particles(x, y, 'particle', {
    speed: { min: 120, max: 320 },
    scale: { start: 0.8, end: 0 },
    lifespan: 350,
    quantity: qty,
    tint,
    blendMode: 'ADD',
    angle: { min: 0, max: 360 },
  }).setDepth(21);
  scene.time.delayedCall(400, () => em.destroy());
}
