import { errorJson, json } from "@/server/http";
import {
  ServiceError,
  getJobView,
  selectFrames,
  serializeJob,
} from "@/server/jobs/service";

// PATCH /api/video-jobs/{jobId}/frames — 추출 프레임 선택/해제 (Phase 2).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  let body: { selectedFrameAssetIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorJson("잘못된 요청 본문입니다.", 400, "invalid_input");
  }

  const selectedIds = Array.isArray(body.selectedFrameAssetIds)
    ? body.selectedFrameAssetIds.filter((id): id is string => typeof id === "string")
    : [];
  if (selectedIds.length === 0) {
    return errorJson("최소 1장의 프레임을 선택해야 합니다.", 400, "invalid_input");
  }

  try {
    selectFrames(jobId, selectedIds);
  } catch (e) {
    if (e instanceof ServiceError) return errorJson(e.message, 404, e.code);
    throw e;
  }

  const view = await getJobView(jobId);
  return json(serializeJob(view!));
}
