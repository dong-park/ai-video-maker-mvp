import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// provider output(또는 mock 로컬 sample)의 바이트를 가져온다.
// http(s)면 다운로드, 아니면 로컬 파일 경로로 읽는다 (mock).
export async function fetchSourceBytes(
  sourceUrl: string,
): Promise<{ data: Buffer; contentType: string | null }> {
  if (/^https?:\/\//.test(sourceUrl)) {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      throw new Error(`source fetch failed: ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return { data: buf, contentType: res.headers.get("content-type") };
  }
  // 로컬 파일 경로 (MockProvider 가 번들 sample.mp4 경로를 반환).
  const data = await readFile(sourceUrl);
  return { data, contentType: "video/mp4" };
}

// 비디오 바이트에서 대표 프레임(썸네일)을 추출한다. best-effort — 실패 시 null.
export async function generateThumbnail(videoData: Buffer): Promise<Buffer | null> {
  let dir: string | null = null;
  try {
    dir = await mkdtemp(path.join(tmpdir(), "aivm-thumb-"));
    const input = path.join(dir, "in.mp4");
    const output = path.join(dir, "out.jpg");
    await writeFile(input, videoData);
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      input,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      output,
    ]);
    return await readFile(output);
  } catch {
    return null;
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
