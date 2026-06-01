"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchJob } from "@/lib/client";
import type { JobStatus } from "@/lib/types";

const STEPS: { status: JobStatus[]; label: string }[] = [
  { status: ["created", "ready_to_generate"], label: "업로드 정리 중" },
  { status: ["extracting_frames"], label: "프레임 추출 중" },
  { status: ["queued"], label: "AI 영상 생성 대기 중" },
  { status: ["generating"], label: "AI 영상 생성 중" },
  { status: ["saving_output"], label: "영상 저장 중" },
  { status: ["succeeded"], label: "완료" },
];

const ORDER: JobStatus[] = [
  "created",
  "ready_to_generate",
  "extracting_frames",
  "queued",
  "generating",
  "saving_output",
  "succeeded",
];

export default function GeneratingPage() {
  const router = useRouter();
  const { jobId } = useParams<{ jobId: string }>();
  const [status, setStatus] = useState<JobStatus>("queued");
  const [serverProgress, setServerProgress] = useState(10);
  const [pseudo, setPseudo] = useState(10);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const stopped = useRef(false);

  // 폴링 (drive-on-read 로 서버가 상태를 전진시킨다).
  useEffect(() => {
    stopped.current = false;
    async function poll() {
      while (!stopped.current) {
        try {
          const j = await fetchJob(jobId);
          setStatus(j.status);
          setServerProgress(j.progress);
          if (j.status === "succeeded") {
            router.replace(`/jobs/${jobId}/result`);
            return;
          }
          if (j.status === "failed") {
            setErrorMessage(j.errorMessage ?? "AI 영상 생성에 실패했습니다.");
            return;
          }
        } catch {
          // 일시적 오류는 다음 폴링에서 재시도.
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    void poll();
    return () => {
      stopped.current = true;
    };
  }, [jobId, router]);

  // generating 동안 멈춘 듯 보이지 않도록 pseudo progress 를 올린다 (UX_FLOWS).
  useEffect(() => {
    const t = setInterval(() => {
      setPseudo((p) => (status === "generating" && p < 85 ? p + 2 : p));
    }, 700);
    return () => clearInterval(t);
  }, [status]);

  const display = Math.min(100, Math.max(serverProgress, pseudo));
  const currentIdx = ORDER.indexOf(status);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/jobs/${jobId}/result`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 권한 없을 수 있음
    }
  }

  if (errorMessage) {
    return (
      <main>
        <span className="step-label">Step 4 · 생성</span>
        <h1>이번 생성은 실패했어요.</h1>
        <p className="subcopy">크레딧은 차감되지 않았고 다시 시도할 수 있습니다.</p>
        <div className="error-box">{errorMessage}</div>
        <div className="bottom-cta stack">
          <button
            className="btn"
            onClick={() => router.replace(`/jobs/${jobId}/style`)}
          >
            다른 스타일로 다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <span className="step-label">Step 4 · 생성</span>
      <h1>영상을 만들고 있어요.</h1>
      <p className="subcopy">
        보통 1~2분 정도 걸려요. 창을 닫아도 결과 페이지에서 다시 확인할 수 있습니다.
      </p>

      <div className="progress-bar">
        <div style={{ width: `${display}%` }} />
      </div>

      <ul className="status-list">
        {STEPS.map((step) => {
          const stepIdx = ORDER.indexOf(step.status[step.status.length - 1]);
          const isActive = step.status.includes(status);
          const isDone = stepIdx < currentIdx;
          return (
            <li
              key={step.label}
              className={isActive ? "active" : isDone ? "done" : ""}
            >
              {isDone ? "✓ " : isActive ? "● " : "○ "}
              {step.label}
            </li>
          );
        })}
      </ul>

      <div className="bottom-cta stack">
        <button className="btn btn-secondary" onClick={copyLink}>
          {copied ? "링크 복사됨!" : "결과 페이지 링크 복사"}
        </button>
        <button className="btn btn-ghost" onClick={() => router.push("/")}>
          그만두기
        </button>
      </div>
    </main>
  );
}
