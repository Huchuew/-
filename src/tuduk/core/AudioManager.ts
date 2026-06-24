import type { ElementType } from '../types';

import type { SkillAnimTier } from '../data/combatSkills';

import {

  getCharAttackSe, getCraftSe, getDotSe, getEquipSe, getEncounterSe, getHitLandedSe,
  getHurtSe, getKillSe, getMonsterSe,

  getCharSkillSe, getSkillSeWithPower, getUpgradeSe, RMMZ_SE_FILES, UI_SE,

} from '../data/rmmzSe';
import { getBuffApplySe, getDebuffApplySe } from '../data/statusEffectAudio';

import { type BgmResolveInput, resolveBgmSession } from '../data/rmmzBgm';

import {
  getPrestigeAttackSe, getPrestigeClaimSequencing, getPrestigeJobProfile, type PrestigeJobProfile,
} from '../data/prestigeAudio';

import type { GameSave } from '../types';

import { bgmPlayer } from './BgmPlayer';

import { sePlayer } from './SePlayer';



/** Web Audio SE + RMMZ BGM (브라우저 정책상 첫 터치 후 활성화) */

export class AudioManager {

  private ctx: AudioContext | null = null;

  private sfxGain: GainNode | null = null;

  private enabled = false;

  private sfxOn = true;

  private bgmOn = true;

  private bgmVolumeMul = 0.82;

  private sfxVolumeMul = 0.58;

  private seLoaded = false;

  private bgmLoaded = false;

  private activeBgmKey = '';



  init() {

    if (this.ctx) return;

    this.ctx = new AudioContext();

    this.sfxGain = this.ctx.createGain();

    this.sfxGain.connect(this.ctx.destination);

    this.sfxGain.gain.value = 0.24 * this.sfxVolumeMul;

    sePlayer.attach(this.ctx, this.sfxGain);

    this.enabled = true;

  }



  async unlock() {

    this.ensureInit();

    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') await this.ctx.resume();

    if (!this.seLoaded) {

      this.seLoaded = true;

      void sePlayer.preload([...RMMZ_SE_FILES]);

    }

    if (!this.bgmLoaded) {

      this.bgmLoaded = true;

      void bgmPlayer.preload([

        'Town3.ogg', 'Field1.ogg', 'Dungeon1.ogg',

        'Battle2.ogg', 'Battle6.ogg', 'Scene1.ogg', 'Scene3.ogg',

      ]);

    }

  }



  setSfx(on: boolean) {

    this.sfxOn = on;

    sePlayer.setEnabled(on);

  }



  setBgm(on: boolean) {

    this.bgmOn = on;

    bgmPlayer.setEnabled(on);

    if (!on) {

      this.activeBgmKey = '';

      bgmPlayer.stop();

    } else {

      bgmPlayer.setVolumeMultiplier(this.bgmVolumeMul);

    }

  }



  setBgmVolume(vol: number) {

    this.bgmVolumeMul = Math.max(0, Math.min(1, vol));

    bgmPlayer.setVolumeMultiplier(this.bgmOn ? this.bgmVolumeMul : 0);

  }



  setSfxVolume(vol: number) {

    this.sfxVolumeMul = Math.max(0, Math.min(1, vol));

    if (this.sfxGain) this.sfxGain.gain.value = 0.24 * this.sfxVolumeMul;

  }



  applySettings(save: GameSave) {

    this.setBgmVolume(save.settings.bgmVolume ?? 0.82);

    this.setSfxVolume(save.settings.sfxVolume ?? 0.58);

    this.setBgm(save.settings.bgm !== false);

    this.setSfx(save.settings.sfx !== false);

  }



  /** 상황에 맞는 BGM 전환 (같은 세션이면 유지 · 곡 끝나면 플레이리스트 다음 곡) */

