import type { AdventureSystem } from '../systems/AdventureSystem';
import { configurePixelArtContext } from '../assets/AssetLoader';
import { CHAR_GAUGE_BAR_H, CHAR_HP_BAR_H } from '../data/charUiLayout';
import { REGIONS } from '../data/regions';
import { getRegionPalette } from '../data/regionVisuals';
import { BattleRenderer } from './BattleRenderer';
import { applyCanvasPixelArtStyle } from './SpriteLoader';
import { getBattleSceneLayout } from './battleSceneLayout';
import { StageBackgroundRenderer, invalidateStageBackgroundCache } from './StageBackgroundRenderer';
import { drawSpireTowerScene, preloadSpireTowerAssets } from './SpireTowerRenderer';
import { drawRivalDuelBackground } from './RivalDuelBackground';
import { LodgingRenderer } from './LodgingRenderer';
import { getExpeditionPotions } from '../systems/PotionInventory';
import { EXPEDITION_POTION_CARRY } from '../types';
import { isBossGateReady } from '../systems/floorPacing';
import type { RivalDuelResult } from '../systems/RivalDuelSystem';

export class AdventureRenderer {
  private ctx: CanvasRenderingContext2D;
  private animTime = 0;
  private battle = new BattleRenderer();
  private stageBg = new StageBackgroundRenderer();
  private lodging = new LodgingRenderer();
  private lastCanvasW = 0;
  private lastCanvasH = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    configurePixelArtContext(ctx);
    applyCanvasPixelArtStyle(canvas);
    this.ctx = ctx;
  }

  private getCombatBottomInset(_adv: AdventureSystem, _canvasH: number): number {
    return 0;
  }

  /** 전투 캔버스 상단 여백 (HUD는 HTML 바에 분리됨) */
  private getCombatTopInset(): number {
    return 8;
  }

  private getHudSafeBottom(_canvasH: number): number {
    return this.getCombatTopInset();
  }

  /** 버프 아이콘 — 전투 캔버스 좌상단 */
  private getBuffIconTop(_canvasH: number): number {
    return this.getCombatTopInset() + 4;
  }

  resize(w: number, h: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    configurePixelArtContext(this.ctx);
    if (w !== this.lastCanvasW || h !== this.lastCanvasH) {
      this.lastCanvasW = w;
      this.lastCanvasH = h;
      invalidateStageBackgroundCache();
      this.stageBg.invalidateCache();
    }
  }

  render(adv: AdventureSystem, dt: number) {
    this.animTime += dt;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const ctx = this.ctx;

    if (adv.isAtLodging() || adv.isReturningToLodging) {
      void this.lodging.ensureLoaded();
      this.lodging.update(dt);
      this.lodging.draw(ctx, w, h, this.animTime, {
        save: adv.save,
        atLodging: adv.isAtLodging(),
        resting: adv.isAtLodging() && adv.isLodgingResting,
      });
      if (adv.isReturningToLodging) {
        const hudH = this.getCombatTopInset();
        if (adv.isTraveling()) {
          this.drawTravelOverlay(adv, w, h, hudH);
        } else if (adv.phase === 'walk' && adv.getReturnWalkRemainingSec() > 0) {
          this.drawReturnWalkOverlay(adv, w, h, hudH);
        }
      }
      return;
    }

    const reg = adv.region;
    const hudH = this.getCombatTopInset();
    const hudSafeBottom = hudH;
    const bottomInset = this.getCombatBottomInset(adv, h);
    const animT = this.animTime;
    const scrollX = adv.isRivalDuelActive() ? 0 : adv.backgroundScrollX;
    const moving = adv.isRivalDuelActive() ? false : adv.isBackgroundMoving();
    const shakeAmt = adv.vfx.screenShake;
    if (shakeAmt > 0.01) {
      ctx.save();
      const px = (Math.random() - 0.5) * shakeAmt * 16;
      const py = (Math.random() - 0.5) * shakeAmt * 12;
      ctx.translate(px, py);
    }

    const sceneLayout = adv.isRivalDuelActive()
      ? drawRivalDuelBackground(ctx, w, h, hudH)
      : adv.isTraveling() && adv.travelFromId
        ? getBattleSceneLayout(w, h, adv.travelFromId)
        : getBattleSceneLayout(w, h, reg.id);
    const { groundY } = sceneLayout;

    if (adv.isRivalDuelActive()) {
      // 결투장 배경은 sceneLayout 계산 시 drawRivalDuelBackground에서 그림
    } else if (adv.isTraveling() && adv.travelFromId && adv.travelToId) {
      const fromReg = REGIONS.find(r => r.id === adv.travelFromId) ?? reg;
      this.stageBg.draw(ctx, {
        canvasW: w, canvasH: h, scrollX, regionId: fromReg.id, layout: sceneLayout,
        travelProgress: adv.getTravelProgress(),
        travelDurationSec: adv.travelDurationSec,
        travelToRegionId: adv.travelToId,
        animTime: animT,
      });
    } else if (adv.isInSpireRun() || adv.isSpireReturnInProgress()) {
      void preloadSpireTowerAssets();
      drawSpireTowerScene(ctx, w, h, {
        scrollX,
        animTime: animT,
        floor: adv.save.spireRun?.floor ?? 1,
      });
    } else {
      this.stageBg.draw(ctx, {
        canvasW: w, canvasH: h, scrollX, regionId: reg.id, layout: sceneLayout,
        animTime: animT,
      });
    }

    if (!adv.isRivalDuelActive()) {
      this.drawBattleGroundStrip(w, sceneLayout.horizonY, groundY, moving ? scrollX : 0, reg.id);
    }

    const vfx = adv.vfx;
    this.battle.drawBattlefield(
      ctx, adv, animT, w, h, hudH, hudSafeBottom, bottomInset, groundY,
      {
        drawHpBar: (x, y, bw, ratio, color) => this.drawHpBar(x, y, bw, ratio, color),
        drawGaugeBar: (x, y, bw, ratio, color, label) => this.drawGaugeBar(x, y, bw, ratio, color, label),
        drawSkillChargeBar: (x, y, bw, ratio, color, label, icon) =>
          this.drawSkillChargeBar(x, y, bw, ratio, color, label, icon),
        drawNameLabel: (x, y, name, size, color) => this.drawNameLabel(x, y, name, size, color),
        drawHitRing: (x, y, size, intensity) => this.drawHitRing(x, y, size, intensity),
        drawHealRing: (x, y, size, intensity) => this.drawHealRing(x, y, size, intensity),
        drawStatusRing: (x, y, size, intensity, color, glow, ring) =>
          this.drawStatusRing(x, y, size, intensity, color, glow, ring),
        drawCharacterFallback: (x, y, color, accent, name, combat, t, scale) =>
          this.drawCharacterFallback(x, y, color, accent, name, combat, t, scale),
        drawMonsterFallback: (x, y, color, name, scale, t) =>
          this.drawMonsterFallback(x, y, color, name, scale, t),
      },
    );

    for (const slash of vfx.slashes) {
      if (adv.isCombatPerfLite()) break;
      this.drawImpactSlash(
        slash.x * w, slash.y * h, slash.angle, slash.scale, slash.life, slash.crit, slash.prestige ?? 0,
      );
    }

    if (adv.phase === 'encounter') {
      ctx.fillStyle = `rgba(255,220,100,${0.12 + Math.sin(this.animTime * 10) * 0.06})`;
      ctx.fillRect(0, 0, w, h);
      const banner = adv.encounterBanner || `👹 ${adv.encounterName}`;
      const fs = Math.max(11, Math.min(14, h * 0.055));
      this.drawFloatingText(banner, w / 2, hudH + 28, '#ffeeaa', fs, 1, true);
    }

    if (adv.phase === 'boss' && adv.bossIntroTimer > 0) {
      this.drawBossIntroOverlay(adv, w, h, hudH);
    }

    if (adv.eliteIntroTimer > 0 && (adv.phase === 'combat' || adv.phase === 'boss')) {
      this.drawEliteIntroOverlay(adv, w, h, hudH);
    }

    if ((adv.phase === 'combat' || adv.phase === 'boss') && adv.encounterSlots.length > 0) {
      this.drawCombatHud(adv, w, h, hudH);
    }

    if (adv.hasRivalDuelResultPending() && adv.rivalDuelResultPending) {
      this.drawRivalDuelResultBanner(adv.rivalDuelResultPending, w, h, hudH);
    }

    for (const ev of adv.events) {
      if (ev.life < 0.08) continue;
      const px = ev.x * w;
      const py = ev.y * h;
      const alpha = Math.min(1, ev.life);
      const fontSize = ev.compact
        ? Math.max(10, Math.min(13, h * 0.048))
        : Math.max(11, Math.min(16, h * 0.065));
      this.drawFloatingText(ev.text, px, py, ev.color, fontSize, alpha, ev.compact);
    }

    this.drawGemPickupFly(adv, w, h);

    if (adv.isTraveling()) {
      this.drawTravelOverlay(adv, w, h, hudH);
    } else if (adv.isResting) {
      this.drawRestOverlay(adv, w, h, hudH);
    } else if (adv.phase === 'walk') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffffcc';
      ctx.font = `bold ${Math.max(10, h * 0.04)}px Outfit, sans-serif`;
      const runDots = '.'.repeat(1 + Math.floor(this.animTime * 4) % 3);
      const walkLabel = adv.isInSpireRun()
        ? `야탑 등반 중${runDots}`
        : `달리는 중${runDots}`;
      ctx.fillText(walkLabel, w / 2, hudH + 28);
    }

    if (adv.phase === 'defeat' || adv.isDefeatRestActive()) {
      this.drawDefeatOverlay(adv, w, h);
    }

    if (shakeAmt > 0.01) ctx.restore();
  }

  /** 엘리트·에픽 등장 연출 */
  private drawEliteIntroOverlay(adv: AdventureSystem, w: number, h: number, hudH: number) {
    const ctx = this.ctx;
    const t = adv.eliteIntroTimer;
    const alpha = Math.min(1, t / 0.5);
    const cx = w / 2;
    const cy = hudH + (h - hudH) * 0.38;
    const epic = adv.isEpicFight;

    ctx.save();
    ctx.globalAlpha = alpha * 0.65;
    const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.max(w, h) * 0.5);
    grad.addColorStop(0, epic ? 'rgba(255, 80, 180, 0.4)' : 'rgba(255, 140, 40, 0.38)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, hudH, w, h - hudH);

    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.max(15, h * 0.045)}px Outfit, sans-serif`;
    ctx.fillStyle = epic ? '#ff88cc' : '#ffaa55';
    ctx.strokeStyle = '#000000bb';
    ctx.lineWidth = 3;
    const title = adv.eliteIntroLabel || (epic ? '★ 에픽' : '⚠ 엘리트');
    ctx.strokeText(title, cx, cy);
    ctx.fillText(title, cx, cy);
    if (adv.eliteRewardHint) {
      ctx.font = `${Math.max(11, h * 0.032)}px Outfit, sans-serif`;
      ctx.fillStyle = '#ffeeaa';
      ctx.fillText(adv.eliteRewardHint, cx, cy + Math.max(16, h * 0.035));
    }
    ctx.restore();
  }

  private drawRestOverlay(adv: AdventureSystem, w: number, h: number, hudH: number) {
    const ctx = this.ctx;
    const sec = adv.getRestRemainingSec();
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const timer = `${m}:${String(s).padStart(2, '0')}`;
    const cx = w / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 28, 0.55)';
    ctx.fillRect(0, hudH, w, h - hudH);

    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.max(14, h * 0.042)}px Outfit, sans-serif`;
    ctx.fillStyle = '#cceeff';
    ctx.fillText('🛏️ 휴식 진행중…', cx, h * 0.38);
    ctx.font = `bold ${Math.max(28, h * 0.09)}px Outfit, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(timer, cx, h * 0.48);
    ctx.font = `${Math.max(10, h * 0.03)}px Outfit, sans-serif`;
    ctx.fillStyle = '#99aabb';
    ctx.fillText('완료 시 HP 전원 회복', cx, h * 0.54);
    ctx.restore();
  }

  /** 보스 등장 연출 */
  private drawBossIntroOverlay(adv: AdventureSystem, w: number, h: number, hudH: number) {
    const ctx = this.ctx;
    const t = adv.bossIntroTimer;
    const pulse = 0.55 + Math.sin(this.animTime * 14) * 0.25;
    const alpha = Math.min(1, t / 0.6);
    const cx = w / 2;
    const cy = hudH + (h - hudH) * 0.42;
    const name = adv.bossIntroName || '보스';

    ctx.save();
    ctx.globalAlpha = alpha * 0.72;
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.55);
    grad.addColorStop(0, 'rgba(255, 40, 40, 0.45)');
    grad.addColorStop(0.45, 'rgba(120, 0, 80, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, hudH, w, h - hudH);

    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    const nameSize = Math.max(20, h * 0.075) * (0.92 + pulse * 0.12);
    ctx.font = `bold ${nameSize}px Outfit, sans-serif`;
    const nameGrad = ctx.createLinearGradient(cx - w * 0.3, cy, cx + w * 0.3, cy);
    nameGrad.addColorStop(0, '#ffdd44');
    nameGrad.addColorStop(0.5, '#ffffff');
    nameGrad.addColorStop(1, '#ff8844');
    ctx.fillStyle = nameGrad;
    ctx.strokeStyle = '#4a1020';
    ctx.lineWidth = 5;
    const bossLabel = `👑 ${name}`;
    ctx.strokeText(bossLabel, cx, cy);
    ctx.fillText(bossLabel, cx, cy);
    ctx.restore();
  }

  /** 전투 중 어픽스·콤보·포션 한줄 HUD */
  private drawCombatHud(adv: AdventureSystem, w: number, h: number, hudH: number) {
    const ctx = this.ctx;
    const affix = adv.getCurrentAffix();
    const aliveCount = adv.encounterSlots.filter(s => s.entity.hp > 0).length;
    if (!aliveCount) return;

    const combo = adv.getComboHudText();
    const potions = adv.save.party.length > 0
      ? `${getExpeditionPotions(adv.save)}/${EXPEDITION_POTION_CARRY}`
      : '';
    const codexPct = Math.floor(adv.getCodexPercent(adv.save.currentRegion) * 100);
    const bossHint = adv.isInSpireRun() ? ''
      : adv.isInExpedition() && !isBossGateReady(adv.save, adv.save.currentRegion, adv.getCodexPercent(adv.save.currentRegion))
        ? `보스게이트 ${codexPct}%`
        : '';

    ctx.save();
    ctx.textAlign = 'right';
    const fontSize = Math.max(8, Math.min(10, h * 0.028));
    ctx.font = `bold ${fontSize}px Outfit, sans-serif`;
    const parts = [
      `${affix.icon} ${affix.name}`,
      aliveCount > 1 ? `적 ${aliveCount}` : '',
      combo || '',
      potions ? `🧪${potions}` : '',
      bossHint,
    ].filter(Boolean);
    const label = parts.join(' · ');
    const tw = ctx.measureText(label).width;
    const panelX = w - tw - 18;
    const y = hudH + 6;
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    this.roundRect(panelX - 4, y - 2, tw + 12, fontSize + 8, 5);
    ctx.fill();
    ctx.fillStyle = '#aaccff';
    ctx.fillText(label, w - 10, y + fontSize + 1);
    ctx.restore();
  }

  private drawDefeatOverlay(adv: AdventureSystem, w: number, h: number) {
    const ctx = this.ctx;
    const log = adv.getDefeatLog();
    const sec = adv.getDefeatRemainingSec();
    const timer = sec < 60 ? `${sec}초` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    const dots = '.'.repeat(1 + Math.floor(this.animTime * 2) % 4);

    ctx.save();
    ctx.fillStyle = 'rgba(8, 6, 18, 0.78)';
    ctx.fillRect(0, 0, w, h);

    const panelW = Math.min(w - 32, 320);
    const panelH = Math.min(h - 48, log ? 360 : 180);
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;

    ctx.fillStyle = 'rgba(22, 18, 36, 0.96)';
    ctx.strokeStyle = 'rgba(255, 90, 90, 0.55)';
    ctx.lineWidth = 2;
    this.roundRect(px, py, panelW, panelH, 14);
    ctx.fill();
    ctx.stroke();

    const cx = w / 2;
    let y = py + 28;
    const titleSize = Math.max(16, Math.min(20, h * 0.045));
    const subSize = Math.max(12, Math.min(14, h * 0.032));
    const timerSize = Math.max(34, Math.min(48, h * 0.11));

    ctx.textAlign = 'center';
    ctx.font = `bold ${titleSize}px Outfit, sans-serif`;
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('파티원이 전멸했습니다.', cx, y);
    y += titleSize + 8;

    ctx.font = `${subSize}px Outfit, sans-serif`;
    ctx.fillStyle = '#c8c0d8';
    ctx.fillText(`휴식 중${dots}`, cx, y);
    y += subSize + 18;

    ctx.font = `bold ${timerSize}px Outfit, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(timer, cx, y);
    y += timerSize * 0.55;

    ctx.font = `${Math.max(10, subSize - 1)}px Outfit, sans-serif`;
    ctx.fillStyle = '#8888aa';
    const mercy = (adv.save.stats.defeatCount ?? 0) <= 1;
    ctx.fillText(
      mercy ? '첫 전멸 — 숙소 골드 패널티 면제 · 휴식 후 65% 회복' : '숙소 보유 골드만 차감 · 던전은 골드 없음',
      cx, y + 10,
    );

    if (log) {
      const logTop = y + 28;
      const logPad = 12;
      const logH = panelH - (logTop - py) - 14;
      const logX = px + logPad;
      const logW = panelW - logPad * 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      this.roundRect(logX, logTop, logW, logH, 8);
      ctx.fill();

      const rowH = Math.max(18, Math.min(22, logH / 7));
      const labelSize = Math.max(10, Math.min(12, rowH * 0.55));
      const valSize = labelSize;
      const rows: [string, string, string][] = [
        ['던전', log.regionName ?? '-', '#aaccff'],
        ['어픽스', log.affixName ?? '-', '#ccaa88'],
        ['가한 피해', log.stats.damageDealt.toLocaleString(), '#88ccff'],
        ['받은 피해', log.stats.damageTaken.toLocaleString(), '#ff8888'],
        ['투닥 피해', log.stats.touchDamage.toLocaleString(), '#dd88ff'],
        ['처치 수', `${log.stats.kills}마리`, '#aadd88'],
        ['숙소 골드 차감', `-${log.penaltyGold.toLocaleString()}`, '#ff6666'],
        ['총 손실', `-${log.goldLost.toLocaleString()}`, '#ff4444'],
      ];
      if (log.lastHit) {
        rows.splice(2, 0, ['마지막 일격', `${log.lastHit.attacker}→${log.lastHit.target} -${log.lastHit.damage}`, '#ff6644']);
      }

      ctx.textAlign = 'left';
      let ry = logTop + rowH * 0.75;
      for (const [label, value, color] of rows) {
        ctx.font = `${labelSize}px Outfit, sans-serif`;
        ctx.fillStyle = '#9a94b0';
        ctx.fillText(label, logX + 10, ry);
        ctx.textAlign = 'right';
        ctx.font = `bold ${valSize}px Outfit, sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(value, logX + logW - 10, ry);
        ctx.textAlign = 'left';
        ry += rowH;
      }
      if (log.aggroTip) {
        ctx.textAlign = 'center';
        ctx.font = `${Math.max(9, labelSize - 1)}px Outfit, sans-serif`;
        ctx.fillStyle = '#99aacc';
        ctx.fillText(log.aggroTip, logX + logW / 2, logTop + logH - 6);
      }
    }

    ctx.restore();
  }

  private drawTravelOverlay(adv: AdventureSystem, w: number, h: number, hudH: number) {
    const ctx = this.ctx;
    if (adv.isSpireReturnInProgress()) {
      const floor = adv.save.spireRun?.floor ?? 1;
      const remain = adv.getSpireReturnRemainingSec();
      const prog = adv.getTravelProgress();
      const cx = w / 2;
      const panelW = Math.min(w - 40, 300);
      const panelH = 72;
      const px = (w - panelW) / 2;
      const py = hudH + 18;

      ctx.save();
      ctx.fillStyle = 'rgba(12, 8, 22, 0.88)';
      ctx.strokeStyle = 'rgba(180, 140, 255, 0.5)';
      ctx.lineWidth = 2;
      this.roundRect(px, py, panelW, panelH, 12);
      ctx.fill();
      ctx.stroke();

      const titleSize = Math.max(11, Math.min(13, h * 0.034));
      const subSize = Math.max(9, Math.min(11, h * 0.028));
      ctx.textAlign = 'center';
      ctx.font = `bold ${titleSize}px Outfit, sans-serif`;
      ctx.fillStyle = '#e8ddff';
      ctx.fillText(`🗼 야탑 ${floor}층  →  🏠 마을`, cx, py + 22);
      ctx.font = `${subSize}px Outfit, sans-serif`;
      ctx.fillStyle = '#bbaadd';
      ctx.fillText(`귀환 중… ${remain}초`, cx, py + 40);

      const barX = px + 16;
      const barW = panelW - 32;
      const barY = py + panelH - 16;
      const barH = 6;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      this.roundRect(barX, barY, barW, barH, 3);
      ctx.fill();
      const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, '#6644aa');
      grad.addColorStop(1, '#bb88ff');
      ctx.fillStyle = grad;
      this.roundRect(barX, barY, Math.max(barH, barW * prog), barH, 3);
      ctx.fill();
      ctx.restore();
      return;
    }

    const fromReg = REGIONS.find(r => r.id === adv.travelFromId);
    const toReg = REGIONS.find(r => r.id === adv.travelToId);
    const prog = adv.getTravelProgress();
    const remain = Math.max(0, Math.ceil(adv.travelDurationSec * (1 - prog)));
    const cx = w / 2;
    const panelW = Math.min(w - 40, 300);
    const panelH = 72;
    const px = (w - panelW) / 2;
    const py = hudH + 18;

    ctx.save();
    ctx.fillStyle = 'rgba(12, 10, 24, 0.82)';
    ctx.strokeStyle = 'rgba(136, 204, 255, 0.45)';
    ctx.lineWidth = 2;
    this.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    const titleSize = Math.max(11, Math.min(13, h * 0.034));
    const subSize = Math.max(9, Math.min(11, h * 0.028));
    ctx.textAlign = 'center';
    ctx.font = `bold ${titleSize}px Outfit, sans-serif`;
    ctx.fillStyle = '#e8f4ff';
    const returning = adv.isReturningToLodging;
    ctx.fillText(
      returning
        ? `🏠 ${fromReg?.name ?? '?'}  ←  ${toReg?.name ?? '?'}`
        : `🗺️ ${fromReg?.name ?? '?'}  →  ${toReg?.name ?? '?'}`,
      cx, py + 22,
    );
    ctx.font = `${subSize}px Outfit, sans-serif`;
    ctx.fillStyle = '#aabbcc';
    ctx.fillText(
      returning ? `숙소 귀환 중… ${remain}초 (전투 없음)` : `이동 중… ${remain}초`,
      cx, py + 40,
    );

    const barX = px + 16;
    const barW = panelW - 32;
    const barY = py + panelH - 16;
    const barH = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this.roundRect(barX, barY, barW, barH, 3);
    ctx.fill();
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#4488cc');
    grad.addColorStop(1, '#88ddff');
    ctx.fillStyle = grad;
    this.roundRect(barX, barY, Math.max(barH, barW * prog), barH, 3);
    ctx.fill();
    ctx.restore();
  }

  private drawReturnWalkOverlay(adv: AdventureSystem, w: number, h: number, hudH: number) {
    const ctx = this.ctx;
    const reg = REGIONS.find(r => r.id === adv.save.currentRegion);
    const remain = adv.getReturnWalkRemainingSec();
    const cx = w / 2;
    const panelW = Math.min(w - 40, 300);
    const panelH = 58;
    const px = (w - panelW) / 2;
    const py = hudH + 18;

    ctx.save();
    ctx.fillStyle = 'rgba(12, 10, 24, 0.82)';
    ctx.strokeStyle = 'rgba(204, 170, 238, 0.45)';
    ctx.lineWidth = 2;
    this.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    const titleSize = Math.max(11, Math.min(13, h * 0.034));
    const subSize = Math.max(9, Math.min(11, h * 0.028));
    ctx.textAlign = 'center';
    ctx.font = `bold ${titleSize}px Outfit, sans-serif`;
    ctx.fillStyle = '#e8f4ff';
    ctx.fillText(`🏠 ${adv.save.currentRegion}층 ${reg?.name ?? ''} 통과`, cx, py + 22);
    ctx.font = `${subSize}px Outfit, sans-serif`;
    ctx.fillStyle = '#aabbcc';
    ctx.fillText(`숙소 귀환 중… ${remain}초`, cx, py + 42);
    ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** 파노라마 하단 — 배경과 자연스럽게 이어지는 발밑 음영만 */
  private drawBattleGroundStrip(
    w: number, horizonY: number, groundY: number, _scroll: number, _regionId: number,
  ) {
    const ctx = this.ctx;
    const stripH = groundY - horizonY;
    if (stripH <= 4) {
      const fadeH = Math.min(28, w * 0.08);
      const g = ctx.createLinearGradient(0, groundY - fadeH, 0, groundY + 2);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = g;
      ctx.fillRect(0, groundY - fadeH, w, fadeH + 2);
      return;
    }

    const g = ctx.createLinearGradient(0, horizonY, 0, groundY);
    g.addColorStop(0, 'rgba(0,0,0,0.08)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(0, horizonY, w, stripH);
  }

  /** 발밑 지면 러시 라인 — 속도감 */
  private drawGroundRush(
    w: number, groundY: number, h: number,
    bgScroll: number, ground: string, isWalking: boolean, speedMult: number,
  ) {
    const ctx = this.ctx;
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
    groundGrad.addColorStop(0, this.shadeColor(ground, -5));
    groundGrad.addColorStop(0.35, this.shadeColor(ground, -20));
    groundGrad.addColorStop(1, this.shadeColor(ground, -40));
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    if (isWalking) {
      ctx.fillStyle = this.shadeColor(ground, 30) + '55';
      for (let i = 0; i < 14; i++) {
        const gx = ((bgScroll * speedMult + i * 72) % (w + 100) + (w + 100)) % (w + 100) - 50;
        ctx.fillRect(gx, groundY + 2, 48, 3);
      }
    }
    ctx.fillStyle = '#00000022';
    ctx.fillRect(0, groundY, w, 2);
  }

  private shadeColor(hex: string, amount: number): string {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + amount));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
    return `rgb(${r},${g},${b})`;
  }

  private drawCloudLayer(w: number, h: number, scroll: number, alpha: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      const cx = ((scroll + i * 160) % (w + 100)) - 40;
      const cy = h * (0.08 + (i % 3) * 0.06);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 28 + (i % 2) * 10, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 22, cy + 4, 20, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 18, cy + 3, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawParallaxHills(
    w: number, h: number, scroll: number, color: string,
    groundY: number, speed: number, heightRatio: number, alpha: number,
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.shadeColor(color, -20);
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w; x += 12) {
      const y = groundY - h * heightRatio * 0.35
        + Math.sin((x + scroll * speed) * 0.012) * h * 0.04
        + Math.sin((x + scroll * speed) * 0.005 + 1) * h * 0.025;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawSceneryProps(
    w: number, groundY: number, scroll: number, ground: string, isWalking: boolean,
  ) {
    const ctx = this.ctx;
    const speed = isWalking ? 1.6 : 0.35;
    const treeColor = this.shadeColor(ground, -40);
    const trunk = this.shadeColor(ground, -60);

    for (let i = 0; i < 7; i++) {
      const tx = ((scroll * speed + i * 130) % (w + 80)) - 40;
      const th = 22 + (i % 3) * 8;
      ctx.fillStyle = trunk;
      ctx.fillRect(tx - 3, groundY - th, 6, th);
      ctx.fillStyle = treeColor;
      ctx.beginPath();
      ctx.moveTo(tx, groundY - th - 18);
      ctx.lineTo(tx - 14, groundY - th + 2);
      ctx.lineTo(tx + 14, groundY - th + 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = this.shadeColor(ground, 15) + 'aa';
    for (let i = 0; i < 10; i++) {
      const bx = ((scroll * speed * 1.3 + i * 75) % (w + 60)) - 30;
      ctx.beginPath();
      ctx.ellipse(bx, groundY + 2, 8 + (i % 2) * 4, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 💎 보석 드롭 — 화면 가로질러 아이콘 비행 */
  private drawGemPickupFly(adv: AdventureSystem, w: number, h: number) {
    const vfx = adv.gemFlyVfx;
    if (!vfx) return;

    const ctx = this.ctx;
    const prog = Math.min(1, vfx.elapsed / vfx.duration);
    const ease = prog < 0.5 ? 2 * prog * prog : 1 - (-2 * prog + 2) ** 2 / 2;
    const x = -48 + (w + 96) * ease;
    const y = h * 0.34 - Math.sin(prog * Math.PI) * 32;
    const iconSize = Math.max(30, Math.min(44, h * 0.058));
    const labelSize = Math.max(12, Math.min(16, h * 0.038));
    const alpha = prog < 0.06 ? prog / 0.06 : prog > 0.94 ? (1 - prog) / 0.06 : 1;
    const pulse = 1 + Math.sin(vfx.elapsed * 14) * 0.08;

    ctx.save();
    ctx.globalAlpha = alpha;

    const glowR = iconSize * 0.9 * pulse;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, glowR);
    grad.addColorStop(0, 'rgba(200, 140, 255, 0.55)');
    grad.addColorStop(1, 'rgba(200, 140, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `${Math.round(iconSize * pulse)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💎', x, y);

    ctx.font = `bold ${labelSize}px Outfit, sans-serif`;
    ctx.fillStyle = '#f0d8ff';
    ctx.strokeStyle = '#000000cc';
    ctx.lineWidth = 3;
    const label = '보석 획득!';
    ctx.strokeText(label, x + iconSize * 0.95, y - 2);
    ctx.fillText(label, x + iconSize * 0.95, y - 2);

    for (let i = 0; i < 4; i++) {
      const sparkX = x - 20 - i * 14 + Math.sin(vfx.elapsed * 8 + i) * 4;
      const sparkY = y + 6 + Math.cos(vfx.elapsed * 9 + i * 1.7) * 5;
      ctx.globalAlpha = alpha * (0.35 + (i % 2) * 0.2);
      ctx.fillText('✨', sparkX, sparkY);
    }

    ctx.restore();
  }

  private drawHitRing(x: number, y: number, size: number, intensity: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = intensity * 0.55;
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2 + intensity * 2;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.45 + (1 - intensity) * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawHealRing(x: number, y: number, size: number, intensity: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = intensity * 0.72;
    ctx.strokeStyle = '#55ff99';
    ctx.lineWidth = 2.5 + intensity * 3;
    ctx.shadowColor = '#44ff8844';
    ctx.shadowBlur = 8 + intensity * 10;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.48 + (1 - intensity) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = intensity * 0.28;
    ctx.fillStyle = '#44ff88';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawStatusRing(
    x: number, y: number, size: number, intensity: number,
    color: string, glow: string, ring: string,
  ) {
    const ctx = this.ctx;
    ctx.save();
    const isDebuff = ring.startsWith('debuff');
    const isShock = ring === 'debuff_shock';
    const isDot = ring === 'debuff_dot';
    const lineW = isShock ? 3.5 + intensity * 4 : isDot ? 2 + intensity * 2.5 : 2.5 + intensity * 3;
    const radius = size * (isDebuff ? 0.5 : 0.46) + (1 - intensity) * (isShock ? 2 : 5);
    ctx.globalAlpha = intensity * (isDebuff ? 0.78 : 0.68);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.shadowColor = glow;
    ctx.shadowBlur = isShock ? 14 + intensity * 16 : 8 + intensity * 10;
    if (isShock) {
      ctx.setLineDash([4 + intensity * 3, 3]);
    } else if (isDot) {
      ctx.setLineDash([2, 4]);
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (ring === 'shield' || ring === 'buff') {
      ctx.globalAlpha = intensity * 0.22;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    if (isDebuff && intensity > 0.35) {
      ctx.globalAlpha = intensity * 0.45;
      ctx.fillStyle = color;
      const spikes = isShock ? 6 : 4;
      for (let i = 0; i < spikes; i++) {
        const a = (Math.PI * 2 * i) / spikes + intensity * 0.4;
        const r1 = radius * 0.85;
        const r2 = radius * (isShock ? 1.18 : 1.08);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
        ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawImpactSlash(
    x: number, y: number, angle: number, scale: number, life: number, crit: boolean, prestige = 0,
  ) {
    const ctx = this.ctx;
    const alpha = Math.min(1, life * 5);
    const colors = prestige > 0
      ? (() => {
        const palette = ['#ffffff', '#aaddff', '#cc88ff', '#ffd700'] as const;
        const accent = ['#ffee66', '#66ccff', '#ff88ff', '#ff6644'] as const;
        const i = Math.min(3, prestige);
        return { main: palette[i]!, accent: accent[i]! };
      })()
      : { main: crit ? '#ffee66' : '#ffffff', accent: '#ff6644' };
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colors.main;
    ctx.lineWidth = (crit || prestige > 0) ? 3 + prestige * 0.4 : 2;
    ctx.lineCap = 'round';
    const len = ((crit || prestige > 0) ? 28 : 20) * scale * (1 + prestige * 0.08);
    ctx.beginPath();
    ctx.moveTo(-len * 0.3, len * 0.5);
    ctx.lineTo(len * 0.7, -len * 0.4);
    ctx.stroke();
    if (crit || prestige > 0) {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 1.5 + prestige * 0.25;
      ctx.beginPath();
      ctx.moveTo(-len * 0.1, len * 0.35);
      ctx.lineTo(len * 0.5, -len * 0.55);
      ctx.stroke();
    }
    if (prestige >= 2) {
      ctx.globalAlpha = alpha * 0.45;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, len * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawRivalDuelResultBanner(result: RivalDuelResult, w: number, h: number, hudH: number) {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = hudH + Math.round(h * 0.16);
    const title = result.won ? '🏆 격파 성공!' : '💀 격파 실패';
    const sub = result.won && result.gold != null
      ? `🪙 +${result.gold.toLocaleString()} · SP +${result.sp ?? 0}`
      : result.nickname;
    const titleFs = Math.max(16, Math.min(22, h * 0.07));
    const subFs = Math.max(11, Math.min(14, h * 0.042));
    ctx.save();
    ctx.fillStyle = 'rgba(8, 6, 18, 0.55)';
    const padX = 18;
    const padY = 12;
    ctx.font = `bold ${titleFs}px Outfit, sans-serif`;
    const tw = Math.max(ctx.measureText(title).width, ctx.measureText(sub).width);
    const boxW = tw + padX * 2;
    const boxH = titleFs + subFs + padY * 2 + 8;
    const bx = cx - boxW / 2;
    const by = cy - boxH / 2;
    this.roundRect(bx, by, boxW, boxH, 10);
    ctx.fill();
    ctx.strokeStyle = result.won ? '#ffcc8844' : '#ff666644';
    ctx.lineWidth = 1.5;
    this.roundRect(bx, by, boxW, boxH, 10);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${titleFs}px Outfit, sans-serif`;
    ctx.fillStyle = result.won ? '#ffeeaa' : '#ffaaaa';
    ctx.fillText(title, cx, by + padY + titleFs * 0.45);
    ctx.font = `bold ${subFs}px Outfit, sans-serif`;
    ctx.fillStyle = result.won ? '#c8f0c8' : '#ddcccc';
    ctx.fillText(sub, cx, by + boxH - padY - subFs * 0.45);
    ctx.restore();
  }

  private drawNameLabel(x: number, y: number, name: string, fontSize: number, color = '#fff') {
    const ctx = this.ctx;
    ctx.font = `bold ${fontSize}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000cc';
    ctx.strokeText(name, x, y);
    ctx.fillStyle = color;
    ctx.fillText(name, x, y);
    ctx.textBaseline = 'alphabetic';
  }

  private drawFloatingText(
    text: string, x: number, y: number, color: string, fontSize: number, alpha = 1,
    compact = false,
  ) {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const hudH = this.getCombatTopInset();

    ctx.font = `bold ${fontSize}px Outfit, sans-serif`;
    const tw = ctx.measureText(text).width;
    const cx = Math.max(tw / 2 + 6, Math.min(w - tw / 2 - 6, x));
    const cy = Math.max(hudH + fontSize * 0.5, Math.min(h - 6, y));

    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (compact) {
      const padX = 7;
      const padY = 3;
      const boxW = tw + padX * 2;
      const boxH = fontSize + padY * 2;
      const bx = cx - boxW / 2;
      const by = cy - boxH / 2;
      ctx.fillStyle = 'rgba(8, 6, 18, 0.72)';
      this.roundRect(bx, by, boxW, boxH, 6);
      ctx.fill();
      ctx.strokeStyle = color + '55';
      ctx.lineWidth = 1;
      this.roundRect(bx, by, boxW, boxH, 6);
      ctx.stroke();
    } else {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000cc';
      ctx.strokeText(text, cx, cy);
    }

    ctx.fillStyle = color;
    ctx.fillText(text, cx, cy);
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic';
  }

  private drawHills(w: number, h: number, scroll: number, color: string) {
    const ctx = this.ctx;
    ctx.fillStyle = color + '88';
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();
      const spd = 0.2 + layer * 0.15;
      const baseY = h * (0.45 + layer * 0.08);
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) {
        const y = baseY + Math.sin((x + scroll * spd) * 0.008 + layer) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawCharacterFallback(
    x: number, y: number, color: string, accent: string, name: string,
    combat: boolean, t: number, scale = 1,
  ) {
    const ctx = this.ctx;
    const s = Math.max(0.75, scale);
    const legSwing = (combat ? Math.sin(t * 12) * 8 : Math.sin(t * 8) * 12) * s;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.translate(-x, -y);

    ctx.fillStyle = '#00000044';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.fillRect(x - 8, y - 18 + legSwing * 0.3, 6, 18);
    ctx.fillRect(x + 2, y - 18 - legSwing * 0.3, 6, 18);

    ctx.fillStyle = color;
    ctx.fillRect(x - 14, y - 42, 28, 26);
    ctx.fillStyle = accent;
    ctx.fillRect(x - 10, y - 38, 20, 8);

    ctx.fillStyle = '#ffd5b8';
    ctx.beginPath();
    ctx.arc(x, y - 50, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(x - 12, y - 62, 24, 10);

    ctx.fillStyle = '#222';
    ctx.fillRect(x - 5, y - 52, 3, 3);
    ctx.fillRect(x + 2, y - 52, 3, 3);

    if (combat) {
      const angle = Math.sin(t * 10) * 0.8;
      ctx.save();
      ctx.translate(x + 14, y - 30);
      ctx.rotate(angle);
      ctx.fillStyle = '#ccc';
      ctx.fillRect(0, -2, 22, 4);
      ctx.restore();
    }

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(10, Math.round(10 * s))}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y - 68);

    ctx.restore();
  }

  private drawMonsterFallback(x: number, y: number, color: string, name: string, scale: number, t: number) {
    const ctx = this.ctx;
    const bounce = Math.sin(t * 5) * 4 * scale;
    const s = 28 * scale;

    ctx.fillStyle = '#00000044';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, s * 0.7, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y - s / 2 - bounce, s, s * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff8';
    ctx.beginPath();
    ctx.ellipse(x - s * 0.25, y - s * 0.6 - bounce, s * 0.2, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#222';
    ctx.fillRect(x - s * 0.2, y - s * 0.45 - bounce, s * 0.15, s * 0.15);
    ctx.fillRect(x + s * 0.05, y - s * 0.45 - bounce, s * 0.15, s * 0.15);

    if (name) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${10 * scale}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(name, x, y - s - 10 - bounce);
    }
  }

  private drawGaugeBar(x: number, y: number, bw: number, ratio: number, color: string, label: string) {
    const ctx = this.ctx;
    const h = CHAR_GAUGE_BAR_H;
    ctx.fillStyle = '#00000088';
    ctx.fillRect(x, y, bw, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(1, bw * Math.min(1, ratio)), h);
    if (ratio >= 0.98) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 5px Outfit, sans-serif';
      ctx.fillStyle = '#ffffffcc';
      ctx.fillText('★', x + bw / 2, y - 1);
    }
    ctx.textAlign = 'left';
    ctx.font = '5px Outfit, sans-serif';
    ctx.fillStyle = '#999';
    ctx.fillText(label, x + bw + 1, y + h);
  }

  private drawSkillChargeBar(
    x: number, y: number, bw: number, ratio: number, color: string,
    label?: string, icon?: string,
  ) {
    const ctx = this.ctx;
    if (label || icon) {
      const tag = `${icon ?? ''}${icon && label ? ' ' : ''}${label ?? ''}`.trim();
      if (tag) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 6px Outfit, sans-serif';
        ctx.fillStyle = '#ffffffcc';
        ctx.fillText(tag.length > 10 ? `${tag.slice(0, 9)}…` : tag, x, y - 2);
        ctx.restore();
      }
    }
    const h = 4;
    const left = x - bw / 2;
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(left, y, bw, h);
    const fillW = Math.max(1, bw * Math.min(1, ratio));
    ctx.fillStyle = color;
    ctx.fillRect(left, y, fillW, h);
    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = 1;
    ctx.strokeRect(left + 0.5, y + 0.5, bw - 1, h - 1);
    if (ratio >= 0.95) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 6px Outfit, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('!', x, y - 2);
    }
  }

  private drawHpBar(x: number, y: number, bw: number, ratio: number, color: string) {
    const ctx = this.ctx;
    const h = CHAR_HP_BAR_H;
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, bw, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, bw * Math.max(0, ratio), h);
  }
}
