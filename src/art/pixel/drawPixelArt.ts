import Phaser from 'phaser';
import type { PixelGrid } from './palette';

export function drawPixelArt(
  scene: Phaser.Scene,
  key: string,
  pixels: PixelGrid,
  scale = 3,
) {
  if (scene.textures.exists(key)) return;
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  const g = scene.add.graphics().setVisible(false);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = pixels[y][x];
      if (c == null) continue;
      g.fillStyle(c, 1);
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  g.generateTexture(key, w * scale, h * scale);
  g.destroy();
}

export function compositeArt(
  scene: Phaser.Scene,
  key: string,
  layers: PixelGrid[],
  scale = 3,
) {
  if (scene.textures.exists(key)) return;
  const h = Math.max(...layers.map(l => l.length));
  const w = Math.max(...layers.map(l => l[0]?.length ?? 0));
  const g = scene.add.graphics().setVisible(false);
  for (const layer of layers) {
    for (let y = 0; y < layer.length; y++) {
      for (let x = 0; x < layer[y].length; x++) {
        const c = layer[y][x];
        if (c == null) continue;
        g.fillStyle(c, 1);
        g.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  g.generateTexture(key, w * scale, h * scale);
  g.destroy();
}
