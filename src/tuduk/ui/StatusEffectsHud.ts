import type { AdventureSystem } from '../systems/AdventureSystem';
import type { GameSave, TimedCombatEffect } from '../types';
import { getCookBuffInfo } from '../systems/CookSystem';
import { getActiveShopBattleBuffs } from '../systems/LodgingShopSystem';
import { elementCssClass } from '../data/elemental';
import { resolveCookHudIcon, resolveDotHudIcon, resolveStatusHudIcon } from '../ui/statusEffectIcons';
import { vibrateShort } from '../core/Haptics';

export interface HudStatusItem {
  key: string;
  /** 동일 종류 병합 키 */
  stackId: string;
  icon: string;
  name: string;
  desc: string;
  kind: 'buff' | 'debuff' | 'info';
  remainRatio: number;
  remainSec: number;
  order: number;
  stacks?: number;
  elementClass?: string;
}

const MAX_HUD_STATUS = 6;

export function collectHudStatusItems(save: GameSave, adv: AdventureSystem): HudStatusItem[] {
  if (!adv.isInExpedition() || adv.isAtLodging()) return [];

  const items: HudStatusItem[] = [];
  const now = Date.now();

  const cookInfo = getCookBuffInfo(save);
  if (cookInfo && save.cookBuffUntil > now && save.cookBuffType) {
    const remain = save.cookBuffUntil - now;
    const duration = Math.max(remain, 5 * 60 * 1000);
    items.push({
      key: 'buff:cook',
      stackId: 'buff:cook',
      icon: resolveCookHudIcon(save.cookBuffType),
      name: cookInfo.label,
      desc: cookInfo.desc,
      kind: 'buff',
      remainRatio: Math.max(0, Math.min(1, remain / duration)),
      remainSec: Math.ceil(remain / 1000),
      order: 0,
    });
  }

  const shopBuffs = getActiveShopBattleBuffs(save, now);
  if (shopBuffs.length) {
    for (const buff of shopBuffs) {
      items.push({
        key: `buff:shop-${buff.kind}`,
        stackId: `buff:shop-${buff.kind}`,
        icon: buff.icon,
        name: buff.name,
        desc: buff.desc,
        kind: 'buff',
        remainRatio: buff.remainRatio,
        remainSec: buff.remainSec,
        order: 1,
      });
    }
  }

  if (adv.phase === 'combat' || adv.phase === 'boss' || adv.phase === 'loot') {
    collectCombatStatusItems(adv, items);
  }

  return mergeHudStatusItems(items)
    .sort((a, b) => {
      const rank = (k: HudStatusItem['kind']) => (k === 'debuff' ? 0 : k === 'buff' ? 1 : 2);
      const dr = rank(a.kind) - rank(b.kind);
      if (dr !== 0) return dr;
      return a.order - b.order;
    })
    .slice(0, MAX_HUD_STATUS);
}

function collectCombatStatusItems(adv: AdventureSystem, items: HudStatusItem[]) {
  for (const p of adv.party) {
    for (const mod of p.combatModifiers ?? []) {
      if (mod.elapsed >= mod.duration) continue;
      items.push(modToHudItem(mod));
    }
    for (const dot of p.statusEffects ?? []) {
      if (dot.ticksLeft <= 0) continue;
      const totalTicks = dot.ticksLeft + (dot.elapsed / Math.max(0.01, dot.interval));
      items.push({
        key: `debuff:dot:${dot.element}`,
        stackId: `debuff:dot:${dot.element}`,
        icon: resolveDotHudIcon(dot.element),
        name: dot.element === 'fire' ? '화상'
          : dot.element === 'water' ? '냉기'
            : dot.element === 'thunder' ? '감전'
              : dot.element === 'poison' ? '중독'
                : '도트',
        desc: `틱당 ${dot.damagePerTick} · ${dot.ticksLeft}틱`,
        kind: 'debuff',
        remainRatio: Math.max(0.05, Math.min(1, dot.ticksLeft / Math.max(1, totalTicks))),
        remainSec: Math.ceil(dot.ticksLeft * dot.interval),
        order: 10 + dot.ticksLeft,
        elementClass: elementCssClass(dot.element),
      });
    }
  }
}

