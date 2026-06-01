"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { JobResponse } from "@/lib/api";
import { fetchJob, regenerate, type RegenerateMode } from "@/lib/client";

export default function ResultPage() {
  const router = useRouter();
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchJob(jobId)
      .then((j) => {
        if (j.status !== "succeeded" && j.status !== "failed") {
          router.replace(`/jobs/${jobId}/generating`);
          return;
        }
        setJob(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "불러오지 못했습니다."));
  }, [jobId, router]);

  async function onRegenerate(mode: RegenerateMode) {
    setBusy(true);
    setError(null);
    try {
      const { jobId: newJobId, next } = await regenerate(jobId, mode);
      if (next === "style") router.push(`/jobs/${newJobId}/style`);
      else router.push(`/jobs/${newJobId}/generating`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "재생성에 실패했습니다.");
      setBusy(false);
    }
  }

  if (error) return <main><div className="error-box">{error}</div></main>;
  if (!job) return <main><div className="spinner" /></main>;

  if (job.status === "failed" || !job.output) {
    return (
      <main>
        <span className="step-label">Step 5 · 결과</span>
        <h1>이번 생성은 실패했어요.</h1>
        <p className="subcopy">크레딧은 차감되지 않았고 다시 시도할 수 있습니다.</p>
        {job.errorMessage && <div className="error-box">{job.errorMessage}</div>}
        <div className="bottom-cta stack">
          <button className="btn" disabled={busy} onClick={() => onRegenerate("same")}>
            같은 설정으로 다시 만들기
          </button>
          <button className="btn btn-secondary" disabled={busy} onClick={() => onRegenerate("restyle")}>
            다른 스타일로 다시 만들기
          </button>
        </div>
      </main>
    );
  }

  const downloadUrl = `${job.output.videoUrl}?download=1`;

  return (
    <main>
      <span className="step-label">Step 5 · 결과</span>
      <h1>영상이 완성됐어요.</h1>

      <video src={job.output.videoUrl} controls playsInline poster={job.output.thumbnailUrl ?? undefined} />

      <div className="stack" style={{ marginTop: 16 }}>
        <a className="btn" href={downloadUrl}>
          다운로드
        </a>
        <button className="btn btn-secondary" disabled={busy} onClick={() => onRegenerate("same")}>
          같은 설정으로 다시 만들기
        </button>
        <button className="btn btn-secondary" disabled={busy} onClick={() => onRegenerate("weak_motion")}>
          움직임 약하게 다시 만들기
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => onRegenerate("restyle")}>
          다른 스타일로 다시 만들기
        </button>
        <button className="btn btn-ghost" onClick={() => router.push(`/jobs/${jobId}/review`)}>
          원본 소스 보기
        </button>
      </div>
    </main>
  );
}
