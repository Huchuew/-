import Phaser from 'phaser';
import { FONTS, COLORS } from './theme';
import type { BattleSystem } from '../systems/BattleSystem';
import { buildHeroSpritesheet, resolveMonsterTexture } from '../art/hq/SpriteRegistry';
import type { SaveData } from '../data/types';
import { getEquipped } from '../systems/EquipmentSystem';
import {
  hitStop, screenFlash, punchDamageText, impactBurst, showBossBanner,
} from './JuiceEffects';
import { UI, addBattleZoneBg } from '../assets/uiAssets';

const HERO_SCALE = 2.6;
const MOB_SCALE = 2.4;
const BOSS_SCALE = 2.9;

export class BattleView {
  private scene: Phaser.Scene;
  private hero!: Phaser.GameObjects.Sprite;
  private monster!: Phaser.GameObjects.Sprite;
  private heroAnimPrefix = '';
  private monsterAnimPrefix = '';
  private playerHpBar!: Phaser.GameObjects.Rectangle;
  private playerHpBg!: Phaser.GameObjects.Rectangle;
  private monsterHpBar!: Phaser.GameObjects.Rectangle;
  private monsterHpBg!: Phaser.GameObjects.Rectangle;
  private playerHpText!: Phaser.GameObjects.Text;
  private monsterHpText!: Phaser.GameObjects.Text;
  private monsterNameText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private telegraph!: Phaser.GameObjects.Text;
  private battle: BattleSystem;
  private save: SaveData;

