import { hasS3Config } from "@/lib/config";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";

// 스토리지 추상화. env에 S3/R2 키가 있으면 실제 S3Storage, 없으면 로컬 파일 폴백.
export interface StorageClient {
  readonly driver: "local" | "s3";
  // 서버측 바이트 저장 (blob 업로드, provider output 복사, 프레임/썸네일).
  putObject(key: string, data: Buffer, contentType: string): Promise<void>;
  // 사용자에게 노출할 공개 URL.
  publicUrl(key: string): string;
  // 클라이언트가 직접 PUT 할 presigned URL. 로컬은 null(서버 blob 엔드포인트 사용).
  presignPut(key: string, contentType: string): Promise<string | null>;
  // 저장된 객체 읽기 (로컬 서빙/복사용).
  readObject(key: string): Promise<Buffer>;
}

let cached: StorageClient | null = null;

export function getStorage(): StorageClient {
  if (cached) return cached;
  cached = hasS3Config() ? new S3Storage() : new LocalStorage();
  return cached;
}

const EXT_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

export function contentTypeForKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return EXT_CONTENT_TYPE[ext] ?? "application/octet-stream";
}

export function extForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    default:
      return "bin";
  }
}
