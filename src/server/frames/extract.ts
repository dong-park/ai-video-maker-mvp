import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// 너무 어두운 프레임으로 간주하는 평균 밝기 임계값 (0~255).
const DARK_THRESHOLD = 24;

export type ExtractOptions = {
  intervalSeconds?: number;
  maxFrames?: number;
  // 추출 구간. startSeconds(기본 0)부터 windowSeconds 길이만 추출.
  // 둘 다 생략하면 기존처럼 영상 전체에서 추출한다.
  startSeconds?: number;
  windowSeconds?: number;
};

// 비디오 길이(초). ffprobe 실패 시 null.
export async function probeDurationSeconds(
  videoData: Buffer,
): Promise<number | null> {
  let dir: string | null = null;
  try {
    dir = await mkdtemp(path.join(tmpdir(), "aivm-probe-"));
    const input = path.join(dir, "in.mp4");
    await writeFile(input, videoData);
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      input,
    ]);
    const seconds = Number.parseFloat(stdout.toString().trim());
    return Number.isFinite(seconds) ? seconds : null;
  } catch {
    return null;
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// 한 프레임 이미지의 평균 밝기(0~255). 1x1 gray 로 다운스케일해서 단일 픽셀을 읽는다.
async function avgBrightness(jpegPath: string): Promise<number> {
  const { stdout } = await execFileAsync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      jpegPath,
      "-vf",
      "scale=1:1",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "gray",
      "-",
    ],
    { encoding: "buffer", maxBuffer: 1024 },
  );
  const buf = stdout as unknown as Buffer;
  return buf.length > 0 ? buf[0] : 255;
}

// 비디오에서 프레임을 추출한다.
// - intervalSeconds 마다 1프레임 (기본 2초)
// - mpdecimate 로 거의 동일한(near-duplicate) 프레임 제거
// - 너무 어두운 프레임 제거
// - 최대 maxFrames 장 (기본 12)
export async function extractFrames(
  videoData: Buffer,
  opts: ExtractOptions = {},
): Promise<Buffer[]> {
  const intervalSeconds = opts.intervalSeconds ?? 2;
  const maxFrames = opts.maxFrames ?? 12;
  const startSeconds = opts.startSeconds ?? 0;
  const windowSeconds = opts.windowSeconds;

  let dir: string | null = null;
  try {
    dir = await mkdtemp(path.join(tmpdir(), "aivm-frames-"));
    const input = path.join(dir, "in.mp4");
    await writeFile(input, videoData);

    const args = ["-y", "-i", input];
    // 구간 추출: -i 뒤(출력 시킹)에 -ss/-t 를 붙여 프레임 단위로 정확히 [start, start+window] 만 디코드.
    // 구간 옵션이 없으면 인자를 추가하지 않아 기존 전체 추출 동작이 그대로 유지된다.
    if (startSeconds > 0) args.push("-ss", String(startSeconds));
    if (windowSeconds !== undefined) args.push("-t", String(windowSeconds));
    args.push(
      "-vf",
      `fps=1/${intervalSeconds},mpdecimate=hi=768:lo=384:frac=0.33,scale=512:-1`,
      "-vsync",
      "vfr",
      "-frames:v",
      String(maxFrames),
      "-q:v",
      "3",
      path.join(dir, "f_%03d.jpg"),
    );
    await execFileAsync("ffmpeg", args);

    const files = (await readdir(dir))
      .filter((f) => f.startsWith("f_") && f.endsWith(".jpg"))
      .sort();

    const kept: Buffer[] = [];
    for (const file of files) {
      const full = path.join(dir, file);
      const brightness = await avgBrightness(full).catch(() => 255);
      if (brightness < DARK_THRESHOLD) continue;
      kept.push(await readFile(full));
      if (kept.length >= maxFrames) break;
    }
    return kept;
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
