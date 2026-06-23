/** @deprecated — HQ 스프라이트 시스템으로 이전. 하위 호환용 re-export */
import Phaser from 'phaser';
import type { EquippedGear, HeroClass } from '../data/types';
import {
  buildHeroSpritesheet,
  registerMonsterSprites,
  heroTextureKey,
} from './hq/SpriteRegistry';

export function registerPixelSprites(scene: Phaser.Scene) {
  registerMonsterSprites(scene);
}

export function buildHeroTexture(scene: Phaser.Scene, heroClass: HeroClass, gear: EquippedGear) {
  const { textureKey } = buildHeroSpritesheet(scene, heroClass, gear);
  return textureKey;
}

export function getHeroPreviewKey(heroClass: HeroClass) {
  return heroTextureKey(heroClass, { armor: 'cloth', weapon: 'wood', helmet: 'none' });
}
