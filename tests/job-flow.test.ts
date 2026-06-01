import { beforeEach, describe, expect, it } from "vitest";
import {
  createMediaAsset,
  getOutputByJob,
  getVideoJob,
} from "@/server/db/repo";
import { resetStore } from "@/server/db/store";
import {
  completeJob,
  createJobFromAssets,
  getJobView,
  serializeJob,
  startGeneration,
} from "@/server/jobs/service";
import { mockSamplePath } from "@/server/provider/mock";

function makeImageAsset(n: number) {
  return createMediaAsset({
    userId: null,
    jobId: null,
    type: "input_image",
    originalFilename: `img${n}.jpg`,
    mimeType: "image/jpeg",
    storageUrl: `http://localhost:3000/api/files/uploads/images/img${n}.jpg`,
    width: null,
    height: null,
    durationSeconds: null,
    fileSizeBytes: 1000,
    sortOrder: 0,
    selected: true,
    metadataJson: {},
  });
}

async function pollUntilTerminal(jobId: string) {
  let view = await getJobView(jobId);
  let guard = 0;
  while (
    view &&
    view.status !== "succeeded" &&
    view.status !== "failed" &&
    guard < 12
  ) {
    view = await getJobView(jobId);
    guard += 1;
  }
  return view;
}

describe("이미지 → 영상 end-to-end (DoD 핵심)", () => {
  beforeEach(() => resetStore());

  it("업로드된 이미지로 job 생성 → 생성 → 자체 스토리지 MP4 로 완료된다", async () => {
    const a1 = makeImageAsset(1);
    const a2 = makeImageAsset(2);

    const job = createJobFromAssets({
      inputType: "images",
      assetIds: [a1.id, a2.id],
      style: "product_ad",
      aspectRatio: "9:16",
      durationSeconds: 5,
    });
    expect(job.status).toBe("ready_to_generate");
    expect(job.style).toBe("product_ad");

    const gen = await startGeneration(job.id);
    expect(["queued", "generating"]).toContain(gen.status);
    expect(gen.providerJobId).toBeTruthy();
    expect(gen.prompt && gen.prompt.length).toBeGreaterThan(0);

    const view = await pollUntilTerminal(job.id);
    expect(view?.status).toBe("succeeded");
    expect(view?.progress).toBe(100);
    expect(view?.output).toBeTruthy();

    // 출력은 provider URL 이 아니라 자체 스토리지 URL 이어야 한다.
    expect(view?.output?.videoUrl).toContain("/api/files/outputs/");
    expect(view?.output?.videoUrl).toContain("video.mp4");

    // generated_outputs row 는 provider 원본 URL 도 보관한다.
    const out = getOutputByJob(job.id);
    expect(out?.providerOutputUrl).toContain("sample.mp4");
    expect(out?.fileSizeBytes).toBeGreaterThan(0);

    const dto = serializeJob(view!);
    expect(dto.status).toBe("succeeded");
    expect(dto.assets.length).toBe(2);
    expect(dto.output?.videoUrl).toContain("/api/files/outputs/");
  });

  it("선택된 이미지가 없으면 생성이 거부된다", async () => {
    const job = createJobFromAssets({ inputType: "images", assetIds: [] });
    await expect(startGeneration(job.id)).rejects.toThrow();
  });

  it("completeJob 중복 호출은 중복 output 을 만들지 않는다 (idempotency)", async () => {
    const a1 = makeImageAsset(1);
    const job = createJobFromAssets({ inputType: "images", assetIds: [a1.id] });
    await startGeneration(job.id);
    const j = getVideoJob(job.id)!;
    await completeJob(j, mockSamplePath());
    await completeJob(j, mockSamplePath());
    const view = await getJobView(job.id);
    expect(view?.status).toBe("succeeded");
    // output 은 하나만.
    expect(getOutputByJob(job.id)).toBeTruthy();
  });
});
