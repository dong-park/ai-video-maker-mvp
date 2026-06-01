import { getMediaAsset, updateMediaAsset } from "@/server/db/repo";
import { errorJson, json } from "@/server/http";
import { getStorage } from "@/server/storage";

// PUT /api/assets/{assetId}/blob — 로컬 폴백 업로드 엔드포인트.
// (S3/R2 사용 시에는 presigned URL 로 직접 업로드하므로 호출되지 않는다.)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const asset = getMediaAsset(assetId);
  if (!asset) {
    return errorJson("자산을 찾을 수 없습니다.", 404, "not_found");
  }

  const key = (asset.metadataJson as { storageKey?: string }).storageKey;
  if (!key) {
    return errorJson("업로드 키가 없습니다.", 400, "invalid_input");
  }

  const data = Buffer.from(await req.arrayBuffer());
  await getStorage().putObject(key, data, asset.mimeType ?? "application/octet-stream");

  updateMediaAsset(assetId, {
    fileSizeBytes: data.length,
    metadataJson: { ...asset.metadataJson, uploaded: true },
  });

  return json({ assetId, ok: true });
}
