import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createMediaAsset, listAssetsByJobAndType } from "@/server/db/repo";
import { resetStore } from "@/server/db/store";
import { extractFrames } from "@/server/frames/extract";
import {
  extractFramesForVideo,
  getJobView,
  selectFrames,
  startGeneration,
} from "@/server/jobs/service";
import { getStorage } from "@/server/storage";

const execFileAsync = promisify(execFile);

let videoBytes: Buffer;

beforeAll(async () => {
  // 8초 테스트 비디오 생성 (2초 간격이면 약 4프레임).
  const dir = await mkdtemp(path.join(tmpdir(), "aivm-test-vid-"));
  const out = path.join(dir, "v.mp4");
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=640x360:rate=24:duration=8",
    "-pix_fmt",
    "yuv420p",
    out,
  ]);
  videoBytes = await readFile(out);
  await rm(dir, { recursive: true, force: true });
}, 60000);

describe("프레임 추출 (Phase 2)", () => {
  beforeEach(() => resetStore());

  it("extractFrames 는 1~12장의 JPEG 프레임을 추출한다", async () => {
    const frames = await extractFrames(videoBytes, { intervalSeconds: 2, maxFrames: 12 });
    expect(frames.length).toBeGreaterThanOrEqual(1);
    expect(frames.length).toBeLessThanOrEqual(12);
    for (const f of frames) {
      expect(f.length).toBeGreaterThan(0);
    }
  }, 60000);

  it("비디오 → 프레임 추출 → 선택 → 생성 end-to-end", async () => {
    const storage = getStorage();
    const key = "uploads/videos/test.mp4";
    await storage.putObject(key, videoBytes, "video/mp4");
    const asset = createMediaAsset({
      userId: null,
      jobId: null,
      type: "input_video",
      originalFilename: "test.mp4",
      mimeType: "video/mp4",
      storageUrl: storage.publicUrl(key),
      width: null,
      height: null,
      durationSeconds: null,
      fileSizeBytes: videoBytes.length,
      sortOrder: 0,
      selected: true,
      metadataJson: { storageKey: key, uploaded: true },
    });

    const job = await extractFramesForVideo(asset.id, { intervalSeconds: 2 });
    expect(job.status).toBe("ready_to_generate");
    expect(job.inputType).toBe("video");

    const frames = listAssetsByJobAndType(job.id, "extracted_frame");
    expect(frames.length).toBeGreaterThanOrEqual(1);

    selectFrames(job.id, [frames[0].id]);
    await startGeneration(job.id);

    let view = await getJobView(job.id);
    let guard = 0;
    while (view && view.status !== "succeeded" && view.status !== "failed" && guard < 12) {
      view = await getJobView(job.id);
      guard += 1;
    }
    expect(view?.status).toBe("succeeded");
    expect(view?.output?.videoUrl).toContain("/api/files/outputs/");
  }, 60000);
});
