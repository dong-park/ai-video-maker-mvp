import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildPrompt } from "@/lib/prompt";
import type { JobResponse } from "@/lib/api";
import type {
  AspectRatio,
  Duration,
  ErrorCode,
  GeneratedOutput,
  InputType,
  MediaAsset,
  Style,
  VideoJob,
} from "@/lib/types";
import {
  MAX_VIDEO_SECONDS,
  SAMPLE_MAX_START,
  SAMPLE_WINDOW_SECONDS,
} from "@/lib/config";
import { newId } from "@/lib/ids";
import {
  createGeneratedOutput,
  createMediaAsset,
  createVideoJob,
  deleteMediaAsset,
  getMediaAsset,
  getOutputByJob,
  getVideoJob,
  listAssetsByJob,
  listAssetsByJobAndType,
  updateMediaAsset,
  updateVideoJob,
} from "@/server/db/repo";
import { extractFrames, probeDurationSeconds } from "@/server/frames/extract";
import { fetchSourceBytes, generateThumbnail } from "@/server/media";
import { getProvider } from "@/server/provider";
import { getStorage } from "@/server/storage";

// 비디오 프레임 추출 시 추천(미리 선택)하는 최대 장수.
const RECOMMENDED_FRAMES = 6;

function nowIso(): string {
  return new Date().toISOString();
}

export class ServiceError extends Error {
  constructor(
    public code: ErrorCode | "not_found",
    message: string,
  ) {
    super(message);
  }
}

// 생성에 입력으로 쓰는 자산: 선택된 input_image 또는 extracted_frame.
function generationInputAssets(jobId: string): MediaAsset[] {
  return listAssetsByJob(jobId).filter(
    (a) =>
      a.selected && (a.type === "input_image" || a.type === "extracted_frame"),
  );
}

export type CreateJobInput = {
  inputType: InputType;
  assetIds: string[];
  style?: Style;
  aspectRatio?: AspectRatio;
  durationSeconds?: Duration;
};

// 이미지(또는 비디오) 자산으로 job 생성 + 자산 연결. 기본 9:16 / 5초.
export function createJobFromAssets(input: CreateJobInput): VideoJob {
  const job = createVideoJob({
    userId: null,
    inputType: input.inputType,
    status: "ready_to_generate",
    style: input.style ?? "natural_motion",
    aspectRatio: input.aspectRatio ?? "9:16",
    durationSeconds: input.durationSeconds ?? 5,
    provider: null,
    providerModel: null,
    providerJobId: null,
    prompt: null,
    negativePrompt: null,
    progress: 0,
    errorCode: null,
    errorMessage: null,
    costEstimateUsd: null,
    startedAt: null,
    completedAt: null,
  });

  input.assetIds.forEach((assetId, index) => {
    updateMediaAsset(assetId, { jobId: job.id, sortOrder: index, selected: true });
  });

  return job;
}

export type SettingsPatch = {
  style?: Style;
  aspectRatio?: AspectRatio;
  durationSeconds?: Duration;
};

export function updateJobSettings(jobId: string, patch: SettingsPatch): VideoJob {
  const job = getVideoJob(jobId);
  if (!job) throw new ServiceError("not_found", "job을 찾을 수 없습니다.");
  const updated = updateVideoJob(jobId, {
    style: patch.style ?? job.style,
    aspectRatio: patch.aspectRatio ?? job.aspectRatio,
    durationSeconds: patch.durationSeconds ?? job.durationSeconds,
  });
  return updated!;
}

// 이미지 리뷰: 최종 순서/포함 이미지 집합을 반영한다 (reorder + delete + 추가).
// assetIds 에 없는 기존 input_image 는 삭제, 있는 것은 순서대로 연결.
export function setJobImages(jobId: string, assetIds: string[]): VideoJob {
  const job = getVideoJob(jobId);
  if (!job) throw new ServiceError("not_found", "job을 찾을 수 없습니다.");

  const keep = new Set(assetIds);
  for (const asset of listAssetsByJobAndType(jobId, "input_image")) {
    if (!keep.has(asset.id)) deleteMediaAsset(asset.id);
  }
  assetIds.forEach((assetId, index) => {
    updateMediaAsset(assetId, { jobId, sortOrder: index, selected: true });
  });
  return getVideoJob(jobId)!;
}

