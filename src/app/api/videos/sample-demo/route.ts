import { errorJson, json } from "@/server/http";
import { ServiceError, startSampleDemo } from "@/server/jobs/service";

// POST /api/videos/sample-demo — 번들 샘플 영상으로 데모 video job 시작.
// body.startSeconds (옵션, 기본 0): 10초 고정 구간의 시작점. 서버가 [start, start+10s] 만 추출.
export async function POST(req: Request) {
  let body: { startSeconds?: number };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const startSeconds =
    typeof body.startSeconds === "number" ? body.startSeconds : 0;

  try {
    const job = await startSampleDemo(startSeconds);
    return json({ jobId: job.id, status: job.status });
  } catch (e) {
    if (e instanceof ServiceError) {
      const status = e.code === "not_found" ? 404 : 400;
      return errorJson(e.message, status, e.code);
    }
    throw e;
  }
}
