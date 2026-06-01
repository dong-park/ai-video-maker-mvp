import { describe, expect, it } from "vitest";
import { MockProvider } from "@/server/provider/mock";

const baseInput = {
  jobId: "job_1",
  prompt: "p",
  imageUrls: ["http://x/a.jpg"],
  aspectRatio: "9:16" as const,
  durationSeconds: 5 as const,
  style: "natural_motion",
};

describe("MockProvider", () => {
  it("submit 은 queued + providerJobId 를 반환한다", async () => {
    const p = new MockProvider();
    const r = await p.submit(baseInput);
    expect(r.status).toBe("queued");
    expect(r.providerJobId).toBeTruthy();
    expect(r.provider).toBe("mock");
  });

  it("getStatus 는 폴링하면 결국 succeeded + outputUrl 을 준다", async () => {
    const p = new MockProvider();
    const { providerJobId } = await p.submit(baseInput);
    let status = await p.getStatus(providerJobId);
    let guard = 0;
    while (status.status !== "succeeded" && guard < 10) {
      status = await p.getStatus(providerJobId);
      guard += 1;
    }
    expect(status.status).toBe("succeeded");
    expect(status.outputUrl).toContain("sample.mp4");
  });

  it("normalizeWebhook 은 성공 페이로드를 succeeded 로 정규화한다", () => {
    const p = new MockProvider();
    const e = p.normalizeWebhook({ providerJobId: "req_1", status: "succeeded" });
    expect(e.status).toBe("succeeded");
    expect(e.providerJobId).toBe("req_1");
    expect(e.outputUrl).toContain("sample.mp4");
  });
});
