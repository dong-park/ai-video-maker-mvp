import { beforeEach, describe, expect, it } from "vitest";
import { POST as uploadUrlPOST } from "@/app/api/assets/upload-url/route";
import { PUT as blobPUT } from "@/app/api/assets/[assetId]/blob/route";
import { POST as createJobPOST } from "@/app/api/video-jobs/route";
import { GET as getJobGET } from "@/app/api/video-jobs/[jobId]/route";
import { POST as generatePOST } from "@/app/api/video-jobs/[jobId]/generate/route";
import { POST as webhookPOST } from "@/app/api/webhooks/fal/route";
import { getVideoJob } from "@/server/db/repo";
import { resetStore } from "@/server/db/store";

function jsonReq(method: string, body: unknown): Request {
  return new Request("http://localhost/api", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function uploadImage(filename: string): Promise<string> {
  const res = await uploadUrlPOST(
    jsonReq("POST", { filename, mimeType: "image/jpeg", fileSizeBytes: 1234 }),
  );
  expect(res.status).toBe(200);
  const { assetId } = (await res.json()) as { assetId: string };

  const blobRes = await blobPUT(
    new Request("http://localhost/blob", {
      method: "PUT",
      body: new Uint8Array([1, 2, 3, 4]),
    }),
    { params: Promise.resolve({ assetId }) },
  );
  expect(blobRes.status).toBe(200);
  return assetId;
}

type JobPoll = {
  status: string;
  output: { videoUrl: string } | null;
  progress: number;
};

async function pollJob(jobId: string): Promise<JobPoll | null> {
  let body: JobPoll | null = null;
  for (let i = 0; i < 12; i += 1) {
    const res = await getJobGET(new Request("http://localhost/job"), {
      params: Promise.resolve({ jobId }),
    });
    body = (await res.json()) as JobPoll;
    if (body.status === "succeeded" || body.status === "failed") break;
  }
  return body;
}

describe("API 라우트 end-to-end", () => {
  beforeEach(() => resetStore());

  it("upload-url → blob → create job → generate → 결과 자체 스토리지", async () => {
    const a1 = await uploadImage("a.jpg");
    const a2 = await uploadImage("b.jpg");

    const createRes = await createJobPOST(
      jsonReq("POST", {
        inputType: "images",
        assetIds: [a1, a2],
        style: "memory_montage",
        aspectRatio: "9:16",
        durationSeconds: 5,
      }),
    );
    expect(createRes.status).toBe(201);
    const { jobId } = (await createRes.json()) as { jobId: string };

    const genRes = await generatePOST(jsonReq("POST", {}), {
      params: Promise.resolve({ jobId }),
    });
    expect(genRes.status).toBe(200);

    const body = await pollJob(jobId);
    expect(body?.status).toBe("succeeded");
    const output = body?.output as { videoUrl: string } | null;
    expect(output?.videoUrl).toContain("/api/files/outputs/");
  });

  it("지원하지 않는 mime 은 거부된다", async () => {
    const res = await uploadUrlPOST(
      jsonReq("POST", { filename: "x.txt", mimeType: "text/plain" }),
    );
    expect(res.status).toBe(400);
  });

  it("webhook 중복 호출은 idempotent (출력 1개 유지, 성공 상태)", async () => {
    const a1 = await uploadImage("a.jpg");
    const createRes = await createJobPOST(
      jsonReq("POST", { inputType: "images", assetIds: [a1] }),
    );
    const { jobId } = (await createRes.json()) as { jobId: string };
    await generatePOST(jsonReq("POST", {}), {
      params: Promise.resolve({ jobId }),
    });

    const providerJobId = getVideoJob(jobId)!.providerJobId!;
    const payload = { providerJobId, status: "succeeded" };

    await webhookPOST(jsonReq("POST", payload));
    await webhookPOST(jsonReq("POST", payload));

    const res = await getJobGET(new Request("http://localhost/job"), {
      params: Promise.resolve({ jobId }),
    });
    const body = (await res.json()) as { status: string; output: { videoUrl: string } };
    expect(body.status).toBe("succeeded");
    expect(body.output.videoUrl).toContain("/api/files/outputs/");
  });
});
