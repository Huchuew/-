import { configurePixelArtContext, getImage, getKeyedCanvas } from '../assets/AssetLoader';
import type { AdventureSystem } from '../systems/AdventureSystem';
import { CHAR_MAP, charUsesProjectile } from '../data/characters';
import { getVisualPartyOrder } from '../systems/FormationSystem';
import { getBattleLayout, getBattleSpriteSize, getEnemySlotXs, getPartySlotStagger, calcMeleeDashDistance, getRivalDuelBattleLayout, getRivalDuelEnemySlotXs, getRivalSlotDepthOffset, scaleBattleSpriteSize, RIVAL_DUEL_SPRITE_SCALE, type BattleLayout } from '../data/tinyRpgAnim';
import { getMonsterBattleSpriteSize } from '../data/pipoyaMap';
import type { ProjectileKind } from '../data/tinyRpgAnim';
import { drawPixelSpriteImpact } from './SpriteLoader';
import type { CombatVfxManager, ProjectileVfx } from './combatVfx';
import {
  CHAR_BAR_WIDTH_RATIO, CHAR_BAR_Y_RATIO, CHAR_GAUGE_BAR_H, CHAR_GAUGE_OFFSET,
  CHAR_FOOT_LIFT_RATIO, CHAR_HP_BAR_H, CHAR_NAME_BAR_GAP, CHAR_SKILL_CHARGE_BELOW_NAME,
  CHAR_WALK_FOOT_LIFT_RATIO, getCharNameYRatio, getProjectileHandOffset,
  PROJECTILE_CENTER_DOWN_RATIO, RIVAL_DUEL_BAR_WIDTH_RATIO, RIVAL_DUEL_BAR_Y_RATIO,
  RIVAL_DUEL_NAME_Y_RATIO,
} from '../data/charUiLayout';
import { spiritBarColor } from '../systems/eliteSpirit';
import { gaugeBarColor, gaugeLabel } from '../systems/GaugeSystem';
import { drawCharacterSprite } from './CharacterSprite';
import { drawMonsterSprite } from './MonsterSprite';
import { getMonsterGroundOffset } from '../data/monsterGroundOffset';
import { ELEMENT_COLOR, ELEMENT_ICON } from '../data/elemental';
import type { ElementType, EncounterSlot, GaugeType } from '../types';

function resolveMeleeDashDist(
  partySlotX: number,
  allyW: number,
  enemyUid: string | null,
  alive: EncounterSlot[],
  xs: number[],
  sizes: { w: number }[],
  fallback: number,
): number {
  if (!alive.length) return fallback;
  let idx = 0;
  if (enemyUid) {
    const found = alive.findIndex(e => e.uid === enemyUid);
    if (found >= 0) idx = found;
  }
  return calcMeleeDashDistance(
    partySlotX,
    xs[idx] ?? xs[0] ?? partySlotX,
    allyW,
    sizes[idx]?.w ?? allyW,
  );
}

export interface BattleDrawCallbacks {
  drawHpBar(x: number, y: number, w: number, ratio: number, color: string): void;
  drawGaugeBar(x: number, y: number, w: number, ratio: number, color: string, label: string): void;
  drawSkillChargeBar(
    x: number, y: number, w: number, ratio: number, color: string,
    label?: string, icon?: string,
  ): void;
  drawNameLabel(x: number, y: number, name: string, fontSize: number, color?: string): void;
  drawHitRing(x: number, y: number, size: number, intensity: number): void;
  drawHealRing(x: number, y: number, size: number, intensity: number): void;
  drawStatusRing(
    x: number, y: number, size: number, intensity: number,
    color: string, glow: string, ring: string,
  ): void;
  drawCharacterFallback(
    x: number, y: number, color: string, accent: string,
    name: string, combat: boolean, t: number, scale?: number,
  ): void;
  drawMonsterFallback(
    x: number, y: number, color: string, name: string, scale: number, t: number,
  ): void;
}

interface PartySlotAnchor {
  charId: string;
  slot: number;
  footX: number;
  footY: number;
  spriteH: number;
  spriteW: number;
  nameBaselineY: number;
}

