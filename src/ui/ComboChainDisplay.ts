import Phaser from 'phaser';
import { MATCH_TIER_LABELS, SUIT_SYMBOLS, SUIT_TILE_COLORS } from '../data/constants';
import type { ComboStep } from '../data/types';
import { FONTS } from './theme';

export class ComboChainDisplay {
  private container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y).setDepth(200).setAlpha(0);
  }

  async showChain(steps: ComboStep[]): Promise<void> {
    this.container.removeAll(true);
    if (steps.length === 0) return;

    const bg = this.scene.add.rectangle(0, 0, 900, 130, 0x000000, 0.78)
      .setStrokeStyle(2, 0xffd700, 0.6);
    this.container.add(bg);

    let xOff = -380;
    for (let si = 0; si < steps.length; si++) {
      const step = steps[si];
      if (si > 0) {
        this.container.add(this.scene.add.text(xOff + 18, 0, '→', {
          fontSize: '28px', color: '#ffd700', fontStyle: 'bold',
        }).setOrigin(0.5));
        xOff += 40;
      }

      const mini = this.scene.add.container(xOff + 55, 0);
      const color = SUIT_TILE_COLORS[step.suit];

      step.cards.slice(0, 5).forEach((card, i) => {
        const chip = this.scene.add.rectangle(i * 26 - 26, -8, 22, 22, color)
          .setStrokeStyle(2, 0xffffff, 0.5);
        const sym = this.scene.add.text(i * 26 - 26, -8, SUIT_SYMBOLS[card.suit], {
          fontSize: '14px', color: '#fff',
        }).setOrigin(0.5);
        mini.add([chip, sym]);
      });

      mini.add(this.scene.add.text(0, 28, `${SUIT_SYMBOLS[step.suit]} ×${step.cards.length}`, {
        fontFamily: FONTS.body, fontSize: '17px', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5));

      if (step.tier !== 'none') {
        mini.add(this.scene.add.text(0, 50, MATCH_TIER_LABELS[step.tier], {
          fontFamily: FONTS.body, fontSize: '15px', color: '#44ffaa',
        }).setOrigin(0.5));
      }

      mini.add(this.scene.add.text(0, 72, `-${step.damage}`, {
        fontFamily: FONTS.body, fontSize: '14px', color: '#ff6644',
      }).setOrigin(0.5));

      if (step.heal > 0) {
        mini.add(this.scene.add.text(0, 90, `+${step.heal} HP`, {
          fontSize: '12px', color: '#66ff88',
        }).setOrigin(0.5));
      }
      if (step.goldBonus > 0) {
        mini.add(this.scene.add.text(0, 90, `+${step.goldBonus} 🪙`, {
          fontSize: '12px', color: '#ffd700',
        }).setOrigin(0.5));
      }

      if (step.comboIndex > 1) {
        mini.add(this.scene.add.text(-48, -38, `×${step.comboIndex}`, {
          fontSize: '13px', color: '#ff6b35', backgroundColor: '#000000cc',
          padding: { x: 6, y: 2 },
        }).setOrigin(0.5));
      }

      this.container.add(mini);
      xOff += 105;
    }

    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: this.container, alpha: 1, duration: 180,
        onComplete: () => {
          this.scene.time.delayedCall(1100, () => {
            this.scene.tweens.add({
              targets: this.container, alpha: 0, duration: 250,
              onComplete: () => { this.container.removeAll(true); resolve(); },
            });
          });
        },
      });
    });
  }

  destroy() {
    this.container.destroy();
  }
}
