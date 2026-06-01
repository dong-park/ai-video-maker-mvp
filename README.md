# AI Video Maker MVP

사진 여러 장 또는 짧은 비디오를 업로드하면, AI가 공유 가능한 짧은 영상을 만들어주는 웹 서비스 MVP 스펙입니다.

## 한 줄 정의

사용자가 **이미지 여러 장** 또는 **짧은 비디오**를 올리면, 서비스가 핵심 장면을 추출하고 AI 영상 모델을 호출해 **5~10초짜리 릴스/광고/몽타주 영상**을 생성합니다.

---

## 실행 방법 (MVP 구현)

Next.js(App Router) + TypeScript 로 구현된 MVP 입니다. **API 키 없이도** 전체 플로우가 동작합니다 — provider 는 MockProvider(고정 샘플 MP4 반환), 스토리지는 로컬 파일 폴백, DB 는 in-memory 폴백으로 자동 분기됩니다.

### 요구 사항

- Node.js 20+ (개발/검증은 Node 22 기준)
- `ffmpeg` / `ffprobe` (비디오 프레임 추출 및 썸네일 생성에 사용. macOS: `brew install ffmpeg`)

### 빠른 시작

```bash
npm install
npm run dev          # http://localhost:3000
```

브라우저에서 `http://localhost:3000` 접속 → 이미지 1~6장 업로드 → 스타일/비율/길이 선택 → 생성 → 결과 MP4 재생/다운로드.

내 파일이 없다면 업로드 화면의 **"샘플로 해보기"** 카드에서 번들 데모 영상(`public/samples/sample-bbb-30s.mp4`)으로 바로 시작할 수 있습니다 — 10초 구간의 시작점(0~20초)을 고르면 해당 구간에서만 프레임을 추출해 동일한 리뷰→스타일→생성 플로우로 이어집니다.

키가 없으면 MockProvider 가 번들된 샘플 영상(`public/mock/sample.mp4`)을 결과로 돌려주고, 그 파일을 자체 스토리지(`.storage/`)로 복사해 `/api/files/...` URL 로 서빙합니다. 즉 **provider URL 에 의존하지 않습니다.**

### 검증 게이트

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # vitest (단위 + end-to-end, ffmpeg 사용)
npm run build        # next build
```

### 화면 흐름 (IA)

```
/                       업로드 (이미지 / 비디오 탭)
/jobs/:jobId/review     이미지 순서·삭제 / 비디오 프레임 선택
/jobs/:jobId/style      스타일 5종 + 비율 3종 + 길이 2종
/jobs/:jobId/generating 진행 상태 폴링 (pseudo progress)
/jobs/:jobId/result     결과 재생 / 다운로드 / 재생성
```

### 주요 API

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/assets/upload-url` | 업로드 타겟 + asset 생성 |
| PUT | `/api/assets/{assetId}/blob` | (로컬) 파일 업로드 |
| POST | `/api/video-jobs` | 이미지 자산으로 job 생성 |
| PATCH | `/api/video-jobs/{jobId}/assets` | 이미지 순서/삭제 |
| PATCH | `/api/video-jobs/{jobId}/frames` | 프레임 선택 |
| POST | `/api/video-jobs/{jobId}/generate` | 생성 시작 |
| GET | `/api/video-jobs/{jobId}` | 상태 조회(폴링) |
| POST | `/api/video-jobs/{jobId}/regenerate` | 재생성 |
| POST | `/api/videos/extract-frames` | 비디오 프레임 추출 (옵션 `startSeconds`/`windowSeconds` 로 구간 추출) |
| POST | `/api/videos/sample-demo` | 번들 샘플로 데모 시작 (`startSeconds` 기준 10초 구간) |
| POST | `/api/webhooks/fal` | provider webhook |
| GET | `/api/files/{...key}` | (로컬) 스토리지 서빙 |

### 실제 연동 (.env 채우기)

`.env.example` 을 `.env.local` 로 복사한 뒤 값을 채우면 자동으로 실제 연동으로 분기됩니다.

```bash
cp .env.example .env.local
```

