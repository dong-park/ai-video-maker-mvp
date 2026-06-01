import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageClient } from "./index";

// 실제 R2/S3 클라이언트. env에 S3_* 키가 있을 때만 활성화된다 (config.hasS3Config).
// R2도 S3 호환이므로 S3_ENDPOINT로 endpoint를 덮어쓰면 동작한다.
export class S3Storage implements StorageClient {
  readonly driver = "s3" as const;
  private client: S3Client;
  private bucket: string;
  private publicBase: string;

  constructor() {
    const region = process.env.S3_REGION || "auto";
    this.bucket = process.env.S3_BUCKET as string;
    // 공개 베이스 (CDN/R2 public 도메인). 없으면 endpoint/bucket 조합.
    this.publicBase = (
      process.env.S3_PUBLIC_BASE_URL ||
      `${process.env.S3_ENDPOINT ?? ""}/${this.bucket}`
    ).replace(/\/$/, "");

    this.client = new S3Client({
      region,
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
      },
    });
  }

  async putObject(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/${key}`;
  }

  async presignPut(key: string, contentType: string): Promise<string | null> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 900 },
    );
  }

  async readObject(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }
}