/** 동일 stackId는 하나의 칩으로 병합 (잔여시간은 최장 기준) */
function mergeHudStatusItems(items: HudStatusItem[]): HudStatusItem[] {
  const map = new Map<string, HudStatusItem>();
  for (const item of items) {
    const prev = map.get(item.stackId);
    if (!prev) {
      map.set(item.stackId, { ...item, key: item.stackId, stacks: 1 });
      continue;
    }
    prev.stacks = (prev.stacks ?? 1) + 1;
    prev.remainSec = Math.max(prev.remainSec, item.remainSec);
    prev.remainRatio = Math.max(prev.remainRatio, item.remainRatio);
    prev.order = Math.min(prev.order, item.order);
  }
  return [...map.values()].map(item => ({
    ...item,
    key: item.stackId,
    name: item.stacks && item.stacks > 1 ? `${item.name} ×${item.stacks}` : item.name,
    desc: item.stacks && item.stacks > 1
      ? `${item.desc} · ${item.stacks}명`
      : item.desc,
  }));
}

function modToHudItem(mod: TimedCombatEffect): HudStatusItem {
  const remain = Math.max(0, mod.duration - mod.elapsed);
  const parts: string[] = [];
  if (mod.atkMult && mod.atkMult < 1) parts.push(`공격 ${Math.round((1 - mod.atkMult) * 100)}%↓`);
  if (mod.atkMult && mod.atkMult > 1) parts.push(`공격 ${Math.round((mod.atkMult - 1) * 100)}%↑`);
  if (mod.defMult && mod.defMult < 1) parts.push(`방어 ${Math.round((1 - mod.defMult) * 100)}%↓`);
  if (mod.defMult && mod.defMult > 1) parts.push(`방어 ${Math.round((mod.defMult - 1) * 100)}%↑`);
  if (mod.spdMult && mod.spdMult < 1) parts.push(`공속 ${Math.round((1 - mod.spdMult) * 100)}%↓`);
  if (mod.spdMult && mod.spdMult > 1) parts.push(`공속 ${Math.round((mod.spdMult - 1) * 100)}%↑`);
  if (mod.damagePerTick) parts.push(`틱 ${mod.damagePerTick}`);
  const stackId = `${mod.kind}:${mod.id}`;
  return {
    key: stackId,
    stackId,
    icon: resolveStatusHudIcon(mod),
    name: mod.name,
    desc: parts.length ? parts.join(' · ') : (mod.desc || mod.name),
    kind: mod.kind,
    remainRatio: Math.max(0, Math.min(1, remain / Math.max(0.01, mod.duration))),
    remainSec: Math.ceil(remain),
    order: mod.kind === 'debuff' ? 5 : 8,
  };
}

const LONG_PRESS_MS = 420;

function kindLabel(kind: HudStatusItem['kind']): string {
  if (kind === 'buff') return '버프';
  if (kind === 'debuff') return '디버프';
  return '효과';
}

export class StatusEffectsHud {
  private root: HTMLElement;
  private tooltip: HTMLElement;
  private longPressTimer = 0;
  private pressStart = 0;
  private activeChip: HTMLElement | null = null;
  private activePointerId = -1;
  private freezeRebuild = false;
  private tooltipPinned = false;

  constructor(stage: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'combat-status-hud';
    this.root.className = 'combat-status-hud hidden';
    stage.appendChild(this.root);

    this.tooltip = document.createElement('div');
    this.tooltip.id = 'status-tooltip';
    this.tooltip.className = 'status-tooltip hidden';
    document.body.appendChild(this.tooltip);

    document.addEventListener('pointerdown', e => this.onDocumentPointerDown(e), true);
    document.addEventListener('pointerup', e => this.onDocumentPointerUp(e));
    document.addEventListener('pointercancel', e => this.onDocumentPointerUp(e));
  }

  update(save: GameSave, adv: AdventureSystem) {
    const items = collectHudStatusItems(save, adv);
    if (!items.length) {
      this.root.replaceChildren();
      this.root.classList.add('hidden');
      if (!this.tooltipPinned) this.hideTooltip();
      return;
    }
    this.root.classList.remove('hidden');
    this.syncChips(items);
    this.updateRingStyles(items);
  }

