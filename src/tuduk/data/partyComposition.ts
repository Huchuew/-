import type { GameSave } from '../types';
import { MAX_PARTY_SIZE } from '../types';
import { CHAR_MAP, isHealerChar, isTankChar } from './characters';
import { TANK_DAMAGE_THREAT_MULT } from '../systems/AggroSystem';
import { formatTraitSynergyDetail } from './traitSynergy';

const RANGED_JOBS = new Set(['archer', 'mage']);

export function getPartyCompositionHint(save: GameSave): string {
  const party = save.party.map(id => CHAR_MAP[id]).filter(Boolean);
  if (party.length === 0) return '모험단에 전투원을 배치하세요.';

  const hasTank = party.some(c => isTankChar(c!.id));
  const hasDps = party.some(c => c!.equipRole === 'dps' || c!.equipRole === 'bruiser');
  const hasHealer = party.some(c => isHealerChar(c!.id));
  const healerNames = party.filter(c => isHealerChar(c!.id)).map(c => c!.name).join('/');
  const hasRanged = party.some(c => RANGED_JOBS.has(c!.job));

  const parts: string[] = [];

  const floor = save.currentRegion ?? save.maxRegion ?? 1;
  if (floor >= 12 && party.length < MAX_PARTY_SIZE) {
    parts.push(`12층+ — ${MAX_PARTY_SIZE}인 편성 권장`);
  } else if (floor >= 10 && party.length < 3) {
    parts.push('10~11층 — 3인 편성 권장');
  } else if (party.length === 1) {
    const role = party[0]!.equipRole;
    if (role === 'tank') {
      parts.push('1인 탱 — 초반만 가능, 딜러 영입 권장');
    } else if (role === 'dps' || role === 'bruiser') {
      parts.push(`1인 딜 — 9층까지, 10층부터 3인+ 권장`);
    } else {
      parts.push(`1인 편성 — 10층 전 동료 영입 권장`);
    }
  } else if (party.length < MAX_PARTY_SIZE && floor >= 10) {
    parts.push(`슬롯 ${MAX_PARTY_SIZE - party.length} — 층이 올라갈수록 4인이 편해요`);
  }

  if (!hasTank) {
    parts.push('탱커 없음 — 딜러가 직접 맞음');
  } else {
    parts.push(`탱커 선봉 ✓ · 탱 딜은 어그로×${TANK_DAMAGE_THREAT_MULT}`);
  }

  if (!hasDps) {
    parts.push('딜러 없음 — 보스전 매우 느림');
  } else if (hasRanged) {
    parts.push('원거리 화력 ✓');
  }

  if (!hasHealer) {
    parts.push('힐러 없음 — 장기전 위험');
  } else {
    parts.push(`${healerNames || '힐러'} ✓`);
  }

  if (hasTank && hasDps && hasHealer && party.length >= MAX_PARTY_SIZE) {
    parts.push('4인 철삼각 — 10층+ 표준 편성');
  } else if (hasTank && hasDps && hasHealer && party.length >= 3) {
    parts.push('철삼각 — 4번째 슬롯 채우면 안정↑');
  }

  const traits = formatTraitSynergyDetail(save);
  if (traits !== '활성 특성 없음') {
    parts.push(traits.split(' · ')[0] ?? '');
  }

  return parts.filter(Boolean).join(' · ');
}