interface RivalHudEntry {
  x: number;
  barY: number;
  nameY: number;
  barW: number;
  hpRatio: number;
  hpColor: string;
  label: string;
  nameSize: number;
  nameColor?: string;
  gaugeRatio?: number;
  gaugeType?: GaugeType;
}

function rivalCharHudY(footY: number, spriteH: number): { barY: number; nameY: number } {
  return {
    barY: footY - Math.round(spriteH * RIVAL_DUEL_BAR_Y_RATIO),
    nameY: footY - Math.round(spriteH * RIVAL_DUEL_NAME_Y_RATIO),
  };
}

export class BattleRenderer {
  drawBattlefield(
    ctx: CanvasRenderingContext2D,
    adv: AdventureSystem,
    animTime: number,
    w: number,
    h: number,
    hudH: number,
    hudSafeBottom: number,
    bottomInset: number,
    groundY: number,
    cb: BattleDrawCallbacks,
  ) {
    const inCombat = adv.phase === 'combat' || adv.phase === 'boss';
    const isRivalDuel = adv.isRivalDuelActive();
    const isPartyMoving = adv.isWalking() || adv.isTraveling();
    const showPartyHudBars = inCombat && !adv.isCombatSkillBarActive();
    const vfx = adv.vfx;
    const footLift = Math.round(h * CHAR_FOOT_LIFT_RATIO)
      + (isPartyMoving && !inCombat ? Math.round(h * CHAR_WALK_FOOT_LIFT_RATIO) : 0);
    const footY = Math.max(
      hudH + 48,
      Math.min(h - 2, Math.round(groundY - footLift)),
    );
    const layout = isRivalDuel
      ? getRivalDuelBattleLayout(w, h, hudH, footY, adv.save.party.length)
      : getBattleLayout(w, h, hudH, footY, adv.save.party.length, inCombat);
    /** 파티·적 공통 지면 — 발 접지선(footY) 기준 */
    const enemyFootY = footY;

    const aliveEnemies = adv.encounterSlots.filter(s => s.entity.hp > 0);
    let impactAnchorX = layout.enemyX;
    let impactAnchorFootY = enemyFootY;
    let impactAnchorH = getMonsterBattleSpriteSize(w, h, hudH, false).h;
    let enemySizes: { w: number; h: number }[] = [];
    let enemyXs: number[] = [layout.enemyX];
    const rivalHudQueue: RivalHudEntry[] = [];
    if (aliveEnemies.length > 0) {
      enemySizes = aliveEnemies.map(enc => {
        if (enc.rivalCharId) {
          const s = scaleBattleSpriteSize(
            getBattleSpriteSize(w, h, hudH, enemyFootY, 'player'),
            RIVAL_DUEL_SPRITE_SCALE,
          );
          return { w: s.w, h: s.h };
        }
        const boss = enc.def.isBoss || enc.def.id.startsWith('boss_');
        return getMonsterBattleSpriteSize(w, h, hudH, boss, enc.def.id);
      });
      const maxEw = Math.max(...enemySizes.map(s => s.w));
      enemyXs = isRivalDuel
        ? getRivalDuelEnemySlotXs(layout.enemyX, maxEw, aliveEnemies.length)
        : getEnemySlotXs(layout.enemyX, maxEw, aliveEnemies.length);
      impactAnchorX = enemyXs[0] ?? layout.enemyX;
      const primaryMonId = aliveEnemies[0]!.def.id;
      impactAnchorFootY = enemyFootY + getMonsterGroundOffset(primaryMonId);
      impactAnchorH = enemySizes[0]!.h;

      aliveEnemies.forEach((enc, i) => {
        const monId = enc.def.id;
        const { w: ew, h: eh } = enemySizes[i]!;
        const ex = enemyXs[i] ?? layout.enemyX;
        const depthY = isRivalDuel && enc.rivalCharId
          ? getRivalSlotDepthOffset(i, aliveEnemies.length)
          : 0;
        const monFootY = enemyFootY + getMonsterGroundOffset(monId) + depthY;
        const strikeProg = vfx.getEnemyStrikeProgress(i);
        const lunge = (isRivalDuel && enc.rivalCharId)
          ? 0
          : vfx.getEnemyStrikeOffset(strikeProg, Math.round(ew * 0.22));
        const flash = Math.max(vfx.getEnemyAttackFlash(i), vfx.getEnemyHitFlash(i));
        let drawn = false;
        if (enc.rivalCharId && CHAR_MAP[enc.rivalCharId]) {
          ctx.save();
          ctx.translate(ex + lunge, 0);
          ctx.scale(-1, 1);
          drawn = drawCharacterSprite(ctx, {
            charId: enc.rivalCharId,
            x: 0,
            y: monFootY,
            w: ew,
            h: eh,
            inCombat,
            animTime,
            flash,
            slot: i,
            hp: enc.entity.hp,
            dieAnimProgress: enc.entity.dieAnimProgress,
          });
          ctx.restore();
        } else {
          drawn = drawMonsterSprite(ctx, {
            monId,
            x: ex + lunge,
            y: monFootY,
            w: ew,
            h: eh,
            animTime,
            flash,
            inCombat,
            hp: enc.entity.hp,
            maxHp: enc.entity.maxHp,
            strikeProg,
          });
        }
        if (!drawn) {
          cb.drawMonsterFallback(ex, monFootY, '#cc4444', '', eh / 100, animTime);
        } else if (flash > 0) {
          cb.drawHitRing(ex, monFootY - eh * 0.5, ew, flash * 0.85);
        }
        const enemyStatus = vfx.getEnemyStatusFlash(i);
        if (enemyStatus) {
          const sAlpha = vfx.getStatusFlashAlpha(enemyStatus);
          if (sAlpha > 0) {
            cb.drawStatusRing(ex, monFootY - eh * 0.48, ew, sAlpha, enemyStatus.color, enemyStatus.glow, enemyStatus.ring);
          }
        }

        const isRivalChar = !!enc.rivalCharId;
        const barW = Math.round(ew * (isRivalDuel && isRivalChar ? RIVAL_DUEL_BAR_WIDTH_RATIO : CHAR_BAR_WIDTH_RATIO));
        const nameSize = isRivalDuel && isRivalChar
          ? Math.max(7, Math.min(9, h * 0.032))
          : Math.max(8, Math.min(11, h * 0.04));
        const nameGap = Math.max(CHAR_NAME_BAR_GAP, Math.round(nameSize * 0.45));
        const isElite = enc.isElite && !isRivalChar;
        let barY: number;
        let nameY: number;
        if (isRivalChar) {
          ({ barY, nameY } = rivalCharHudY(monFootY, eh));
        } else {
          const uiStack = i * (nameGap + 12);
          const spiritBand = isElite ? CHAR_GAUGE_BAR_H + 3 : 0;
          barY = monFootY - Math.round(eh * 0.10) - uiStack - spiritBand;
          nameY = monFootY - Math.round(eh * 0.48) - uiStack;
          nameY = Math.min(nameY, barY - nameGap);
        }
        const minNameY = hudSafeBottom + nameSize + 4;
        if (nameY < minNameY) {
          const lift = minNameY - nameY;
          nameY += lift;
          barY += lift;
        }
        const hpRatio = enc.entity.hp / enc.entity.maxHp;
        const isBoss = enc.def.isBoss || enc.def.id.startsWith('boss_');
        const isBossBar = isBoss && i === 0;
        const isRareBar = enc.def.isRare && !isRivalChar;
        const hpColor = isRivalChar
          ? (hpRatio > 0.5 ? '#ff7777' : hpRatio > 0.25 ? '#ff9955' : '#ff4444')
          : isBossBar
            ? (hpRatio > 0.5 ? '#ff2244' : '#cc1133')
            : isRareBar
              ? (hpRatio > 0.5 ? '#cc66ff' : '#9944cc')
              : isElite
                ? (hpRatio > 0.5 ? '#ffcc00' : '#ff9900')
                : hpRatio > 0.5 ? '#ff5555' : hpRatio > 0.25 ? '#ff8844' : '#ff3333';
        const el = enc.def.element;
        const elIcon = el && el !== 'none' ? ELEMENT_ICON[el as ElementType] : '';
        const rivalDef = isRivalChar ? CHAR_MAP[enc.rivalCharId!] : undefined;
        let label = isRivalChar
          ? (rivalDef?.name ?? enc.entity.name.split(' ')[0] ?? enc.entity.name)
          : aliveEnemies.length > 1 ? `${enc.entity.name} (${i + 1})` : enc.entity.name;
        if (elIcon && !isRivalChar) label = `${elIcon} ${label}`;
        if (isElite && i === 0) label = `⚠ ${label}`;
        const nameColor = isRivalChar
          ? '#ffdddd'
          : isElite
            ? '#ffcc44'
            : isRareBar
              ? '#dd88ff'
              : el && el !== 'none'
                ? ELEMENT_COLOR[el as ElementType]
                : undefined;
        if (isRivalDuel && isRivalChar) {
          rivalHudQueue.push({
            x: ex, barY, nameY, barW, hpRatio, hpColor, label, nameSize, nameColor,
          });
        } else {
          cb.drawHpBar(ex - barW / 2, barY, barW, hpRatio, hpColor);
          if (isElite) {
            const spirit = enc.spiritGauge ?? 0;
            cb.drawGaugeBar(
              ex - barW / 2, barY + CHAR_HP_BAR_H + 1, barW, spirit,
              spiritBarColor(spirit), '투지',
            );
          }
          cb.drawNameLabel(ex, nameY, label, isBoss && i === 0 ? nameSize + 1 : nameSize, nameColor);
        }
      });
    }

    const allySize = scaleBattleSpriteSize(
      getBattleSpriteSize(w, h, hudH, footY, 'player'),
      isRivalDuel ? RIVAL_DUEL_SPRITE_SCALE : 1,
    );
    const { w: allyW, h: allyH } = allySize;
    const labelSize = isRivalDuel
      ? Math.max(7, Math.min(9, h * 0.032))
      : Math.max(10, Math.min(14, h * 0.048));
    const barW = Math.round(allyW * (isRivalDuel ? RIVAL_DUEL_BAR_WIDTH_RATIO : CHAR_BAR_WIDTH_RATIO));

    const partyIds = getVisualPartyOrder(adv.save);
    const partyAnchors: PartySlotAnchor[] = [];
    const partyAnchorByChar = new Map<string, PartySlotAnchor>();

    partyIds.forEach((id, i) => {
      const def = CHAR_MAP[id];
      const combat = adv.party.find(p => p.id === id);
      if (!def) return;

      const basePx = layout.partyBaseX + i * layout.partyGap + getPartySlotStagger(partyIds, i, layout.partyGap);
      let px = basePx;
      const meleeEnemyUid = inCombat ? vfx.getMeleeEnemyUid(i) : null;
      const meleeDashDist = inCombat && !isRivalDuel
        ? resolveMeleeDashDist(
          basePx, allyW, meleeEnemyUid, aliveEnemies, enemyXs, enemySizes, layout.dashMaxDist,
        )
        : 0;

      const meleeVis = vfx.getMeleeVisual(i, meleeDashDist);
      let dashProg = 0;
      let dashSlot: number | null = null;
      let strikeAnimKey: string | null = null;
      let meleeEngaged = false;

      if (meleeVis) {
        if (!isRivalDuel) px = Math.round(px + meleeVis.offsetX);
        dashProg = meleeVis.swingProg;
        dashSlot = meleeVis.dashSlot;
        strikeAnimKey = meleeVis.attackKey;
        meleeEngaged = meleeVis.meleeEngaged && !meleeVis.isSwinging;
      } else if (inCombat && vfx.partyStrike?.slot === i) {
        const strikeProg = vfx.getStrikeProgress();
        const projectileStrike = !vfx.partyStrike.advance
          && (vfx.partyStrike.delivery === 'projectile' || charUsesProjectile(id));
        if (!projectileStrike && !isRivalDuel) {
          px = Math.round(px + vfx.getStrikeOffset(strikeProg, meleeDashDist));
        }
        if (!projectileStrike) {
          dashProg = strikeProg;
          dashSlot = i;
          strikeAnimKey = vfx.partyStrike.attackKey ?? null;
        }
      }

      px = Math.round(px);
      const minX = Math.round(allyW * 0.5 + 6);
      const maxX = Math.round(w - allyW * 0.5 - 6);
      px = Math.max(minX, Math.min(maxX, px));
      const depthY = isRivalDuel ? getRivalSlotDepthOffset(i, partyIds.length) : 0;
      const py = footY + depthY;
      const rivalUi = isRivalDuel ? rivalCharHudY(py, allyH) : null;
      const nameY = rivalUi ? rivalUi.nameY : py - Math.round(allyH * getCharNameYRatio(id));
      const barY = rivalUi ? rivalUi.barY : py - Math.round(allyH * CHAR_BAR_Y_RATIO);
      const nameGap = Math.max(CHAR_NAME_BAR_GAP, Math.round(labelSize * 0.45));
      const stackedNameY = rivalUi ? nameY : Math.min(nameY, barY - nameGap);
      const anchor: PartySlotAnchor = {
        charId: id,
        slot: i,
        footX: px,
        footY: py,
        spriteH: allyH,
        spriteW: allyW,
        nameBaselineY: stackedNameY,
      };
      partyAnchors[i] = anchor;
      partyAnchorByChar.set(id, anchor);
      const partyFlash = vfx.partyFlash?.slot === i ? vfx.getFlashAlpha(vfx.partyFlash) : 0;
      const healFlash = vfx.getHealTargetFlash(i);
      const healerGlow = vfx.getHealerCastFlash(i);
      const shieldGlow = vfx.getShieldFlash(i);
      const pulseGlow = vfx.getHealPulseFlash(i);

      const drawn = drawCharacterSprite(ctx, {
        charId: id,
        x: px,
        y: py,
        w: allyW,
        h: allyH,
        inCombat,
        animTime: animTime + i,
        flash: partyFlash,
        slot: i,
        dashProg,
        dashSlot,
        strikeAnimKey,
        meleeEngaged,
        hp: combat?.hp,
        dieAnimProgress: combat?.dieAnimProgress,
      });

      if (drawn) {
        if (partyFlash > 0) cb.drawHitRing(px, py - allyH * 0.5, allyW, partyFlash);
        if (shieldGlow > 0) cb.drawHealRing(px, py - allyH * 0.42, allyW * 1.05, shieldGlow * 0.95);
        if (pulseGlow > 0) cb.drawHealRing(px, py - allyH * 0.48, allyW * 0.9, pulseGlow);
        if (healFlash > 0) cb.drawHealRing(px, py - allyH * 0.45, allyW, healFlash);
        if (healerGlow > 0) cb.drawHealRing(px, py - allyH * 0.55, allyW * 0.85, healerGlow * 0.75);
        const statusFlash = vfx.getPartyStatusFlash(i);
        if (statusFlash) {
          const sAlpha = vfx.getStatusFlashAlpha(statusFlash);
          if (sAlpha > 0) {
            cb.drawStatusRing(px, py - allyH * 0.46, allyW, sAlpha, statusFlash.color, statusFlash.glow, statusFlash.ring);
          }
        }
        if (!adv.isCombatSkillBarActive() && !isRivalDuel) {
          cb.drawNameLabel(px, stackedNameY, def.name, labelSize);
        }
      } else {
        cb.drawCharacterFallback(px, py, def.color, def.accent, def.name, inCombat, animTime + i, allyH / 62);
        if (!adv.isCombatSkillBarActive() && !isRivalDuel) {
          cb.drawNameLabel(px, stackedNameY, def.name, labelSize);
        }
        if (partyFlash > 0) cb.drawHitRing(px, py - allyH * 0.45, allyW, partyFlash);
        if (healFlash > 0) cb.drawHealRing(px, py - allyH * 0.45, allyW, healFlash);
      }

      if (combat && showPartyHudBars) {
        const ratio = combat.hp / Math.max(1, combat.maxHp);
        const barColor = ratio > 0.5 ? '#44cc66' : ratio > 0.25 ? '#ccaa44' : '#ff6644';
        if (isRivalDuel) {
          rivalHudQueue.push({
            x: px,
            barY,
            nameY: stackedNameY,
            barW,
            hpRatio: ratio,
            hpColor: barColor,
            label: def.name,
            nameSize: labelSize,
            nameColor: '#e8ffe8',
          });
        } else {
          cb.drawHpBar(px - barW / 2, barY, barW, ratio, barColor);
          if (combat.gaugeType && combat.gauge != null) {
            const gRatio = combat.gauge / Math.max(0.01, combat.gaugeMax ?? 1);
            cb.drawGaugeBar(
              px - barW / 2, barY + CHAR_GAUGE_OFFSET, barW, gRatio,
              gaugeBarColor(combat.gaugeType, gRatio),
              gaugeLabel(combat.gaugeType),
            );
          }
        }
      }

      const skillCharge = vfx.getSkillChargeSlot(i);
      if (skillCharge && skillCharge.ratio > 0.02 && !isRivalDuel) {
        const chargeY = stackedNameY + CHAR_SKILL_CHARGE_BELOW_NAME;
        cb.drawSkillChargeBar(
          px, chargeY, Math.round(barW * 0.72), skillCharge.ratio, skillCharge.color,
          skillCharge.label, skillCharge.icon,
        );
      }
    });

    if (isRivalDuel && rivalHudQueue.length > 0) {
      for (const hud of rivalHudQueue) {
        cb.drawNameLabel(hud.x, hud.nameY, hud.label, hud.nameSize, hud.nameColor);
        cb.drawHpBar(hud.x - hud.barW / 2, hud.barY, hud.barW, hud.hpRatio, hud.hpColor);
        if (hud.gaugeRatio != null && hud.gaugeType) {
          cb.drawGaugeBar(
            hud.x - hud.barW / 2, hud.barY + CHAR_GAUGE_OFFSET, hud.barW, hud.gaugeRatio,
            gaugeBarColor(hud.gaugeType, hud.gaugeRatio),
            gaugeLabel(hud.gaugeType),
          );
        }
      }
    }

    if (inCombat && vfx.projectiles.length > 0 && !adv.isCombatPerfLite()) {
      const enemyFootYs = aliveEnemies.length > 0
        ? aliveEnemies.map((enc, i) => enemyFootY + getMonsterGroundOffset(enc.def.id))
        : [enemyFootY];
      const enemyHs = enemySizes.length > 0
        ? enemySizes.map(s => s.h)
        : [impactAnchorH];
      this.drawProjectiles(
        ctx, vfx, vfx.projectiles, allyW,
        layout, footY, partyIds, partyAnchors, partyAnchorByChar,
        enemyXs, enemyFootYs, enemyHs, enemySizes.map(s => s.w),
      );
    }
  }

