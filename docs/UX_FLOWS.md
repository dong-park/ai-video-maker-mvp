# UX Flows and Screens

## Product Principle

이 제품은 영상 편집기가 아니라 **영상 생성 도구**입니다.

사용자가 해야 하는 일은 세 가지뿐이어야 합니다.

1. 소스 올리기
2. 스타일 고르기
3. 결과 받기

## IA

```text
/
  Upload
/jobs/:jobId/review
  Asset Review / Frame Selection
/jobs/:jobId/style
  Style + Ratio + Duration
/jobs/:jobId/generating
  Progress
/jobs/:jobId/result
  Video Result
```

## Screen 1: Upload

### Goal

사용자가 이미지 또는 비디오를 바로 올리게 합니다.

### Copy

Headline:

> 사진 여러 장이나 짧은 영상을 올리면 AI가 릴스용 영상을 만들어줘요.

Subcopy:

> 편집 없이, 스타일만 고르면 5초 MP4로 완성됩니다.

Primary actions:

- 이미지 올리기
- 비디오 올리기

### Rules

- 이미지와 비디오를 한 job에 동시에 섞지 않습니다.
- 이미지 업로드는 1~6장으로 제한합니다.
- 비디오 업로드는 60초/100MB 이하로 제한합니다.

## Screen 2A: Image Review

### Goal

사용자가 업로드한 이미지 순서와 포함 여부를 확인합니다.

### Components

- 이미지 썸네일 grid
- 순서 변경 drag handle
- 삭제 버튼
- 이미지 추가 버튼
- 다음 버튼

### Empty/Error

- 지원하지 않는 파일 형식입니다.
- 이미지는 최대 6장까지 올릴 수 있습니다.
- 이미지가 너무 작습니다.

### UX Detail

이미지 순서가 영상 흐름에 영향을 준다는 문구를 보여줍니다.

> 첫 번째 이미지가 영상의 시작 장면이 됩니다.

## Screen 2B: Video Frame Review

### Goal

비디오에서 추출된 프레임 중 generation에 사용할 장면을 고르게 합니다.

### Components

- 원본 비디오 preview
- 추출 프레임 strip/grid
- 선택된 프레임 count
- 프레임 다시 추출 버튼
- 다음 버튼

### Copy

> AI 영상에 사용할 장면을 골라주세요. 보통 3~6장이 가장 자연스럽습니다.

### Rules

- 최소 1장 선택 필요
- 권장 3~6장
- 너무 많은 프레임을 선택하면 결과가 불안정할 수 있음을 안내

## Screen 3: Style Selection

### Goal

사용자가 prompt를 몰라도 원하는 결과 방향을 고르게 합니다.

### Style Cards

#### Natural Motion

Copy:

> 사진이 자연스럽게 살아나는 느낌

Best for:

- 인물
- 음식
- 일상 사진

#### Cinematic Zoom

Copy:

> 천천히 줌인되는 영화 같은 무드

Best for:

- 여행
- 공간
- 프로필

#### Instagram Reel

Copy:

> 세로 숏폼에 어울리는 감각적인 움직임

Best for:

- 인스타
- 틱톡
- 브이로그

#### Product Ad

Copy:

> 상품을 선명하게 보여주는 광고 컷

Best for:

- 쇼핑몰
- 스마트스토어
- 브랜드 상품

#### Memory Montage

Copy:

> 여러 장면을 감성적으로 이어주는 영상

Best for:

- 여행
- 가족
- 이벤트

### Ratio Selection

- 9:16 — 릴스/쇼츠 추천
- 1:1 — 피드/프로필용
- 16:9 — 유튜브/웹용

Default: 9:16

### Duration Selection

- 5초 — 빠르고 저렴함
- 10초 — 더 풍부하지만 오래 걸림

Default: 5초

## Screen 4: Generating

### Goal

긴 대기시간 동안 사용자가 이탈하지 않게 합니다.

### States

```text
업로드 정리 중
프레임 추출 중
AI 영상 생성 대기 중
AI 영상 생성 중
영상 저장 중
완료
```

### UX Copy

> 보통 1~2분 정도 걸려요. 창을 닫아도 결과 페이지에서 다시 확인할 수 있습니다.

### Actions

- 취소
- 결과 페이지 링크 복사

### Progress Strategy

실제 provider progress가 없으면 status 기반 pseudo progress를 사용합니다.

- queued: 10%
- generating: 35~85% slowly increasing
- saving_output: 90%
- succeeded: 100%

## Screen 5: Result

### Goal

사용자가 결과를 보고 바로 저장하거나 다시 만들 수 있게 합니다.

### Components

- video player
- 다운로드 버튼
- 다른 스타일로 다시 만들기
- 같은 설정으로 다시 만들기
- 원본 소스 보기

### Success Copy

> 영상이 완성됐어요.

### Failure Copy

> 이번 생성은 실패했어요. 크레딧은 차감되지 않았고 다시 시도할 수 있습니다.

## Edge Cases

### Video too long

> MVP에서는 60초 이하 영상만 지원합니다. 짧게 잘라서 다시 올려주세요.

### No good frames

> 사용할 만한 장면을 찾지 못했어요. 다른 영상을 올리거나 직접 이미지를 올려주세요.

### Provider policy rejection

> 이 요청은 AI 영상 정책상 생성할 수 없습니다. 다른 이미지나 스타일로 다시 시도해주세요.

### Output distortion

> 결과가 마음에 들지 않나요? `움직임 약하게` 옵션으로 다시 생성해보세요.

## Regeneration UX

Regeneration options:

- 같은 설정으로 다시 생성
- 움직임 약하게
- 다른 스타일로 생성
- 프레임 다시 고르기

Do not expose raw seed/model parameters in MVP.

## Mobile UX

모바일 중심으로 설계합니다.

- 9:16 기본
- thumb grid는 2 columns
- CTA는 하단 sticky
- video player는 full-width
- 다운로드 버튼은 명확하게

## Pricing UX Placeholder

MVP에서는 내부 테스트 후 과금 UX를 붙입니다.

Potential copy:

- 5초 기본 영상: 1 credit
- 10초 영상: 2 credits
- 프리미엄 모델: 4 credits
- 실패한 생성은 credit 환불