  private createChip(item: HudStatusItem): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `status-chip ${item.kind}${item.elementClass ? ` ${item.elementClass}` : ''}`;
    btn.dataset.statusKey = item.key;
    btn.dataset.name = item.name;
    btn.dataset.desc = item.desc;
    btn.dataset.kind = item.kind;
    btn.dataset.remainSec = String(item.remainSec);
    btn.dataset.remainRatio = String(item.remainRatio);
    btn.innerHTML = `
      <span class="status-ring"></span>
      <span class="status-icon">${item.icon}</span>
    `;
    btn.addEventListener('pointerdown', e => this.onChipPointerDown(e, btn));
    return btn;
  }

  private syncChips(items: HudStatusItem[]) {
    const wanted = new Set(items.map(i => i.key));
    const existing = new Map<string, HTMLButtonElement>();

    for (const child of [...this.root.children]) {
      const chip = child as HTMLButtonElement;
      const key = chip.dataset.statusKey;
      if (!key || !wanted.has(key)) {
        if (chip !== this.activeChip) chip.remove();
        continue;
      }
      existing.set(key, chip);
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let chip = existing.get(item.key);
      if (!chip) {
        chip = this.createChip(item);
        existing.set(item.key, chip);
      } else {
        chip.className = `status-chip ${item.kind}${item.elementClass ? ` ${item.elementClass}` : ''}`;
        const iconEl = chip.querySelector('.status-icon');
        if (iconEl) iconEl.textContent = item.icon;
      }

      const at = this.root.children[i];
      if (at !== chip) {
        this.root.insertBefore(chip, at ?? null);
      }
    }
  }

  private updateRingStyles(items: HudStatusItem[]) {
    for (const item of items) {
      const btn = this.root.querySelector(`[data-status-key="${item.key}"]`) as HTMLElement | null;
      if (!btn) continue;
      const ring = btn.querySelector('.status-ring') as HTMLElement | null;
      if (ring) {
        ring.style.setProperty('--remain', String(item.remainRatio));
        ring.style.setProperty('--elapsed', String(1 - item.remainRatio));
      }
      btn.dataset.name = item.name;
      btn.dataset.desc = item.desc;
      btn.dataset.kind = item.kind;
      btn.dataset.remainSec = String(item.remainSec);
      btn.dataset.remainRatio = String(item.remainRatio);
    }
  }

  private onChipPointerDown(e: PointerEvent, chip: HTMLElement) {
    if (e.button !== 0) return;
    e.stopPropagation();
    this.clearLongPress();
    this.hideTooltip();
    this.tooltipPinned = false;
    this.freezeRebuild = true;
    this.activeChip = chip;
    this.activePointerId = e.pointerId;
    this.pressStart = Date.now();
    try { chip.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    this.longPressTimer = window.setTimeout(() => {
      if (this.activeChip === chip) this.revealTooltip(chip);
    }, LONG_PRESS_MS);
  }

  private onDocumentPointerUp(e: PointerEvent) {
    if (this.activeChip && e.pointerId === this.activePointerId) {
      const held = Date.now() - this.pressStart;
      if (held >= LONG_PRESS_MS) this.revealTooltip(this.activeChip);
      this.clearLongPress();
      this.activeChip = null;
      this.activePointerId = -1;
      if (!this.tooltipPinned) this.freezeRebuild = false;
      return;
    }
    if (!this.activeChip) this.freezeRebuild = this.tooltipPinned;
  }

  private onDocumentPointerDown(e: PointerEvent) {
    if (this.tooltip.classList.contains('hidden')) return;
    const target = e.target as Node;
    if (this.tooltip.contains(target)) return;
    if (this.activeChip?.contains(target)) return;
    this.dismissTooltip();
  }

  private revealTooltip(chip: HTMLElement) {
    this.showTooltip(chip);
    this.tooltipPinned = true;
    this.freezeRebuild = true;
    vibrateShort(8);
  }

  private dismissTooltip() {
    this.hideTooltip();
    this.tooltipPinned = false;
    this.freezeRebuild = false;
  }

  private clearLongPress() {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    this.longPressTimer = 0;
  }

  private showTooltip(anchor: HTMLElement) {
    const name = anchor.dataset.name ?? '';
    const desc = anchor.dataset.desc ?? '';
    const kind = anchor.dataset.kind ?? 'info';
    const remainSec = anchor.dataset.remainSec ?? '0';
    const remainRatio = Number(anchor.dataset.remainRatio ?? '1');
    const icon = anchor.querySelector('.status-icon')?.textContent ?? '';
    const kindText = kindLabel(kind as HudStatusItem['kind']);
    const kindClass = kind === 'buff' ? 'buff' : kind === 'debuff' ? 'debuff' : 'info';
    this.tooltip.innerHTML = `
      <div class="status-tooltip-head ${kindClass}">
        <span class="status-tooltip-icon">${icon}</span>
        <div class="status-tooltip-titles">
          <strong>${name}</strong>
          <span class="status-tooltip-kind">${kindText}</span>
        </div>
      </div>
      <p class="status-tooltip-desc">${desc}</p>
      <div class="status-tooltip-time">
        <span class="status-time-track"><span class="status-time-fill" style="width:${Math.round(remainRatio * 100)}%"></span></span>
        <small>남은 ${remainSec}초</small>
      </div>
    `;
    this.tooltip.classList.remove('hidden');
    const rect = anchor.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + 240 > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 248);
    if (top + 120 > window.innerHeight - 8) top = Math.max(8, rect.top - 120);
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  private hideTooltip() {
    this.tooltip.classList.add('hidden');
  }
}