- **fal.ai**: `FAL_KEY` 를 채우면 MockProvider 대신 실제 fal queue API 를 호출합니다. 기본 모델은 9:16 + 5초를 지원하는 Kling image-to-video 이며 `FAL_MODEL` 로 교체할 수 있습니다.
- **R2 / S3**: `S3_BUCKET` + `S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY` 가 모두 있으면 로컬 파일 대신 실제 객체 스토리지를 사용합니다. R2 는 `S3_ENDPOINT` / `S3_PUBLIC_BASE_URL` 을 함께 설정하세요. 업로드는 presigned PUT URL 로 클라이언트가 직접 올립니다.
- **DB**: 운영 환경에서는 `db/migrations/0001_init.sql`(Postgres/Supabase) 을 적용하세요. 로컬/테스트는 in-memory 폴백으로 동작합니다.

> 구현 범위: PRD 의 In/Out Scope 를 따릅니다. Phase 0~1(이미지→영상) + Phase 2(비디오→프레임→영상)까지 구현되어 있고, 편집기·인증·관리자·결제는 범위 밖입니다.

---

## 문제 정의

일반 사용자는 영상 편집을 어렵게 느낍니다.

- 좋은 사진이나 짧은 영상은 있지만 릴스/광고 영상으로 만들기 어렵다.
- 컷 편집, 자막, 음악, 전환 효과를 직접 다루기 부담스럽다.
- AI 영상 도구는 많지만 프롬프트 작성과 모델 선택이 어렵다.

이 MVP는 복잡한 편집기를 만드는 대신, 사용자가 소스만 올리면 바로 결과 영상을 받을 수 있게 합니다.

## MVP 목표

- 프롬프트를 몰라도 영상 생성 가능
- 이미지 여러 장 또는 비디오 한 개로 시작 가능
- 3분 안에 첫 결과물을 받을 수 있는 흐름
- 결과물은 바로 다운로드 가능한 MP4
- 초기에는 짧은 숏폼/광고/감성 영상에 집중

## 핵심 입력 방식

### 1. 이미지 여러 장 업로드

사용자가 1~6장의 이미지를 업로드합니다.

예시:

- 상품 사진 여러 장
- 인물 사진 여러 장
- 여행 사진 여러 장
- 음식 사진 여러 장
- 전/후 비교 이미지

서비스는 이미지 순서와 선택한 스타일을 바탕으로 짧은 영상을 생성합니다.

### 2. 비디오 업로드

사용자가 짧은 비디오를 업로드합니다.

MVP 기준:

- 포맷: MP4, MOV
- 최대 길이: 60초
- 최대 용량: 100MB

서비스는 비디오에서 일정 간격으로 프레임을 캡처하고, 사용자가 대표 프레임을 선택한 뒤 AI 영상 생성을 진행합니다.

## 사용자 플로우

### Flow A: 이미지 → 영상

1. 이미지 업로드
2. 업로드 이미지 미리보기
3. 이미지 순서 변경 / 삭제
4. 스타일 선택
5. 비율과 길이 선택
6. 영상 생성 요청
7. 생성 상태 확인
8. 결과 영상 미리보기
9. 다운로드 또는 다시 만들기

### Flow B: 비디오 → 프레임 → 영상

1. 비디오 업로드
2. 서버에서 프레임 추출
3. 추출 프레임 미리보기
4. 사용자가 프레임 선택/해제
5. 스타일 선택
6. 비율과 길이 선택
7. 영상 생성 요청
8. 생성 상태 확인
9. 결과 영상 미리보기
10. 다운로드 또는 다시 만들기

## MVP 기능 범위

### 포함

- 이미지 다중 업로드
- 비디오 업로드
- ffmpeg 기반 프레임 추출
- 추출 프레임 미리보기
- 프레임 선택/해제
- 이미지 순서 변경
- 스타일 프리셋 선택
- 영상 비율 선택
- 영상 길이 선택
- AI 영상 생성 job 생성
- 생성 상태 polling 또는 webhook 처리
- 결과 MP4 저장
- 결과 영상 미리보기
- 다운로드
- 실패 시 에러 표시 및 재시도

### 제외

- 복잡한 타임라인 편집
- 음악 자동 생성
- 자막 자동 생성
- 립싱크
- 얼굴 합성
- 유명인/캐릭터 스타일 생성
- 긴 영상 생성
- 다중 모델 비교 UI
- 장면별 프롬프트 직접 수정
- 팀 협업 기능

## 생성 옵션

### 스타일 프리셋