  private projectileBodyY(footY: number, spriteH: number, yRatio: number): number {
    return Math.round(
      footY - spriteH * yRatio + spriteH * PROJECTILE_CENTER_DOWN_RATIO,
    );
  }

  private projectileOriginY(footY: number, spriteH: number, kind: ProjectileKind, charId?: string): number {
    if (charId) {
      const hand = getProjectileHandOffset(charId);
      return this.projectileBodyY(footY, spriteH, hand.yBase);
    }
    const ratio = kind === 'arrow' ? 0.28
      : kind === 'heal' ? 0.22
        : kind === 'orb' ? 0.24
          : kind === 'holy' ? 0.24
            : 0.26;
    return this.projectileBodyY(footY, spriteH, ratio);
  }

  private projectileTargetY(footY: number, spriteH: number, kind: ProjectileKind, charId?: string): number {
    if (charId) {
      const hand = getProjectileHandOffset(charId);
      return this.projectileBodyY(footY, spriteH, hand.yBase - 0.012);
    }
    const ratio = kind === 'arrow' ? 0.26
      : kind === 'heal' ? 0.20
        : kind === 'orb' ? 0.22
          : kind === 'holy' ? 0.22
            : 0.24;
    return this.projectileBodyY(footY, spriteH, ratio);
  }