  syncBgm(input: BgmResolveInput) {

    if (!this.bgmOn) return;

    const session = resolveBgmSession(input);

    if (!session) return;

    if (session.key === this.activeBgmKey) return;

    this.activeBgmKey = session.key;

    bgmPlayer.playSession(session);

  }



  stopBGM() {

    this.activeBgmKey = '';

    bgmPlayer.stop();

  }



  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, delay = 0) {

    if (!this.ctx || !this.sfxGain || !this.sfxOn) return;

    const volScale = this.sfxVolumeMul;

    if (this.ctx.state === 'suspended') void this.ctx.resume();

    const t0 = this.ctx.currentTime + delay;

    const osc = this.ctx.createOscillator();

    const g = this.ctx.createGain();

    osc.type = type;

    osc.frequency.setValueAtTime(freq, t0);

    g.gain.setValueAtTime(vol * volScale, t0);

    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    osc.connect(g);

    g.connect(this.sfxGain);

    osc.start(t0);

    osc.stop(t0 + dur + 0.02);

  }



  private se(file: string, vol = 0.2, rate = 1) {

    if (!this.sfxOn) return;

    sePlayer.play(file, vol * this.sfxVolumeMul, rate);

  }



  playTab() { this.tone(520, 0.05, 'sine', 0.08); }



  playSplash() {

    this.se('Magic1.ogg', 0.14);

    setTimeout(() => this.tone(392, 0.35, 'sine', 0.06), 120);

    setTimeout(() => this.se('Saint1.ogg', 0.1), 280);

  }



  playConfirm() {

    this.se('Skill1.ogg', 0.16);

    setTimeout(() => this.tone(660, 0.12, 'triangle', 0.07), 60);

  }



  playCharAttack(
    charId: string, crit = false,
    skill?: { element: ElementType; animTier: SkillAnimTier },
    ultimate = false,
    powerTier = 0,
    prestige?: PrestigeJobProfile | null,
  ) {
    const tier = Math.max(0, Math.min(6, powerTier));
    const prestigeTier = prestige?.tier ?? 0;
    const tierVol = 0.17 + tier * 0.028 + prestigeTier * 0.015;
    const pitch = 1 + tier * 0.035 + prestigeTier * 0.04;

    if (ultimate) {
      const theme = prestige?.sfxTheme;
      if (theme && prestigeTier >= 2) {
        const atk = getPrestigeAttackSe(theme, prestigeTier, true);
        this.se(atk.file, 0.3 + tier * 0.025, atk.pitch);
        setTimeout(() => this.se('Flash1.ogg', 0.18, atk.pitch + 0.06), 70);
        setTimeout(() => this.se('Skill3.ogg', 0.2, atk.pitch + 0.1), 150);
        return;
      }
      this.se('Skill3.ogg', 0.26 + tier * 0.025, pitch);
      setTimeout(() => this.se('Flash1.ogg', 0.15 + tier * 0.02, pitch), 70);
      if (tier >= 4) setTimeout(() => this.se('Magic11.ogg', 0.12 + tier * 0.01, pitch), 140);
      return;
    }

    if (skill) {
      const vol = (skill.animTier >= 3 ? 0.3 : 0.23) + tier * 0.024 + prestigeTier * 0.012;
      this.se(getCharSkillSe(charId, skill.element, skill.animTier, tier), vol, pitch);
      if (tier >= 3 && skill.animTier >= 2) {
        setTimeout(() => this.se('Wind1.ogg', 0.08 + tier * 0.01, pitch + 0.05), 90);
      }
    } else if (prestige && prestigeTier > 0) {
      const atk = getPrestigeAttackSe(prestige.sfxTheme, prestigeTier, crit);
      this.se(atk.file, atk.vol, atk.pitch);
      if (prestigeTier >= 3 && crit) {
        setTimeout(() => this.se('Flash1.ogg', 0.14, atk.pitch + 0.08), 55);
      }
    } else {
      this.se(getCharAttackSe(charId, tier), crit ? 0.26 + tier * 0.02 : tierVol, pitch);
      if (tier >= 5) {
        const accents = ['Blow2.ogg', 'Slash3.ogg', 'Blow4.ogg'] as const;
        setTimeout(
          () => this.se(accents[tier % accents.length]!, 0.09, pitch + 0.04),
          50,
        );
      }
    }
  }



  playTownOpen() { this.se('Saint1.ogg', 0.12); }

  playRest() { this.se('Saint2.ogg', 0.16); }

  playCombatHeal(charId: string, targetCount = 1, ultimate = false) {
    const vol = ultimate ? 0.28 : 0.2 + Math.min(3, targetCount) * 0.03;
    const pitch = ultimate ? 1.12 : 1.04;
    this.se('Water1.ogg', vol, pitch);
    setTimeout(() => this.se('Saint2.ogg', vol * 0.85, pitch + 0.06), 80);
    if (ultimate) setTimeout(() => this.se('Magic11.ogg', 0.16, pitch + 0.1), 160);
    if (charId === 'isanim' || charId === 'yujin') {
      setTimeout(() => this.se('Water1.ogg', vol * 0.7, pitch), 120);
    }
  }



  playHitLanded(magic = false) {

    this.se(getHitLandedSe(magic), 0.14);

  }



  playMonsterAttack(

    monsterId: string, tinyPack: string, isBoss: boolean, magic = false, visualSlot = 0,

  ) {

    const vol = isBoss ? 0.24 : 0.16 + visualSlot * 0.02;

    const pitch = 1 - visualSlot * 0.06;

    this.se(getMonsterSe(monsterId, tinyPack, isBoss), vol, pitch);

    if (magic) setTimeout(() => this.se('Magic5.ogg', 0.12, pitch), 60);

  }



  playHitReceived(magic = false, element?: ElementType) {

    if (element && element !== 'none') {

      this.se(getDotSe(element), 0.13);

    } else {

      this.se(getHurtSe(magic), 0.15);

    }

  }



  playDotTick(element: ElementType) {

    this.se(getDotSe(element), 0.09);

  }



  playCrit() { this.se(UI_SE.crit, 0.18); }

  playKill(isBoss = false, isElite = false) { this.se(getKillSe(isBoss, isElite), 0.2); }

  playGold() { this.se(UI_SE.gold, 0.16); }

  private playStatusCue(cue: { file: string; vol: number; pitch?: number; followMs?: number; followFile?: string; followVol?: number; followPitch?: number }) {
    this.se(cue.file, cue.vol, cue.pitch ?? 1);
    if (cue.followMs && cue.followFile) {
      setTimeout(() => this.se(cue.followFile!, cue.followVol ?? cue.vol * 0.85, cue.followPitch ?? cue.pitch ?? 1), cue.followMs);
    }
  }

  playBuffApply(opts: {
    buffId: string;
    skillKind?: string;
    hasAtk?: boolean;
    hasDef?: boolean;
    hasSpd?: boolean;
  }) {
    this.playStatusCue(getBuffApplySe({
      skillKind: opts.skillKind,
      hasAtk: opts.hasAtk,
      hasDef: opts.hasDef,
      hasSpd: opts.hasSpd,
      isBlock: opts.skillKind === 'block',
    }));
  }

  playDebuffApply(debuffId: string) {
    this.playStatusCue(getDebuffApplySe(debuffId));
  }

  playCleanse(charId: string) {
    this.playStatusCue(getBuffApplySe({ skillKind: 'cleanse' }));
    if (charId === 'yujin' || charId === 'isanim') {
      setTimeout(() => this.se('Saint1.ogg', 0.1, 1.08), 180);
    }
  }

  playTouch(powerTier = 0) {
    const tier = Math.max(0, Math.min(6, powerTier));
    const files = ['Blow1.ogg', 'Blow2.ogg', 'Blow4.ogg', 'Slash2.ogg', 'Slash5.ogg', 'Slash7.ogg', 'Slash8.ogg'] as const;
    const idx = (tier + Math.floor(Math.random() * 2)) % files.length;
    this.se(files[idx]!, 0.1 + tier * 0.018, 1.04 + tier * 0.04);
  }

  playEncounter() { this.se(getEncounterSe(), 0.18); }

  playUpgrade(tier = 0) {
    const t = Math.max(0, Math.min(6, tier));
    this.se(getUpgradeSe(t), 0.18 + t * 0.018, 1 + t * 0.03);
    if (t >= 3) setTimeout(() => this.se('Flash1.ogg', 0.1 + t * 0.01, 1.05 + t * 0.02), 100);
  }

  /** 2·3·4차 전직 확정 연출 — 직업 테마별 SE */
  playPrestigeJobChange(charId: string, tier: 1 | 2 | 3 = 1, save?: GameSave | null) {
    const profile = save ? getPrestigeJobProfile(save, charId) : null;
    const theme = profile?.sfxTheme ?? 'holy';
    const seq = getPrestigeClaimSequencing(theme, tier);
    for (const step of seq) {
      setTimeout(() => this.se(step.file, step.vol, step.pitch), step.delay);
    }
    if (tier >= 2) {
      setTimeout(() => this.se('Skill3.ogg', 0.2 + tier * 0.04, 1.1 + tier * 0.08), 320);
    }
    if (tier >= 3) {
      setTimeout(() => this.se('Flash1.ogg', 0.24, 1.25), 400);
      setTimeout(() => this.se('Saint3.ogg', 0.18, 1.3), 480);
    }
  }

  playCraft(tier = 0) {
    const t = Math.max(0, Math.min(6, tier));
    this.se(getCraftSe(t), 0.17 + t * 0.018, 1 + t * 0.025);
  }

  playEquip(tier = 0) {
    const t = Math.max(0, Math.min(6, tier));
    this.se(getEquipSe(t), 0.14 + t * 0.015, 1 + t * 0.02);
  }

  playFail() { this.se(UI_SE.fail, 0.14); }

  playGemPickup() {
    this.se('Coin.ogg', 0.24, 1.25);
    setTimeout(() => this.se('Magic10.ogg', 0.2, 1.12), 70);
    setTimeout(() => this.se('Flash1.ogg', 0.16, 1.08), 140);
    setTimeout(() => this.se('Saint2.ogg', 0.12, 1.15), 220);
  }

  /** 전설 각성 — 다층 SE 연출 */
  playAscension(charId?: string) {
    this.se('Saint3.ogg', 0.22, 0.95);
    setTimeout(() => this.se('Magic10.ogg', 0.28, 1.15), 120);
    setTimeout(() => this.se('Skill3.ogg', 0.32, 1.2), 240);
    setTimeout(() => this.se('Flash1.ogg', 0.3, 1.35), 360);
    setTimeout(() => this.se('Saint1.ogg', 0.26, 1.4), 520);
    setTimeout(() => this.se('Coin.ogg', 0.2, 1.5), 680);
    if (charId) {
      setTimeout(() => this.playPrestigeJobChange(charId, 3), 400);
    }
  }

  /** 전설 장신구 드랍 */
  playLegendaryDrop() {
    this.se('Coin.ogg', 0.26, 1.3);
    setTimeout(() => this.se('Magic10.ogg', 0.3, 1.2), 80);
    setTimeout(() => this.se('Saint2.ogg', 0.24, 1.25), 180);
    setTimeout(() => this.se('Flash1.ogg', 0.28, 1.4), 300);
    setTimeout(() => this.se('Skill3.ogg', 0.22, 1.35), 450);
    setTimeout(() => this.se('Saint3.ogg', 0.2, 1.5), 600);
  }



  /** @deprecated playCharAttack */

  playAttack(_profile: string, crit = false) { this.playCharAttack('mujang', crit); }



  ensureInit() {

    if (!this.enabled) this.init();

  }

}



export const audio = new AudioManager();

