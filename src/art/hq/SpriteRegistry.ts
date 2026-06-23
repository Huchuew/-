import Phaser from 'phaser';
import type { EquippedGear, HeroClass } from '../../data/types';
import { HQ_SIZE } from './PixelCanvas';
import { ANIM_FRAMES, type AnimState } from './characters/types';
import { renderKnightFrame } from './characters/knight';
import { renderNunFrame } from './characters/nun';
import { renderMageFrame } from './characters/mage';
import { renderHamsterFrame } from './characters/hamster';
import { monsterIdFromKey, renderMonsterFrame, type MonsterId } from './monsters';

const HERO_RENDERERS: Record<HeroClass, typeof renderKnightFrame> = {
  knight: renderKnightFrame,
  nun: renderNunFrame,
  mage: renderMageFrame,
  hamster: renderHamsterFrame,
};

const ANIM_ORDER: AnimState[] = ['idle', 'walk', 'attack', 'skill'];

function totalFrames() {
  return ANIM_ORDER.reduce((s, a) => s + ANIM_FRAMES[a], 0);
}

function buildSheetCanvas(drawFrame: (state: AnimState, frame: number) => ReturnType<typeof renderKnightFrame>) {
  const count = totalFrames();
  const canvas = document.createElement('canvas');
  canvas.width = HQ_SIZE * count;
  canvas.height = HQ_SIZE;
  const ctx = canvas.getContext('2d')!;
  let idx = 0;
  for (const state of ANIM_ORDER) {
    for (let f = 0; f < ANIM_FRAMES[state]; f++) {
      const frame = drawFrame(state, f);
      ctx.putImageData(frame.toImageData(), idx * HQ_SIZE, 0);
      idx++;
    }
  }
  return canvas;
}

function frameRange(state: AnimState): { start: number; end: number } {
  let start = 0;
  for (const s of ANIM_ORDER) {
    const n = ANIM_FRAMES[s];
    if (s === state) return { start, end: start + n - 1 };
    start += n;
  }
  return { start: 0, end: 0 };
}

function registerAnims(scene: Phaser.Scene, textureKey: string, prefix: string) {
  const rates: Record<AnimState, number> = { idle: 10, walk: 12, attack: 18, skill: 14 };
  for (const state of ANIM_ORDER) {
    const animKey = `${prefix}_${state}`;
    if (scene.anims.exists(animKey)) continue;
    const { start, end } = frameRange(state);
    scene.anims.create({
      key: animKey,
      frames: scene.anims.generateFrameNumbers(textureKey, { start, end }),
      frameRate: rates[state],
      repeat: state === 'idle' || state === 'walk' ? -1 : 0,
    });
  }
}

export function heroTextureKey(heroClass: HeroClass, gear: EquippedGear) {
  return `hq_${heroClass}_${gear.armor}_${gear.weapon}`;
}

export function buildHeroSpritesheet(
  scene: Phaser.Scene,
  heroClass: HeroClass,
  gear: EquippedGear,
): { textureKey: string; animPrefix: string } {
  const textureKey = heroTextureKey(heroClass, gear);
  const animPrefix = textureKey;
  const render = HERO_RENDERERS[heroClass];

  if (!scene.textures.exists(textureKey)) {
    const canvas = buildSheetCanvas((state, frame) => render(state, frame, gear));
    scene.textures.addCanvas(textureKey, canvas);
    const tex = scene.textures.get(textureKey);
    const count = totalFrames();
    for (let i = 0; i < count; i++) {
      tex.add(i, 0, i * HQ_SIZE, 0, HQ_SIZE, HQ_SIZE);
    }
  }
  registerAnims(scene, textureKey, animPrefix);
  return { textureKey, animPrefix };
}

export function monsterTextureKey(spriteKey: string) {
  return `hq_${spriteKey}`;
}

const MONSTER_IDS: MonsterId[] = [
  'slime_green', 'slime_blue', 'slime_red', 'mushroom', 'bat',
  'goblin', 'skeleton', 'boss_slime_king', 'boss_goblin', 'boss_dragon', 'boss_lich',
];

export function registerMonsterSprites(scene: Phaser.Scene) {
  for (const id of MONSTER_IDS) {
    const textureKey = `hq_mob_${id}`;
    if (scene.textures.exists(textureKey)) continue;
    const canvas = buildSheetCanvas((state, frame) => renderMonsterFrame(id, state, frame));
    scene.textures.addCanvas(textureKey, canvas);
    const tex = scene.textures.get(textureKey);
    const count = totalFrames();
    for (let i = 0; i < count; i++) {
      tex.add(i, 0, i * HQ_SIZE, 0, HQ_SIZE, HQ_SIZE);
    }
    registerAnims(scene, textureKey, textureKey);
  }
}

export function getMonsterAnimPrefix(spriteKey: string) {
  return monsterTextureKey(spriteKey);
}

export function resolveMonsterTexture(spriteKey: string) {
  const id = monsterIdFromKey(spriteKey);
  return `hq_mob_${id}`;
}
