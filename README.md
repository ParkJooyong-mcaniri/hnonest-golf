# 어니스트 게임 스코어카드 (Vercel)

## 배포 (5분)
1. 이 폴더를 GitHub 저장소로 push → Vercel에서 Import (Framework: Other, 빌드 설정 없음)
2. Vercel 프로젝트 → Storage → Marketplace → **Upstash Redis** 생성 후 프로젝트에 Connect
   (KV_REST_API_URL / KV_REST_API_TOKEN 환경변수가 자동 등록됨)
3. Settings → Environment Variables 에 `ADMIN_PIN` 추가 (히든홀 초기화용)
4. Redeploy → 주소를 단톡방에 공유

* 상단에 "⚠️테스트DB"가 보이면 Redis 연결이 안 된 상태 (8명 공유 안 됨)
* 다음 라운드는 `GAME_ID` 환경변수만 바꾸면 새 판으로 시작

## 로컬 테스트
npm i && ADMIN_PIN=1234 npm run dev   # http://localhost:3000

## 설정 변경
lib/config.js — 홀/Par, 선수·조·선언타수, 히든홀 후보, 추첨 조건(DRAW_REQUIRES_COMPLETE)

## 데이터 구조 (골프장 → 라운드 → 스코어)
- lib/config.js: COURSES(골프장, 재사용) / ROUND(이번 라운드: 선수·룰)
- Redis 키
  - golf:courses                       골프장 정보
  - golf:rockgarden:rounds             라운드 목록(선수, 홀 순서, 룰, 생성일)
  - golf:rockgarden:{roundId}:scores   스코어
  - golf:rockgarden:{roundId}:hidden   히든홀
- 다음 라운드: Vercel 환경변수 ROUND_ID 를 새 값(예: 2026-11-rockgarden)으로 → Redeploy. 이전 기록은 그대로 보존
- 라운드 목록 조회: /api/rounds
