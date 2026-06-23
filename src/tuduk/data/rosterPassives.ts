/** 보유 캐릭터 상시 버프 + 파티 출전 시 던전 발동 효과 */

export type RosterProcKind =
  | 'healParty'
  | 'goldBurst'
  | 'atkBuff'
  | 'spdBuff'
  | 'critBuff'
  | 'gemDrop'
  | 'materialDrop'
  | 'expBurst'
  | 'shieldPulse';

export interface RosterOwnedBonus {
  atk?: number;
  def?: number;
  hp?: number;
  gold?: number;
  exp?: number;
  spd?: number;
  crit?: number;
}

export interface RosterPartyProc {
  id: string;
  name: string;
  chance: number;
  desc: string;
  kind: RosterProcKind;
  power?: number;
  duration?: number;
}

export interface RosterPassiveDef {
  charId: string;
  name: string;
  ownedDesc: string;
  owned: RosterOwnedBonus;
  partyProc?: RosterPartyProc;
}

const STACK_CAP: Record<keyof RosterOwnedBonus, number> = {
  atk: 0.28,
  def: 0.28,
  hp: 0.22,
  gold: 0.22,
  exp: 0.35,
  spd: 0.18,
  crit: 0.12,
};

export const ROSTER_PASSIVES: RosterPassiveDef[] = [
  { charId: 'huchu', name: '마력 공명', ownedDesc: '파티 EXP +1.8%', owned: { exp: 0.018 },
    partyProc: { id: 'hc_fire', name: '화염 잔불', chance: 0.09, desc: '처치 시 화염 폭발', kind: 'atkBuff', power: 0.15, duration: 6 } },
  { charId: 'mujang', name: '철벽 의지', ownedDesc: '파티 DEF +1.5%', owned: { def: 0.015 },
    partyProc: { id: 'mj_shield', name: '방패 맥동', chance: 0.08, desc: '피격 시 일시 방어', kind: 'shieldPulse', power: 0.2, duration: 5 } },
  { charId: 'ujang', name: '검기', ownedDesc: '파티 ATK +1.4%', owned: { atk: 0.014 },
    partyProc: { id: 'uj_combo', name: '연속 베기', chance: 0.1, desc: '처치 시 공격 가속', kind: 'spdBuff', power: 0.12, duration: 5 } },
  { charId: 'dung', name: '바람의 눈', ownedDesc: '파티 치명 +0.8%', owned: { crit: 0.008 },
    partyProc: { id: 'dg_snipe', name: '저격 탄환', chance: 0.07, desc: '처치 시 치명 버프', kind: 'critBuff', power: 0.1, duration: 6 } },
  { charId: 'lesford', name: '용의 기운', ownedDesc: '파티 ATK +1.2%', owned: { atk: 0.012 },
    partyProc: { id: 'ls_pierce', name: '관통 찌르기', chance: 0.08, desc: '처치 시 공격 강화', kind: 'atkBuff', power: 0.14, duration: 5 } },
  { charId: 'ampa', name: '광기', ownedDesc: '파티 ATK +1.6%', owned: { atk: 0.016 },
    partyProc: { id: 'am_rage', name: '광폭', chance: 0.09, desc: '처치 시 광폭화', kind: 'atkBuff', power: 0.18, duration: 4 } },
  { charId: 'yujin', name: '축복', ownedDesc: '파티 HP +1.2%', owned: { hp: 0.012 },
    partyProc: { id: 'yj_heal', name: '성스러운 치유', chance: 0.1, desc: '처치 시 파티 회복', kind: 'healParty', power: 0.08 } },
  { charId: 'seoyoung', name: '수호 맹세', ownedDesc: '파티 DEF +1.8%', owned: { def: 0.018 },
    partyProc: { id: 'sy_guard', name: '수호 결계', chance: 0.07, desc: '피격 시 방어 버프', kind: 'shieldPulse', power: 0.22, duration: 6 } },
  { charId: 'teso', name: '성역', ownedDesc: '파티 DEF +1.4% · HP +1%', owned: { def: 0.014, hp: 0.01 },
    partyProc: { id: 'bh_holy', name: '성광', chance: 0.08, desc: '처치 시 신성 버프', kind: 'atkBuff', power: 0.12, duration: 6 } },
  { charId: 'horangi', name: '라미의 야성', ownedDesc: '파티 ATK +1.3%', owned: { atk: 0.013 },
    partyProc: { id: 'hg_claw', name: '맹호 발톱', chance: 0.09, desc: '처치 시 연타 가속', kind: 'spdBuff', power: 0.14, duration: 5 } },
  { charId: 'hyesung', name: '유성 가호', ownedDesc: '파티 공속 +1%', owned: { spd: 0.01 },
    partyProc: { id: 'hs_meteor', name: '유성낙하', chance: 0.08, desc: '처치 시 폭발 딜 버프', kind: 'atkBuff', power: 0.16, duration: 4 } },
  { charId: 'isanim', name: '점액 체질', ownedDesc: '파티 EXP +1.5%', owned: { exp: 0.015 },
    partyProc: { id: 'mn_split', name: '분열', chance: 0.1, desc: '처치 시 EXP 보너스', kind: 'expBurst', power: 0.25 } },
  { charId: 'sanjeok', name: '산적의 약탈', ownedDesc: '파티 골드 +1.6%', owned: { gold: 0.016 },
    partyProc: { id: 'cl_loot', name: '약탈', chance: 0.11, desc: '처치 시 추가 골드', kind: 'goldBurst', power: 1.4 } },
  { charId: 'sodia', name: '망령 시선', ownedDesc: '파티 치명 +1%', owned: { crit: 0.01 },
    partyProc: { id: 'sd_poison', name: '독화살', chance: 0.08, desc: '처치 시 치명 강화', kind: 'critBuff', power: 0.12, duration: 5 } },
  { charId: 'jimjimi', name: '기병 진군', ownedDesc: '파티 공속 +0.9%', owned: { spd: 0.009 },
    partyProc: { id: 'tn_charge', name: '돌격', chance: 0.09, desc: '처치 시 돌격 가속', kind: 'spdBuff', power: 0.15, duration: 5 } },
  { charId: 'danjong', name: '왕의 위엄', ownedDesc: '파티 DEF +1.6% · HP +1.2%', owned: { def: 0.016, hp: 0.012 },
    partyProc: { id: 'dj_crown', name: '왕검', chance: 0.07, desc: '처치 시 방어 강화', kind: 'shieldPulse', power: 0.18, duration: 6 } },
  { charId: 'hyeoni', name: '망령 공명', ownedDesc: '파티 ATK +1.1% · EXP +1%', owned: { atk: 0.011, exp: 0.01 },
    partyProc: { id: 'hv_curse', name: '저주', chance: 0.08, desc: '처치 시 공격 버프', kind: 'atkBuff', power: 0.14, duration: 5 } },
  { charId: 'pocket', name: '철갑 결속', ownedDesc: '파티 DEF +1.7%', owned: { def: 0.017 },
    partyProc: { id: 'pk_wall', name: '철벽 방패', chance: 0.08, desc: '피격 시 철벽', kind: 'shieldPulse', power: 0.24, duration: 5 } },
  { charId: 'cutie', name: '공허 기운', ownedDesc: '파티 ATK +1% · 치명 +0.6%', owned: { atk: 0.01, crit: 0.006 },
    partyProc: { id: 'ct_void', name: '공허 참', chance: 0.08, desc: '처치 시 망령 일격', kind: 'atkBuff', power: 0.15, duration: 5 } },
  { charId: 'hidden', name: '셰프의 향', ownedDesc: '파티 골드 +1.2% · EXP +1.2%', owned: { gold: 0.012, exp: 0.012 },
    partyProc: { id: 'hd_feast', name: '만찬 기운', chance: 0.1, desc: '처치 시 재료 드롭', kind: 'materialDrop', power: 1 } },
];

