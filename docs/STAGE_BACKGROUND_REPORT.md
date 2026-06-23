# 스테이지 배경 적용 보고서

## 1. 적용한 배경 개수

**20개** (압축 파일 내 스테이지 PNG 전부, 크롭/슬라이스/합성 없이 원본 그대로)

## 2. 배경 파일 경로

`public/assets/backgrounds/`

| # | 파일 | 배경명 |
|---|------|--------|
| 1 | `01_grassland_castle.png` | 초원 성 |
| 2 | `02_forest.png` | 숲 |
| 3 | `03_autumn_ruins.png` | 가을 유적 |
| 4 | `04_snow_mountains.png` | 설산 |
| 5 | `05_desert_arch.png` | 사막 |
| 6 | `06_crystal_cave.png` | 수정 동굴 |
| 7 | `07_volcano.png` | 화산 |
| 8 | `08_beach_shipwreck.png` | 해변 |
| 9 | `09_ancient_ruins.png` | 고대 유적 |
| 10 | `10_graveyard.png` | 묘지 |
| 11 | `11_windmill_village.png` | 풍차 마을 |
| 12 | `12_enchanted_forest.png` | 마법 숲 |
| 13 | `13_overgrown_ruins.png` | 덩굴 유적 |
| 14 | `14_castle_hall.png` | 성 내부 |
| 15 | `15_village_night.png` | 밤 마을 |
| 16 | `16_seaside_port.png` | 항구 |
| 17 | `17_bone_desert.png` | 뼈 사막 |
| 18 | `18_swamp.png` | 늪지 |
| 19 | `19_ice_cave.png` | 얼음 동굴 |
| 20 | `20_floating_islands.png` | 하늘섬 |

설치 명령: `npm run install:backgrounds`

## 3. 수정한 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `scripts/install-rpg-backgrounds.mjs` | ZIP에서 20개 PNG 그대로 복사 |
| `src/tuduk/data/stageBackgrounds.ts` | **신규** — 배경 배열·지역 매핑 |
| `src/tuduk/render/StageBackgroundRenderer.ts` | **신규** — 무한 스크롤·페이드·캐시 |
| `src/tuduk/render/AdventureRenderer.ts` | 기존 패럴랙스 → 스테이지 배경 렌더러 연동 |
| `src/tuduk/assets/preloadAssets.ts` | 20개 배경 preload |
| `package.json` | `install:backgrounds` 스크립트 |
| `src/tuduk/systems/AdventureSystem.ts` | 18지역 보스 클리어 후 1지역 순환 |

## 4. 무한 스크롤 구현 방식

1. 각 PNG를 **화면 너비에 맞춰 비율 유지 스케일** (오프스크린 캔버스 1회 생성 후 캐시)
2. 지평선(`HORIZON_Y_RATIO = 0.38`)에 이미지 하단 정렬
3. `scrollX`만큼 좌측 이동 — 동일 타일을 가로로 이어 붙여 `drawImage` 반복
4. `offset = scrollX % tileWidth`로 끊김 없는 루프
5. `imageSmoothingEnabled = false` + `pixelated` 스타일로 픽셀아트 유지

## 5. 모바일 화면 대응 방식

- 캔버스 `resize` 시 오프스크린 캐시 무효화 후 재생성
- 배경 PNG는 **가로 전체 너비**에 맞춤 (비율 깨짐 없음)
- 상단 하늘·중간 지면은 지역 색상 그라데이션으로 채워 **검은 여백 방지**
- DPR 최대 2로 제한해 모바일 성능 유지
- 캐릭터·몬스터·UI는 배경 이후 레이어에 그림

## 6. 스테이지별 배경 매칭표

지역 ID → 배경 인덱스: `(regionId - 1) % 20`

| 지역 ID | 게임 지역명 | 배경 # | 배경명 |
|---------|------------|--------|--------|
| 1 | 가락동 스타디움 | 1 | 초원 성 |
| 2 | 왕십리 | 2 | 숲 |
| 3 | 건대 화양 | 3 | 가을 유적 |
| 4 | 성신여대 | 4 | 설산 |
| 5 | 회기 | 5 | 사막 |
| 6 | 잠실 | 6 | 수정 동굴 |
| 7 | 강동 | 7 | 화산 |
| 8 | 수유 | 8 | 해변 |
| 9 | 노원 | 9 | 고대 유적 |
| 10 | 모란 | 10 | 묘지 |
| 11 | 구리 | 11 | 풍차 마을 |
| 12 | 하남 | 12 | 마법 숲 |
| 13 | 의정부 | 13 | 덩굴 유적 |
| 14 | 별내 | 14 | 성 내부 |
| 15 | 평내호평 | 15 | 밤 마을 |
| 16 | 진접 | 16 | 항구 |
| 17 | 옥정 | 17 | 뼈 사막 |
| 18 | 경기광주 | 18 | 늪지 |
| 19* | (예비) | 19 | 얼음 동굴 |
| 20* | (예비) | 20 | 하늘섬 |

\*현재 게임 지역은 18개. 19·20번 배경은 지역 확장 시 자동 매핑. 18지역 보스 클리어 후 1지역으로 순환.

### 배경 전환

- 지역 이동(`travel` 페이즈) 시 **0.8초** 페이드 크로스
- 이전 배경 → 다음 배경으로 alpha 블렌드 (갑작스러운 점프 없음)
