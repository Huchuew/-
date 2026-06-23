import type { RmmzSeName } from './rmmzSe';

export interface StatusSeCue {
  file: RmmzSeName;
  vol: number;
  pitch?: number;
  /** ms 후 추가 SE */
  followMs?: number;
  followFile?: RmmzSeName;
  followVol?: number;
  followPitch?: number;
}

const DEBUFF_APPLY_SE: Record<string, StatusSeCue> = {
  weakness: { file: 'Magic2.ogg', vol: 0.17, pitch: 0.92, followMs: 90, followFile: 'Wind1.ogg', followVol: 0.1, followPitch: 0.88 },
  armor_break: { file: 'Blow5.ogg', vol: 0.2, pitch: 0.85, followMs: 70, followFile: 'Slash4.ogg', followVol: 0.12, followPitch: 0.9 },
  slow: { file: 'Ice3.ogg', vol: 0.16, pitch: 0.94, followMs: 110, followFile: 'Water2.ogg', followVol: 0.09, followPitch: 0.9 },
  poison: { file: 'Poison.ogg', vol: 0.19, pitch: 1.02, followMs: 140, followFile: 'Darkness1.ogg', followVol: 0.11, followPitch: 0.95 },
  curse: { file: 'Darkness1.ogg', vol: 0.18, pitch: 0.88, followMs: 120, followFile: 'Magic8.ogg', followVol: 0.1, followPitch: 0.82 },
  bleed: { file: 'Slash2.ogg', vol: 0.17, pitch: 1.05, followMs: 80, followFile: 'Damage2.ogg', followVol: 0.11, followPitch: 1.0 },
  shock: { file: 'Thunder2.ogg', vol: 0.2, pitch: 1.08, followMs: 60, followFile: 'Thunder4.ogg', followVol: 0.14, followPitch: 1.12 },
  silence: { file: 'Magic7.ogg', vol: 0.15, pitch: 0.78, followMs: 100, followFile: 'Wind2.ogg', followVol: 0.08, followPitch: 0.72 },
};

const BUFF_KIND_SE: Record<string, StatusSeCue> = {
  atk: { file: 'Skill2.ogg', vol: 0.18, pitch: 1.06, followMs: 80, followFile: 'Fire2.ogg', followVol: 0.1, followPitch: 1.1 },
  def: { file: 'Saint2.ogg', vol: 0.17, pitch: 1.0, followMs: 90, followFile: 'Skill1.ogg', followVol: 0.11, followPitch: 0.98 },
  spd: { file: 'Wind3.ogg', vol: 0.16, pitch: 1.12, followMs: 70, followFile: 'Thunder1.ogg', followVol: 0.09, followPitch: 1.15 },
  mixed: { file: 'Magic4.ogg', vol: 0.17, pitch: 1.04, followMs: 100, followFile: 'Saint1.ogg', followVol: 0.1, followPitch: 1.02 },
  block: { file: 'Sword3.ogg', vol: 0.2, pitch: 0.92, followMs: 60, followFile: 'Blow3.ogg', followVol: 0.12, followPitch: 0.88 },
  heal: { file: 'Water1.ogg', vol: 0.18, pitch: 1.05, followMs: 90, followFile: 'Saint2.ogg', followVol: 0.12, followPitch: 1.08 },
  cleanse: { file: 'Magic6.ogg', vol: 0.17, pitch: 1.1, followMs: 110, followFile: 'Saint3.ogg', followVol: 0.11, followPitch: 1.06 },
};

export function getDebuffApplySe(debuffId: string): StatusSeCue {
  return DEBUFF_APPLY_SE[debuffId] ?? { file: 'Magic5.ogg', vol: 0.15, pitch: 0.95 };
}

export function getBuffApplySe(opts: {
  skillKind?: string;
  hasAtk?: boolean;
  hasDef?: boolean;
  hasSpd?: boolean;
  isBlock?: boolean;
}): StatusSeCue {
  if (opts.isBlock || opts.skillKind === 'block') return BUFF_KIND_SE.block!;
  if (opts.skillKind === 'heal') return BUFF_KIND_SE.heal!;
  if (opts.skillKind === 'cleanse') return BUFF_KIND_SE.cleanse!;
  const kinds = [opts.hasAtk, opts.hasDef, opts.hasSpd].filter(Boolean).length;
  if (kinds >= 2) return BUFF_KIND_SE.mixed!;
  if (opts.hasSpd) return BUFF_KIND_SE.spd!;
  if (opts.hasDef) return BUFF_KIND_SE.def!;
  if (opts.hasAtk) return BUFF_KIND_SE.atk!;
  return BUFF_KIND_SE.mixed!;
}

export function getDebuffTickSe(debuffId: string): StatusSeCue {
  if (debuffId === 'poison') return { file: 'Poison.ogg', vol: 0.07, pitch: 1.05 };
  if (debuffId === 'bleed') return { file: 'Damage2.ogg', vol: 0.07, pitch: 1.02 };
  return { file: 'Absorb1.ogg', vol: 0.06, pitch: 0.95 };
}
