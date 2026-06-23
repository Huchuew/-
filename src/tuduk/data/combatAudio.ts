import type { ElementType } from '../types';
import type { SkillAnimTier } from './combatSkills';
import { CHAR_MAP } from './characters';

export type CombatSfxProfile = 'melee' | 'lancer' | 'archer' | 'mage' | 'buffer' | 'chef' | 'fist';

export function getCombatSfxProfile(charId: string): CombatSfxProfile {
  const job = CHAR_MAP[charId]?.job;
  return job ? jobToSfxProfile(job) : 'melee';
}

export type CombatAudioEvent =
  | {
    type: 'attack';
    charId: string;
    crit: boolean;
    powerTier?: number;
    skill?: { element: ElementType; animTier: SkillAnimTier; name: string };
    ultimate?: boolean;
    swingDelayMs?: number;
    hitDelayMs?: number;
    playHitLanded?: boolean;
  }
  | { type: 'heal'; charId: string; targetCount?: number; ultimate?: boolean }
  | { type: 'hurt'; magic: boolean; element?: ElementType; delayMs?: number }
  | { type: 'dot'; element: ElementType }
  | { type: 'monsterAttack'; monsterId: string; tinyPack: string; isBoss: boolean; magic: boolean; visualSlot?: number; delayMs?: number }
  | { type: 'crit' }
  | { type: 'kill'; isBoss?: boolean; isElite?: boolean }
  | { type: 'gold' }
  | { type: 'touch'; powerTier?: number }
  | { type: 'encounter' }
  | { type: 'gem' }
  | { type: 'buffApply'; buffId: string; skillKind?: string; hasAtk?: boolean; hasDef?: boolean; hasSpd?: boolean; charId?: string }
  | { type: 'debuffApply'; debuffId: string; onPlayer: boolean }
  | { type: 'cleanse'; charId: string };

export function jobToSfxProfile(job: string): CombatSfxProfile {
  switch (job) {
    case 'archer': return 'archer';
    case 'mage': return 'mage';
    case 'lancer': return 'lancer';
    case 'fighter': return 'fist';
    case 'chef': return 'chef';
    case 'buffer_atk':
    case 'buffer_spd':
    case 'buffer_crit':
    case 'buffer_exp':
      return 'buffer';
    default:
      return 'melee';
  }
}
