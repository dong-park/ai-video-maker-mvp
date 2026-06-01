import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { publicBaseUrl } from "@/lib/config";
import type { StorageClient } from "./index";

// 로컬 파일 스토리지 폴백. 키 없이 dev/test 가 돌도록 .storage 디렉터리에 저장한다.
// 공개 URL은 /api/files/<key> 라우트가 서빙한다.
const ROOT = path.join(process.cwd(), ".storage");

function fsPath(key: string): string {
  // 경로 traversal 방지.
  const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(ROOT, safe);
}

export class LocalStorage implements StorageClient {
  readonly driver = "local" as const;

  async putObject(key: string, data: Buffer, _contentType: string): Promise<void> {
    void _contentType;
    const target = fsPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
  }

  publicUrl(key: string): string {
    return `${publicBaseUrl()}/api/files/${key}`;
  }

  async presignPut(): Promise<string | null> {
    // 로컬은 presigned 업로드가 없다 — 서버 blob 엔드포인트를 사용한다.
    return null;
  }

  async readObject(key: string): Promise<Buffer> {
    return readFile(fsPath(key));
  }
}
