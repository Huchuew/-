import Phaser from 'phaser';

const BASE = 'assets/ui';

export const UI = {
  logo: 'ui_logo',
  btnStart: 'ui_btn_start',
  btnSetting: 'ui_btn_setting',
  btnMail: 'ui_btn_mail',
  goldBar: 'ui_gold_bar',
  gemBar: 'ui_gem_bar',
  iconGold: 'ui_icon_gold',
  iconGem: 'ui_icon_gem',
  iconEnergy: 'ui_icon_energy',
  bgTitle: 'ui_bg_title',
  bgLobby: 'ui_bg_lobby',
  bgBattle: 'ui_bg_battle',
  btnShop: 'ui_btn_shop',
  btnUpgrade: 'ui_btn_upgrade',
  btnHero: 'ui_btn_hero',
  btnBag: 'ui_btn_bag',
  btnQuest: 'ui_btn_quest',
  panelFrame: 'ui_panel_frame',
  panelPopup: 'ui_panel_popup',
} as const;

const FILES: [string, string][] = [
  [UI.logo, 'logo_poker_rush.png'],
  [UI.btnStart, 'btn_start.png'],
  [UI.btnSetting, 'btn_setting.png'],
  [UI.btnMail, 'btn_mail.png'],
  [UI.goldBar, 'ui_gold_bar.png'],
  [UI.gemBar, 'ui_gem_bar.png'],
  [UI.iconGold, 'icon_gold.png'],
  [UI.iconGem, 'icon_gem.png'],
  [UI.iconEnergy, 'icon_energy.png'],
  [UI.bgTitle, 'background_title.png'],
  [UI.bgLobby, 'background_lobby.png'],
  [UI.bgBattle, 'background_battle.png'],
  [UI.btnShop, 'btn_shop.png'],
  [UI.btnUpgrade, 'btn_upgrade.png'],
  [UI.btnHero, 'btn_hero.png'],
  [UI.btnBag, 'btn_bag.png'],
  [UI.btnQuest, 'btn_quest.png'],
  [UI.panelFrame, 'panel_frame.png'],
  [UI.panelPopup, 'panel_popup.png'],
];

export function preloadUI(scene: Phaser.Scene) {
  for (const [key, file] of FILES) {
    scene.load.image(key, `${BASE}/${file}`);
  }
}

/** 배경 이미지를 화면에 맞게 cover */
export function addCoverBg(scene: Phaser.Scene, key: string, depth = 0): Phaser.GameObjects.Image {
  const img = scene.add.image(540, 960, key).setDepth(depth);
  const scale = Math.max(1080 / img.width, 1920 / img.height);
  img.setScale(scale);
  return img;
}

/** 전투 구역용 — 배틀 목업 상단(숲+보스) 크롭 */
export function addBattleZoneBg(scene: Phaser.Scene, depth = 0): Phaser.GameObjects.Image {
  const img = scene.add.image(540, 360, UI.bgBattle).setDepth(depth);
  const cropRatio = 0.44;
  const cropH = Math.floor(img.height * cropRatio);
  img.setCrop(0, 0, img.width, cropH);
  img.setDisplaySize(1080, 720);
  return img;
}

export function createImageButton(
  scene: Phaser.Scene,
  x: number, y: number,
  texture: string,
  onClick: () => void,
  displayW?: number,
): Phaser.GameObjects.Image {
  const btn = scene.add.image(x, y, texture).setInteractive({ useHandCursor: true });
  const sx = displayW ? displayW / btn.width : 1;
  const sy = displayW ? sx : 1;
  btn.setScale(sx, sy);
  btn.on('pointerover', () => btn.setScale(sx * 1.06, sy * 1.06));
  btn.on('pointerout', () => btn.setScale(sx, sy));
  btn.on('pointerdown', () => {
    scene.tweens.add({ targets: btn, scaleX: sx * 0.94, scaleY: sy * 0.94, duration: 60, yoyo: true });
    onClick();
  });
  return btn;
}

export function addCurrencyBar(
  scene: Phaser.Scene,
  x: number, y: number,
  type: 'gold' | 'gem',
  value: number,
  barW = 280,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const barKey = type === 'gold' ? UI.goldBar : UI.gemBar;
  const bar = scene.add.image(0, 0, barKey).setDisplaySize(barW, 44);
  const txt = scene.add.text(barW * 0.38, 0, value.toLocaleString(), {
    fontFamily: 'Outfit, sans-serif', fontSize: '22px', color: '#fff', fontStyle: 'bold',
    stroke: '#000', strokeThickness: 3,
  }).setOrigin(0, 0.5);
  c.add([bar, txt]);
  return c;
}

export function addPopupPanel(
  scene: Phaser.Scene,
  w = 900, h = 1400,
): Phaser.GameObjects.Container {
  const c = scene.add.container(540, 960);
  const dim = scene.add.rectangle(0, 0, 1080, 1920, 0x000000, 0.82);
  const panel = scene.add.image(0, 0, UI.panelPopup).setDisplaySize(w, h);
  c.add([dim, panel]);
  return c;
}
