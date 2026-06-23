import type { ElementType } from '../types';

export const ELEMENT_LABEL: Record<ElementType, string> = {
  none: '무속성',
  fire: '화염',
  water: '냉기',
  thunder: '전기',
  poison: '독',
};

export const ELEMENT_ICON: Record<ElementType, string> = {
  none: '⚔',
  fire: '🔥',
  water: '💧',
  thunder: '⚡',
  poison: '☠',
};

export const ELEMENT_COLOR: Record<ElementType, string> = {
  none: '#c8d0dc',
  fire: '#ff5533',
  water: '#44ccff',
  thunder: '#ffdd22',
  poison: '#77ee44',
};

/** 배경·테두리 — UI 뱃지용 */
export const ELEMENT_BG: Record<ElementType, string> = {
  none: '#2a3040',
  fire: '#3a1810',
  water: '#0e2848',
  thunder: '#3a3208',
  poison: '#142a10',
};

export const ELEMENT_BORDER: Record<ElementType, string> = {
  none: '#667788',
  fire: '#ff6644',
  water: '#55bbff',
  thunder: '#eedd33',
  poison: '#88ee55',
};

export const ELEMENT_GLOW: Record<ElementType, string> = {
  none: '#8899aa88',
  fire: '#ff442288',
  water: '#33aaff88',
  thunder: '#ffee4488',
  poison: '#66ee4488',
};

export function elementCssClass(el: ElementType): string {
  return el === 'none' ? 'element-none' : `element-${el}`;
}

export function formatElementBadge(el: ElementType, compact = false): string {
  if (el === 'none') {
    return compact
      ? '<span class="element-badge element-none" title="무속성">⚔</span>'
      : '<span class="element-badge element-none">⚔ 무속성</span>';
  }
  const cls = elementCssClass(el);
  const label = compact ? ELEMENT_ICON[el] : `${ELEMENT_ICON[el]} ${ELEMENT_LABEL[el]}`;
  return `<span class="element-badge ${cls}" title="${ELEMENT_LABEL[el]}">${label}</span>`;
}

export const DOT_INTERVAL = 0.85;

/** 약점: value 속성 공격이 key 속성 몬스터에 유리 */
const WEAK_TO: Partial<Record<ElementType, ElementType>> = {
  fire: 'water',
  water: 'thunder',
  thunder: 'poison',
  poison: 'fire',
};

export function getElementDamageMult(attackEl: ElementType, targetEl: ElementType): number {
  if (attackEl === 'none' || targetEl === 'none') return 1;
  if (WEAK_TO[targetEl] === attackEl) return 1.32;
  if (WEAK_TO[attackEl] === targetEl) return 0.88;
  return 1;
}

export function formatElementMatchup(targetEl: ElementType): string {
  if (targetEl === 'none') return '';
  const weak = WEAK_TO[targetEl];
  if (!weak) return `${ELEMENT_ICON[targetEl]}${ELEMENT_LABEL[targetEl]} 구역`;
  return `${ELEMENT_ICON[targetEl]}약점 → ${ELEMENT_ICON[weak]}${ELEMENT_LABEL[weak]} 스킬`;
}

export function getWeakTargetForAttack(attackEl: ElementType): ElementType | null {
  if (attackEl === 'none') return null;
  for (const [target, weak] of Object.entries(WEAK_TO) as [ElementType, ElementType][]) {
    if (weak === attackEl) return target;
  }
  return null;
}

/** 스킬 속성 → 유리한 몬스터 속성 (한 줄) */
export function formatAttackElementHint(attackEl: ElementType): string {
  const target = getWeakTargetForAttack(attackEl);
  if (!target) return '';
  return `${formatElementBadge(attackEl, true)} 스킬 → ${formatElementBadge(target, true)} 몬스터에 <strong>1.32배</strong>`;
}

/** 속성 상성 안내 (UI용) */
export function formatElementWheelHtml(): string {
  const pairs: [ElementType, ElementType][] = [
    ['water', 'fire'],
    ['thunder', 'water'],
    ['poison', 'thunder'],
    ['fire', 'poison'],
  ];
  const row = pairs
    .map(([atk, mon]) => `${formatElementBadge(atk, true)}→${formatElementBadge(mon, true)}`)
    .join(' ');
  return `<span class="ew-title">속성 상성</span>`
    + `<span class="ew-desc">스킬 속성이 몬스터 약점이면 피해 <strong>1.32배</strong> · 불리하면 0.88배</span>`
    + `<span class="ew-pairs">${row}</span>`;
}

/** @deprecated formatElementWheelHtml 사용 */
export function getElementWheelTip(): string {
  return formatElementWheelHtml();
}

export function getRegionElementTip(regionId: number): string {
  if (regionId <= 4) return '초반 구역 — 속성 약점은 스킬·도트로 체감';
  if (regionId <= 8) return '☠독·💧냉기 구역 증가 — 상성 스킬 습득 추천';
  if (regionId <= 14) return '⚡전기·☠독 혼합 — 9~14층 엘리트 주의 · 약점 1.32배';
  return '🔥후반 화염·강적 — 필살기·포션 준비';
}
