# Architecture Spec

## 1. High-Level Architecture

```text
Browser
  ↓
Next.js Web App
  ↓
API Server
  ├─ Upload service
  ├─ Frame extraction service
  ├─ Video job service
  ├─ Provider adapter
  └─ Webhook handler
  ↓
Database + Object Storage + Queue
  ↓
AI Video Provider
```

## 2. Core Components

### Web App

Responsibilities:

- File upload UI
- Asset review UI
- Frame selection UI
- Style/ratio/duration selection
- Job status polling
- Result video playback

### API Server

Responsibilities:

- Validate uploads
- Create media assets
- Extract video frames
- Create generation jobs
- Submit provider jobs
- Handle webhooks
- Copy provider output to own storage

### Storage

Recommended: Cloudflare R2 or S3.

Buckets/prefixes:

```text
uploads/images/{assetId}.{ext}
uploads/videos/{assetId}.{ext}
frames/{jobId}/{frameIndex}.jpg
outputs/{jobId}/video.mp4
outputs/{jobId}/thumbnail.jpg
```

### Database

Postgres or Supabase is enough for MVP.

Tables:

- users
- media_assets
- video_jobs
- generated_outputs
- provider_events

### Queue

MVP can start with DB status + cron/polling, but BullMQ + Redis is recommended once traffic grows.

Queue jobs:

- extract_video_frames
- submit_video_generation
- poll_provider_job
- persist_provider_output

## 3. Data Model

### media_assets

```sql
create table media_assets (
  id text primary key,
  user_id text,
  job_id text,
  type text not null,
  original_filename text,
  mime_type text,
  storage_url text not null,
  width integer,
  height integer,
  duration_seconds numeric,
  file_size_bytes bigint,
  sort_order integer default 0,
  selected boolean default true,
  metadata_json jsonb default '{}',
  created_at timestamptz default now()
);
```

`type` values:

```text
input_image
input_video
extracted_frame
output_video
output_thumbnail
```

### video_jobs

```sql
create table video_jobs (
  id text primary key,
  user_id text,
  input_type text not null,
  status text not null,
  style text not null,
  aspect_ratio text not null,
  duration_seconds integer not null,
  provider text,
  provider_model text,
  provider_job_id text,
  prompt text,
  negative_prompt text,
  progress integer default 0,
  error_code text,
  error_message text,
  cost_estimate_usd numeric,
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);
```

`status` values:

```text
created
extracting_frames
ready_to_generate
queued
generating
saving_output
succeeded
failed
canceled
```

### generated_outputs

```sql
create table generated_outputs (
  id text primary key,
  job_id text not null,
  video_url text not null,
  thumbnail_url text,
  provider_output_url text,
  width integer,
  height integer,
  duration_seconds numeric,
  file_size_bytes bigint,
  created_at timestamptz default now()
);
```

### provider_events

```sql
create table provider_events (
  id text primary key,
  provider text not null,
  provider_job_id text,
  event_type text,
  payload_json jsonb not null,
  received_at timestamptz default now(),
  processed_at timestamptz
);
```

## 4. API Endpoints

### Create upload URL

```http
POST /api/assets/upload-url
```

Request:

```json
{
  "filename": "product.jpg",
  "mimeType": "image/jpeg",
  "fileSizeBytes": 2340000
}
```

Response:

```json
{
  "assetId": "asset_123",
  "uploadUrl": "https://...",
  "storageUrl": "https://cdn.../uploads/images/asset_123.jpg"
}
```

### Create job from images

```http
POST /api/video-jobs
```

Request:

```json
{
  "inputType": "images",
  "assetIds": ["asset_1", "asset_2"],
  "style": "product_ad",
  "aspectRatio": "9:16",
  "durationSeconds": 5
}
```

Response:

```json
{
  "jobId": "job_123",
  "status": "queued"
}
```

### Extract frames from video

```http
POST /api/videos/extract-frames
```

Request:

```json
{
  "videoAssetId": "asset_video_1",
  "intervalSeconds": 2,
  "maxFrames": 12
}
```

Response:

```json
{
  "jobId": "job_123",
  "status": "extracting_frames"
}
```

### Select frames

```http
PATCH /api/video-jobs/{jobId}/frames
```

Request:

```json
{
  "selectedFrameAssetIds": ["frame_1", "frame_3", "frame_5"]
}
```

### Start generation

```http
POST /api/video-jobs/{jobId}/generate
```

Response:

```json
{
  "jobId": "job_123",
  "status": "queued"
}
```

### Get job

```http
GET /api/video-jobs/{jobId}
```

Response:

```json
{
  "id": "job_123",
  "status": "generating",
  "progress": 45,
  "assets": [],
  "output": null
}
```

### Provider webhook

```http
POST /api/webhooks/fal
```

Webhook handler must be idempotent.

## 5. Provider Adapter Interface

```ts
type VideoGenerationInput = {
  jobId: string;
  prompt: string;
  negativePrompt?: string;
  imageUrls: string[];
  aspectRatio: "9:16" | "1:1" | "16:9";
  durationSeconds: 5 | 10;
  style: string;
};

type SubmitResult = {
  provider: string;
  providerModel: string;
  providerJobId: string;
  status: "queued" | "generating";
};

type ProviderAdapter = {
  submit(input: VideoGenerationInput): Promise<SubmitResult>;
  getStatus(providerJobId: string): Promise<ProviderStatus>;
  normalizeWebhook(payload: unknown): ProviderEvent;
};
```

## 6. Frame Extraction

Use ffmpeg.

Basic command shape:

```bash
ffmpeg -i input.mp4 -vf fps=1/2,scale=1024:-1 frames/frame_%03d.jpg
```

MVP filters:

- remove very dark frames
- remove near-duplicate frames
- limit to max 12 extracted frames
- recommend max 6 selected frames

Later:

- scene detection
- blur detection
- object/face detection
- CLIP diversity ranking

## 7. Error Handling

### User-facing errors

- 업로드 파일이 너무 큽니다.
- 지원하지 않는 파일 형식입니다.
- 비디오 길이가 60초를 초과합니다.
- 프레임을 추출하지 못했습니다.
- AI 영상 생성에 실패했습니다. 다시 시도해주세요.
- 정책상 생성할 수 없는 요청입니다.

### Internal errors

- provider_timeout
- provider_policy_rejected
- provider_failed
- storage_copy_failed
- frame_extraction_failed
- invalid_input

## 8. Security

- upload mime type 검증
- file size 제한
- signed upload URL 사용
- webhook signature 검증 가능하면 적용
- public result URL은 guess 불가능한 path 사용
- raw provider payload는 provider_events에 저장하되 secret은 저장하지 않음

## 9. Observability

Log fields:

```text
job_id
user_id
provider
provider_model
provider_job_id
status
input_type
style
aspect_ratio
duration_seconds
elapsed_ms
error_code
```

Metrics:

- job_created_count
- job_succeeded_count
- job_failed_count
- avg_generation_seconds
- avg_cost_usd
- storage_copy_failures
- provider_timeout_count
