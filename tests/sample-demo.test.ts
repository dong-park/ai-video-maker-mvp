import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { listAssetsByJobAndType } from "@/server/db/repo";
import { resetStore } from "@/server/db/store";
import { extractFrames } from "@/server/frames/extract";
import {
  getJobView,
  selectFrames,
  startGeneration,
  startSampleDemo,
} from "@/server/jobs/service";
import { getStorage } from "@/server/storage";

const execFileAsync = promisify(execFile);

// 10초마다 색이 바뀌는 30초 테스트 영상: [0,10) 빨강 · [10,20) 초록 · [20,30) 파랑.
// 구간 추출이 [start, start+10] 밖 프레임을 내지 않음을 색으로 검증하기 위함.
let colorVideo: Buffer;

beforeAll(async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "aivm-color-vid-"));
  const out = path.join(dir, "c.mp4");
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0xFF0000:s=160x120:r=10:d=10",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x00FF00:s=160x120:r=10:d=10",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x5050FF:s=160x120:r=10:d=10",
    "-filter_complex",
    "[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]",
    "-map",
    "[v]",
    "-pix_fmt",
    "yuv420p",
    out,
  ]);
  colorVideo = await readFile(out);
  await rm(dir, { recursive: true, force: true });
}, 60000);

// JPEG 한 장의 평균 RGB (1x1 다운스케일).
async function avgRgb(jpeg: Buffer): Promise<[number, number, number]> {
  const dir = await mkdtemp(path.join(tmpdir(), "aivm-rgb-"));
  try {
    const p = path.join(dir, "f.jpg");
    await writeFile(p, jpeg);
    const { stdout } = await execFileAsync(
      "ffmpeg",
      ["-v", "error", "-i", p, "-vf", "scale=1:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
      { encoding: "buffer", maxBuffer: 1024 },
    );
    const buf = stdout as unknown as Buffer;
    return [buf[0] ?? 0, buf[1] ?? 0, buf[2] ?? 0];
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

type Channel = "r" | "g" | "b";
const MARGIN = 40;

function dominant([r, g, b]: [number, number, number]): Channel | null {
  if (r > g + MARGIN && r > b + MARGIN) return "r";
  if (g > r + MARGIN && g > b + MARGIN) return "g";
  if (b > r + MARGIN && b > g + MARGIN) return "b";
  return null;
}

describe("구간 프레임 추출 (sample demo)", () => {
  beforeEach(() => resetStore());

  it.each([
    { start: 0, color: "r" as Channel, label: "[0,10) 빨강" },
    { start: 10, color: "g" as Channel, label: "[10,20) 초록" },
    { start: 20, color: "b" as Channel, label: "[20,30) 파랑" },
  ])("$label 구간만 추출하면 그 구간 색 프레임만 나온다", async ({ start, color }) => {
    const frames = await extractFrames(colorVideo, {
      intervalSeconds: 2,
      startSeconds: start,
      windowSeconds: 10,
    });
    expect(frames.length).toBeGreaterThanOrEqual(1);
    for (const f of frames) {
      expect(dominant(await avgRgb(f))).toBe(color);
    }
  }, 60000);

  it("구간 옵션 없이 추출하면 세 구간 색이 모두 섞여 나온다 (기존 전체 동작)", async () => {
    const frames = await extractFrames(colorVideo, { intervalSeconds: 2 });
    const colors = new Set<Channel | null>();
    for (const f of frames) colors.add(dominant(await avgRgb(f)));
    // 전체 추출이면 빨강·초록·파랑이 모두 등장한다 → 구간 추출과 명확히 구분된다.
    expect(colors.has("r")).toBe(true);
    expect(colors.has("g")).toBe(true);
    expect(colors.has("b")).toBe(true);
  }, 60000);
});

describe("샘플 데모 진입 → 프레임 → 선택 → 생성 end-to-end (Mock)", () => {
  beforeEach(() => resetStore());

  it("startSampleDemo 로 시작해 결과 영상까지 도달한다", async () => {
    const job = await startSampleDemo(10);
    expect(job.inputType).toBe("video");
    expect(job.status).toBe("ready_to_generate");

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

  it("시작점을 다르게 주면 추출 프레임도 달라진다", async () => {
    const a = await startSampleDemo(0);
    const b = await startSampleDemo(20);
    const framesA = listAssetsByJobAndType(a.id, "extracted_frame");
    const framesB = listAssetsByJobAndType(b.id, "extracted_frame");
    expect(framesA.length).toBeGreaterThanOrEqual(1);
    expect(framesB.length).toBeGreaterThanOrEqual(1);

    const storage = getStorage();
    const keyOf = (url: string) => url.split("/api/files/")[1];
    const bytesA = await storage.readObject(keyOf(framesA[0].storageUrl));
    const bytesB = await storage.readObject(keyOf(framesB[0].storageUrl));
    // 다른 10초 구간 → 첫 프레임 픽셀이 동일하지 않다.
    expect(Buffer.compare(bytesA, bytesB)).not.toBe(0);
  }, 60000);
});
