import Phaser from 'phaser';
import { COLORS, FONTS } from './theme';

export function createButton(
  scene: Phaser.Scene,
  x: number, y: number, w: number, h: number,
  label: string,
  onClick: () => void,
  variant: 'gold' | 'purple' | 'dark' = 'purple',
): Phaser.GameObjects.Container {
  const colors = {
    gold: { fill: 0x8b6914, stroke: COLORS.gold, hover: 0xa67c00 },
    purple: { fill: COLORS.purple, stroke: 0x9d4edd, hover: 0x9d4edd },
    dark: { fill: 0x2a2a3e, stroke: 0x555577, hover: 0x3a3a55 },
  }[variant];

  const container = scene.add.container(x, y);
  const shadow = scene.add.rectangle(2, 4, w, h, 0x000000, 0.4);
  const bg = scene.add.graphics();
  const drawBg = (color: number) => {
    bg.clear();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    bg.lineStyle(2, colors.stroke, 0.8);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  };
  drawBg(colors.fill);

  const text = scene.add.text(0, 0, label, {
    fontFamily: FONTS.body,
    fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
    align: 'center',
  }).setOrigin(0.5);

  const hit = scene.add.rectangle(0, 0, w, h, 0xffffff, 0.001);
  hit.setInteractive({ useHandCursor: true });
  hit.on('pointerover', () => drawBg(colors.hover));
  hit.on('pointerout', () => drawBg(colors.fill));
  hit.on('pointerdown', () => {
    scene.tweens.add({ targets: container, scaleX: 0.95, scaleY: 0.95, duration: 60, yoyo: true });
    onClick();
  });

  container.add([shadow, bg, text, hit]);
  container.setDepth(50);
  return container;
}