export const ROSTER_PASSIVE_MAP: Record<string, RosterPassiveDef> = Object.fromEntries(
  ROSTER_PASSIVES.map(p => [p.charId, p]),
);

export interface ComputedRosterBonuses {
  atk: number;
  def: number;
  hp: number;
  gold: number;
  exp: number;
  spd: number;
  crit: number;
  ownedCount: number;
  entries: { charId: string; name: string; desc: string }[];
}

function capStat(key: keyof RosterOwnedBonus, raw: number): number {
  return Math.min(STACK_CAP[key], raw);
}

export function computeRosterBonuses(owned: string[]): ComputedRosterBonuses {
  const sum: RosterOwnedBonus = {};
  const entries: { charId: string; name: string; desc: string }[] = [];
  for (const id of owned) {
    const p = ROSTER_PASSIVE_MAP[id];
    if (!p) continue;
    entries.push({ charId: id, name: p.name, desc: p.ownedDesc });
    for (const k of Object.keys(p.owned) as (keyof RosterOwnedBonus)[]) {
      sum[k] = (sum[k] ?? 0) + (p.owned[k] ?? 0);
    }
  }
  return {
    atk: 1 + capStat('atk', sum.atk ?? 0),
    def: 1 + capStat('def', sum.def ?? 0),
    hp: 1 + capStat('hp', sum.hp ?? 0),
    gold: 1 + capStat('gold', sum.gold ?? 0),
    exp: 1 + capStat('exp', sum.exp ?? 0),
    spd: 1 + capStat('spd', sum.spd ?? 0),
    crit: capStat('crit', sum.crit ?? 0),
    ownedCount: entries.length,
    entries,
  };
}

export function getActivePartyIds(save: { party: string[]; supportSlot?: string | null }): Set<string> {
  const ids = new Set(save.party);
  if (save.supportSlot) ids.add(save.supportSlot);
  return ids;
}
