import { contentTypeForKey, getStorage } from "@/server/storage";

// GET /api/files/<key> — 로컬 파일 스토리지 서빙. ?download=1 이면 첨부로 내려준다.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const storage = getStorage();
  if (storage.driver !== "local") {
    // S3/R2 사용 시에는 CDN/공개 URL 로 직접 서빙된다.
    return new Response("Not found", { status: 404 });
  }

  const { key: segments } = await params;
  const key = segments.join("/");

  let data: Buffer;
  try {
    data = await storage.readObject(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const headers = new Headers({
    "Content-Type": contentTypeForKey(key),
    "Content-Length": String(data.length),
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  if (url.searchParams.get("download") === "1") {
    const filename = key.split("/").pop() ?? "download";
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  }

  return new Response(new Uint8Array(data), { status: 200, headers });
}
