import { MAX_IMAGES } from "@/lib/config";
import type { InputType } from "@/lib/types";
import {
  parseAspectRatio,
  parseDuration,
  parseStyle,
} from "@/lib/validation";
import { getMediaAsset } from "@/server/db/repo";
import { errorJson, json } from "@/server/http";
import { createJobFromAssets } from "@/server/jobs/service";

// POST /api/video-jobs — 이미지(또는 비디오 프레임) 자산으로 job 생성.
export async function POST(req: Request) {
  let body: {
    inputType?: string;
    assetIds?: unknown;
    style?: unknown;
    aspectRatio?: unknown;
    durationSeconds?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return errorJson("잘못된 요청 본문입니다.", 400, "invalid_input");
  }

  const inputType: InputType = body.inputType === "video" ? "video" : "images";
  const assetIds = Array.isArray(body.assetIds)
    ? body.assetIds.filter((id): id is string => typeof id === "string")
    : [];

  if (assetIds.length === 0) {
    return errorJson("최소 1개의 자산이 필요합니다.", 400, "invalid_input");
  }
  if (inputType === "images" && assetIds.length > MAX_IMAGES) {
    return errorJson(
      `이미지는 최대 ${MAX_IMAGES}장까지 올릴 수 있습니다.`,
      400,
      "invalid_input",
    );
  }
  for (const id of assetIds) {
    if (!getMediaAsset(id)) {
      return errorJson("존재하지 않는 자산이 포함되어 있습니다.", 400, "invalid_input");
    }
  }

  const job = createJobFromAssets({
    inputType,
    assetIds,
    style: parseStyle(body.style),
    aspectRatio: parseAspectRatio(body.aspectRatio),
    durationSeconds: parseDuration(body.durationSeconds),
  });

  return json({ jobId: job.id, status: job.status }, 201);
}
