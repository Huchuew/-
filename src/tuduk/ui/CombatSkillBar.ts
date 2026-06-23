import type { AdventureSystem } from '../systems/AdventureSystem';

import type { GameSave } from '../types';

import { CHAR_MAP } from '../data/characters';

import { getDisplaySkillsForBar } from '../data/combatSkills';

import type { CombatSkillDef } from '../data/combatSkills';

import { formatSkillBrief } from '../data/combatFloatText';

import { getGauge, getGaugeType, GAUGE_MAX, gaugeBarColor } from '../systems/GaugeSystem';

import { getVisualPartyOrder } from '../systems/FormationSystem';

import { paintSkillBarPortraits } from '../render/FormationPortrait';

import { renderSkillIconSvg, skillIconBorderColor } from './skillIconArt';

import { bindTap } from '../utils/bindTap';
import { vibrateShort } from '../core/Haptics';



function esc(s: string): string {

  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

}



export class CombatSkillBar {

  private dock: HTMLElement;

  private root: HTMLElement;

  private tooltip: HTMLElement;

  private tipPinned = false;

  private snapshots = new Map<string, string>();

  private lastSyncMs = 0;



  constructor(dock: HTMLElement) {

    this.dock = dock;

    this.root = document.createElement('div');

    this.root.id = 'combat-skill-bar';

    this.root.className = 'combat-skill-bar hidden';

    dock.appendChild(this.root);



    this.tooltip = document.createElement('div');

    this.tooltip.id = 'skill-bar-tooltip';

    this.tooltip.className = 'skill-bar-tooltip hidden';

    document.body.appendChild(this.tooltip);



    document.addEventListener('pointerup', e => {

      if (this.tooltip.classList.contains('hidden')) return;

      const t = e.target as Node;

      if (this.tooltip.contains(t)) return;

      if ((t as HTMLElement).closest?.('.skill-icon-btn')) return;

      this.hideTooltip();

    }, true);



    bindTap(this.root, e => this.onSkillTap(e));

  }



  update(save: GameSave, adv: AdventureSystem) {

    const show = adv.isCombatSkillBarActive() && save.party.length > 0;

    this.root.classList.toggle('hidden', !show);
    this.dock.classList.toggle('is-active', show);

    if (!show) {

      if (!this.tipPinned) this.hideTooltip();

      this.snapshots.clear();

      return;

    }

    const now = performance.now();

    const throttleMs = adv.isCombatPerfLite() ? 220 : 140;

    if (now - this.lastSyncMs < throttleMs) return;

    this.lastSyncMs = now;

    this.syncMembers(save, adv);

  }



  private onSkillTap(e: Event) {

    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.skill-icon-btn');

    if (!btn) return;

    e.preventDefault();

    e.stopPropagation();

    this.showTooltip(btn, btn.dataset.skillTitle ?? '', btn.dataset.skillSub ?? '');

    this.tipPinned = true;

    vibrateShort(6);

  }



  private showTooltip(anchor: HTMLElement, title: string, subtitle: string) {

    this.tooltip.innerHTML = `<strong>${title}</strong><p>${subtitle}</p><small>탭하여 닫기</small>`;

    this.tooltip.classList.remove('hidden');

    const rect = anchor.getBoundingClientRect();

    let left = rect.left + rect.width / 2 - 110;

    let top = rect.top - 8;

    top = Math.max(8, top - this.tooltip.offsetHeight);

    left = Math.max(8, Math.min(left, window.innerWidth - 228));

    this.tooltip.style.left = `${left}px`;

    this.tooltip.style.top = `${top}px`;

  }



  private hideTooltip() {

    this.tooltip.classList.add('hidden');

    this.tipPinned = false;

  }



  private memberSnapshot(

    hpPct: number, gaugePct: number, flashId: string | null, prestigeLv: number,

    chipState: string, isDown: boolean, skills: CombatSkillDef[], level: number,

  ): string {

    const skillSig = skills.map(s => `${s.nodeId}:${flashId === s.nodeId ? 1 : 0}`).join(',');

    return `${hpPct}|${gaugePct}|${flashId ?? ''}|${prestigeLv}|${chipState}|${isDown}|${level}|${skillSig}`;

  }