// 프레임 선택 (Phase 2): 선택된 extracted_frame 만 selected=true.
export function selectFrames(jobId: string, selectedIds: string[]): VideoJob {
  const job = getVideoJob(jobId);
  if (!job) throw new ServiceError("not_found", "job을 찾을 수 없습니다.");
  const selected = new Set(selectedIds);
  for (const frame of listAssetsByJobAndType(jobId, "extracted_frame")) {
    updateMediaAsset(frame.id, { selected: selected.has(frame.id) });
  }
  return getVideoJob(jobId)!;
}

// 비디오 자산에서 프레임을 추출해 video job 을 만든다 (Phase 2).
export async function extractFramesForVideo(
  videoAssetId: string,
  opts: {
    intervalSeconds?: number;
    maxFrames?: number;
    startSeconds?: number;
    windowSeconds?: number;
  } = {},
): Promise<VideoJob> {
  const asset = getMediaAsset(videoAssetId);
  if (!asset || asset.type !== "input_video") {
    throw new ServiceError("invalid_input", "비디오 자산을 찾을 수 없습니다.");
  }

  const storage = getStorage();
  const key = (asset.metadataJson as { storageKey?: string }).storageKey;
  if (!key) throw new ServiceError("invalid_input", "업로드가 완료되지 않았습니다.");

  let videoData: Buffer;
  try {
    videoData = await storage.readObject(key);
  } catch {
    throw new ServiceError("invalid_input", "업로드가 완료되지 않았습니다.");
  }

  const duration = await probeDurationSeconds(videoData);
  if (duration !== null && duration > MAX_VIDEO_SECONDS) {
    throw new ServiceError(
      "invalid_input",
      `비디오 길이가 ${MAX_VIDEO_SECONDS}초를 초과합니다.`,
    );
  }

  const job = createVideoJob({
    userId: null,
    inputType: "video",
    status: "extracting_frames",
    style: "natural_motion",
    aspectRatio: "9:16",
    durationSeconds: 5,
    provider: null,
    providerModel: null,
    providerJobId: null,
    prompt: null,
    negativePrompt: null,
    progress: 0,
    errorCode: null,
    errorMessage: null,
    costEstimateUsd: null,
    startedAt: null,
    completedAt: null,
  });
  updateMediaAsset(videoAssetId, {
    jobId: job.id,
    durationSeconds: duration,
  });

  let frames: Buffer[];
  try {
    frames = await extractFrames(videoData, opts);
  } catch {
    failJob(job.id, "frame_extraction_failed", "프레임을 추출하지 못했습니다.");
    throw new ServiceError("frame_extraction_failed", "프레임을 추출하지 못했습니다.");
  }

  for (let i = 0; i < frames.length; i += 1) {
    const frameKey = `frames/${job.id}/${i}.jpg`;
    await storage.putObject(frameKey, frames[i], "image/jpeg");
    createMediaAsset({
      userId: null,
      jobId: job.id,
      type: "extracted_frame",
      originalFilename: null,
      mimeType: "image/jpeg",
      storageUrl: storage.publicUrl(frameKey),
      width: null,
      height: null,
      durationSeconds: null,
      fileSizeBytes: frames[i].length,
      sortOrder: i,
      // 앞쪽 최대 6장을 추천(미리 선택).
      selected: i < RECOMMENDED_FRAMES,
      metadataJson: {},
    });
  }

  return updateVideoJob(job.id, { status: "ready_to_generate", progress: 0 })!;
}

// 번들된 데모 샘플 영상의 서버측 경로 (public/ 하위).
const SAMPLE_VIDEO_PATH = path.join(
  process.cwd(),
  "public",
  "samples",
  "sample-bbb-30s.mp4",
);

// "샘플로 해보기": 번들 샘플 영상을 업로드한 것처럼 input_video 자산으로 등록하고,
// 선택한 시작점 기준 [start, start+10s] 구간만 프레임을 추출해 video job 을 만든다.
export async function startSampleDemo(startSeconds: number): Promise<VideoJob> {
  let videoData: Buffer;
  try {
    videoData = await readFile(SAMPLE_VIDEO_PATH);
  } catch {
    throw new ServiceError("invalid_input", "샘플 영상을 찾을 수 없습니다.");
  }

  // 기존 업로드 흐름과 동일하게 스토리지에 넣고 input_video 자산을 만든다 (소스만 번들 파일).
  const storage = getStorage();
  const assetId = newId("asset");
  const key = `uploads/videos/${assetId}.mp4`;
  await storage.putObject(key, videoData, "video/mp4");

  const asset = createMediaAsset({
    id: assetId,
    userId: null,
    jobId: null,
    type: "input_video",
    originalFilename: "sample-bbb-30s.mp4",
    mimeType: "video/mp4",
    storageUrl: storage.publicUrl(key),
    width: null,
    height: null,
    durationSeconds: null,
    fileSizeBytes: videoData.length,
    sortOrder: 0,
    selected: true,
    metadataJson: { storageKey: key, uploaded: true, sample: true },
  });

  const start = clampSampleStart(startSeconds);
  return extractFramesForVideo(asset.id, {
    startSeconds: start,
    windowSeconds: SAMPLE_WINDOW_SECONDS,
  });
}

