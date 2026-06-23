import type { EquippedGear, HeroClass } from '../../../data/types';
import type { PixelCanvas } from '../PixelCanvas';

export type AnimState = 'idle' | 'walk' | 'attack' | 'skill';

export const ANIM_FRAMES: Record<AnimState, number> = {
  idle: 8,
  walk: 6,
  attack: 8,
  skill: 10,
};

export interface FrameCtx {
  canvas: PixelCanvas;
  frame: number;
  total: number;
  gear: EquippedGear;
  /** 발 기준 Y 오프셋 (바운스·걷기) */
  bounce: number;
  /** 팔/무기 각도 */
  armAngle: number;
  /** 다리 스텝 */
  legPhase: number;
  /** 스킬 이펙트 강도 0~1 */
  fx: number;
}

export type HeroDrawer = (ctx: FrameCtx, heroClass: HeroClass) => void;

export function animOffset(state: AnimState, frame: number): Partial<FrameCtx> {
  const t = frame / ANIM_FRAMES[state];
  switch (state) {
    case 'idle':
      return {
        bounce: Math.sin(t * Math.PI * 2) * 2,
        armAngle: Math.sin(t * Math.PI * 2) * 4,
        legPhase: 0,
        fx: 0,
      };
    case 'walk':
      return {
        bounce: Math.abs(Math.sin(t * Math.PI * 2)) * 3,
        armAngle: Math.sin(t * Math.PI * 2) * 12,
        legPhase: Math.sin(t * Math.PI * 2),
        fx: 0,
      };
    case 'attack': {
      const swing = frame < 4 ? frame / 4 : 1 - (frame - 4) / 4;
      return {
        bounce: swing * 4,
        armAngle: -30 + swing * 90,
        legPhase: swing * 0.3,
        fx: swing,
      };
    }
    case 'skill':
      return {
        bounce: Math.sin(t * Math.PI) * 5,
        armAngle: -50 + t * 100,
        legPhase: 0,
        fx: Math.sin(t * Math.PI),
      };
    default:
      return { bounce: 0, armAngle: 0, legPhase: 0, fx: 0 };
  }
}
