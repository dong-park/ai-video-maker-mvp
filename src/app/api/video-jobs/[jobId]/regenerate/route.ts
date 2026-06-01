import { parseStyle } from "@/lib/validation";
import { errorJson, json } from "@/server/http";
import { ServiceError, regenerateJob } from "@/server/jobs/service";

// POST /api/video-jobs/{jobId}/regenerate — 입력을 복제한 새 job 으로 재생성.
// mode: "same"(같은 설정) | "weak_motion"(움직임 약하게) | "restyle"(다른 스타일로, 생성 안 함)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  let body: { mode?: string; style?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // 기본 same.
  }

  const mode = body.mode ?? "same";
  try {
    if (mode === "restyle") {
      const job = await regenerateJob(jobId, { generate: false });
      return json({ jobId: job.id, status: job.status, next: "style" });
    }
    const job = await regenerateJob(jobId, {
      generate: true,
      weakMotion: mode === "weak_motion",
      style: parseStyle(body.style),
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
