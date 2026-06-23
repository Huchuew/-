# Cursor Ready Tiny RPG Assets

정리 기준:
- characters/ : 플레이어·아군 느낌 캐릭터
- monsters/ : 적/몬스터 느낌 캐릭터
- projectiles/ : 화살/마법 이펙트
- 모든 애니메이션 프레임은 100x100 투명 PNG로 분리됨
- 파일명은 Cursor가 이해하기 쉽게 `이름_동작_frame_001.png` 형식
- 각 폴더 안에서는 frame_001 → frame_002 순서대로 재생하면 됨

Cursor에게 줄 문장:
```text
이 ZIP의 assets 구조를 그대로 사용해줘.
characters는 플레이어/아군 캐릭터, monsters는 적 몬스터, projectiles는 투사체/마법 이펙트야.
각 애니메이션 폴더의 PNG는 이미 100x100 투명 프레임으로 분리되어 있으니 원본 시트를 다시 자르지 말고, 파일명 순서대로 애니메이션을 만들어줘.
walk는 이동, idle은 대기, attack 계열은 공격, hit은 피격, die는 사망 모션으로 연결해줘.
```
