import { PixelCanvas } from '../PixelCanvas';
import { drawSlimeBody, drawSlimeEyes, drawFace, drawEye } from '../drawPrimitives';
import type { AnimState } from '../characters/types';
import { ANIM_FRAMES, animOffset } from '../characters/types';

export type MonsterId =
  | 'slime_green' | 'slime_blue' | 'slime_red' | 'mushroom' | 'bat'
  | 'goblin' | 'skeleton'
  | 'boss_slime_king' | 'boss_goblin' | 'boss_dragon' | 'boss_lich';

const SLIME_COLORS = {
  slime_green: { base: 0x55dd77, hi: 0x88ffaa, lo: 0x33aa55 },
  slime_blue: { base: 0x55aaff, hi: 0x88ccff, lo: 0x3377cc },
  slime_red: { base: 0xff5566, hi: 0xff8899, lo: 0xcc3344 },
};

function drawSlime(c: PixelCanvas, colors: { base: number; hi: number; lo: number }, squash: number, mood: number) {
  drawSlimeBody(c, 48, 58, 26, colors, squash);
  drawSlimeEyes(c, 48, 50 + mood, mood);
}

function drawMushroom(c: PixelCanvas, frame: number) {
  const bob = Math.sin(frame * 0.8) * 2;
  c.softCircle(48, 62 + bob, 18, 0xf0e0c0);
  c.softCircle(48, 42 + bob, 22, 0xee3344);
  c.softCircle(40, 38 + bob, 6, 0xffffff, 100);
  drawEye(c, 42, 58 + bob, 0x2a2030);
  drawEye(c, 54, 58 + bob, 0x2a2030);
}

function drawBat(c: PixelCanvas, frame: number) {
  const wing = Math.sin(frame * 1.2) * 12;
  c.softCircle(48, 50, 10, 0x7744aa);
  c.line(20, 50 + wing, 38, 48, 0x6633aa, 3);
  c.line(76, 50 + wing, 58, 48, 0x6633aa, 3);
  drawEye(c, 44, 48, 0xff4444);
  drawEye(c, 52, 48, 0xff4444);
}

function drawGoblin(c: PixelCanvas, frame: number, boss = false) {
  const bob = Math.sin(frame * 0.6) * 2;
  const scale = boss ? 1.15 : 1;
  const cy = 78 + bob;
  c.fillRect(40, cy - 20 * scale, 16, 18, 0x44aa44);
  c.softCircle(48, cy - 32 * scale, 14 * scale, 0x55cc55);
  drawEye(c, 44, cy - 32 * scale, 0xffcc00);
  drawEye(c, 52, cy - 32 * scale, 0xffcc00);
  c.fillRect(46, cy - 26 * scale, 4, 3, 0x338833);
  if (boss) c.fillRect(42, cy - 42 * scale, 12, 5, 0xffd700);
  c.line(60, cy - 15, 72, cy - 30 + Math.sin(frame) * 5, 0x886644, boss ? 4 : 3);
}

function drawSkeleton(c: PixelCanvas, frame: number) {
  const bob = Math.sin(frame * 0.5) * 2;
  const cy = 76 + bob;
  c.fillRect(44, cy - 18, 8, 16, 0xeeeeee);
  c.softCircle(48, cy - 30, 12, 0xf5f5f5);
  drawEye(c, 44, cy - 30, 0x331133);
  drawEye(c, 52, cy - 30, 0x331133);
  c.line(58, cy - 12, 70, cy - 25, 0xdddddd, 2);
}

function drawBossDragon(c: PixelCanvas, frame: number) {
  const bob = Math.sin(frame * 0.4) * 3;
  c.softCircle(48, 60 + bob, 28, 0x8855cc);
  c.softCircle(40, 52 + bob, 12, 0xaa77ee);
  drawEye(c, 42, 50 + bob, 0xffaa44);
  drawEye(c, 54, 50 + bob, 0xffaa44);
  c.softCircle(30, 45 + bob, 8, 0x7744bb);
  c.softCircle(66, 45 + bob, 8, 0x7744bb);
}

function drawBossLich(c: PixelCanvas, frame: number) {
  const bob = Math.sin(frame * 0.35) * 2;
  const cy = 70 + bob;
  c.fillRect(38, cy - 10, 20, 24, 0x552288);
  c.softCircle(48, cy - 28, 13, 0xeeeeee);
  drawEye(c, 44, cy - 28, 0xaa44ff);
  drawEye(c, 52, cy - 28, 0xaa44ff);
  c.line(58, cy - 20, 58, cy - 50, 0x553311, 2);
  c.softCircle(58, cy - 54, 5, 0xaa55ff);
  for (let i = 0; i < 3; i++) {
    const a = frame * 0.5 + i * 2;
    c.softCircle(30 + i * 18, cy - 40 + Math.sin(a) * 6, 4, 0xaa55ff, 180);
  }
}

export function renderMonsterFrame(id: MonsterId, state: AnimState, frame: number): PixelCanvas {
  const c = new PixelCanvas();
  const off = animOffset(state, frame);
  const squash = state === 'walk' ? Math.abs(off.legPhase ?? 0) * 0.5 : 0;
  const mood = state === 'attack' ? 2 : 0;

  switch (id) {
    case 'slime_green':
    case 'slime_blue':
    case 'slime_red':
      drawSlime(c, SLIME_COLORS[id], squash, mood);
      break;
    case 'mushroom':
      drawMushroom(c, frame);
      break;
    case 'bat':
      drawBat(c, frame);
      break;
    case 'goblin':
      drawGoblin(c, frame);
      break;
    case 'skeleton':
      drawSkeleton(c, frame);
      break;
    case 'boss_slime_king':
      drawSlime(c, SLIME_COLORS.slime_green, squash * 0.5, mood);
      c.fillRect(40, 28, 16, 6, 0xffd700);
      c.softCircle(48, 26, 5, 0xffee66);
      break;
    case 'boss_goblin':
      drawGoblin(c, frame, true);
      break;
    case 'boss_dragon':
      drawBossDragon(c, frame);
      break;
    case 'boss_lich':
      drawBossLich(c, frame);
      break;
  }
  return c;
}

export function monsterIdFromKey(spriteKey: string): MonsterId {
  const id = spriteKey.replace('mob_', '') as MonsterId;
  return id;
}

export const MONSTER_ANIM_FRAMES = ANIM_FRAMES;