  private resolvePartyAnchor(
    anchors: PartySlotAnchor[],
    byChar: Map<string, PartySlotAnchor>,
    p: ProjectileVfx,
  ): PartySlotAnchor | null {
    if (p.charId) {
      const hit = byChar.get(p.charId);
      if (hit) return hit;
    }
    return anchors[p.sourceSlot] ?? null;
  }

  private partyReleasePoint(
    anchor: PartySlotAnchor,
    kind: ProjectileKind,
    releaseProg: number,
  ): { x: number; y: number } {
    const hand = getProjectileHandOffset(anchor.charId);
    const lean = anchor.spriteW * (hand.leanBase + releaseProg * hand.leanScale);
    const yRatio = hand.yBase + releaseProg * hand.yScale;
    const kindTweak = kind === 'arrow' ? -0.01 : kind === 'heal' ? -0.02 : -0.015;
    return {
      x: Math.round(anchor.footX + lean),
      y: this.projectileBodyY(anchor.footY, anchor.spriteH, yRatio + kindTweak),
    };
  }

  private partyProjectileOrigin(
    vfx: CombatVfxManager,
    anchors: PartySlotAnchor[],
    byChar: Map<string, PartySlotAnchor>,
    p: ProjectileVfx,
    layout: BattleLayout,
    partyIds: string[],
    footY: number,
    spriteH: number,
    spriteW: number,
  ): { x: number; y: number } {
    const anchor = this.resolvePartyAnchor(anchors, byChar, p);
    if (anchor) {
      const releaseProg = vfx.getProjectileReleaseProg(anchor.slot, p.spawnDelay);
      return this.partyReleasePoint(anchor, p.kind, releaseProg);
    }
    const slot = p.sourceSlot;
    const x = Math.round(
      layout.partyBaseX + slot * layout.partyGap
      + getPartySlotStagger(partyIds, slot, layout.partyGap)
      + spriteW * 0.18,
    );
    return { x, y: this.projectileOriginY(footY, spriteH, p.kind, p.charId) };
  }

