// 도메인 타입 및 enum. ARCHITECTURE.md 3절(데이터 모델), 5절(provider adapter) 기준.

export const STYLES = [
  "natural_motion",
  "cinematic_zoom",
  "instagram_reel",
  "product_ad",
  "memory_montage",
] as const;
export type Style = (typeof STYLES)[number];

export const ASPECT_RATIOS = ["9:16", "1:1", "16:9"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const DURATIONS = [5, 10] as const;
export type Duration = (typeof DURATIONS)[number];

export type InputType = "images" | "video";

// ARCHITECTURE: video_jobs.status
export const JOB_STATUSES = [
  "created",
  "extracting_frames",
  "ready_to_generate",
  "queued",
  "generating",
  "saving_output",
  "succeeded",
  "failed",
  "canceled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

// ARCHITECTURE: media_assets.type
export type AssetType =
  | "input_image"
  | "input_video"
  | "extracted_frame"
  | "output_video"
  | "output_thumbnail";

export type MediaAsset = {
  id: string;
  userId: string | null;
  jobId: string | null;
  type: AssetType;
  originalFilename: string | null;
  mimeType: string | null;
  storageUrl: string;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  sortOrder: number;
  selected: boolean;
  metadataJson: Record<string, unknown>;
  createdAt: string;
};

export type VideoJob = {
  id: string;
  userId: string | null;
  inputType: InputType;
  status: JobStatus;
  style: Style;
  aspectRatio: AspectRatio;
  durationSeconds: Duration;
  provider: string | null;
  providerModel: string | null;
  providerJobId: string | null;
  prompt: string | null;
  negativePrompt: string | null;
  progress: number;
  errorCode: string | null;
  errorMessage: string | null;
  costEstimateUsd: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type GeneratedOutput = {
  id: string;
  jobId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  providerOutputUrl: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  createdAt: string;
};

export type ProviderEvent = {
  id: string;
  provider: string;
  providerJobId: string | null;
  eventType: string | null;
  payloadJson: Record<string, unknown>;
  receivedAt: string;
  processedAt: string | null;
};

// 내부 에러 코드 (ARCHITECTURE 7절)
export type ErrorCode =
  | "provider_timeout"
  | "provider_policy_rejected"
  | "provider_failed"
  | "storage_copy_failed"
  | "frame_extraction_failed"
  | "invalid_input";
