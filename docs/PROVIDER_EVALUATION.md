# Provider Evaluation

## Goal

MVP에서는 영상 모델 하나를 고정하기보다, provider adapter를 두고 빠르게 모델을 교체할 수 있어야 합니다.

초기 추천:

1. **fal.ai** — MVP 기본 provider
2. **Replicate** — 실험/백업
3. **Runway / Luma / OpenAI Sora / Google Veo** — 품질 또는 상용 안정화 단계에서 검토
4. **ComfyUI self-host** — 비용 최적화/완전 제어가 필요할 때 검토

## Evaluation Criteria

### Product Fit

- image-to-video 지원 여부
- 여러 이미지 또는 keyframe 기반 입력 지원 여부
- 9:16 세로 영상 지원 여부
- 5초/10초 생성 지원 여부
- 결과 품질과 원본 보존력

### Developer Fit

- async job API
- webhook 지원
- polling 지원
- output URL 제공 방식
- SDK/문서 품질
- 모델 교체 용이성

### Business Fit

- 초당/영상당 가격
- 상업적 사용 가능 여부
- rate limit/쿼터
- provider 안정성
- output 권리/정책

## Provider Matrix

### fal.ai

Recommended role: **primary MVP provider**

Strengths:

- 다양한 최신 영상 모델 접근 가능
- queue 기반 비동기 API
- webhook 지원
- 모델별 API 문서가 비교적 명확
- 가격 비교가 쉬움

Observed model examples:

- Kling image-to-video
  - input: `prompt`, `image_url`
  - duration: `5`, `10`
  - negative prompt 지원
- Veo image-to-video
  - input: `prompt`
  - aspect ratio: `auto`, `16:9`, `9:16`
  - duration: `4s`, `6s`, `8s`
  - resolution: `720p`, `1080p`
  - audio generation 옵션 있음

Pricing examples from fal pricing page:

- Wan 2.5: about `$0.05 / second`
- Kling 2.5 Turbo Pro: about `$0.07 / second`
- Veo 3: about `$0.4 / second`

Risks:

- model-specific schemas differ
- provider output URL durability should not be assumed
- commercial rights must be checked per model

MVP stance:

- Use fal as abstraction baseline.
- Start with an image-to-video model that supports 5s and 9:16.
- Store exact model id in `video_jobs.provider_model`.

### Replicate

Recommended role: **experimentation and fallback**

Strengths:

- huge model catalog
- prediction API is straightforward
- webhook support
- good for testing open/community models

Known pricing examples:

- Wan 2.1 i2v 480p: about `$0.09 / second`
- Wan 2.1 i2v 720p: about `$0.25 / second`

Risks:

- community model stability varies
- cold starts can affect UX
- commercial license is model-specific
- output files may need immediate persistence

MVP stance:

- Use for model discovery.
- Do not expose community model names directly to users.
- Only promote a model to production after stability and license review.

### Runway

Recommended role: **premium/quality candidate**

Strengths:

- strong creative video brand
- likely high visual quality
- useful for polished commercial outputs

Risks:

- pricing/access may be less MVP-friendly
- API restrictions and model-specific duration/ratio limits
- polling-oriented integration

MVP stance:

- Evaluate after fal prototype validates demand.
- Consider as premium generation option.

### Luma Ray

Recommended role: **cinematic/image animation candidate**

Strengths:

- official API
- image-to-video and text-to-video support
- good fit for cinematic motion

Risks:

- pricing/availability may require sales/contact depending on plan
- output constraints need live validation

MVP stance:

- Compare against fal models for quality once product flow exists.

### OpenAI Sora

Recommended role: **policy-sensitive B2C candidate**

Strengths:

- OpenAI ecosystem
- clear policy posture
- useful if app already uses OpenAI stack

Risks:

- access/price/model constraints
- stricter restrictions around real people, copyrighted content, music, famous characters

MVP stance:

- Not first integration unless existing OpenAI infra/access is already available.

### Google Veo via Vertex AI

Recommended role: **enterprise/B2B candidate**

Strengths:

- GCP enterprise fit
- procurement/security/compliance advantages
- high quality model family

Risks:

- setup overhead
- pricing and quota complexity
- slower MVP iteration

MVP stance:

- Good for B2B later, not first MVP.

### ComfyUI self-host

Recommended role: **later cost/control optimization**

Strengths:

- full workflow control
- custom models/nodes
- lower marginal cost at scale if GPU infra is managed well

Risks:

- heavy ops burden
- GPU autoscaling/queue/retry/storage must be built
- model licenses are your responsibility
- workflow JSON/custom nodes are operational risk

MVP stance:

- Avoid for first version.
- Revisit after demand and style requirements are clear.

## Provider Abstraction Requirements

The app should not couple UI directly to provider-specific fields.

Internal normalized fields:

```text
style
aspect_ratio
duration_seconds
input_images
prompt
negative_prompt
provider
provider_model
provider_job_id
status
output_url
```

Provider adapter maps normalized input to provider-specific schema.

## Model Selection Policy

MVP default model should optimize for:

1. stable API
2. 9:16 support
3. 5s output
4. reasonable cost
5. image-to-video quality
6. commercial use clarity

Premium model can optimize for:

1. higher quality
2. better prompt following
3. 1080p
4. audio support

## Output Persistence Policy

Never rely on provider output URL as the final user URL.

On completion:

1. receive provider output URL
2. download MP4 server-side
3. validate content type and size
4. upload to own storage
5. create generated_outputs row
6. expose own CDN URL to user

## Recommended First Experiment

### Experiment 1: Image sequence to 5s vertical video

Inputs:

- 3 product images
- 3 personal/travel images
- 3 food images

Styles:

- Product Ad
- Memory Montage
- Cinematic Zoom

Compare:

- Kling image-to-video
- Wan image-to-video
- optional Veo premium sample

Measure:

- generation time
- cost
- subject preservation
- motion naturalness
- artifact level
- download/share worthiness

Decision:

- Pick one default model for v0.1.
- Keep another as fallback/premium.