// 시작점을 데모 허용 범위 [0, SAMPLE_MAX_START] 정수로 보정한다.
function clampSampleStart(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Math.min(Math.max(Math.round(seconds), 0), SAMPLE_MAX_START);
}

// provider 에 생성 요청 제출. prompt 는 서버측에서 빌드한다.
export async function startGeneration(
  jobId: string,
  opts: { weakMotion?: boolean } = {},
): Promise<VideoJob> {
  const job = getVideoJob(jobId);
  if (!job) throw new ServiceError("not_found", "job을 찾을 수 없습니다.");

  const assets = generationInputAssets(jobId);
  if (assets.length === 0) {
    throw new ServiceError("invalid_input", "생성에 사용할 이미지가 없습니다.");
  }

  const { prompt, negativePrompt } = buildPrompt({
    style: job.style,
    imageCount: assets.length,
    weakMotion: opts.weakMotion,
  });

  const provider = getProvider();
  const submitResult = await provider.submit({
    jobId: job.id,
    prompt,
    negativePrompt,
    imageUrls: assets.map((a) => a.storageUrl),
    aspectRatio: job.aspectRatio,
    durationSeconds: job.durationSeconds,
    style: job.style,
  });

  return updateVideoJob(jobId, {
    status: submitResult.status,
    provider: submitResult.provider,
    providerModel: submitResult.providerModel,
    providerJobId: submitResult.providerJobId,
    prompt,
    negativePrompt,
    progress: submitResult.status === "generating" ? 35 : 10,
    startedAt: nowIso(),
    errorCode: null,
    errorMessage: null,
  })!;
}

export function failJob(jobId: string, code: ErrorCode, message: string): void {
  updateVideoJob(jobId, {
    status: "failed",
    errorCode: code,
    errorMessage: message,
    completedAt: nowIso(),
  });
}

// provider output 을 자체 스토리지로 복사하고 generated_outputs row 생성. idempotent.
export async function completeJob(job: VideoJob, providerOutputUrl: string): Promise<void> {
  if (getOutputByJob(job.id)) {
    if (job.status !== "succeeded") {
      updateVideoJob(job.id, { status: "succeeded", progress: 100, completedAt: nowIso() });
    }
    return;
  }

  updateVideoJob(job.id, { status: "saving_output", progress: 90 });

  let data: Buffer;
  try {
    ({ data } = await fetchSourceBytes(providerOutputUrl));
  } catch {
    failJob(job.id, "storage_copy_failed", "결과 영상을 저장하지 못했습니다.");
    return;
  }

  const storage = getStorage();
  const videoKey = `outputs/${job.id}/video.mp4`;
  try {
    await storage.putObject(videoKey, data, "video/mp4");
  } catch {
    failJob(job.id, "storage_copy_failed", "결과 영상을 저장하지 못했습니다.");
    return;
  }
  const videoUrl = storage.publicUrl(videoKey);

  // 썸네일은 best-effort.
  let thumbnailUrl: string | null = null;
  const thumb = await generateThumbnail(data);
  if (thumb) {
    const thumbKey = `outputs/${job.id}/thumbnail.jpg`;
    try {
      await storage.putObject(thumbKey, thumb, "image/jpeg");
      thumbnailUrl = storage.publicUrl(thumbKey);
    } catch {
      thumbnailUrl = null;
    }
  }

  createGeneratedOutput({
    jobId: job.id,
    videoUrl,
    thumbnailUrl,
    providerOutputUrl,
    width: null,
    height: null,
    durationSeconds: job.durationSeconds,
    fileSizeBytes: data.length,
  });

  // 결과물도 media_assets 에 기록 (ARCHITECTURE type output_video/output_thumbnail).
  createMediaAsset({
    userId: null,
    jobId: job.id,
    type: "output_video",
    originalFilename: null,
    mimeType: "video/mp4",
    storageUrl: videoUrl,
    width: null,
    height: null,
    durationSeconds: job.durationSeconds,
    fileSizeBytes: data.length,
    sortOrder: 0,
    selected: true,
    metadataJson: {},
  });

  updateVideoJob(job.id, { status: "succeeded", progress: 100, completedAt: nowIso() });
}