MVP에서는 사용자가 직접 프롬프트를 쓰지 않도록 합니다.

1. **Natural Motion**
   - 사진이 자연스럽게 살아나는 느낌
   - 은은한 카메라 무빙

2. **Cinematic Zoom**
   - 천천히 줌인
   - 영화적인 조명과 깊이감

3. **Instagram Reel**
   - 세로형 숏폼에 어울리는 빠르고 감각적인 무드

4. **Product Ad**
   - 상품 광고처럼 깔끔하고 선명한 영상

5. **Memory Montage**
   - 여러 장면을 감성적으로 연결하는 몽타주

### 화면 비율

- 9:16 세로 — 기본값
- 1:1 정사각
- 16:9 가로

### 영상 길이

- 5초 — 기본값
- 10초

초기에는 비용과 실패율을 줄이기 위해 5초를 기본으로 둡니다.

## 비디오 프레임 추출 정책

MVP 기본 로직:

1. 업로드된 비디오에서 2초마다 1프레임 추출
2. 최대 12프레임까지 추출
3. 너무 어두운 프레임 제거
4. 이전 프레임과 지나치게 비슷한 프레임 제거
5. 대표 프레임 최대 6장 표시
6. 사용자가 최종 사용할 프레임 선택

추후 개선:

- blur 감지
- 장면 전환 감지
- 얼굴/상품 감지
- CLIP 기반 다양성 선택
- 자동 베스트 프레임 추천

## 추천 기술 구조

### Frontend

- Next.js
- 업로드 UI
- 프레임 선택 UI
- 스타일 선택 UI
- job status polling
- video preview

### Backend

- Next.js API Route 또는 Express
- ffmpeg로 프레임 추출
- AI provider API 호출
- webhook endpoint
- 결과 저장 처리

### Storage

- Cloudflare R2 또는 AWS S3

저장 대상:

- 원본 이미지
- 원본 비디오
- 추출 프레임
- 생성된 MP4
- 결과 썸네일

### Queue

MVP 초기:

- DB status + polling

조금 안정화 후:

- BullMQ + Redis

영상 생성은 느리므로 동기 요청으로 처리하지 않습니다.

## AI Provider 전략

### 1순위: fal.ai

MVP에 가장 적합합니다.

- image-to-video 모델을 빠르게 테스트 가능
- Kling, Wan, Veo 등 다양한 모델 접근 가능
- queue/webhook 구조 제공
- 모델 교체가 쉬움

### 2순위: Replicate

- 프로토타입과 모델 실험에 적합
- 커뮤니티 모델이 많음
- 단, 상업적 사용 가능 여부와 안정성은 모델별 확인 필요

### 나중 후보

- Runway
- Luma Ray
- OpenAI Sora
- Google Veo
- ComfyUI self-host

## 데이터 모델 초안

### video_jobs

```text
id
user_id
status
input_type: images | video
style
aspect_ratio
duration_seconds
provider
provider_model
provider_job_id
prompt
error_message
created_at
started_at
completed_at
```

### media_assets

```text
id
job_id
type: image | video | extracted_frame | output_video
source_url
storage_url
width
height
duration_seconds
sort_order
selected
created_at
```

### generated_outputs

```text
id
job_id
video_url
thumbnail_url
provider_output_url
duration_seconds
width
height
file_size
created_at
```

## Job 상태

```text
created
uploading
extracting_frames
ready_to_generate
queued
generating
saving_output
succeeded
failed
canceled
```

## API 초안

### 이미지 업로드 기반 job 생성

```http
POST /api/video-jobs
```

```json
{
  "inputType": "images",
  "assetIds": ["asset_1", "asset_2", "asset_3"],
  "style": "cinematic_zoom",
  "aspectRatio": "9:16",
  "durationSeconds": 5
}
```

### 비디오 프레임 추출 요청

```http
POST /api/videos/extract-frames
```

```json
{
  "videoAssetId": "asset_video_1",
  "intervalSeconds": 2,
  "maxFrames": 12
}
```

### job 상태 조회

```http
GET /api/video-jobs/{jobId}
```

```json
{
  "id": "job_123",
  "status": "generating",
  "progress": 45
}
```

### provider webhook

```http
POST /api/webhooks/fal
```

완료 시 provider output을 다운로드해서 자체 storage에 저장합니다.

