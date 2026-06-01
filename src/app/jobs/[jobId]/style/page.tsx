"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchJob, generate } from "@/lib/client";
import { styleList } from "@/lib/styles";
import type { AspectRatio, Duration, Style } from "@/lib/types";

const RATIOS: { value: AspectRatio; label: string; hint: string }[] = [
  { value: "9:16", label: "9:16", hint: "릴스/쇼츠" },
  { value: "1:1", label: "1:1", hint: "피드/프로필" },
  { value: "16:9", label: "16:9", hint: "유튜브/웹" },
];

const DURATIONS: { value: Duration; label: string }[] = [
  { value: 5, label: "5초 · 빠르고 저렴함" },
  { value: 10, label: "10초 · 풍부하지만 오래 걸림" },
];

export default function StylePage() {
  const router = useRouter();
  const { jobId } = useParams<{ jobId: string }>();
  const [style, setStyle] = useState<Style>("natural_motion");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [durationSeconds, setDuration] = useState<Duration>(5);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJob(jobId)
      .then((j) => {
        setStyle(j.style);
        setAspectRatio(j.aspectRatio);
        setDuration(j.durationSeconds);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [jobId]);

  async function onGenerate() {
    setBusy(true);
    setError(null);
    try {
      await generate(jobId, { style, aspectRatio, durationSeconds });
      router.push(`/jobs/${jobId}/generating`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성을 시작하지 못했습니다.");
      setBusy(false);
    }
  }

  if (!ready) return <main><div className="spinner" /></main>;

  return (
    <main>
      <span className="step-label">Step 3 · 스타일</span>
      <h1>원하는 느낌을 골라주세요.</h1>
      <p className="subcopy">프롬프트는 몰라도 됩니다. 스타일만 고르면 돼요.</p>

      {error && <div className="error-box">{error}</div>}

      {styleList().map((preset) => (
        <button
          key={preset.id}
          className={`style-card ${style === preset.id ? "active" : ""}`}
          onClick={() => setStyle(preset.id)}
        >
          <div className="name">{preset.label}</div>
          <div className="desc">{preset.copy}</div>
          <div className="tags">{preset.bestFor.join(" · ")}</div>
        </button>
      ))}

      <div className="section-title">화면 비율</div>
      <div className="option-row">
        {RATIOS.map((r) => (
          <button
            key={r.value}
            className={aspectRatio === r.value ? "active" : ""}
            onClick={() => setAspectRatio(r.value)}
          >
            {r.label}
            <br />
            <small style={{ color: "var(--muted)" }}>{r.hint}</small>
          </button>
        ))}
      </div>

      <div className="section-title">영상 길이</div>
      <div className="option-row">
        {DURATIONS.map((d) => (
          <button
            key={d.value}
            className={durationSeconds === d.value ? "active" : ""}
            onClick={() => setDuration(d.value)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="bottom-cta">
        <button className="btn" disabled={busy} onClick={onGenerate}>
          {busy ? "시작 중…" : "이 스타일로 영상 만들기"}
        </button>
      </div>
    </main>
  );
}
