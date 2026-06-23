import Phaser from 'phaser';

export function ensureParticleTexture(scene: Phaser.Scene, key = 'particle') {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics().setVisible(false);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture(key, 8, 8);
  g.destroy();
}
