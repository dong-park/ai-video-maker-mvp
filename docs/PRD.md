# PRD: AI Video Maker MVP

## 1. Product Summary

AI Video Maker는 사용자가 보유한 **여러 이미지** 또는 **짧은 비디오**를 입력하면, 핵심 장면을 추출하고 AI 영상 모델을 호출해 **짧은 MP4 영상**을 생성하는 웹 서비스입니다.

초기 제품은 영상 편집기가 아니라, 비전문 사용자가 몇 번의 선택만으로 공유 가능한 숏폼 영상을 얻는 **생성형 유틸리티**입니다.

## 2. Target Users

### Primary

#### 1. 소상공인 / 1인 브랜드 운영자

- 상품 사진은 있지만 광고 영상 제작이 어렵다.
- 인스타 릴스, 스마트스토어, 상세페이지용 짧은 영상이 필요하다.
- 복잡한 편집 툴보다 빠른 결과를 원한다.

#### 2. 개인 크리에이터

- 여행/음식/운동/일상 사진을 짧은 릴스처럼 만들고 싶다.
- 프롬프트 작성이나 영상 편집 경험이 적다.
- 결과물을 카톡, 인스타, 블로그에 공유하고 싶다.

#### 3. 중고거래/부동산/공간 소개 사용자

- 여러 장의 사진으로 움직이는 소개 영상을 만들고 싶다.
- 사진만 있는 매물을 더 매력적으로 보여주고 싶다.

## 3. Core Use Cases

### Use Case 1: 상품 사진 여러 장 → 광고 영상

사용자는 상품 사진 3~5장을 업로드하고 `Product Ad` 스타일을 선택합니다.
서비스는 상품을 유지하면서 카메라 무빙, 조명감, 광고 느낌을 더한 5초 영상을 생성합니다.

Success:

- 상품 형태가 유지된다.
- 과한 변형 없이 광고 소재로 쓸 수 있다.
- 9:16 영상으로 다운로드할 수 있다.

### Use Case 2: 여행/일상 사진 → 감성 몽타주

사용자는 여행 사진 여러 장을 업로드하고 `Memory Montage` 스타일을 선택합니다.
서비스는 자연스러운 장면 전환과 감성적인 카메라 무빙이 있는 짧은 영상을 생성합니다.

Success:

- 사진 속 장소/인물이 과하게 변하지 않는다.
- 릴스나 카톡 공유에 적합하다.

### Use Case 3: 기존 비디오 → 대표 프레임 → 새 AI 영상

사용자는 짧은 비디오를 업로드합니다.
서비스는 비디오에서 대표 프레임을 추출하고, 사용자가 선택한 프레임을 기반으로 새 영상을 생성합니다.

Success:

- 사용자가 직접 캡처하지 않아도 대표 장면을 고를 수 있다.
- 원본 영상에서 좋은 장면을 재활용할 수 있다.

## 4. MVP Scope

### In Scope

- 이미지 1~6장 업로드
- 비디오 60초 이하 업로드
- 비디오 프레임 추출
- 추출 프레임 선택/해제
- 스타일 프리셋 5개
- 비율 3개: 9:16, 1:1, 16:9
- 길이 2개: 5초, 10초
- 비동기 영상 생성 job
- 결과 MP4 미리보기/다운로드
- 생성 실패 시 재시도

### Out of Scope

- 타임라인 편집
- 자막/음악 자동 생성
- 긴 영상 생성
- 립싱크
- 얼굴 합성
- 유명인/저작권 캐릭터 생성
- 사용자가 모델을 직접 고르는 고급 UI
- 장면별 프롬프트 편집

## 5. User Experience Principles

### 1. 프롬프트를 숨긴다

사용자가 긴 프롬프트를 작성하게 하지 않습니다. 스타일 프리셋과 짧은 옵션만 노출합니다.

### 2. 결과 실패를 제품적으로 흡수한다

AI 영상은 실패할 수 있습니다. 실패를 숨기지 않고 `다시 생성`, `움직임 약하게`, `다른 스타일`을 제공합니다.

### 3. 편집기가 되지 않는다

타임라인, 컷 편집, 키프레임 조작을 제공하지 않습니다. MVP의 가치는 빠른 생성입니다.

### 4. 입력물 보존을 강조한다

인물, 상품, 장소가 과하게 바뀌면 사용자 신뢰가 떨어집니다. 모든 프롬프트와 UI는 `원본 보존`을 우선합니다.

## 6. Functional Requirements

### Upload

- 이미지는 JPG, PNG, WEBP를 지원합니다.
- 비디오는 MP4, MOV를 지원합니다.
- 업로드 파일은 storage에 저장합니다.
- 업로드 후 asset record를 생성합니다.

### Frame Extraction

- 비디오 업로드 후 서버에서 ffmpeg로 프레임을 추출합니다.
- 기본 간격은 2초입니다.
- 최대 12프레임을 추출합니다.
- 자동 필터링 후 최대 6장을 추천합니다.
- 사용자는 최종 사용할 프레임을 선택/해제할 수 있습니다.

### Generation

- generation request는 동기 처리하지 않습니다.
- 내부 job을 만들고 provider job id를 저장합니다.
- provider webhook 또는 polling으로 상태를 갱신합니다.
- 완료된 output URL은 즉시 자체 storage로 복사합니다.

### Result

- 결과 MP4를 웹에서 재생할 수 있습니다.
- 사용자는 다운로드할 수 있습니다.
- 실패한 job은 error message를 보여주고 재시도할 수 있습니다.

## 7. Non-Functional Requirements

### Performance

- 이미지 업로드 후 generation 시작까지 10초 이내 목표
- 비디오 프레임 추출은 30초 이내 목표
- 5초 영상 생성은 평균 2분 이내 목표

### Reliability

- provider timeout 처리
- webhook idempotency 보장
- provider URL 만료 전 자체 저장
- 실패 시 원인 기록

### Safety

- 저작권 캐릭터, 유명인, 노골적/위험 콘텐츠 제한
- 사용자 업로드 파일 용량 제한
- provider policy 위반 에러 처리

## 8. Success Metrics

### Activation

- 업로드 시작 대비 generation 요청 비율
- 첫 결과 영상 생성 완료율

### Quality

- generation success rate
- retry rate
- download rate
- user-selected regenerate rate

### Business

- free trial → paid conversion
- 평균 generation cost
- 영상 1개당 gross margin

## 9. MVP Acceptance Criteria

- 사용자가 이미지 1~6장을 업로드해 5초 MP4를 만들 수 있다.
- 사용자가 비디오를 업로드해 추출 프레임을 확인할 수 있다.
- 사용자가 추출 프레임 중 일부를 선택해 generation에 사용할 수 있다.
- generation 상태가 `queued/generating/succeeded/failed`로 표시된다.
- 완료된 영상은 자체 storage URL로 재생/다운로드된다.
- provider output URL에만 의존하지 않는다.
