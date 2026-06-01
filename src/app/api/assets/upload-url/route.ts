import {
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  VIDEO_MIME_TYPES,
} from "@/lib/config";
import { newId } from "@/lib/ids";
import type { AssetType } from "@/lib/types";
import { createMediaAsset } from "@/server/db/repo";
import { errorJson, json } from "@/server/http";
import { extForMime, getStorage } from "@/server/storage";

// POST /api/assets/upload-url — 업로드 타겟 생성 + media_asset row 생성.
export async function POST(req: Request) {
  let body: { filename?: string; mimeType?: string; fileSizeBytes?: number };
  try {
    body = await req.json();
  } catch {
    return errorJson("잘못된 요청 본문입니다.", 400, "invalid_input");
  }

  const { filename, mimeType, fileSizeBytes } = body;
  if (!mimeType) {
    return errorJson("mimeType이 필요합니다.", 400, "invalid_input");
  }

  const isImage = (IMAGE_MIME_TYPES as readonly string[]).includes(mimeType);
  const isVideo = (VIDEO_MIME_TYPES as readonly string[]).includes(mimeType);
  if (!isImage && !isVideo) {
    return errorJson("지원하지 않는 파일 형식입니다.", 400, "invalid_input");
  }

  const sizeLimit = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (typeof fileSizeBytes === "number" && fileSizeBytes > sizeLimit) {
    return errorJson("업로드 파일이 너무 큽니다.", 413, "invalid_input");
  }

  const assetId = newId("asset");
  const ext = extForMime(mimeType);
  const folder = isImage ? "uploads/images" : "uploads/videos";
  const key = `${folder}/${assetId}.${ext}`;

  const storage = getStorage();
  const storageUrl = storage.publicUrl(key);
  const type: AssetType = isImage ? "input_image" : "input_video";

  createMediaAsset({
    id: assetId,
    userId: null,
    jobId: null,
    type,
    originalFilename: filename ?? null,
    mimeType,
    storageUrl,
    width: null,
    height: null,
    durationSeconds: null,
    fileSizeBytes: typeof fileSizeBytes === "number" ? fileSizeBytes : null,
    sortOrder: 0,
    selected: true,
    metadataJson: { storageKey: key, uploaded: false },
  });

  const presigned = await storage.presignPut(key, mimeType);
  const uploadUrl = presigned ?? `/api/assets/${assetId}/blob`;

  return json({ assetId, uploadUrl, storageUrl });
}
