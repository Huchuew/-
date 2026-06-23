import type { PrestigeBranchCharDef } from './prestigeBranchBuilder';

/** 캐릭터별 2차→3차→4차 전직 분기 (메이플식 A/B 경로) */
export const PRESTIGE_BRANCH_DEFS: PrestigeBranchCharDef[] = [
  {
    charId: 'mujang', treeName: '전직 · 분기', prefix: 'mj_pr',
    paths: [
      {
        key: 'a', label: '수호 대장',
        nodes: [
          { name: '하사', desc: '2차 · 철벽 수호', cost: 700, lv: 15, rate: 0.12, atk: 12, def: 12 },
          { name: '중사', desc: '3차 · 방패 대장', cost: 1600, lv: 25, rate: 0.10, atk: 15, def: 18 },
          { name: '대장', desc: '4차 · 수호 대장', cost: 3800, lv: 40, rate: 0.08, atk: 30, def: 22 },
        ],
      },
      {
        key: 'b', label: '철의 광전',
        nodes: [
          { name: '돌격병', desc: '2차 · 공격형 탱커', cost: 700, lv: 15, rate: 0.12, atk: 18, def: 6, hp: 40 },
          { name: '광전 대장', desc: '3차 · 분노의 방패', cost: 1600, lv: 25, rate: 0.10, atk: 24, hp: 70, crit: 0.05 },
          { name: '철의 대장', desc: '4차 · 광전 수호', cost: 3800, lv: 40, rate: 0.08, atk: 38, hp: 100, crit: 0.08 },
        ],
      },
    ],
  },
  {
    charId: 'huchu', treeName: '전직 · 분기', prefix: 'hc_pr',
    paths: [
      {
        key: 'a', label: '아크메이지',
        nodes: [
          { name: '마도사', desc: '2차 · 화염 숙련', cost: 700, lv: 12, rate: 0.12, atk: 10, aoeBonus: 0.1 },
          { name: '대마도사', desc: '3차 · 메테오 숙련', cost: 1600, lv: 22, rate: 0.10, atk: 20, aoeBonus: 0.15 },
          { name: '아크메이지', desc: '4차 · 종말의 불꽃', cost: 3800, lv: 38, rate: 0.08, atk: 40, aoeBonus: 0.25 },
        ],
      },
      {
        key: 'b', label: '프로즌 아크',
        nodes: [
          { name: '빙결술사', desc: '2차 · 냉기 전환', cost: 700, lv: 12, rate: 0.12, atk: 8, def: 8, aoeBonus: 0.08 },
          { name: '얼음 대마도', desc: '3차 · 결계 마법', cost: 1600, lv: 22, rate: 0.10, atk: 16, def: 12, aoeBonus: 0.12 },
          { name: '프로즌 아크', desc: '4차 · 절대영도', cost: 3800, lv: 38, rate: 0.08, atk: 32, def: 16, aoeBonus: 0.2 },
        ],
      },
    ],
  },
  {
    charId: 'ujang', treeName: '전직 · 분기', prefix: 'uj_pr',
    paths: [
      {
        key: 'a', label: '무영',
        nodes: [
          { name: '검사', desc: '2차 · 연속 검술', cost: 700, lv: 14, rate: 0.12, atk: 12, atkSpd: 0.08 },
          { name: '검성', desc: '3차 · 무영 질주', cost: 1600, lv: 24, rate: 0.10, atk: 22, atkSpd: 0.12 },
          { name: '무영', desc: '4차 · 격투의 신', cost: 3800, lv: 38, rate: 0.08, atk: 38, atkSpd: 0.18 },
        ],
      },
      {
        key: 'b', label: '검마',
        nodes: [
          { name: '혈검사', desc: '2차 · 치명 일점', cost: 700, lv: 14, rate: 0.12, atk: 14, crit: 0.06 },
          { name: '마검사', desc: '3차 · 검기 폭발', cost: 1600, lv: 24, rate: 0.10, atk: 24, crit: 0.1 },
          { name: '검마', desc: '4차 · 일섬', cost: 3800, lv: 38, rate: 0.08, atk: 42, crit: 0.14 },
        ],
      },
    ],
  },
  {
    charId: 'dung', treeName: '전직 · 분기', prefix: 'dg_pr',
    paths: [
      {
        key: 'a', label: '바람의 사수',
        nodes: [
          { name: '레인저', desc: '2차 · 저격 숙련', cost: 700, lv: 14, rate: 0.12, atk: 10, crit: 0.05 },
          { name: '스나이퍼', desc: '3차 · 원거리 일점', cost: 1600, lv: 24, rate: 0.10, atk: 18, crit: 0.08 },
          { name: '바람의 사수', desc: '4차 · 바람 화살', cost: 3800, lv: 38, rate: 0.08, atk: 35, crit: 0.1 },
        ],
      },
      {
        key: 'b', label: '폭풍 사수',
        nodes: [
          { name: '속사병', desc: '2차 · 연사 특화', cost: 700, lv: 14, rate: 0.12, atk: 8, atkSpd: 0.15 },
          { name: '폭풍궁', desc: '3차 · 다연발', cost: 1600, lv: 24, rate: 0.10, atk: 16, atkSpd: 0.25 },
          { name: '폭풍 사수', desc: '4차 · 태풍 화살', cost: 3800, lv: 38, rate: 0.08, atk: 28, atkSpd: 0.4, crit: 0.06 },
        ],
      },
    ],
  },
  {
    charId: 'lesford', treeName: '전직 · 분기', prefix: 'ls_pr',
    paths: [
      {
        key: 'a', label: '용창사',
        nodes: [
          { name: '창병', desc: '2차 · 관통 창술', cost: 700, lv: 15, rate: 0.12, atk: 12, def: 6 },
          { name: '기병', desc: '3차 · 용찌르기', cost: 1600, lv: 26, rate: 0.10, atk: 20, hp: 40 },
          { name: '용창사', desc: '4차 · 용의 일격', cost: 3800, lv: 40, rate: 0.08, atk: 38, def: 12 },
        ],
      },
      {
        key: 'b', label: '수호창',
        nodes: [
          { name: '방패창병', desc: '2차 · 방어 창법', cost: 700, lv: 15, rate: 0.12, def: 12, hp: 35 },
          { name: '철벽 기사', desc: '3차 · 진형 수호', cost: 1600, lv: 26, rate: 0.10, atk: 14, def: 18, hp: 60 },
          { name: '수호창', desc: '4차 · 용비늘 방패', cost: 3800, lv: 40, rate: 0.08, atk: 24, def: 24, hp: 90 },
        ],
      },
    ],
  },
  {
    charId: 'ampa', treeName: '전직 · 분기', prefix: 'am_pr',
    paths: [
      {
        key: 'a', label: '멸망의 도끼',
        nodes: [
          { name: '버서커', desc: '2차 · 광폭 입문', cost: 700, lv: 16, rate: 0.12, atk: 14, hp: 30 },
          { name: '혈투사', desc: '3차 · 분노 폭주', cost: 1600, lv: 28, rate: 0.10, atk: 22, atkSpd: 0.15 },
          { name: '멸망의 도끼', desc: '4차 · 광기 극의', cost: 3800, lv: 42, rate: 0.08, atk: 40, crit: 0.12 },
        ],
      },
      {
        key: 'b', label: '피의 수호',
        nodes: [
          { name: '피의 전사', desc: '2차 · 생존 광전', cost: 700, lv: 16, rate: 0.12, atk: 10, hp: 55, def: 8 },
          { name: '강철 광전', desc: '3차 · 고통 내성', cost: 1600, lv: 28, rate: 0.10, atk: 18, hp: 85, def: 12 },
          { name: '피의 수호', desc: '4차 · 불사의 광기', cost: 3800, lv: 42, rate: 0.08, atk: 30, hp: 120, crit: 0.08 },
        ],
      },
    ],
  },
  {
    charId: 'yujin', treeName: '전직 · 분기', prefix: 'yj_pr',
    paths: [
      {
        key: 'a', label: '성직자',
        nodes: [
          { name: '사제', desc: '2차 · 치유 숙련', cost: 700, lv: 13, rate: 0.12, hp: 40, buffAtk: 0.03 },
          { name: '대사제', desc: '3차 · 성스러운 가호', cost: 1600, lv: 23, rate: 0.10, hp: 70, buffAtk: 0.05 },
          { name: '성직자', desc: '4차 · 신성한 축복', cost: 3800, lv: 36, rate: 0.08, hp: 100, buffExp: 0.05 },
        ],
      },
      {
        key: 'b', label: '심판자',
        nodes: [
          { name: '성전사', desc: '2차 · 심판의 빛', cost: 700, lv: 13, rate: 0.12, atk: 12, def: 8 },
          { name: '응징자', desc: '3차 · 신성 일격', cost: 1600, lv: 23, rate: 0.10, atk: 22, crit: 0.06 },
          { name: '심판자', desc: '4차 · 천벌', cost: 3800, lv: 36, rate: 0.08, atk: 36, crit: 0.1 },
        ],
      },
    ],
  },
  {
    charId: 'seoyoung', treeName: '전직 · 분기', prefix: 'sy_pr',
    paths: [
      {
        key: 'a', label: '수호기사',
        nodes: [
          { name: '기사', desc: '2차 · 막기 숙련', cost: 700, lv: 14, rate: 0.12, def: 14, hp: 50 },
          { name: '성기사', desc: '3차 · 수호 맹세', cost: 1600, lv: 26, rate: 0.10, def: 22, hp: 80 },
          { name: '수호기사', desc: '4차 · 철벽 수호', cost: 3800, lv: 38, rate: 0.08, def: 32, hp: 110 },
        ],
      },
      {
        key: 'b', label: '복수의 기사',
        nodes: [
          { name: '응징 기사', desc: '2차 · 반격 탱커', cost: 700, lv: 14, rate: 0.12, atk: 10, def: 10 },
          { name: '심판 기사', desc: '3차 · 복수의 검', cost: 1600, lv: 26, rate: 0.10, atk: 18, def: 14, crit: 0.05 },
          { name: '복수의 기사', desc: '4차 · 정의의 일격', cost: 3800, lv: 38, rate: 0.08, atk: 28, def: 20, crit: 0.08 },
        ],
      },
    ],
  },
  {
    charId: 'teso', treeName: '전직 · 분기', prefix: 'bh_pr',
    paths: [
      {
        key: 'a', label: '성검의 기사',
        nodes: [
          { name: '템플러', desc: '2차 · 성역 수호', cost: 700, lv: 14, rate: 0.12, def: 10, atk: 8 },
          { name: '성전사', desc: '3차 · 성스러운 검', cost: 1600, lv: 26, rate: 0.10, atk: 16, def: 14 },
          { name: '성검의 기사', desc: '4차 · 성광 일격', cost: 3800, lv: 38, rate: 0.08, atk: 24, crit: 0.06 },
        ],
      },
      {
        key: 'b', label: '심판관',
        nodes: [
          { name: '성역 기사', desc: '2차 · 마방 특화', cost: 700, lv: 14, rate: 0.12, def: 12, hp: 40 },
          { name: '결계 수호', desc: '3차 · 신성 결계', cost: 1600, lv: 26, rate: 0.10, def: 20, hp: 65 },
          { name: '심판관', desc: '4차 · 성역 심판', cost: 3800, lv: 38, rate: 0.08, atk: 20, def: 26, crit: 0.05 },
        ],
      },
    ],
  },
  {
    charId: 'cutie', treeName: '전직 · 분기', prefix: 'ct_pr',
    paths: [
      {
        key: 'a', label: '멸망검사',
        nodes: [
          { name: '망령검사', desc: '2차 · 망령 검술', cost: 700, lv: 14, rate: 0.12, atk: 12, hp: 35 },
          { name: '공허검사', desc: '3차 · 공허 참격', cost: 1600, lv: 26, rate: 0.10, atk: 22, hp: 55 },
          { name: '멸망검사', desc: '4차 · 망령 극의', cost: 3800, lv: 38, rate: 0.08, atk: 34, crit: 0.08 },
        ],
      },
      {
        key: 'b', label: '공허장군',
        nodes: [
          { name: '망령장군', desc: '2차 · 망령 지휘', cost: 700, lv: 14, rate: 0.12, def: 10, hp: 50 },
          { name: '공허기사', desc: '3차 · 공허 결계', cost: 1600, lv: 26, rate: 0.10, atk: 14, def: 16, hp: 75 },
          { name: '공허장군', desc: '4차 · 죽음의 왕좌', cost: 3800, lv: 38, rate: 0.08, atk: 26, def: 20, hp: 95 },
        ],
      },
    ],
  },
  {
    charId: 'horangi', treeName: '전직 · 분기', prefix: 'hg_pr',
    paths: [
      {
        key: 'a', label: '백호장군',
        nodes: [
          { name: '야수전사', desc: '2차 · 야성의 힘', cost: 700, lv: 14, rate: 0.12, atk: 12, hp: 40 },
          { name: '맹호전사', desc: '3차 · 산의 포효', cost: 1600, lv: 26, rate: 0.10, atk: 26, hp: 70 },
          { name: '백호장군', desc: '4차 · 백수의 일격', cost: 3800, lv: 38, rate: 0.08, atk: 40, crit: 0.1, hp: 40 },
        ],
      },
      {
        key: 'b', label: '산신검사',
        nodes: [
          { name: '연격사', desc: '2차 · 연타 특화', cost: 700, lv: 14, rate: 0.12, atk: 14, atkSpd: 0.06 },
          { name: '섬광검사', desc: '3차 · 치명 연타', cost: 1600, lv: 26, rate: 0.10, atk: 28, crit: 0.1, atkSpd: 0.06 },
          { name: '산신검사', desc: '4차 · 포효 참격', cost: 3800, lv: 38, rate: 0.08, atk: 42, crit: 0.14, atkSpd: 0.08 },
        ],
      },
    ],
  },
  {
    charId: 'hyesung', treeName: '전직 · 분기', prefix: 'hs_pr',
    paths: [
      {
        key: 'a', label: '천강검성',
        nodes: [
          { name: '돌격검사', desc: '2차 · 광속 질주', cost: 700, lv: 14, rate: 0.12, atk: 14, atkSpd: 0.04 },
          { name: '천광검사', desc: '3차 · 유성 일격', cost: 1600, lv: 26, rate: 0.10, atk: 24, atkSpd: 0.08 },
          { name: '천강검성', desc: '4차 · 천강 낙하', cost: 3800, lv: 38, rate: 0.08, atk: 36, atkSpd: 0.12 },
        ],
      },
      {
        key: 'b', label: '유성검성',
        nodes: [
          { name: '섬광검사', desc: '2차 · 폭발 치명', cost: 700, lv: 14, rate: 0.12, atk: 12, crit: 0.06 },
          { name: '혜성검사', desc: '3차 · 섬광 연무', cost: 1600, lv: 26, rate: 0.10, atk: 22, crit: 0.1 },
          { name: '유성검성', desc: '4차 · 혜성 충돌', cost: 3800, lv: 38, rate: 0.08, atk: 34, crit: 0.14 },
        ],
      },
    ],
  },
  {
    charId: 'isanim', treeName: '전직 · 분기', prefix: 'mn_pr',
    paths: [
      {
        key: 'a', label: '점액현자',
        nodes: [
          { name: '점액술사', desc: '2차 · 파티 가속', cost: 700, lv: 14, rate: 0.12, hp: 45, buffSpd: 0.03 },
          { name: '치유술사', desc: '3차 · 점액 지휘', cost: 1600, lv: 26, rate: 0.10, buffSpd: 0.05, def: 12 },
          { name: '점액현자', desc: '4차 · 점액 폭풍', cost: 3800, lv: 38, rate: 0.08, buffSpd: 0.07, buffExp: 0.04 },
        ],
      },
      {
        key: 'b', label: '폭액술사',
        nodes: [
          { name: '산성술사', desc: '2차 · 공격형 서포트', cost: 700, lv: 14, rate: 0.12, atk: 10, buffAtk: 0.03 },
          { name: '부식술사', desc: '3차 · 산성 강화', cost: 1600, lv: 26, rate: 0.10, atk: 16, buffAtk: 0.05 },
          { name: '폭액술사', desc: '4차 · 점액 폭렬', cost: 3800, lv: 38, rate: 0.08, atk: 24, buffAtk: 0.07, buffCrit: 0.03 },
        ],
      },
    ],
  },
  {
    charId: 'sanjeok', treeName: '전직 · 분기', prefix: 'cl_pr',
    paths: [
      {
        key: 'a', label: '산적대장',
        nodes: [
          { name: '파검사', desc: '2차 · 도적 근력', cost: 700, lv: 14, rate: 0.12, atk: 12, hp: 35 },
          { name: '호령검사', desc: '3차 · 광폭 일격', cost: 1600, lv: 26, rate: 0.10, atk: 20, hp: 55 },
          { name: '산적대장', desc: '4차 · 산적왕', cost: 3800, lv: 38, rate: 0.08, atk: 30, crit: 0.06 },
        ],
      },
      {
        key: 'b', label: '약탈왕',
        nodes: [
          { name: '약탈꾼', desc: '2차 · 전리품 특화', cost: 700, lv: 14, rate: 0.12, atk: 10, buffExp: 0.04 },
          { name: '무법도적', desc: '3차 · 약탈 숙련', cost: 1600, lv: 26, rate: 0.10, atk: 16, buffExp: 0.06 },
          { name: '약탈왕', desc: '4차 · 황금 약탈', cost: 3800, lv: 38, rate: 0.08, atk: 26, buffExp: 0.08, crit: 0.05 },
        ],
      },
    ],
  },
  {
    charId: 'sodia', treeName: '전직 · 분기', prefix: 'sd_pr',
    paths: [
      {
        key: 'a', label: '사신궁수',
        nodes: [
          { name: '망령궁수', desc: '2차 · 망령 사격', cost: 700, lv: 14, rate: 0.12, atk: 12, crit: 0.04 },
          { name: '저승궁수', desc: '3차 · 저격 강화', cost: 1600, lv: 26, rate: 0.10, atk: 22, crit: 0.06 },
          { name: '사신궁수', desc: '4차 · 사신의 화살', cost: 3800, lv: 38, rate: 0.08, atk: 32, crit: 0.08 },
        ],
      },
      {
        key: 'b', label: '독령궁수',
        nodes: [
          { name: '독궁수', desc: '2차 · 독 특화', cost: 700, lv: 14, rate: 0.12, atk: 10, atkSpd: 0.05 },
          { name: '망독궁수', desc: '3차 · 독 폭발', cost: 1600, lv: 26, rate: 0.10, atk: 18, atkSpd: 0.08 },
          { name: '독령궁수', desc: '4차 · 독령의 화살', cost: 3800, lv: 38, rate: 0.08, atk: 28, crit: 0.07, atkSpd: 0.1 },
        ],
      },
    ],
  },
  {
    charId: 'jimjimi', treeName: '전직 · 분기', prefix: 'tn_pr',
    paths: [
      {
        key: 'a', label: '파쇄기사',
        nodes: [
          { name: '기마창병', desc: '2차 · 질풍 돌격', cost: 700, lv: 14, rate: 0.12, atk: 12, def: 8 },
          { name: '질풍기병', desc: '3차 · 관통 돌파', cost: 1600, lv: 26, rate: 0.10, atk: 20, atkSpd: 0.04 },
          { name: '파쇄기사', desc: '4차 · 파쇄 돌격', cost: 3800, lv: 38, rate: 0.08, atk: 30, crit: 0.05 },
        ],
      },
      {
        key: 'b', label: '돌격기사',
        nodes: [
          { name: '철갑기병', desc: '2차 · 방어 기동', cost: 700, lv: 14, rate: 0.12, def: 12, hp: 35 },
          { name: '중기병', desc: '3차 · 철벽 돌격', cost: 1600, lv: 26, rate: 0.10, atk: 16, def: 16, hp: 55 },
          { name: '돌격기사', desc: '4차 · 강철 진군', cost: 3800, lv: 38, rate: 0.08, atk: 24, def: 22, hp: 75 },
        ],
      },
    ],
  },
  {
    charId: 'danjong', treeName: '전직 · 분기', prefix: 'dj_pr',
    paths: [
      {
        key: 'a', label: '절대기사',
        nodes: [
          { name: '망령기사', desc: '2차 · 왕의 방패', cost: 700, lv: 14, rate: 0.12, def: 12, hp: 45 },
          { name: '왕령기사', desc: '3차 · 절대 방어', cost: 1600, lv: 26, rate: 0.10, atk: 10, def: 20 },
          { name: '절대기사', desc: '4차 · 절대 군주', cost: 3800, lv: 38, rate: 0.08, atk: 18, def: 28 },
        ],
      },
      {
        key: 'b', label: '멸망기사',
        nodes: [
          { name: '왕검기사', desc: '2차 · 공격형 군주', cost: 700, lv: 14, rate: 0.12, atk: 10, def: 8 },
          { name: '심판기사', desc: '3차 · 왕검 일격', cost: 1600, lv: 26, rate: 0.10, atk: 18, def: 12 },
          { name: '멸망기사', desc: '4차 · 멸망의 참', cost: 3800, lv: 38, rate: 0.08, atk: 28, crit: 0.07 },
        ],
      },
    ],
  },
  {
    charId: 'hyeoni', treeName: '전직 · 분기', prefix: 'hv_pr',
    paths: [
      {
        key: 'a', label: '사신술사',
        nodes: [
          { name: '어둠술사', desc: '2차 · 망령 마법', cost: 700, lv: 14, rate: 0.12, atk: 14 },
          { name: '망령술사', desc: '3차 · 영혼 흡수', cost: 1600, lv: 26, rate: 0.10, atk: 24 },
          { name: '사신술사', desc: '4차 · 사신의 손', cost: 3800, lv: 38, rate: 0.08, atk: 36 },
        ],
      },
      {
        key: 'b', label: '영주술사',
        nodes: [
          { name: '저주술사', desc: '2차 · 저주 특화', cost: 700, lv: 14, rate: 0.12, atk: 10, def: 6 },
          { name: '영혼술사', desc: '3차 · 영혼 결계', cost: 1600, lv: 26, rate: 0.10, atk: 18, def: 10 },
          { name: '영주술사', desc: '4차 · 죽음의 장막', cost: 3800, lv: 38, rate: 0.08, atk: 30, def: 14, aoeBonus: 0.1 },
        ],
      },
    ],
  },
  {
    charId: 'pocket', treeName: '전직 · 분기', prefix: 'pk_pr',
    paths: [
      {
        key: 'a', label: '강철기사',
        nodes: [
          { name: '철갑병', desc: '2차 · 소형 철벽', cost: 700, lv: 14, rate: 0.12, def: 10, hp: 40 },
          { name: '철갑기사', desc: '3차 · 압축 방어', cost: 1600, lv: 26, rate: 0.10, atk: 12, def: 16 },
          { name: '강철기사', desc: '4차 · 강철 수호', cost: 3800, lv: 38, rate: 0.08, atk: 20, def: 24 },
        ],
      },
      {
        key: 'b', label: '불굴기사',
        nodes: [
          { name: '방패병', desc: '2차 · 어그로 특화', cost: 700, lv: 14, rate: 0.12, def: 14, hp: 50 },
          { name: '요새기사', desc: '3차 · 결계 탱커', cost: 1600, lv: 26, rate: 0.10, def: 22, hp: 75 },
          { name: '불굴기사', desc: '4차 · 불굴의 성벽', cost: 3800, lv: 38, rate: 0.08, def: 30, hp: 100, atk: 12 },
        ],
      },
    ],
  },
];
