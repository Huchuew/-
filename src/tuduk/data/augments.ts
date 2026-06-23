import type { EquipRole, GameSave } from '../types';
import { CHAR_MAP } from './characters';
import { CHAR_TRAITS } from './traitSynergy';
import type { AugmentMods } from './augmentMods';

export type AugmentTier = 'silver' | 'gold' | 'prism';
export type AugmentCategory =
  | 'survival' | 'role' | 'trait' | 'element' | 'combat' | 'economy';

export interface AugmentDef {
  id: string;
  name: string;
  icon: string;
  tier: AugmentTier;
  category: AugmentCategory;
  desc: string;
  minFloor: number;
  exclusiveGroup?: string;
  condition?: (save: GameSave) => boolean;
  conditionHint?: string;
  effects: Partial<AugmentMods>;
}

function countRole(save: GameSave, role: EquipRole): number {
  return save.party.filter(id => CHAR_MAP[id]?.equipRole === role).length;
}

function countTrait(save: GameSave, traitId: string): number {
  let n = 0;
  for (const id of save.party) {
    const traits = CHAR_TRAITS[id] ?? [];
    if (traits.includes(traitId)) n++;
  }
  return n;
}

function hasTriangle(save: GameSave): boolean {
  const roles = new Set(save.party.map(id => CHAR_MAP[id]?.equipRole).filter(Boolean));
  return roles.has('tank') && (roles.has('dps') || roles.has('bruiser')) && roles.has('healer');
}

function traitCond(traitId: string, min = 2) {
  return {
    condition: (s: GameSave) => countTrait(s, traitId) >= min,
    conditionHint: `파티에 ${traitId} 특성 ${min}명+`,
  };
}

function roleCond(role: EquipRole, min = 1, label?: string) {
  return {
    condition: (s: GameSave) => countRole(s, role) >= min,
    conditionHint: label ?? `파티에 ${role} ${min}명+`,
  };
}

function a(
  id: string, name: string, icon: string, tier: AugmentTier, category: AugmentCategory,
  desc: string, effects: Partial<AugmentMods>,
  opts?: Partial<AugmentDef>,
): AugmentDef {
  return { id, name, icon, tier, category, desc, minFloor: 1, effects, ...opts };
}