  private patchMemberLevel(card: HTMLElement, level: number): void {
    const lv = card.querySelector('.gauge-char-lv');
    if (!lv) return;
    const text = ` Lv.${level}`;
    if (lv.textContent !== text) lv.textContent = text;
  }

  private patchCastBar(card: HTMLElement, cast: { ratio: number; label: string; color: string } | null) {
    let row = card.querySelector('.skill-cast-row') as HTMLElement | null;
    if (!cast) {
      row?.classList.add('hidden');
      return;
    }
    if (!row) {
      const body = card.querySelector('.gauge-chip-body');
      if (!body) return;
      body.insertAdjacentHTML('beforeend', `
        <div class="skill-cast-row">
          <span class="skill-cast-label"></span>
          <div class="skill-cast-bar"><div class="skill-cast-fill"></div></div>
        </div>`);
      row = card.querySelector('.skill-cast-row') as HTMLElement | null;
    }
    if (!row) return;
    row.classList.remove('hidden');
    const pct = Math.round(cast.ratio * 100);
    const label = row.querySelector('.skill-cast-label') as HTMLElement | null;
    const fill = row.querySelector('.skill-cast-fill') as HTMLElement | null;
    if (label) {
      label.textContent = cast.label;
      label.title = cast.label;
    }
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.style.background = cast.color;
    }
  }

  private patchMemberBars(

    card: HTMLElement, hpPct: number, hpColor: string, gaugePct: number,

    gaugeColor: string, chipState: string, skills: CombatSkillDef[], flashId: string | null,

    prestigeLv: number,

  ) {

    const head = card.querySelector('.skill-bar-head');

    head?.classList.toggle('gauge-full', chipState === 'gauge-full');

    head?.classList.toggle('gauge-ready', chipState === 'gauge-ready');

    const hpFill = card.querySelector('.skill-hp-fill') as HTMLElement | null;

    if (hpFill) {

      hpFill.style.width = `${hpPct}%`;

      hpFill.style.background = hpColor;

    }

    const gaugeFill = card.querySelector('.gauge-fill') as HTMLElement | null;

    if (gaugeFill) {

      gaugeFill.style.width = `${gaugePct}%`;

      gaugeFill.style.background = gaugeColor;

    }

    for (const btn of card.querySelectorAll<HTMLButtonElement>('.skill-icon-btn')) {

      const node = btn.dataset.node;

      const active = !!node && flashId === node;

      btn.classList.toggle('active', active);

      const ring = btn.querySelector('.skill-proc-ring');

      if (active && !ring) {

        btn.insertAdjacentHTML('beforeend', '<span class="skill-proc-ring"></span>');

      } else if (!active && ring) {

        ring.remove();

      }

    }

    card.classList.toggle('prestige-tier', prestigeLv > 0);

  }



  private syncMembers(save: GameSave, adv: AdventureSystem) {

    const partyIds = getVisualPartyOrder(save).filter(id => save.chars[id] && CHAR_MAP[id]);

    const wanted = new Set(partyIds);

    let needsPortraitPaint = false;



    for (const child of [...this.root.children]) {

      const id = (child as HTMLElement).dataset.charId;

      if (!id || !wanted.has(id)) {

        this.snapshots.delete(id ?? '');

        child.remove();

      }

    }



    partyIds.forEach((id, idx) => {

      const def = CHAR_MAP[id]!;

      const st = save.chars[id]!;

      const entity = adv.party.find(p => p.id === id);

      const isDown = (entity?.hp ?? save.combatHp?.[id] ?? 1) <= 0;



      const flashId = adv.getSkillBarFlash(id);

      const skills = getDisplaySkillsForBar(st.unlockedNodes, id);

      const gaugeRatio = isDown ? 0 : getGauge(save, id) / GAUGE_MAX;

      const gaugePct = Math.round(gaugeRatio * 100);

      const gaugeType = getGaugeType(id);

      const gaugeColor = gaugeBarColor(gaugeType, gaugeRatio);

      const chipState = gaugeRatio >= 1 ? 'gauge-full' : gaugeRatio >= 0.72 ? 'gauge-ready' : '';

      const maxHp = entity?.maxHp ?? 1;

      const curHp = entity?.hp ?? 0;

      const hpPct = isDown ? 0 : Math.round(Math.min(1, Math.max(0, curHp) / Math.max(1, maxHp)) * 100);

      const hpColor = hpPct > 50 ? '#44cc66' : hpPct > 25 ? '#ccaa44' : '#ff6644';

      const prestigeLv = st.prestige ?? 0;

      const cast = adv.getCharacterCastState(id);

      const snap = this.memberSnapshot(
        hpPct, gaugePct, flashId, prestigeLv, chipState, isDown, skills, st.level,
      );

      let card = this.root.querySelector(`[data-char-id="${id}"]`) as HTMLElement | null;

      if (card && this.snapshots.get(id) === snap) {
        this.patchMemberLevel(card, st.level);
        this.patchCastBar(card, cast);
        if (this.root.children[idx] !== card) {
          this.root.insertBefore(card, this.root.children[idx] ?? null);
        }
        return;
      }

      this.snapshots.set(id, snap);



      if (card && card.querySelector('.skill-hp-fill')) {

        card.classList.toggle('down', isDown);

        card.style.setProperty('--char-color', def.color);

        card.style.setProperty('--char-accent', def.accent);

        this.patchMemberBars(card, hpPct, hpColor, gaugePct, gaugeColor, chipState, skills, flashId, prestigeLv);
        this.patchMemberLevel(card, st.level);
        this.patchCastBar(card, cast);

        if (this.root.children[idx] !== card) {

          this.root.insertBefore(card, this.root.children[idx] ?? null);

        }

        return;

      }



      if (!card) {

        card = document.createElement('div');

        card.className = 'skill-bar-member';

        card.dataset.charId = id;

        this.root.appendChild(card);

        needsPortraitPaint = true;

      }

      if (this.root.children[idx] !== card) {

        this.root.insertBefore(card, this.root.children[idx] ?? null);

      }



      card.classList.toggle('down', isDown);

      card.style.setProperty('--char-color', def.color);

      card.style.setProperty('--char-accent', def.accent);

      card.classList.toggle('prestige-tier', prestigeLv > 0);

      if (prestigeLv > 0) card.dataset.prestigeTier = String(prestigeLv);



      const iconsHtml = skills.map(s => {

        const active = flashId === s.nodeId;

        const tier = s.animTier >= 3 ? 't3' : s.animTier >= 2 ? 't2' : 't1';

        const brief = formatSkillBrief(s);

        return `<button type="button" class="skill-icon-btn ${s.skillKind} ${tier}${active ? ' active' : ''}${prestigeLv > 0 ? ' prestige-skill' : ''}"

          data-node="${esc(s.nodeId)}"

          data-skill-title="${esc(brief.title)}"

          data-skill-sub="${esc(brief.subtitle)}"

          style="--skill-border:${skillIconBorderColor(s, prestigeLv)}"

          aria-label="${esc(s.name)}">

          <span class="skill-icon-svg">${renderSkillIconSvg(s, prestigeLv)}</span>

          ${active ? '<span class="skill-proc-ring"></span>' : ''}

        </button>`;

      }).join('');



      const gaugeLabel = gaugeType === 'mana' ? '✦' : '⚡';



      card.innerHTML = `

        <div class="gauge-chip skill-bar-head ${chipState}">

          <div class="gauge-portrait-wrap skill-bar-portrait-wrap" title="${esc(def.name)}">

            <canvas class="skill-bar-portrait" data-char-id="${esc(id)}" aria-hidden="true"></canvas>

          </div>

          <div class="gauge-chip-body">

            <span class="gauge-char-name" title="${esc(def.name)}">${esc(def.name)}<span class="gauge-char-lv"> Lv.${st.level}</span></span>

            <div class="skill-hp-row">

              <span class="skill-hp-label">HP</span>

              <div class="skill-hp-bar">

                <div class="skill-hp-fill" style="width:${hpPct}%;background:${hpColor}"></div>

              </div>

            </div>

            <div class="gauge-bar-row">

              <span class="gauge-type-label" title="${gaugeType === 'mana' ? '마나' : '투지'}">${gaugeLabel}</span>

              <div class="gauge-bar">

                <div class="gauge-fill ${gaugeType}" style="width:${gaugePct}%;background:${gaugeColor}"></div>

              </div>

            </div>

          </div>

        </div>

        <div class="skill-bar-skills">${iconsHtml}</div>`;

      this.patchCastBar(card, cast);
      needsPortraitPaint = true;

    });



    if (needsPortraitPaint) paintSkillBarPortraits(this.root);

  }

}


