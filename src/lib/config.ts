// 환경변수 유무로 real/mock 자동 분기. 실제 키가 없으면 mock + 로컬 스토리지.

export function hasFalKey(): boolean {
  return Boolean(process.env.FAL_KEY && process.env.FAL_KEY.trim());
}

export function hasS3Config(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

// MVP 기본 모델: 9:16 + 5초를 실제 지원하는 Kling류 (PROVIDER_EVALUATION).
export const FAL_DEFAULT_MODEL =
  process.env.FAL_MODEL?.trim() || "fal-ai/kling-video/v1.5/standard/image-to-video";

export const MOCK_MODEL = "mock-kling-i2v";

// 업로드 제한 (PRD / UX_FLOWS)
export const MAX_IMAGES = 6;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB
export const MAX_VIDEO_SECONDS = 60;

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime"] as const;

// "샘플로 해보기" 데모: 번들 영상은 30초이고, 사용자는 10초 고정 구간의 시작점만 고른다.
// 시작점 범위는 [0, 30-10] = 0~20초.
export const SAMPLE_VIDEO_DURATION = 30;
export const SAMPLE_WINDOW_SECONDS = 10;
export const SAMPLE_MAX_START = SAMPLE_VIDEO_DURATION - SAMPLE_WINDOW_SECONDS;

// 자체 스토리지 절대 URL이 필요할 때(webhook→provider 전달 등) 사용할 베이스.
export function publicBaseUrl(): string {
  return process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