export const AUGMENTS: AugmentDef[] = [
  a('emergency_kit', '응급 키트', '💊', 'silver', 'survival', '포션 회복량 +25%', { potionHealMult: 1.25 }),
  a('concentrated_potion', '고농축 포션', '🧪', 'gold', 'survival', '포션 회복량 +50%', { potionHealMult: 1.5 }, { minFloor: 5, exclusiveGroup: 'potion_heal' }),
  a('alchemist_secret', '연금술사의 비법', '⚗️', 'prism', 'survival', '포션 회복 ×2.5', { potionHealMult: 2.5 }, { minFloor: 12, exclusiveGroup: 'potion_heal' }),
  a('extra_pocket', '여분 주머니', '👝', 'silver', 'survival', '원정 휴대 포션 +1 (4개)', { expeditionCarryAdd: 1 }, { exclusiveGroup: 'potion_carry' }),
  a('large_bag', '대용량 가방', '🎒', 'gold', 'survival', '원정 휴대 포션 +3 (6개)', { expeditionCarryAdd: 3 }, { minFloor: 6, exclusiveGroup: 'potion_carry' }),
  a('endless_flask', '무한 약병', '🫙', 'prism', 'survival', '휴대 상한 8개 · 회복량 −20%', { expeditionCarryCap: 8, potionHealPenalty: 0.8 }, { minFloor: 12, exclusiveGroup: 'potion_carry' }),
  a('after_battle_rest', '전투 후 응급', '💚', 'silver', 'survival', '웨이브 클리어 시 파티 HP 3% 회복', { waveHealPct: 0.03 }),
  a('lodging_blessing', '숙소의 축복', '🛏️', 'gold', 'survival', '숙소 휴식 속도 +35% · 귀환 HP +15%', { restSpeedMult: 1.35, returnHealBonus: 0.15 }, { minFloor: 4 }),

  a('iron_tank', '철벽 탱커', '🛡️', 'silver', 'role', '탱커 DEF +12% · 받는 피해 −8%', { tankDefMult: 1.12, tankDmgTakenMult: 0.92 }, { ...roleCond('tank'), conditionHint: '탱커 1명+' }),
  a('taunt_lord', '도발의 군주', '👑', 'gold', 'role', '탱커 위협 +40% · HP +10%', { tankThreatMult: 1.4, tankHpMult: 1.1 }, { minFloor: 5, ...roleCond('tank'), conditionHint: '탱커 1명+' }),
  a('immortal_shield', '불멸의 방패', '🪖', 'prism', 'role', '탱커 1회 부활 (원정당)', { tankReviveOnce: true }, { minFloor: 14, ...roleCond('tank'), conditionHint: '탱커 1명+' }),
  a('sharp_dps', '날카로운 딜러', '⚔️', 'silver', 'role', '딜러·브루저 ATK +10% · 치명 +4%p', { dpsAtkMult: 1.1, dpsCritBonus: 0.04 }, { condition: s => countRole(s, 'dps') + countRole(s, 'bruiser') >= 2, conditionHint: '딜러/브루저 2명+' }),
  a('storm_striker', '폭풍 공속', '💨', 'gold', 'role', '딜러·브루저 공속 +14%', { dpsAtkSpdMult: 1.14 }, { minFloor: 5, condition: s => countRole(s, 'dps') >= 2, conditionHint: '딜러 2명+' }),
  a('executioner', '처형인', '🗡️', 'prism', 'role', '적 HP 30% 이하 시 딜러 피해 +35%', { executeDmgMult: 1.35 }, { minFloor: 12, condition: s => countRole(s, 'dps') + countRole(s, 'bruiser') >= 2, conditionHint: '딜러/브루저 2명+' }),
  a('healing_hands', '치유의 손', '🤲', 'silver', 'role', '힐러 힐량 +15%', { healerHealMult: 1.15 }, { ...roleCond('healer'), conditionHint: '힐러 1명+' }),
  a('life_spring', '생명의 샘', '🌿', 'gold', 'role', '힐러 힐량 +20% · 대상 DEF +8%', { healerHealMult: 1.2, healerDefBuff: 0.08 }, { minFloor: 6, ...roleCond('healer'), conditionHint: '힐러 1명+' }),
  a('support_line', '서포트 라인', '✨', 'silver', 'role', '서포트 버프 지속 +25% · 파티 ATK +6%', { supportBuffDurMult: 1.25, supportPartyAtk: 0.06 }, { ...roleCond('support'), conditionHint: '서포트 1명+' }),
  a('commander', '전장 지휘관', '🎖️', 'gold', 'role', '탱·딜·힐 편성 시 ATK/DEF/HP +8%', { trianglePartyAtk: 0.08, trianglePartyDef: 0.08, trianglePartyHp: 0.08 }, { minFloor: 7, condition: hasTriangle, conditionHint: '탱·딜·힐 삼각 편성' }),

  a('guardian_bond', '수호자 결속', '🛡', 'silver', 'trait', '수호자 특성 시너지 +50%', { traitSynergyMult: 1.5 }, { ...traitCond('guardian'), conditionHint: '수호자 특성 2명+' }),
  a('arcane_burst', '마도 폭발', '🔮', 'gold', 'trait', '마도 특성 스킬 피해 +18%', { traitSynergyMult: 1.18, dpsAtkMult: 1.06 }, { minFloor: 5, ...traitCond('arcane'), conditionHint: '마도 특성 2명+' }),
  a('fury_blood', '광전의 피', '⚔', 'silver', 'trait', '광전 특성 ATK 보너스 +40%', { traitSynergyMult: 1.4 }, { ...traitCond('fury'), conditionHint: '광전 특성 2명+' }),
  a('undead_legion', '유령 군단', '👻', 'gold', 'trait', '망령 특성 HP·흡혈 +30%', { traitSynergyMult: 1.3, tankHpMult: 1.05 }, { minFloor: 6, ...traitCond('undead'), conditionHint: '망령 특성 2명+' }),
  a('lancer_formation', '창술 진형', '🔱', 'silver', 'trait', '창병 특성 공속·관통 +25%', { traitSynergyMult: 1.25, dpsAtkSpdMult: 1.08 }, { ...traitCond('lancer'), conditionHint: '창병 특성 2명+' }),
  a('artillery_support', '포격 지원', '🏹', 'gold', 'trait', '사격 특성 치명·공속 +20%', { traitSynergyMult: 1.2, dpsCritBonus: 0.04 }, { minFloor: 5, ...traitCond('artillery'), conditionHint: '사격 특성 2명+' }),
  a('dual_awakening', '이중 각성', '⭐', 'gold', 'trait', '활성 특성 시너지 효과 +1단계 체감', { traitSynergyMult: 1.35 }, { minFloor: 8, condition: s => new Set(savePartyTraits(s)).size >= 3, conditionHint: '특성 3종+' }),
  a('legend_combo', '전설 조합', '🌟', 'prism', 'trait', '특성 4종+ 시 ATK/DEF/HP +12%', { traitQuadBonus: 0.12 }, { minFloor: 15, condition: s => new Set(savePartyTraits(s)).size >= 4, conditionHint: '특성 4종+' }),

  a('fire_mastery', '화염 숙련', '🔥', 'silver', 'element', '화염 피해 +15%', { fireDmgMult: 1.15 }),
  a('thunder_mastery', '뇌격 숙련', '⚡', 'silver', 'element', '전기 피해 +15% · 스킬 발동 +6%', { thunderDmgMult: 1.15, gaugeGainMult: 1.06 }),
  a('poison_mastery', '독술 숙련', '☠', 'silver', 'element', '독 피해 +18%', { poisonDmgMult: 1.18 }),
  a('water_mastery', '냉기 숙련', '💧', 'silver', 'element', '냉기 피해 +15%', { waterDmgMult: 1.15 }),
  a('weakness_hunter', '약점 파악', '🎯', 'gold', 'element', '속성 약점 피해 1.32→1.42', { weaknessDmgMult: 1.42 / 1.32 }, { minFloor: 6 }),
  a('element_unity', '속성 통일', '🔗', 'gold', 'element', '같은 속성 장비 2개+ ATK +10%', { uniformElementAtk: 0.1 }, { minFloor: 7 }),
  a('boss_hunter', '보스 사냥꾼', '🐉', 'gold', 'combat', '보스·엘리트 피해 +18% · 보스전 힐 +15%', { bossDmgMult: 1.18, bossHealMult: 1.15 }, { minFloor: 8 }),
  a('rift_breaker', '차원 균열', '🌌', 'prism', 'element', '일반몹 속성 약점 항상 적용', { ignoreResistWeakness: true }, { minFloor: 16 }),

  a('tuduk_finger', '투닥 손가락', '👆', 'silver', 'combat', '투닥 피해 +20% · 쿨 −10%', { touchDmgMult: 1.2, touchCdMult: 0.9 }),
  a('combo_master', '연타 달인', '🔥', 'gold', 'combat', '콤보 3+ 시 골드 +12% · ATK +10%', { comboGoldMult: 1.12, comboAtkMult: 1.1 }, { minFloor: 5 }),
  a('gauge_charge', '게이지 충전', '⚡', 'gold', 'combat', '스킬 게이지 충전 +18%', { gaugeGainMult: 1.18 }, { minFloor: 6 }),
  a('ultimate_awaken', '필살 각성', '💥', 'silver', 'combat', '궁극기 피해·힐 +15%', { ultMult: 1.15 }),
  a('chain_burst', '연쇄 폭발', '💫', 'gold', 'combat', '스킬 연속 발동 시 피해 +8%/중첩(최대 5)', { skillChainDmg: 0.08 }, { minFloor: 7 }),
  a('time_stop', '시간 정지', '⏱️', 'prism', 'combat', '보스전 시작 5초 무적+공속 +30%', { bossStartInvulnSec: 5, bossStartAtkSpdMult: 1.3 }, { minFloor: 13 }),
  a('backline_guard', '후방 지원', '🏹', 'silver', 'combat', '후열 DEF +12% · 힐량 +10%', { backlineDefMult: 1.12, backlineHealMult: 1.1 }),

  a('bounty_hand', '풍요의 손길', '📦', 'silver', 'economy', '재료 드랍 +15%', { matDropMult: 1.15 }),
  a('golden_harvest', '황금 수확', '🪙', 'gold', 'economy', '처치 골드 +12%', { killGoldMult: 1.12 }, { minFloor: 5 }),
  a('merchant_eye', '상인의 눈', '👁️', 'silver', 'economy', '숙소 재료 판매가 +10%', { sellGoldMult: 1.1 }),
  a('expedition_pay', '원정 수당', '💰', 'gold', 'economy', '귀환 정산 골드 +8%', { returnGoldMult: 1.08 }, { minFloor: 4 }),
  a('camp_efficiency', '캠프 효율', '🏕️', 'silver', 'economy', '캠프 자동 생산 +20%', { campProdMult: 1.2 }),
  a('dungeon_prep', '던전 준비', '🍱', 'gold', 'economy', '출발 영약 지속 +30% · 효과 +10%', { shopBuffDurMult: 1.3, shopBuffEffMult: 1.1 }, { minFloor: 6 }),
  a('tycoon_path', '타이쿤의 길', '📈', 'prism', 'economy', '창고·시장·파견 수입 +25%', { tycoonIncomeMult: 1.25 }, { minFloor: 11 }),
  a('shortcut_pioneer', '숏컷 개척자', '🗺️', 'silver', 'economy', '층 숏컷 개발 시간 −20%', { shortcutDevMult: 0.8 }),
  a('treasure_hunt', '보물 탐색', '🎁', 'gold', 'economy', '보물상자 확률 +6%p · 골드 +25%', { chestChanceAdd: 0.06, chestGoldMult: 1.25 }, { minFloor: 5 }),

  a('second_wind', '제2의 바람', '🌬️', 'silver', 'survival', '웨이브 클리어 HP +2% · 포션 +10%', { waveHealPct: 0.02, potionHealMult: 1.1 }),
  a('bruiser_rampage', '브루저 광폭', '💢', 'gold', 'role', '브루저·딜러 ATK +8% · HP +6%', { dpsAtkMult: 1.08, tankHpMult: 1.06 }, {
    minFloor: 6,
    condition: s => countRole(s, 'bruiser') + countRole(s, 'dps') >= 2,
    conditionHint: '딜러/브루저 2명+',
  }),
  a('veteran_pay', '베테랑 수당', '📋', 'gold', 'economy', '처치 골드 +8% · 귀환 정산 +6%', { killGoldMult: 1.08, returnGoldMult: 1.06 }, { minFloor: 7 }),
  a('lucky_touch', '행운의 투닥', '🍀', 'silver', 'combat', '투닥 피해 +15% · 치명 +3%p', { touchDmgMult: 1.15, dpsCritBonus: 0.03 }),
  a('arcane_overdrive', '마력 과부하', '⚙️', 'gold', 'combat', '스킬 게이지 +14% · 궁극기 +12%', { gaugeGainMult: 1.14, ultMult: 1.12 }, { minFloor: 8 }),
  a('elite_slayer', '정예 학살자', '💀', 'gold', 'combat', '보스·엘리트 피해 +14% · 처형 +20%', { bossDmgMult: 1.14, executeDmgMult: 1.2 }, { minFloor: 9 }),
  a('fortune_blessing', '행운의 가호', '🌈', 'prism', 'economy', '재료·골드 +18% · 상자 확률 +4%p', { matDropMult: 1.18, killGoldMult: 1.18, chestChanceAdd: 0.04 }, { minFloor: 14 }),
];

function savePartyTraits(save: GameSave): string[] {
  const out: string[] = [];
  for (const id of save.party) out.push(...(CHAR_TRAITS[id] ?? []));
  return out;
}

export const AUGMENT_MAP = Object.fromEntries(AUGMENTS.map(a => [a.id, a])) as Record<string, AugmentDef>;

export const TIER_LABEL: Record<AugmentTier, string> = {
  silver: '실버',
  gold: '골드',
  prism: '프리즘',
};

export const CATEGORY_LABEL: Record<AugmentCategory, string> = {
  survival: '생존',
  role: '역할',
  trait: '특성',
  element: '속성',
  combat: '전투',
  economy: '경제',
};
