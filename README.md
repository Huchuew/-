# 투닥투닥 RPG

모험단 성장 방치형 RPG (Vite + TypeScript + Capacitor)

## 빠른 시작

```bash
npm install
npm run setup:pipoya      # 캐릭터 스프라이트
npm run install:monsters  # 몬스터 이미지 (업로드 후)
npm run dev               # 개발 서버 (저장 후 자동 새로고침)
```

브라우저에서 **http://localhost:5200** — 코드 수정 시 **자동 반영** (HMR).  
세이브 초기화: `?reset=1` URL 파라미터

## 경제

- 시작 골드: **150,000** + 💎 5
- 던전에서 재료 수집 → 숙소 [상점] 판매로 골드 확보
- 10층+ **3인(10~11층) → 4인(12층+)** 권장 (미달 시 적 강화)
- 💎 젬: 몬스터 드랍 · 젬샵 (포션·스킬부스트·속도 등)

## 플레이 가이드

| 구간 | 핵심 |
|------|------|
| 1~9층 | 던전→마을→성장 루프 익히기 |
| 10층+ | 4인·에픽 시험·전직·장비 — 게임 2막 |
| 18층 | 모란 정복 → 엔드game (10층 최종보스 + 18층 배지) |

## Android + 라이브 리로드

```bash
npm run build
npx cap sync android
set CAP_SERVER_URL=http://192.168.0.10:5173
npx cap run android
```

## iOS (iPhone)

Mac + Xcode 필요. `npm run ios:sync` 후 Xcode에서 Run.

| 항목 | 값 |
|------|-----|
| Bundle ID | `com.tuduk.rpg` |
| 세로 고정 | Info.plist |

## 빌드

```bash
npm run release:apk   # Android APK
npm run netlify:prepare  # 웹 배포용 dist
```
