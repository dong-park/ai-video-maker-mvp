# Implementation Plan

## Goal

Build the MVP in small phases, validating the product loop before adding advanced video intelligence.

## Phase 0: Product Skeleton

### 0.1 Create app shell

Change:

- Create Next.js app
- Add upload/review/style/generating/result routes
- Add basic styling

Done:

- App runs locally
- Routes render placeholder screens

Check:

```bash
npm run dev
```

### 0.2 Add database schema

Change:

- Add tables for media_assets, video_jobs, generated_outputs, provider_events
- Add status enum constants in application code

Done:

- Migration applies cleanly
- App can create a video job row

### 0.3 Add object storage integration

Change:

- Configure R2/S3 client
- Add signed upload URL endpoint
- Add server-side upload helper

Done:

- Image can be uploaded and retrieved via storage URL

## Phase 1: Image-to-Video MVP

### 1.1 Image upload

Change:

- Add image upload UI
- Limit to JPG/PNG/WEBP
- Limit to max 6 images
- Create media_assets rows

Done:

- User can upload 1~6 images
- Uploaded images appear as thumbnails

### 1.2 Image review

Change:

- Add thumbnail grid
- Add delete
- Add reorder

Done:

- User can control source image order

### 1.3 Style selection

Change:

- Add style cards
- Add ratio selector
- Add duration selector

Done:

- User can select one style, ratio, and duration
- Default is Product/Natural? Decide after testing; default ratio 9:16, duration 5s

### 1.4 Prompt builder

Change:

- Map style to prompt template
- Add negative prompt template
- Include preservation instructions

Done:

- Prompt generated server-side from style and input metadata

### 1.5 fal.ai provider adapter

Change:

- Add provider adapter interface
- Implement fal submit
- Store provider_job_id
- Normalize provider status

Done:

- Backend can submit one image-to-video job
- provider_job_id saved

### 1.6 Job status page

Change:

- Add job polling endpoint
- Add generating screen
- Add pseudo-progress

Done:

- User sees queued/generating/succeeded/failed states

### 1.7 Output persistence

Change:

- On provider completion, download output MP4
- Upload to own storage
- Create generated_outputs row

Done:

- Result page uses own storage URL, not provider URL

### 1.8 Result page

Change:

- Add video player
- Add download button
- Add regenerate button

Done:

- User can watch and download MP4

## Phase 2: Video Input

### 2.1 Video upload

Change:

- Accept MP4/MOV
- Validate duration <= 60s
- Validate size <= 100MB

Done:

- User can upload one valid video
- Invalid video gets clear error

### 2.2 Frame extraction worker

Change:

- Add ffmpeg extraction worker
- Extract 1 frame every 2 seconds
- Store frame images
- Create media_assets rows with type extracted_frame

Done:

- A 10~60s video produces frame thumbnails

### 2.3 Basic frame filtering

Change:

- Remove dark frames
- Remove near-duplicate frames
- Limit recommended frames to 6

Done:

- Frame review screen does not show many near-identical frames

### 2.4 Frame review UI

Change:

- Show extracted frames
- Add selected/unselected state
- Require at least 1 selected frame

Done:

- User can choose frames for generation

### 2.5 Generate from selected frames

Change:

- Use selected extracted_frame assets as input images
- Reuse Phase 1 generation path

Done:

- Video input can produce generated MP4

## Phase 3: Reliability and Quality

### 3.1 Webhook idempotency

Change:

- Save provider events
- Ignore duplicate completion events
- Guard status transitions

Done:

- Duplicate webhook does not create duplicate outputs

### 3.2 Retry policy

Change:

- Retry transient provider failures
- Do not retry policy rejection
- Add user-triggered regenerate

Done:

- Transient failure can recover
- User sees clear failure message

### 3.3 Cost tracking

Change:

- Estimate generation cost based on provider/model/duration
- Store cost_estimate_usd

Done:

- Admin can inspect cost per job

### 3.4 Quality presets

Change:

- Add internal prompt modifiers:
  - preserve subject
  - weak motion
  - product preservation
  - no text artifacts

Done:

- Regeneration can reduce motion/distortion without exposing raw prompt

## Phase 4: Private Beta

### 4.1 Usage limits

Change:

- Add anonymous/session-based limit or simple auth
- Limit free generation count

Done:

- Abuse risk is controlled

### 4.2 Admin inspection

Change:

- Add simple admin list of jobs
- Show status, provider, model, cost, error

Done:

- Operator can debug failed generations

### 4.3 Feedback capture

Change:

- Add thumbs up/down on result
- Optional reason: distorted, boring, wrong subject, too slow

Done:

- Quality issues become measurable

## Technical Risks

### Provider model does not support multi-image well

Mitigation:

- Start with first/hero image for actual provider call
- Use extra images as prompt context if model supports it
- Later evaluate keyframe-capable models

### Output distorts faces/products

Mitigation:

- Default to weak/natural motion
- Add strong negative prompts
- Add regenerate with weaker motion
- Prefer product/person preservation model after evaluation

### Video generation is too expensive

Mitigation:

- Default 5s
- Use cheaper model as base
- Premium model behind credit multiplier
- Store and expose cost per job during beta

### Generation takes too long

Mitigation:

- Async UX
- Result page link
- Completion notification later
- Smaller duration/resolution defaults

## Build Order Recommendation

1. Image upload + review
2. Style selection
3. fal provider adapter
4. job status + result persistence
5. result page
6. video upload
7. frame extraction
8. frame review
9. selected frames generation
10. reliability/cost/admin