  constructor(scene: Phaser.Scene, battle: BattleSystem, save: SaveData) {
    this.scene = scene;
    this.battle = battle;
    this.save = save;

    if (scene.textures.exists(UI.bgBattle)) {
      addBattleZoneBg(scene, 4);
    } else {
      const g = scene.add.graphics().setDepth(4);
      g.fillGradientStyle(0x4a90c8, 0x7ec8f0, 0x2a6090, 0x1a4878, 1);
      g.fillRect(0, 0, 1080, 720);
    }

    if (scene.textures.exists(UI.panelFrame)) {
      scene.add.image(540, 36, UI.panelFrame).setDisplaySize(400, 52).setDepth(7).setAlpha(0.85);
    }

    this.waveText = scene.add.text(540, 36, '', {
      fontFamily: FONTS.body, fontSize: '28px', color: '#fff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(8);

    this.telegraph = scene.add.text(880, 260, '', {
      fontFamily: FONTS.title, fontSize: '56px', color: '#ff4444',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(12).setAlpha(0);

    this.setupHero(save);
    this.setupMonster();

    this.monsterNameText = scene.add.text(880, 290, battle.monster.name, {
      fontFamily: FONTS.body, fontSize: '26px', color: '#ff9999', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(7);

    this.monsterHpBg = scene.add.rectangle(880, 332, 340, 24, 0x222233, 0.92).setDepth(7);
    this.monsterHpBar = scene.add.rectangle(710, 332, 340, 20, COLORS.crimson).setOrigin(0, 0.5).setDepth(7);
    this.monsterHpText = scene.add.text(880, 332, '', {
      fontFamily: FONTS.body, fontSize: '17px', color: '#fff',
    }).setOrigin(0.5).setDepth(8);

    this.playerHpBg = scene.add.rectangle(200, 582, 300, 24, 0x222233, 0.92).setDepth(7);
    this.playerHpBar = scene.add.rectangle(50, 582, 300, 20, 0x44dd77).setOrigin(0, 0.5).setDepth(7);
    this.playerHpText = scene.add.text(200, 582, '', {
      fontFamily: FONTS.body, fontSize: '17px', color: '#fff',
    }).setOrigin(0.5).setDepth(8);

    scene.add.graphics().setDepth(9)
      .fillGradientStyle(COLORS.gold, COLORS.gold, 0x000000, 0x000000, 0.85)
      .fillRect(0, 716, 1080, 6);

    this.updateHp();
    this.updateWaveLabel();

    if (battle.monster.isBoss) {
      showBossBanner(scene, battle.monster.name);
    }
  }

  private setupHero(save: SaveData) {
    const { textureKey, animPrefix } = buildHeroSpritesheet(this.scene, save.heroClass, getEquipped(save));
    this.heroAnimPrefix = animPrefix;
    this.hero = this.scene.add.sprite(200, 500, textureKey, 0)
      .setOrigin(0.5, 1).setScale(HERO_SCALE).setDepth(6);
    this.hero.play(`${animPrefix}_idle`);
  }

  private setupMonster() {
    const tex = resolveMonsterTexture(this.battle.monster.spriteKey);
    this.monsterAnimPrefix = tex;
    const scale = this.battle.monster.isBoss ? BOSS_SCALE : MOB_SCALE;
    this.monster = this.scene.add.sprite(880, 500, tex, 0)
      .setOrigin(0.5, 1).setScale(scale).setFlipX(true).setDepth(6);
    this.monster.play(`${tex}_idle`);
  }

  refreshHero(save: SaveData) {
    this.save = save;
    const { textureKey, animPrefix } = buildHeroSpritesheet(this.scene, save.heroClass, getEquipped(save));
    this.heroAnimPrefix = animPrefix;
    this.hero.setTexture(textureKey, 0);
    this.hero.play(`${animPrefix}_idle`);
  }

  updateWaveLabel() {
    const b = this.battle;
    const tag = b.monster.isBoss ? '👑 BOSS WAVE' : '⚔️ WAVE';
    this.waveText.setText(`${tag} ${b.wave}`);
    this.monsterNameText.setText(b.monster.name);
  }

  updateHp() {
    const b = this.battle;
    this.playerHpBar.width = 300 * Math.max(0, b.playerHp / b.playerMaxHp);
    this.monsterHpBar.width = 340 * Math.max(0, b.monsterHp / b.monsterMaxHp);
    this.playerHpText.setText(`${b.playerHp}/${b.playerMaxHp}`);
    this.monsterHpText.setText(`${b.monsterHp}/${b.monsterMaxHp}`);
  }

  private playAnim(sprite: Phaser.GameObjects.Sprite, prefix: string, state: string): Promise<void> {
    const key = `${prefix}_${state}`;
    return new Promise(resolve => {
      if (!this.scene.anims.exists(key)) { resolve(); return; }
      sprite.play(key);
      sprite.once('animationcomplete', () => {
        sprite.play(`${prefix}_idle`);
        resolve();
      });
    });
  }

  async playAttack(damage: number, isSkill = false): Promise<void> {
    const state = isSkill ? 'skill' : 'attack';
    if (isSkill) {
      hitStop(this.scene, 100, 0.08);
      screenFlash(this.scene, 0xffee88, 0.3, 120);
      impactBurst(this.scene, this.monster.x - 20, this.monster.y - 60, [0xffee66, 0xffffff, 0xffaa22], 24);
    } else {
      hitStop(this.scene, 50, 0.2);
      impactBurst(this.scene, this.monster.x - 10, this.monster.y - 50, [0xffffff, 0xff6644], 10);
    }

    this.scene.cameras.main.shake(isSkill ? 280 : 120, isSkill ? 0.018 : 0.008);

    const animPromise = this.playAnim(this.hero, this.heroAnimPrefix, state);
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: this.hero, x: 320, duration: isSkill ? 200 : 120, yoyo: true, ease: 'Quad.easeOut',
        onComplete: () => {
          punchDamageText(this.scene, this.monster.x, this.monster.y - 80, `-${damage}`, '#ff3333', isSkill ? 52 : 40, isSkill);
          this.scene.tweens.add({
            targets: this.monster, x: 920, alpha: 0.35, duration: 80, yoyo: true,
            onComplete: () => { this.monster.setAlpha(1); this.updateHp(); resolve(); },
          });
        },
      });
    });
    await animPromise;
  }

  async playMonsterAttack(damage: number): Promise<void> {
    this.telegraph.setText('!').setAlpha(1);
    this.scene.tweens.add({
      targets: this.telegraph, scaleX: 1.3, scaleY: 1.3, duration: 200, yoyo: true, repeat: 1,
      onComplete: () => this.telegraph.setAlpha(0).setScale(1),
    });

    await new Promise<void>(r => this.scene.time.delayedCall(280, () => r()));

    const animPromise = this.playAnim(this.monster, this.monsterAnimPrefix, 'attack');
    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: this.monster, x: 700, duration: 130, yoyo: true,
        onYoyo: () => {
          punchDamageText(this.scene, this.hero.x, this.hero.y - 70, `-${damage}`, '#ff6644', 36);
          hitStop(this.scene, 60, 0.15);
          this.scene.tweens.add({
            targets: this.hero, x: 150, alpha: 0.45, duration: 90, yoyo: true,
            onComplete: () => { this.hero.setAlpha(1); this.updateHp(); resolve(); },
          });
        },
      });
    });
    await animPromise;
  }

  async playMonsterDefeated(): Promise<void> {
    impactBurst(this.scene, this.monster.x, this.monster.y - 40, [0xffd700, 0xff6644, 0xffffff], 20);
    screenFlash(this.scene, 0xffd700, 0.15, 80);

    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this.monster,
        scaleX: 0, scaleY: 0, alpha: 0, angle: 360, duration: 350, ease: 'Back.easeIn',
        onComplete: () => {
          this.battle.nextWave();
          const scale = this.battle.monster.isBoss ? BOSS_SCALE : MOB_SCALE;
          const tex = resolveMonsterTexture(this.battle.monster.spriteKey);
          this.monsterAnimPrefix = tex;
          this.monster.setTexture(tex, 0);
          this.monster.setPosition(950, 500);
          this.monster.setAlpha(0).setAngle(0).setScale(0.3);
          this.updateWaveLabel();
          this.updateHp();

          if (this.battle.monster.isBoss) {
            showBossBanner(this.scene, this.battle.monster.name);
          }

          this.scene.tweens.add({
            targets: this.monster,
            x: 880, alpha: 1, scaleX: scale, scaleY: scale,
            duration: 450, ease: 'Back.easeOut',
            onComplete: () => {
              this.monster.play(`${tex}_idle`);
              resolve();
            },
          });
        },
      });
    });
  }

  showGoldDrop(amount: number) {
    const t = this.scene.add.text(540, 380, `+${amount} 🪙`, {
      fontFamily: FONTS.title, fontSize: '42px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(25).setScale(0.5);
    this.scene.tweens.add({
      targets: t, y: 280, scaleX: 1.2, scaleY: 1.2, alpha: 0,
      duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy(),
    });
  }
}