  private partyProjectileTarget(
    anchors: PartySlotAnchor[],
    byChar: Map<string, PartySlotAnchor>,
    slot: number,
    kind: ProjectileKind,
    charId: string | undefined,
    fallbackLayout: BattleLayout,
    partyIds: string[],
    footY: number,
    spriteH: number,
    spriteW: number,
  ): { x: number; y: number } {
    const anchor = (charId ? byChar.get(charId) : null) ?? anchors[slot];
    if (anchor) {
      return {
        x: Math.round(anchor.footX + anchor.spriteW * 0.14),
        y: this.projectileTargetY(anchor.footY, anchor.spriteH, kind, charId),
      };
    }
    const x = Math.round(
      fallbackLayout.partyBaseX + slot * fallbackLayout.partyGap
      + getPartySlotStagger(partyIds, slot, fallbackLayout.partyGap)
      + spriteW * 0.14,
    );
    const y = this.projectileTargetY(footY, spriteH, kind, charId);
    return { x, y: y - (kind === 'heal' ? spriteH * 0.06 : 0) };
  }

  private drawProjectiles(
    ctx: CanvasRenderingContext2D,
    vfx: CombatVfxManager,
    projectiles: ProjectileVfx[],
    allyW: number,
    layout: BattleLayout,
    footY: number,
    partyIds: string[],
    partyAnchors: PartySlotAnchor[],
    partyAnchorByChar: Map<string, PartySlotAnchor>,
    enemyXs: number[],
    enemyFootYs: number[],
    enemyHs: number[],
    enemyWs: number[],
  ) {
    const fallbackH = partyAnchors[0]?.spriteH ?? allyW;
    for (const p of projectiles) {
      if (p.elapsed < p.spawnDelay) continue;
      const localT = p.elapsed - p.spawnDelay;
      const tierScale = 1 + p.tier * 0.09;

      let fromPx: number;
      let fromPy: number;
      let toPx: number;
      let toPy: number;
      let targetEnemyH = enemyHs[0] ?? fallbackH;
      let targetEnemyFootY = enemyFootYs[0] ?? footY;

      if (p.sourceSide === 'party') {
        const origin = this.partyProjectileOrigin(
          vfx, partyAnchors, partyAnchorByChar, p, layout, partyIds, footY, fallbackH, allyW,
        );
        fromPx = origin.x;
        fromPy = origin.y;
      } else {
        const eSlot = Math.min(p.sourceSlot, enemyXs.length - 1);
        const ew = enemyWs[eSlot] ?? allyW;
        fromPx = (enemyXs[eSlot] ?? layout.enemyX) - Math.round(ew * 0.22);
        fromPy = this.projectileOriginY(enemyFootYs[eSlot] ?? footY, enemyHs[eSlot] ?? fallbackH, p.kind);
      }

      if (p.targetKind === 'enemy') {
        const eSlot = Math.min(p.targetEnemySlot, enemyXs.length - 1);
        toPx = enemyXs[eSlot] ?? layout.enemyX;
        targetEnemyFootY = enemyFootYs[eSlot] ?? footY;
        targetEnemyH = enemyHs[eSlot] ?? fallbackH;
        toPy = this.projectileTargetY(targetEnemyFootY, targetEnemyH, p.kind);
      } else {
        const allyTarget = this.partyProjectileTarget(
          partyAnchors, partyAnchorByChar, p.targetPartySlot, p.kind, undefined,
          layout, partyIds, footY, fallbackH, allyW,
        );
        toPx = allyTarget.x;
        toPy = allyTarget.y;
      }

      if (localT < p.flightDuration) {
        const prog = 1 - (1 - localT / p.flightDuration) ** 3;
        const x = fromPx + (toPx - fromPx) * prog;
        const y = fromPy + (toPy - fromPy) * prog;
        const angle = Math.atan2(toPy - fromPy, toPx - fromPx);
        const flightScale = p.kind === 'arrow' ? 0.58
          : p.kind === 'heal' ? 0.40
            : p.kind === 'orb' ? 0.44
              : 0.58;
        const size = allyW * flightScale * tierScale;
        const frameIdx = p.kind !== 'arrow'
          ? Math.floor(localT * 16) % Math.max(1, p.flightFrames.length)
          : 0;
        const path = p.flightFrames[frameIdx] ?? p.flightFrames[0];
        if (!path) continue;
        this.drawRotatedProjectile(
          ctx, path, x, y, size, size * 0.88, angle,
          p.kind === 'arrow', p.crit, p.kind === 'holy' || p.kind === 'heal',
        );
      } else if (p.impactFrames.length > 0) {
        const impactT = localT - p.flightDuration;
        const x = toPx;
        const impactFootY = p.targetKind === 'enemy'
          ? this.projectileTargetY(targetEnemyFootY, targetEnemyH, p.kind)
          : toPy;
        const impactScale = p.kind === 'holy' ? 0.44
          : p.kind === 'orb' ? 0.48
            : 0.68;
        const frameIdx = Math.min(
          p.impactFrames.length - 1,
          Math.floor((impactT / p.impactDuration) * p.impactFrames.length),
        );
        const path = p.impactFrames[frameIdx];
        if (!path) continue;
        const size = allyW * impactScale * (1 + p.tier * 0.05) * tierScale;
        drawPixelSpriteImpact(ctx, path, x, impactFootY, size, size, {
          flash: p.crit ? 0.18 : 0.06,
          glow: p.kind === 'holy' || p.kind === 'orb' || p.kind === 'heal',
        });
      }
    }
  }

  private drawRotatedProjectile(
    ctx: CanvasRenderingContext2D,
    path: string,
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number,
    rotate: boolean,
    crit: boolean,
    holy = false,
  ) {
    const keyed = getKeyedCanvas(path);
    const img = getImage(path);
    const src: CanvasImageSource | null = keyed ?? img;
    if (!src) return;
    ctx.save();
    configurePixelArtContext(ctx);
    ctx.translate(Math.round(x), Math.round(y));
    if (rotate) ctx.rotate(angle);
    const iw = Math.round(w);
    const ih = Math.round(h);
    const sw = keyed ? keyed.width : img!.naturalWidth;
    const sh = keyed ? keyed.height : img!.naturalHeight;
    ctx.drawImage(src, 0, 0, sw, sh, -iw / 2, -ih / 2, iw, ih);
    if (holy || crit) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = holy ? 0.32 : 0.38;
      ctx.drawImage(src, 0, 0, sw, sh, -iw / 2, -ih / 2, iw, ih);
    }
    ctx.restore();
  }
}
