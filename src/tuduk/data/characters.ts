import type { CharDef } from '../types';
import { buildPrestigePathsRecord } from './prestigeBranchForks';

/** 핵심 모험단 — 역할별 차별화, 동일 티어 내 선택지 */

export const CHARACTERS: CharDef[] = [
  { id: 'huchu', name: '후추', job: 'mage', jobLabel: '마법사', equipRole: 'dps',
    desc: '광역 마법 · 느리지만 넓게 때린다', cost: 62000, recruitRate: 0.2,
    color: '#aa55ff', accent: '#ff88ff', baseHp: 42, baseAtk: 52, baseDef: 4, baseMdef: 26,
    atkSpd: 0.74, critRate: 0.13, critMult: 1.9, aoe: true, pierce: false, berserk: false },

  { id: 'mujang', name: '무쟁', job: 'warrior', jobLabel: '전사', equipRole: 'tank',
    desc: '철벽 탱커 · 어그로·방패 특화', cost: 12000, recruitRate: 0.35,
    color: '#6a8aaa', accent: '#ccddee', baseHp: 265, baseAtk: 9, baseDef: 38, baseMdef: 12,
    atkSpd: 0.52, critRate: 0.04, critMult: 1.32, aoe: false, pierce: false, berserk: false },

  { id: 'ujang', name: '우쟁', job: 'fighter', jobLabel: '검객', equipRole: 'dps',
    desc: '연타 딜러 · 공속·콤보 특화', cost: 72000, recruitRate: 0.2,
    color: '#cc8844', accent: '#ffdd88', baseHp: 54, baseAtk: 38, baseDef: 7, baseMdef: 5,
    atkSpd: 0.86, critRate: 0.14, critMult: 1.85, aoe: false, pierce: false, berserk: false },

  { id: 'dung', name: '둥둥둥', job: 'archer', jobLabel: '궁수', equipRole: 'dps',
    desc: '원거리 스나이퍼 · 치명·저격 특화', cost: 38000, recruitRate: 0.24,
    color: '#55cc77', accent: '#aaffcc', baseHp: 46, baseAtk: 40, baseDef: 5, baseMdef: 4,
    atkSpd: 0.92, critRate: 0.20, critMult: 2.0, aoe: false, pierce: false, berserk: false },

  { id: 'lesford', name: '레시포드', job: 'lancer', jobLabel: '창기병', equipRole: 'dps',
    desc: '관통 딜러 · 방어 무시 일점 특화', cost: 78000, recruitRate: 0.18,
    color: '#ff8844', accent: '#ffcc88', baseHp: 72, baseAtk: 42, baseDef: 11, baseMdef: 7,
    atkSpd: 0.82, critRate: 0.12, critMult: 1.75, aoe: false, pierce: true, berserk: false },

  { id: 'ampa', name: '얌파', job: 'berserker', jobLabel: '광전사', equipRole: 'bruiser',
    desc: '브루저 · 체력 낮을수록 광폭', cost: 105000, recruitRate: 0.14,
    color: '#ff4455', accent: '#ff8888', baseHp: 112, baseAtk: 38, baseDef: 11, baseMdef: 5,
    atkSpd: 0.72, critRate: 0.15, critMult: 2.05, aoe: false, pierce: false, berserk: true },

  { id: 'yujin', name: '유진', job: 'healer', jobLabel: '사제', equipRole: 'healer',
    desc: '성스러운 치유 · 1인도 천천히 클리어 가능', cost: 48000, recruitRate: 0.22,
    color: '#ffee88', accent: '#ffffcc', baseHp: 118, baseAtk: 18, baseDef: 14, baseMdef: 28,
    atkSpd: 0.78, critRate: 0.04, critMult: 1.3, aoe: false, pierce: false, berserk: false },

  { id: 'seoyoung', name: '서영', job: 'warrior', jobLabel: '기사', equipRole: 'tank',
    desc: '최고 물방 · 막기·수호 특화', cost: 42000, recruitRate: 0.26,
    color: '#5599dd', accent: '#aaddff', baseHp: 275, baseAtk: 8, baseDef: 40, baseMdef: 16,
    atkSpd: 0.46, critRate: 0.03, critMult: 1.3, aoe: false, pierce: false, berserk: false },

  { id: 'teso', name: '테소로', job: 'warrior', jobLabel: '성기사', equipRole: 'tank',
    desc: '마방 탱커 · 성역·결계 특화', cost: 88000, recruitRate: 0.17,
    color: '#ffcc55', accent: '#ffeeaa', baseHp: 250, baseAtk: 10, baseDef: 36, baseMdef: 22,
    atkSpd: 0.54, critRate: 0.04, critMult: 1.38, aoe: false, pierce: false, berserk: false },

  { id: 'horangi', name: '라미', job: 'berserker', jobLabel: '수인전사', equipRole: 'bruiser',
    desc: '야수 브루저 · 연타·포효 특화', cost: 94000, recruitRate: 0.15,
    color: '#e8a040', accent: '#ffd080', baseHp: 128, baseAtk: 35, baseDef: 12, baseMdef: 6,
    atkSpd: 0.68, critRate: 0.13, critMult: 1.9, aoe: false, pierce: false, berserk: false },

  { id: 'hyesung', name: '혜성처럼', job: 'fighter', jobLabel: '속검사', equipRole: 'dps',
    desc: '광속 검술 · 공속·치명 폭발', cost: 86000, recruitRate: 0.17,
    color: '#66ccff', accent: '#aaeeff', baseHp: 62, baseAtk: 43, baseDef: 7, baseMdef: 5,
    atkSpd: 0.80, critRate: 0.19, critMult: 2.0, aoe: false, pierce: false, berserk: false },

  { id: 'isanim', name: '이사님', job: 'buffer_spd', jobLabel: '연금술사', equipRole: 'support',
    desc: '점액 연금 · 회복·정화·가속', cost: 64000, recruitRate: 0.21,
    color: '#88ddaa', accent: '#ccffdd', baseHp: 135, baseAtk: 11, baseDef: 16, baseMdef: 22,
    atkSpd: 0.68, critRate: 0.03, critMult: 1.25, aoe: false, pierce: false, berserk: false },

  { id: 'sanjeok', name: '산적', job: 'fighter', jobLabel: '도적', equipRole: 'bruiser',
    desc: '도적 · 근접·약탈 특화', cost: 52000, recruitRate: 0.23,
    color: '#55aa55', accent: '#88dd88', baseHp: 86, baseAtk: 39, baseDef: 8, baseMdef: 4,
    atkSpd: 0.98, critRate: 0.12, critMult: 1.8, aoe: false, pierce: false, berserk: false },

  { id: 'sodia', name: '시민', job: 'archer', jobLabel: '유령궁수', equipRole: 'dps',
    desc: '망령 궁술 · 독·저격 특화', cost: 71000, recruitRate: 0.19,
    color: '#aabbcc', accent: '#ddeeff', baseHp: 48, baseAtk: 37, baseDef: 5, baseMdef: 6,
    atkSpd: 0.88, critRate: 0.18, critMult: 1.92, aoe: false, pierce: false, berserk: false },

  { id: 'jimjimi', name: '짐짐이', job: 'lancer', jobLabel: '기병', equipRole: 'dps',
    desc: '돌격 기병 · 관통·기동 특화', cost: 80000, recruitRate: 0.18,
    color: '#cc7744', accent: '#ffbb88', baseHp: 78, baseAtk: 41, baseDef: 10, baseMdef: 7,
    atkSpd: 0.88, critRate: 0.11, critMult: 1.78, aoe: false, pierce: true, berserk: false },

  { id: 'danjong', name: '단종', job: 'warrior', jobLabel: '망령기사', equipRole: 'tank',
    desc: '망령 기사 · 방어·왕권 특화', cost: 102000, recruitRate: 0.14,
    color: '#8899bb', accent: '#ccddee', baseHp: 268, baseAtk: 8, baseDef: 39, baseMdef: 14,
    atkSpd: 0.51, critRate: 0.03, critMult: 1.3, aoe: false, pierce: false, berserk: false },

  { id: 'hyeoni', name: '현이V', job: 'mage', jobLabel: '사술사', equipRole: 'dps',
    desc: '망령 마법 · 독·저주 특화', cost: 76000, recruitRate: 0.18,
    color: '#9966cc', accent: '#cc99ff', baseHp: 45, baseAtk: 50, baseDef: 4, baseMdef: 25,
    atkSpd: 0.75, critRate: 0.12, critMult: 1.88, aoe: false, pierce: false, berserk: false },

  { id: 'pocket', name: '포켓', job: 'warrior', jobLabel: '철갑전사', equipRole: 'tank',
    desc: '소형 철갑 · 기동 방어 특화', cost: 70000, recruitRate: 0.19,
    color: '#668855', accent: '#aacc99', baseHp: 242, baseAtk: 11, baseDef: 37, baseMdef: 11,
    atkSpd: 0.57, critRate: 0.04, critMult: 1.35, aoe: false, pierce: false, berserk: false },

  { id: 'cutie', name: '큐티가이', job: 'berserker', jobLabel: '망령전사', equipRole: 'bruiser',
    desc: '망령 대검 · 한 방·독 특화', cost: 95000, recruitRate: 0.16,
    color: '#99aabb', accent: '#ddeeff', baseHp: 92, baseAtk: 42, baseDef: 10, baseMdef: 5,
    atkSpd: 0.66, critRate: 0.12, critMult: 2.05, aoe: false, pierce: false, berserk: false },

  { id: 'hidden', name: '히든카드', job: 'chef', jobLabel: '요리사', equipRole: 'support',
    desc: '비밀 요리 · 회복·해독·버프', cost: 250_000, recruitRate: 0.05,
    color: '#886644', accent: '#ccaa88', baseHp: 100, baseAtk: 7, baseDef: 10, baseMdef: 12,
    atkSpd: 0.66, critRate: 0.04, critMult: 1.22, aoe: false, pierce: false, berserk: false },
];

export const CHAR_MAP = Object.fromEntries(CHARACTERS.map(c => [c.id, c]));

const MELEE_DASH_JOBS = new Set(['warrior', 'lancer', 'berserker', 'fighter']);

export function charUsesMeleeDash(charId: string): boolean {
  const job = CHAR_MAP[charId]?.job;
  return job != null && MELEE_DASH_JOBS.has(job);
}

const PROJECTILE_CHARS = new Set(['dung', 'huchu', 'yujin', 'sodia', 'hyeoni']);

/** 원거리 투사체(화살·마법구)를 쏘는 캐릭터 */
export function charUsesProjectile(charId: string): boolean {
  return PROJECTILE_CHARS.has(charId);
}

export function isHealerChar(charId: string): boolean {
  const job = CHAR_MAP[charId]?.job;
  return job === 'healer' || charId === 'hidden' || charId === 'isanim';
}

export function isTankChar(charId: string): boolean {
  return CHAR_MAP[charId]?.equipRole === 'tank';
}

/** 전직 분기 경로 — [A경로 노드명[], B경로 노드명[]] */
export const PRESTIGE_PATHS: Record<string, string[][]> = buildPrestigePathsRecord();
