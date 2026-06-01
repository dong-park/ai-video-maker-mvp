# BRIEF — 오토파일럿 워커 지시문

당신은 **대화 맥락이 0인 새 에이전트**다. 이 문서가 작업의 전부이자 최종이다.
**사용자에게 묻지 마라** — 스펙은 이 BRIEF로 확정이다.

## 아젠다
AI Video Maker MVP autonomous build.

AI Video Maker MVP를 자율 구현하라. 이 클론에 docs/PRD.md, docs/ARCHITECTURE.md, docs/IMPLEMENTATION_PLAN.md, docs/PROVIDER_EVALUATION.md, docs/UX_FLOWS.md 가 있다. 먼저 다섯 문서를 전부 읽고 그 스펙을 단일 진실원(single source of truth)으로 삼아라.

[완료 기준 / Definition of Done]
- Phase 0 + Phase 1 을 완성한다 = 이미지 1~6장 업로드 -> 스타일/비율/길이 선택 -> 비동기 video job 생성 -> fal.ai 어댑터 호출 -> job 상태(queued/generating/succeeded/failed) -> 결과 MP4를 자체 스토리지 URL로 재생/다운로드, 까지 end-to-end로 동작.
- 게이트가 그린이고 시간이 남으면 Phase 2(비디오 업로드 + ffmpeg 프레임 추출 + 프레임 선택)까지 확장한다. Phase 3/4(웹훅 idempotency 심화, 인증, 관리자, 결제)는 하지 말 것.

[이미 정한 기술 결정 — 재논의 금지]
- 스택: Next.js(App Router) + TypeScript. App/route 구조는 UX_FLOWS.md 의 IA(/, /jobs/:jobId/review|style|generating|result)를 따른다.
- DB: ARCHITECTURE.md 의 5개 테이블 스키마(media_assets, video_jobs, generated_outputs, provider_events, users)를 그대로 사용. Postgres/Supabase 가정. 단, 실제 키 없이도 테스트가 돌도록 마이그레이션 파일 + 로컬 SQLite 또는 in-memory 폴백 중 하나를 제공해 게이트가 통과하게 하라.
- Provider/스토리지: fal.ai 어댑터와 R2/S3 클라이언트를 "실제 코드"로 작성하되 키는 .env.example 자리만 만들고 비워둔다. 테스트와 로컬 dev 는 MockProvider(고정 샘플 MP4 URL 반환)와 로컬 파일 스토리지 폴백으로 동작하게 해서, 실제 키가 없어도 전체 플로우와 모든 게이트가 통과해야 한다. 환경변수 유무로 real/mock 을 자동 분기.
- ProviderAdapter 인터페이스는 ARCHITECTURE.md 5절 그대로(submit/getStatus/normalizeWebhook). provider_model 에 모델 id 저장. 출력은 provider URL 의존 금지 — 완료 시 자체 스토리지로 복사(generated_outputs row 생성). MVP 기본 모델은 9:16 + 5초를 실제 지원하는 Kling류로 가정.
- 프롬프트는 숨긴다: 스타일 프리셋 5개(Natural Motion, Cinematic Zoom, Instagram Reel, Product Ad, Memory Montage)를 서버측 프롬프트 템플릿으로 매핑. 멀티 이미지는 hero(첫) 이미지 기준 호출 + 나머지는 프롬프트 컨텍스트(IMPLEMENTATION_PLAN.md Technical Risks 준수). 기본값 9:16 / 5초.

[작업 방식]
- 가능하면 /outsource 명령으로 독립적인 기능 슬라이스(예: 스토리지 클라이언트, provider 어댑터, 업로드/리뷰 UI, job 상태/결과 페이지)를 병렬 위임해 속도를 높여라. 단, 격리 클론 환경(원격 제거 + push deny 훅) 때문에 /outsource 스폰이 막히면 즉시 직접 순차 구현으로 폴백하되 반드시 MVP를 완성하라. 병렬화는 수단일 뿐 목적이 아니다.
- 빌드 순서: IMPLEMENTATION_PLAN.md 의 Build Order Recommendation(1 이미지 업로드+리뷰 -> 2 스타일 -> 3 fal 어댑터 -> 4 job 상태+영속화 -> 5 결과 페이지 ...)을 따른다. 공유 기반(타입, DB 스키마, 스토리지/어댑터 인터페이스)을 먼저 깔고 그 다음에 병렬화하라.
- 각 의미 단위 후 tsc + lint + test 그린(최대 3회 재시도). 그 다음 1-pass 셀프 리뷰.
- Conventional Commits(한국어)로 의미 단위 커밋. 절대 push 하지 말 것(원격 없음).
- 끝나면 set-state done + set-status outcome=success|failed + notify 로 보고. README 에 로컬 실행 방법과 .env 채우는 법(실제 fal.ai/R2 연동 시)을 적어라.

[제약]
- 편집기 기능(타임라인/컷 편집/키프레임) 금지. 인증/관리자/결제(Phase 4) 금지. PRD 의 In/Out Scope 를 엄수.
- 스펙에 없는 기능/추상화/설정 옵션을 임의로 추가하지 말 것. 최소 코드로 스펙을 충족하라.

## 작업 환경
- 격리된 클론: `/Users/donghwan/worktree/agenda-ai-video-maker-mvp-autonomous-build-ai-video-maker`
- 작업 브랜치: `agenda/ai-video-maker-mvp-autonomous-build-ai-video-maker` (이미 체크아웃됨 — 이 브랜치에서만 작업·커밋한다)
- 원본 repo: `/Users/donghwan/ai-video-maker-mvp`
- 원격(origin)은 이미 제거되어 있다. 어디에도 **push 금지**.

## 절차
1. **plan** — 아젠다를 검증 가능한 작업 단위로 분해한다.
2. **구현** — 독립 단위는 가능시 병렬로, 계획대로만. 스펙 밖 기능은 만들지 마라.
3. **검증 게이트** — `tsc`·`lint`·`test`가 모두 그린이 될 때까지 고친다.
   - **tsc/lint/test 그린 전 done 금지.** 셋 다 통과가 done의 전제 조건이다.
   - 실패하면 고치고 재실행하되 **최대 3회 재시도**까지. 3회 안에 그린을 못 내면
     멈추고 아래 보고 프로토콜로 실패를 보고한다(상태는 `idle`).
4. **셀프 리뷰** — 합리적인 1-pass 셀프 리뷰(정확성·누락·회귀).
5. **커밋** — `agenda/ai-video-maker-mvp-autonomous-build-ai-video-maker`에 커밋한다(Conventional Commits, 한국어). 다시 말하지만 push 금지.

## 보고 프로토콜 (완료·중단 시 반드시)
서버 status enum을 우회 인코딩한다 — **상태(state)와 결과(outcome)를 분리**해서 보고한다.
- 상태: 정상 종료면 `pharos set-state done`, 미완·중단이면 `pharos set-state idle`.
- 결과: 성공이면 `pharos set-status outcome=success`, 실패면 `pharos set-status outcome=failed`.
  결과는 반드시 **set-status outcome**으로 싣는다 — 결과를 set-state로 표현하지 마라.
- `pharos notify`로 한 줄 요약을 남긴다:
  브랜치(`agenda/ai-video-maker-mvp-autonomous-build-ai-video-maker`), diff 요약(+N/-M·파일수), test 상태(통과/실패 수), 리뷰 요지.

## 마무리
- **push 금지**, **사용자에게 묻지 마라.**
- 완료 센티넬을 출력한다: `[agenda done] <commit-hash>`.
