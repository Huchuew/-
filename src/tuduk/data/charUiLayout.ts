/** 전투 UI — 캐릭터별 이름·바 Y 오프셋 (발 기준, allyH 비율) */

export function getCharNameYRatio(charId: string): number {
  switch (charId) {
    case 'lesford': return 0.48;
    case 'cutie': return 0.44;
    default: return 0.38;
  }
}

/** HP·게이지 바 — 발에서 위로 (낮을수록 발 쪽, 스프라이트 겹침↓) */
export const CHAR_BAR_Y_RATIO = 0.11;

/** 전투·이동 공통 — 발 Y를 canvasH 비율만큼 위로 */
export const CHAR_FOOT_LIFT_RATIO = 0.032;

/** 이동(달리기·층 이동) 중 추가 상승 */
export const CHAR_WALK_FOOT_LIFT_RATIO = 0.028;

/** 이름 하단 ↔ HP바 상단 최소 간격(px) */
export const CHAR_NAME_BAR_GAP = 7;

/** 스프라이트 너비 대비 HP바 너비 */
export const CHAR_BAR_WIDTH_RATIO = 0.36;

export const CHAR_HP_BAR_H = 3;
export const CHAR_GAUGE_BAR_H = 2;
export const CHAR_GAUGE_OFFSET = 4;

/** 스킬 차지 바 — 이름 라벨 바로 아래(px, 이름 baseline 기준) */
export const CHAR_SKILL_CHARGE_BELOW_NAME = 3;

/** 투사체 발사 X — 발 중심에서 적 방향(오른쪽) 추가 오프셋 (allyW 비율) */
export const PROJECTILE_ORIGIN_X_RATIO = 0.2;

/** 캐릭터별 투사체 손 높이·전방 오프셋 (스프라이트 H/W 비율, 발 기준) */
export function getProjectileHandOffset(charId: string): {
  leanBase: number;
  leanScale: number;
  yBase: number;
  yScale: number;
} {
  switch (charId) {
    case 'dung':
    case 'sodia':
      return { leanBase: 0.02, leanScale: 0.04, yBase: 0.28, yScale: -0.012 };
    case 'huchu':
    case 'cutie':
    case 'hyeoni':
      return { leanBase: 0.02, leanScale: 0.03, yBase: 0.25, yScale: -0.01 };
    case 'yujin':
    case 'seoyoung':
      return { leanBase: 0.02, leanScale: 0.03, yBase: 0.26, yScale: -0.01 };
    case 'lesford':
      return { leanBase: 0.02, leanScale: 0.04, yBase: 0.27, yScale: -0.012 };
    default:
      return { leanBase: 0.02, leanScale: 0.03, yBase: 0.26, yScale: -0.01 };
  }
}

/** 투사체 VFX는 중심 앵커 — 몸통(가슴·손) 높이에 맞게 하향 보정 */
export const PROJECTILE_CENTER_DOWN_RATIO = 0.09;
