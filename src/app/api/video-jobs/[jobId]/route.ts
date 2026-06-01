import { parseAspectRatio, parseDuration, parseStyle } from "@/lib/validation";
import { errorJson, json } from "@/server/http";
import {
  ServiceError,
  getJobView,
  serializeJob,
  updateJobSettings,
} from "@/server/jobs/service";

// GET /api/video-jobs/{jobId} — job 상태 조회 (drive-on-read 로 상태 전진).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const view = await getJobView(jobId);
  if (!view) return errorJson("job을 찾을 수 없습니다.", 404, "not_found");
  return json(serializeJob(view));
}

// PATCH /api/video-jobs/{jobId} — 스타일/비율/길이 설정 갱신.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  let body: { style?: unknown; aspectRatio?: unknown; durationSeconds?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorJson("잘못된 요청 본문입니다.", 400, "invalid_input");
  }

  try {
    updateJobSettings(jobId, {
      style: parseStyle(body.style),
      aspectRatio: parseAspectRatio(body.aspectRatio),
      durationSeconds: parseDuration(body.durationSeconds),
    });
  } catch (e) {
    if (e instanceof ServiceError) return errorJson(e.message, 404, e.code);
    throw e;
  }

  const view = await getJobView(jobId);
  return json(serializeJob(view!));
}
