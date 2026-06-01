import type { JobResponse } from "./api";
import type { AspectRatio, Duration, Style } from "./types";

// 브라우저 측 API 헬퍼. 서버 모듈을 import 하지 않는다.

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `요청 실패 (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export type UploadedAsset = { assetId: string; storageUrl: string };

// 파일 1개: upload-url 발급 → 업로드 타겟에 PUT.
export async function uploadOne(file: File): Promise<UploadedAsset> {
  const init = await jsonOrThrow<{
    assetId: string;
    uploadUrl: string;
    storageUrl: string;
  }>(
    await fetch("/api/assets/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
      }),
    }),
  );

  const putRes = await fetch(init.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error("파일 업로드에 실패했습니다.");

  return { assetId: init.assetId, storageUrl: init.storageUrl };
}

export async function uploadMany(files: File[]): Promise<UploadedAsset[]> {
  const out: UploadedAsset[] = [];
  for (const file of files) {
    out.push(await uploadOne(file));
  }
  return out;
}

export async function createImagesJob(assetIds: string[]): Promise<string> {
  const { jobId } = await jsonOrThrow<{ jobId: string }>(
    await fetch("/api/video-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputType: "images", assetIds }),
    }),
  );
  return jobId;
}

export async function fetchJob(jobId: string): Promise<JobResponse> {
  return jsonOrThrow<JobResponse>(await fetch(`/api/video-jobs/${jobId}`));
}

export async function patchImages(
  jobId: string,
  assetIds: string[],
): Promise<JobResponse> {
  return jsonOrThrow<JobResponse>(
    await fetch(`/api/video-jobs/${jobId}/assets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetIds }),
    }),
  );
}

export async function selectFrames(
  jobId: string,
  selectedFrameAssetIds: string[],
): Promise<JobResponse> {
  return jsonOrThrow<JobResponse>(
    await fetch(`/api/video-jobs/${jobId}/frames`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedFrameAssetIds }),
    }),
  );
}

export type GenerateSettings = {
  style: Style;
  aspectRatio: AspectRatio;
  durationSeconds: Duration;
};

export async function generate(
  jobId: string,
  settings: GenerateSettings,
): Promise<void> {
  await jsonOrThrow(
    await fetch(`/api/video-jobs/${jobId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }),
  );
}

export type RegenerateMode = "same" | "weak_motion" | "restyle";

export async function regenerate(
  jobId: string,
  mode: RegenerateMode,
): Promise<{ jobId: string; next?: string }> {
  return jsonOrThrow<{ jobId: string; next?: string }>(
    await fetch(`/api/video-jobs/${jobId}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    }),
  );
}

// Phase 2: 비디오 업로드 → 프레임 추출 job 생성.
export async function uploadVideoAndExtract(
  file: File,
): Promise<{ jobId: string }> {
  const asset = await uploadOne(file);
  return jsonOrThrow<{ jobId: string }>(
    await fetch("/api/videos/extract-frames", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoAssetId: asset.assetId }),
    }),
  );
}
