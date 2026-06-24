import type { RegionDef } from '../types';

/** 19~50층 지역명 (수도권·전국 확장) */
const DEEP_REGION_NAMES: Record<number, string> = {
  19: '분당', 20: '일산', 21: '수원', 22: '안양', 23: '부천', 24: '김포',
  25: '파주', 26: '양주', 27: '남양주', 28: '화성', 29: '평택', 30: '춘천',
  31: '원주', 32: '강릉', 33: '속초', 34: '청주', 35: '대전', 36: '천안',
  37: '전주', 38: '광주', 39: '대구', 40: '울산', 41: '부산', 42: '창원',
  43: '제주', 44: '통영', 45: '여수', 46: '목포', 47: '포항', 48: '경주',
  49: '안동', 50: '잭펍 심연',
};

const DEEP_BADGE_NAMES: Record<number, string> = {
  19: '분당의 배지', 20: '일산의 배지', 21: '수원의 배지', 22: '안양의 배지',
  23: '부천의 배지', 24: '김포의 배지', 25: '파주의 배지', 26: '양주의 배지',
  27: '남양주의 배지', 28: '화성의 배지', 29: '평택의 배지', 30: '춘천의 배지',
  31: '원주의 배지', 32: '강릉의 배지', 33: '속초의 배지', 34: '청주의 배지',
  35: '대전의 배지', 36: '천안의 배지', 37: '전주의 배지', 38: '광주의 배지',
  39: '대구의 배지', 40: '울산의 배지', 41: '부산의 배지', 42: '창원의 배지',
  43: '제주의 배지', 44: '통영의 배지', 45: '여수의 배지', 46: '목포의 배지',
  47: '포항의 배지', 48: '경주의 배지', 49: '안동의 배지', 50: '심연의 배지',
};

export const MAX_DUNGEON_FLOOR = 50;

/** 1~18층 기본 지역 위에 19~50층 프로시저럴 생성 */
export function extendRegionsToMax(base: RegionDef[], maxFloor = MAX_DUNGEON_FLOOR): RegionDef[] {
  if (base.length >= maxFloor) return base.slice(0, maxFloor);
  const out = [...base];
  for (let id = base.length + 1; id <= maxFloor; id++) {
    const template = base[(id - 1) % base.length]!;
    const depth = id - 18;
    const darken = Math.min(0.35, depth * 0.008);
    out.push({
      id,
      name: DEEP_REGION_NAMES[id] ?? `심연 ${id}층`,
      badge: `badge_deep_${id}`,
      badgeName: DEEP_BADGE_NAMES[id] ?? `${id}층 배지`,
      bgTop: tintHex(template.bgTop, -darken),
      bgBottom: tintHex(template.bgBottom, -darken * 1.2),
      ground: tintHex(template.ground, -darken * 0.8),
      monsterIds: [...template.monsterIds],
      bossId: template.bossId,
    });
  }
  return out;
}

function tintHex(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = clamp(parseInt(m[1]!, 16) * (1 + amount));
  const g = clamp(parseInt(m[2]!, 16) * (1 + amount));
  const b = clamp(parseInt(m[3]!, 16) * (1 + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