## 프롬프트 템플릿 초안

### Natural Motion

```text
Create a short natural motion video from the provided reference images.
Keep the subject identity and composition consistent.
Add subtle camera movement, realistic lighting, and smooth motion.
Avoid distortion, face changes, extra limbs, text artifacts, or warping.
```

### Cinematic Zoom

```text
Create a cinematic short video from these references.
Use slow zoom-in, soft depth of field, realistic lighting, and smooth camera movement.
Preserve the subject, face, product shape, and original scene details.
```

### Product Ad

```text
Create a polished product advertisement video from these images.
Use premium lighting, clean composition, smooth camera movement, and commercial presentation.
Preserve product shape, text, color, and material details.
```

### Memory Montage

```text
Create a warm emotional montage from these images.
Use gentle transitions, soft cinematic motion, natural depth, and nostalgic atmosphere.
Preserve the original people, places, and mood.
```

## 성공 기준

### 기능 기준

- 이미지 1~6장으로 영상 생성 가능
- 비디오 60초 이하에서 프레임 추출 가능
- 사용자가 프레임을 선택/해제 가능
- 생성 상태를 확인 가능
- 결과 MP4를 다운로드 가능
- 실패 시 명확한 에러 표시 가능

### 품질 기준

- 5초 영상 생성 성공률 80% 이상
- 평균 생성 시간 2분 이내 목표
- 결과 다운로드 성공률 95% 이상
- provider output을 자체 storage에 저장

### 제품 기준

- 사용자가 3분 안에 첫 결과물을 받을 수 있음
- 프롬프트를 몰라도 생성 가능
- 결과물이 카톡/인스타/웹에서 공유 가능한 MP4
- 실패해도 다시 시도할 수 있음

## 릴리즈 단계

### v0.1 — 이미지 기반 생성

목표:

- 이미지 여러 장으로 5초 AI 영상 생성

포함:

- 이미지 업로드
- 이미지 순서 변경
- 스타일 선택
- fal.ai image-to-video 호출
- 결과 저장
- 다운로드

### v0.2 — 비디오 입력 추가

목표:

- 비디오에서 프레임을 추출해 AI 영상 생성

포함:

- 비디오 업로드
- ffmpeg 프레임 추출
- 프레임 선택/해제
- 선택 프레임 기반 영상 생성

### v0.3 — 품질 개선

목표:

- 실패율과 이상한 결과 줄이기

포함:

- blur/black frame 제거
- 중복 프레임 제거
- 스타일별 prompt 개선
- 실패 시 자동 재시도
- output thumbnail 생성

## MVP에서 가장 중요한 원칙

### 편집기가 아니라 생성 도구

사용자에게 타임라인 편집을 시키지 않습니다.

핵심 가치는:

> 내가 가진 사진/영상만 올리면 AI가 알아서 보기 좋은 짧은 영상을 만들어준다.

### 옵션은 적게

초기 옵션은 아래만 유지합니다.

- 입력: 이미지 또는 비디오
- 스타일: 5개
- 비율: 3개
- 길이: 2개

### 결과 저장은 반드시 자체 storage로

AI provider의 output URL은 임시일 수 있으므로 완료 즉시 다운로드해 자체 storage에 저장합니다.

## 상세 문서

- [PRD](docs/PRD.md) — 사용자, 문제, 범위, 성공 기준
- [Architecture Spec](docs/ARCHITECTURE.md) — 데이터 모델, API, storage, queue, provider adapter
- [Provider Evaluation](docs/PROVIDER_EVALUATION.md) — fal.ai, Replicate, Runway, Luma, Sora, Veo, ComfyUI 비교
- [UX Flows](docs/UX_FLOWS.md) — 화면 흐름, 카피, edge case, regeneration UX
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) — 단계별 구현 순서와 리스크

## 참고 링크

- fal.ai Queue: https://fal.ai/docs/model-endpoints/queue
- fal.ai Webhooks: https://fal.ai/docs/model-endpoints/webhooks
- fal.ai Pricing: https://fal.ai/pricing
- Replicate Predictions: https://replicate.com/docs/topics/predictions/create-a-prediction
- Replicate Webhooks: https://replicate.com/docs/topics/webhooks
- Luma API: https://docs.lumalabs.ai/docs/video-generation
- Runway API: https://docs.dev.runwayml.com/
