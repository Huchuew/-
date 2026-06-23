import Phaser from 'phaser';
import { SUIT_SYMBOLS, SUIT_TILE_COLORS, SUIT_TILE_DARK } from '../data/constants';
import type { CardData, CardSuit } from '../data/types';
import { COLORS } from './theme';

export const CARD_W = 88;
export const CARD_H = 88;

const SUIT_TEXT_COLOR: Record<CardSuit, string> = {
  spades: '#e8f0ff',
  hearts: '#ffffff',
  diamonds: '#fff8e0',
  clubs: '#e8fff0',
};

/** 플러시 메이커 젬 타일 — 배틀 목업 스타일 */
export function drawCard(
  scene: Phaser.Scene,
  card: CardData,
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const isBomb = card.special === 'bomb';
  const base = SUIT_TILE_COLORS[card.suit];
  const dark = SUIT_TILE_DARK[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];
  const textColor = SUIT_TEXT_COLOR[card.suit];

  const shadow = scene.add.rectangle(4, 5, CARD_W - 4, CARD_H - 4, 0x000000, 0.45);
  shadow.setAngle(0);

  const glow = scene.add.rectangle(0, 0, CARD_W + 14, CARD_H + 14, 0xffffff, 0)
    .setVisible(false);

  const bg = scene.add.graphics();
  bg.fillStyle(dark, 1);
  bg.fillRoundedRect(-CARD_W / 2 + 1, -CARD_H / 2 + 2, CARD_W - 2, CARD_H - 2, 16);
  bg.fillStyle(base, 1);
  bg.fillRoundedRect(-CARD_W / 2 + 4, -CARD_H / 2 + 4, CARD_W - 8, CARD_H - 8, 14);
  bg.fillStyle(0xffffff, 0.35);
  bg.fillEllipse(-8, -18, CARD_W * 0.55, CARD_H * 0.35);
  bg.lineStyle(2, 0xffffff, 0.25);
  bg.strokeRoundedRect(-CARD_W / 2 + 4, -CARD_H / 2 + 4, CARD_W - 8, CARD_H - 8, 14);

  const centerSuit = scene.add.text(0, isBomb ? -2 : 4, symbol, {
    fontSize: '48px', color: textColor,
    fontStyle: 'bold',
    stroke: '#00000055', strokeThickness: 3,
  }).setOrigin(0.5);

  const parts: Phaser.GameObjects.GameObject[] = [shadow, glow, bg, centerSuit];

  if (isBomb) {
    parts.push(scene.add.text(0, 30, '💣', { fontSize: '20px' }).setOrigin(0.5));
    const ring = scene.add.graphics();
    ring.lineStyle(3, COLORS.gold, 1);
    ring.strokeRoundedRect(-CARD_W / 2 + 2, -CARD_H / 2 + 2, CARD_W - 4, CARD_H - 4, 16);
    parts.push(ring);
  }

  c.add(parts);
  c.setSize(CARD_W, CARD_H);
  c.setInteractive(
    new Phaser.Geom.Rectangle(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H),
    Phaser.Geom.Rectangle.Contains,
  );
  c.setData('glow', glow);
  c.setData('suit', card.suit);
  return c;
}

export function setCardSelected(container: Phaser.GameObjects.Container, on: boolean) {
  const glow = container.getData('glow') as Phaser.GameObjects.Rectangle;
  const suit = container.getData('suit') as CardSuit;
  if (glow) {
    glow.setVisible(on);
    glow.setFillStyle(SUIT_TILE_COLORS[suit] ?? COLORS.highlight, on ? 0.55 : 0);
    glow.setAlpha(on ? 1 : 0);
  }
  container.setScale(on ? 1.14 : 1);
}
