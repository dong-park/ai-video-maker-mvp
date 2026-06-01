# AI Video Maker MVP

사진 여러 장 또는 짧은 비디오를 업로드하면, AI가 공유 가능한 짧은 영상을 만들어주는 웹 서비스 MVP 스펙입니다.

## 한 줄 정의

사용자가 **이미지 여러 장** 또는 **짧은 비디오**를 올리면, 서비스가 핵심 장면을 추출하고 AI 영상 모델을 호출해 **5~10초짜리 릴스/광고/몽타주 영상**을 생성합니다.

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

## 참고 링크

- fal.ai Queue: https://fal.ai/docs/model-endpoints/queue
- fal.ai Webhooks: https://fal.ai/docs/model-endpoints/webhooks
- fal.ai Pricing: https://fal.ai/pricing
- Replicate Predictions: https://replicate.com/docs/topics/predictions/create-a-prediction
- Replicate Webhooks: https://replicate.com/docs/topics/webhooks
- Luma API: https://docs.lumalabs.ai/docs/video-generation
- Runway API: https://docs.dev.runwayml.com/