// drive-on-read: queued/generating 상태면 provider.getStatus 로 전진시킨다.
export async function advanceJob(jobId: string): Promise<VideoJob | undefined> {
  const job = getVideoJob(jobId);
  if (!job) return undefined;
  if (
    (job.status === "queued" || job.status === "generating") &&
    job.providerJobId
  ) {
    const provider = getProvider();
    let status;
    try {
      status = await provider.getStatus(job.providerJobId);
    } catch {
      // transient 오류는 다음 폴링에서 재시도.
      return job;
    }
    if (status.status === "succeeded" && status.outputUrl) {
      await completeJob(job, status.outputUrl);
    } else if (status.status === "failed") {
      failJob(
        jobId,
        (status.errorCode as ErrorCode) ?? "provider_failed",
        status.errorMessage ?? "AI 영상 생성에 실패했습니다. 다시 시도해주세요.",
      );
    } else {
      updateVideoJob(jobId, {
        status: status.status === "queued" ? "queued" : "generating",
        progress: Math.max(job.progress, status.progress ?? job.progress),
      });
    }
  }
  return getVideoJob(jobId);
}

export type JobView = VideoJob & {
  assets: MediaAsset[];
  output: GeneratedOutput | null;
};

export async function getJobView(jobId: string): Promise<JobView | undefined> {
  const job = await advanceJob(jobId);
  if (!job) return undefined;
  return {
    ...job,
    assets: listAssetsByJob(jobId),
    output: getOutputByJob(jobId) ?? null,
  };
}

// JobView → 외부 응답 DTO. 내부 필드(prompt, providerJobId 등)는 노출하지 않는다.
export function serializeJob(view: JobView): JobResponse {
  return {
    id: view.id,
    inputType: view.inputType,
    status: view.status,
    progress: view.progress,
    style: view.style,
    aspectRatio: view.aspectRatio,
    durationSeconds: view.durationSeconds,
    errorCode: view.errorCode,
    errorMessage: view.errorMessage,
    assets: view.assets
      .filter((a) => a.type === "input_image" || a.type === "extracted_frame")
      .map((a) => ({
        id: a.id,
        type: a.type,
        storageUrl: a.storageUrl,
        sortOrder: a.sortOrder,
        selected: a.selected,
        durationSeconds: a.durationSeconds,
      })),
    output: view.output
      ? {
          videoUrl: view.output.videoUrl,
          thumbnailUrl: view.output.thumbnailUrl,
          durationSeconds: view.output.durationSeconds,
        }
      : null,
  };
}

// 재생성: 입력 자산을 복제한 새 job 을 만든다 (UX_FLOWS Regeneration).
// generate=false 면 ready_to_generate 상태로만 두고 (다른 스타일로 다시 만들기) 반환.
export async function regenerateJob(
  jobId: string,
  opts: { generate: boolean; weakMotion?: boolean; style?: Style } = { generate: true },
): Promise<VideoJob> {
  const old = getVideoJob(jobId);
  if (!old) throw new ServiceError("not_found", "job을 찾을 수 없습니다.");

  const sources = listAssetsByJob(jobId).filter(
    (a) => a.type === "input_image" || a.type === "extracted_frame",
  );

  const newJob = createVideoJob({
    userId: null,
    inputType: old.inputType,
    status: "ready_to_generate",
    style: opts.style ?? old.style,
    aspectRatio: old.aspectRatio,
    durationSeconds: old.durationSeconds,
    provider: null,
    providerModel: null,
    providerJobId: null,
    prompt: null,
    negativePrompt: null,
    progress: 0,
    errorCode: null,
    errorMessage: null,
    costEstimateUsd: null,
    startedAt: null,
    completedAt: null,
  });

  sources.forEach((src, index) => {
    createMediaAsset({
      userId: null,
      jobId: newJob.id,
      type: src.type,
      originalFilename: src.originalFilename,
      mimeType: src.mimeType,
      storageUrl: src.storageUrl,
      width: src.width,
      height: src.height,
      durationSeconds: src.durationSeconds,
      fileSizeBytes: src.fileSizeBytes,
      sortOrder: index,
      selected: src.selected,
      metadataJson: src.metadataJson,
    });
  });

  if (opts.generate) {
    return startGeneration(newJob.id, { weakMotion: opts.weakMotion });
  }
  return newJob;
}
