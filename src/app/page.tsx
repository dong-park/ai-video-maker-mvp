"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_IMAGES,
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
  SAMPLE_MAX_START,
  SAMPLE_WINDOW_SECONDS,
} from "@/lib/config";
import {
  createImagesJob,
  startSampleDemo,
  uploadMany,
  uploadVideoAndExtract,
  type UploadedAsset,
} from "@/lib/client";

type Tab = "images" | "video";

export default function UploadPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("images");
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleStart, setSampleStart] = useState(0);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;

    const invalid = picked.find(
      (f) => !(IMAGE_MIME_TYPES as readonly string[]).includes(f.type),
    );
    if (invalid) {
      setError("지원하지 않는 파일 형식입니다. (JPG, PNG, WEBP)");
      return;
    }
    if (assets.length + picked.length > MAX_IMAGES) {
      setError(`이미지는 최대 ${MAX_IMAGES}장까지 올릴 수 있습니다.`);
      return;
    }

    setBusy(true);
    try {
      const uploaded = await uploadMany(picked);
      setAssets((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function onPickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!(VIDEO_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("지원하지 않는 파일 형식입니다. (MP4, MOV)");
      return;
    }
    setBusy(true);
    try {
      const { jobId } = await uploadVideoAndExtract(file);
      router.push(`/jobs/${jobId}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
      setBusy(false);
    }
  }

  async function onNext() {
    if (assets.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const jobId = await createImagesJob(assets.map((a) => a.assetId));
      router.push(`/jobs/${jobId}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "다음 단계로 이동하지 못했습니다.");
      setBusy(false);
    }
  }

  async function onTrySample() {
    setBusy(true);
    setError(null);
    try {
      const { jobId } = await startSampleDemo(sampleStart);
      router.push(`/jobs/${jobId}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "샘플을 시작하지 못했습니다.");
      setBusy(false);
    }
  }

  function removeAt(i: number) {
    setAssets((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <main>
      <span className="step-label">Step 1 · 올리기</span>
      <h1>사진 여러 장이나 짧은 영상을 올리면 AI가 릴스용 영상을 만들어줘요.</h1>
      <p className="subcopy">편집 없이, 스타일만 고르면 5초 MP4로 완성됩니다.</p>

      <div className="tab-row">
        <button
          className={tab === "images" ? "active" : ""}
          onClick={() => setTab("images")}
        >
          이미지 올리기
        </button>
        <button
          className={tab === "video" ? "active" : ""}
          onClick={() => setTab("video")}
        >
          비디오 올리기
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {tab === "images" ? (
        <>
          {assets.length > 0 && (
            <div className="grid-2" style={{ marginBottom: 14 }}>
              {assets.map((a, i) => (
                <div className="thumb" key={a.assetId}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.storageUrl} alt={`이미지 ${i + 1}`} />
                  <span className="idx">{i + 1}</span>
                  <button
                    className="remove"
                    onClick={() => removeAt(i)}
                    aria-label="삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={imageInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={onPickImages}
          />
          <button
            className="btn btn-secondary"
            disabled={busy || assets.length >= MAX_IMAGES}
            onClick={() => imageInput.current?.click()}
          >
            {assets.length === 0
              ? "이미지 선택 (1~6장)"
              : `이미지 더 추가 (${assets.length}/${MAX_IMAGES})`}
          </button>
          <p className="hint">JPG · PNG · WEBP, 최대 {MAX_IMAGES}장</p>
        </>
      ) : (
        <>
          <input
            ref={videoInput}
            type="file"
            accept="video/mp4,video/quicktime"
            hidden
            onChange={onPickVideo}
          />
          <button
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => videoInput.current?.click()}
          >
            비디오 선택
          </button>
          <p className="hint">MP4 · MOV, 60초 / 100MB 이하. 업로드 후 프레임을 추출합니다.</p>
        </>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <p className="section-title" style={{ marginTop: 0 }}>
          처음이신가요?
        </p>
        <p className="hint" style={{ marginTop: 0 }}>
          내 파일 없이 샘플 영상으로 바로 만들어볼 수 있어요. 10초 구간의 시작점을
          골라 시작하세요.
        </p>
        <label className="hint" htmlFor="sample-start">
          구간: {sampleStart}초 ~ {sampleStart + SAMPLE_WINDOW_SECONDS}초
        </label>
        <input
          id="sample-start"
          type="range"
          min={0}
          max={SAMPLE_MAX_START}
          step={1}
          value={sampleStart}
          onChange={(e) => setSampleStart(Number(e.target.value))}
          style={{ width: "100%", margin: "8px 0 14px" }}
        />
        <button className="btn btn-secondary" disabled={busy} onClick={onTrySample}>
          {busy ? "준비 중…" : "샘플로 해보기 →"}
        </button>
      </div>

      {tab === "images" && (
        <div className="bottom-cta">
          <button className="btn" disabled={busy || assets.length === 0} onClick={onNext}>
            {busy ? "처리 중…" : "다음"}
          </button>
        </div>
      )}
    </main>
  );
}
