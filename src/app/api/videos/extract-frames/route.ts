import { errorJson, json } from "@/server/http";
import { ServiceError, extractFramesForVideo } from "@/server/jobs/service";

// POST /api/videos/extract-frames — 비디오 자산에서 프레임 추출 → video job 생성.
export async function POST(req: Request) {
  let body: {
    videoAssetId?: string;
    intervalSeconds?: number;
    maxFrames?: number;
  };
  try {
    body = await req.json();
  } catch {
    return errorJson("잘못된 요청 본문입니다.", 400, "invalid_input");
  }

  if (!body.videoAssetId) {
    return errorJson("videoAssetId가 필요합니다.", 400, "invalid_input");
  }

  try {
    const job = await extractFramesForVideo(body.videoAssetId, {
      intervalSeconds:
        typeof body.intervalSeconds === "number" ? body.intervalSeconds : undefined,
      maxFrames: typeof body.maxFrames === "number" ? body.maxFrames : undefined,
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
