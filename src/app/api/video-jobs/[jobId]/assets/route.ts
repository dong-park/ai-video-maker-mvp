import { MAX_IMAGES } from "@/lib/config";
import { errorJson, json } from "@/server/http";
import {
  ServiceError,
  getJobView,
  serializeJob,
  setJobImages,
} from "@/server/jobs/service";

// PATCH /api/video-jobs/{jobId}/assets — 이미지 리뷰의 최종 순서/포함 집합 반영.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  let body: { assetIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorJson("잘못된 요청 본문입니다.", 400, "invalid_input");
  }

  const assetIds = Array.isArray(body.assetIds)
    ? body.assetIds.filter((id): id is string => typeof id === "string")
    : [];
  if (assetIds.length === 0) {
    return errorJson("최소 1장의 이미지가 필요합니다.", 400, "invalid_input");
  }
  if (assetIds.length > MAX_IMAGES) {
    return errorJson(
      `이미지는 최대 ${MAX_IMAGES}장까지 올릴 수 있습니다.`,
      400,
      "invalid_input",
    );
  }

  try {
    setJobImages(jobId, assetIds);
  } catch (e) {
    if (e instanceof ServiceError) return errorJson(e.message, 404, e.code);
    throw e;
  }

  const view = await getJobView(jobId);
  return json(serializeJob(view!));
}
