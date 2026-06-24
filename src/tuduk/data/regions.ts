import type { RegionDef } from '../types';
import { extendRegionsToMax, MAX_DUNGEON_FLOOR } from './regionsExtended';

export { MAX_DUNGEON_FLOOR };

const BASE_REGIONS: RegionDef[] = [  { id: 1, name: '가락동 스타디움', badge: 'badge_start', badgeName: '시작의 배지', bgTop: '#87ceeb', bgBottom: '#5a9e6f', ground: '#4a8a55', monsterIds: ['goblin', 'slime_green'], bossId: 'boss_goblin_chief' },
  { id: 2, name: '왕십리', badge: 'badge_steel', badgeName: '강철의 배지', bgTop: '#8899aa', bgBottom: '#556677', ground: '#667788', monsterIds: ['skeleton', 'bat'], bossId: 'boss_iron_knight' },
  { id: 3, name: '건대 화양', badge: 'badge_youth', badgeName: '청춘의 배지', bgTop: '#ffaa88', bgBottom: '#cc6655', ground: '#bb7766', monsterIds: ['wolf', 'goblin'], bossId: 'boss_wolf_king' },
  { id: 4, name: '성신여대', badge: 'badge_faith', badgeName: '신앙의 배지', bgTop: '#eeddff', bgBottom: '#bbaadd', ground: '#aa99cc', monsterIds: ['ghost', 'skeleton'], bossId: 'boss_lich' },
  { id: 5, name: '회기', badge: 'badge_wisdom', badgeName: '지식의 배지', bgTop: '#aaccff', bgBottom: '#6688cc', ground: '#5577bb', monsterIds: ['mage_slime', 'ghost'], bossId: 'boss_arcane' },
  { id: 6, name: '잠실', badge: 'badge_wave', badgeName: '물결의 배지', bgTop: '#66ccff', bgBottom: '#2288cc', ground: '#3399dd', monsterIds: ['fish', 'slime_blue'], bossId: 'boss_kraken' },
  { id: 7, name: '강동', badge: 'badge_guard', badgeName: '수호의 배지', bgTop: '#88ddaa', bgBottom: '#449966', ground: '#338855', monsterIds: ['treant', 'bear'], bossId: 'boss_treant' },
  { id: 8, name: '수유', badge: 'badge_shadow', badgeName: '그림자의 배지', bgTop: '#443355', bgBottom: '#221122', ground: '#332244', monsterIds: ['shadow', 'bat'], bossId: 'boss_shadow' },
  { id: 9, name: '노원', badge: 'badge_north', badgeName: '북풍의 배지', bgTop: '#cceeff', bgBottom: '#88bbdd', ground: '#99ccdd', monsterIds: ['ice_slime', 'wolf'], bossId: 'boss_frost' },
  { id: 10, name: '경기광주', badge: 'badge_final', badgeName: '최후의 배지', bgTop: '#ff6644', bgBottom: '#881122', ground: '#992233', monsterIds: ['demon', 'dragon'], bossId: 'boss_final' },
  { id: 11, name: '구리', badge: 'badge_brass', badgeName: '황동의 배지', bgTop: '#ddcc88', bgBottom: '#aa8844', ground: '#998833', monsterIds: ['golem', 'skeleton'], bossId: 'boss_brass' },
  { id: 12, name: '하남', badge: 'badge_river', badgeName: '강변의 배지', bgTop: '#88ccaa', bgBottom: '#448866', ground: '#337755', monsterIds: ['fish', 'frog'], bossId: 'boss_river' },
  { id: 13, name: '의정부', badge: 'badge_strategy', badgeName: '군략의 배지', bgTop: '#aa9988', bgBottom: '#665544', ground: '#776655', monsterIds: ['soldier', 'archer_mob'], bossId: 'boss_general' },
  { id: 14, name: '별내', badge: 'badge_star', badgeName: '별빛의 배지', bgTop: '#223366', bgBottom: '#112244', ground: '#1a2a55', monsterIds: ['star_slime', 'ghost'], bossId: 'boss_stellar' },
  { id: 15, name: '평내호평', badge: 'badge_calm', badgeName: '평온의 배지', bgTop: '#aaddcc', bgBottom: '#66aa88', ground: '#559977', monsterIds: ['mage_slime', 'treant'], bossId: 'boss_sage' },
  { id: 16, name: '진접', badge: 'badge_forest', badgeName: '숲길의 배지', bgTop: '#55aa66', bgBottom: '#226633', ground: '#1a5522', monsterIds: ['wolf', 'treant'], bossId: 'boss_forest' },
  { id: 17, name: '옥정', badge: 'badge_jade', badgeName: '옥빛의 배지', bgTop: '#88ddbb', bgBottom: '#44aa77', ground: '#339966', monsterIds: ['jade_golem', 'mage_slime'], bossId: 'boss_jade' },
  { id: 18, name: '모란', badge: 'badge_flower', badgeName: '붉은꽃의 배지', bgTop: '#ff8899', bgBottom: '#cc4455', ground: '#bb5566', monsterIds: ['flower_mon', 'bee'], bossId: 'boss_rose' },
];

export const REGIONS: RegionDef[] = extendRegionsToMax(BASE_REGIONS, MAX_DUNGEON_FLOOR);