import type { ElementType } from '../types';

/** 증강 효과 누적 — 기본값 1 또는 0 */
export interface AugmentMods {
  potionHealMult: number;
  expeditionCarryAdd: number;
  expeditionCarryCap: number | null;
  potionHealPenalty: number;
  waveHealPct: number;
  restSpeedMult: number;
  returnHealBonus: number;
  tankDefMult: number;
  tankDmgTakenMult: number;
  tankThreatMult: number;
  tankHpMult: number;
  tankReviveOnce: boolean;
  dpsAtkMult: number;
  dpsCritBonus: number;
  dpsAtkSpdMult: number;
  executeDmgMult: number;
  healerHealMult: number;
  healerDefBuff: number;
  supportBuffDurMult: number;
  supportPartyAtk: number;
  trianglePartyAtk: number;
  trianglePartyDef: number;
  trianglePartyHp: number;
  traitSynergyMult: number;
  traitQuadBonus: number;
  fireDmgMult: number;
  thunderDmgMult: number;
  poisonDmgMult: number;
  waterDmgMult: number;
  weaknessDmgMult: number;
  uniformElementAtk: number;
  bossDmgMult: number;
  bossHealMult: number;
  ignoreResistWeakness: boolean;
  touchDmgMult: number;
  touchCdMult: number;
  comboGoldMult: number;
  comboAtkMult: number;
  gaugeGainMult: number;
  ultMult: number;
  skillChainDmg: number;
  bossStartInvulnSec: number;
  bossStartAtkSpdMult: number;
  backlineDefMult: number;
  backlineHealMult: number;
  killGoldMult: number;
  matDropMult: number;
  sellGoldMult: number;
  returnGoldMult: number;
  campProdMult: number;
  shopBuffDurMult: number;
  shopBuffEffMult: number;
  chestChanceAdd: number;
  chestGoldMult: number;
  shortcutDevMult: number;
  tycoonIncomeMult: number;
}

export function defaultAugmentMods(): AugmentMods {
  return {
    potionHealMult: 1,
    expeditionCarryAdd: 0,
    expeditionCarryCap: null,
    potionHealPenalty: 1,
    waveHealPct: 0,
    restSpeedMult: 1,
    returnHealBonus: 0,
    tankDefMult: 1,
    tankDmgTakenMult: 1,
    tankThreatMult: 1,
    tankHpMult: 1,
    tankReviveOnce: false,
    dpsAtkMult: 1,
    dpsCritBonus: 0,
    dpsAtkSpdMult: 1,
    executeDmgMult: 1,
    healerHealMult: 1,
    healerDefBuff: 0,
    supportBuffDurMult: 1,
    supportPartyAtk: 0,
    trianglePartyAtk: 0,
    trianglePartyDef: 0,
    trianglePartyHp: 0,
    traitSynergyMult: 1,
    traitQuadBonus: 0,
    fireDmgMult: 1,
    thunderDmgMult: 1,
    poisonDmgMult: 1,
    waterDmgMult: 1,
    weaknessDmgMult: 1,
    uniformElementAtk: 0,
    bossDmgMult: 1,
    bossHealMult: 1,
    ignoreResistWeakness: false,
    touchDmgMult: 1,
    touchCdMult: 1,
    comboGoldMult: 1,
    comboAtkMult: 1,
    gaugeGainMult: 1,
    ultMult: 1,
    skillChainDmg: 0,
    bossStartInvulnSec: 0,
    bossStartAtkSpdMult: 1,
    backlineDefMult: 1,
    backlineHealMult: 1,
    killGoldMult: 1,
    matDropMult: 1,
    sellGoldMult: 1,
    returnGoldMult: 1,
    campProdMult: 1,
    shopBuffDurMult: 1,
    shopBuffEffMult: 1,
    chestChanceAdd: 0,
    chestGoldMult: 1,
    shortcutDevMult: 1,
    tycoonIncomeMult: 1,
  };
}

export function mergeAugmentMods(base: AugmentMods, add: Partial<AugmentMods>): AugmentMods {
  const out = { ...base };
  for (const key of Object.keys(add) as (keyof AugmentMods)[]) {
    const v = add[key];
    if (v == null) continue;
    const cur = out[key];
    if (key === 'expeditionCarryCap' && typeof v === 'number') {
      out.expeditionCarryCap = Math.max(out.expeditionCarryCap ?? 0, v);
      continue;
    }
    if (key === 'tankReviveOnce' && typeof v === 'boolean') {
      out.tankReviveOnce = out.tankReviveOnce || v;
      continue;
    }
    if (key === 'ignoreResistWeakness' && typeof v === 'boolean') {
      out.ignoreResistWeakness = out.ignoreResistWeakness || v;
      continue;
    }
    if (typeof cur === 'number' && typeof v === 'number') {
      const multKeys = ['Mult', 'Penalty', 'tankDmgTakenMult', 'weaknessDmgMult', 'executeDmgMult', 'touchCdMult', 'shortcutDevMult'];
      if (multKeys.some(s => String(key).includes(s))) {
        (out[key] as number) = cur * v;
      } else {
        (out[key] as number) = cur + v;
      }
    }
  }
  return out;
}

export function elementAugmentMult(mods: AugmentMods, el: ElementType): number {
  switch (el) {
    case 'fire': return mods.fireDmgMult;
    case 'thunder': return mods.thunderDmgMult;
    case 'poison': return mods.poisonDmgMult;
    case 'water': return mods.waterDmgMult;
    default: return 1;
  }
}
