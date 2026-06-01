import { parseAspectRatio, parseDuration, parseStyle } from "@/lib/validation";
import { errorJson, json } from "@/server/http";
import {
  ServiceError,
  startGeneration,
  updateJobSettings,
} from "@/server/jobs/service";

// POST /api/video-jobs/{jobId}/generate — 생성 시작.
// 선택적으로 설정(style/ratio/duration) + weakMotion 을 함께 받아 마무리한다.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  let body: {
    style?: unknown;
    aspectRatio?: unknown;
    durationSeconds?: unknown;
    weakMotion?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    // 본문 없이 호출 가능 (ARCHITECTURE 의 빈 본문 형태).
  }

  try {
    const style = parseStyle(body.style);
    const aspectRatio = parseAspectRatio(body.aspectRatio);
    const durationSeconds = parseDuration(body.durationSeconds);
    if (style || aspectRatio || durationSeconds) {
      updateJobSettings(jobId, { style, aspectRatio, durationSeconds });
    }
    const job = await startGeneration(jobId, {
      weakMotion: body.weakMotion === true,
    });
    return json({ jobId: job.id, status: job.status });
  } catch (e) {
    if (e instanceof ServiceError) {
      const status = e.code === "not_found" ? 404 : 400;
      return errorJson(e.message, status, e.code);
    }
    throw e;
  }
}
