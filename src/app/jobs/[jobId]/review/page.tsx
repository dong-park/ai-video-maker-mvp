"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { JobResponse } from "@/lib/api";
import { MAX_IMAGES, IMAGE_MIME_TYPES } from "@/lib/config";
import {
  fetchJob,
  patchImages,
  selectFrames,
  uploadMany,
} from "@/lib/client";

type Item = { id: string; storageUrl: string };

export default function ReviewPage() {
  const router = useRouter();
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobResponse | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const j = await fetchJob(jobId);
      setJob(j);
      const sorted = [...j.assets].sort((a, b) => a.sortOrder - b.sortOrder);
      setItems(sorted.map((a) => ({ id: a.id, storageUrl: a.storageUrl })));
      setSelected(new Set(sorted.filter((a) => a.selected).map((a) => a.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오지 못했습니다.");
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !job) return <main><div className="error-box">{error}</div></main>;
  if (!job) return <main><div className="spinner" /></main>;

  const isVideo = job.inputType === "video";

  // ----- 이미지 리뷰 -----
  function move(i: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function removeAt(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  async function onAddImages(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;
    if (picked.some((f) => !(IMAGE_MIME_TYPES as readonly string[]).includes(f.type))) {
      setError("지원하지 않는 파일 형식입니다.");
      return;
    }
    if (items.length + picked.length > MAX_IMAGES) {
      setError(`이미지는 최대 ${MAX_IMAGES}장까지 올릴 수 있습니다.`);
      return;
    }
    setBusy(true);
    try {
      const uploaded = await uploadMany(picked);
      setItems((prev) => [...prev, ...uploaded.map((u) => ({ id: u.assetId, storageUrl: u.storageUrl }))]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setBusy(false);
    }
  }

  // ----- 프레임 리뷰 -----
  function toggleFrame(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onNext() {
    setBusy(true);
    setError(null);
    try {
      if (isVideo) {
        if (selected.size === 0) {
          setError("최소 1장의 프레임을 선택해주세요.");
          setBusy(false);
          return;
        }
        await selectFrames(jobId, [...selected]);
      } else {
        if (items.length === 0) {
          setError("최소 1장의 이미지가 필요합니다.");
          setBusy(false);
          return;
        }
        await patchImages(jobId, items.map((it) => it.id));
      }
      router.push(`/jobs/${jobId}/style`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
      setBusy(false);
    }
  }

  return (
    <main>
      <span className="step-label">Step 2 · 확인</span>
      {isVideo ? (
        <>
          <h1>AI 영상에 사용할 장면을 골라주세요.</h1>
          <p className="subcopy">보통 3~6장이 가장 자연스럽습니다. 너무 많이 고르면 결과가 불안정할 수 있어요.</p>
        </>
      ) : (
        <>
          <h1>이미지 순서를 확인하세요.</h1>
          <p className="subcopy">첫 번째 이미지가 영상의 시작 장면이 됩니다.</p>
        </>
      )}

      {error && <div className="error-box">{error}</div>}

      {isVideo ? (
        <>
          <p className="hint">선택됨 {selected.size}장</p>
          <div className="grid-2">
            {items.map((it) => {
              const on = selected.has(it.id);
              return (
                <div
                  key={it.id}
                  className={`thumb selectable ${on ? "" : "unselected"}`}
                  onClick={() => toggleFrame(it.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.storageUrl} alt="프레임" />
                  {on && <span className="check">✓</span>}
                </div>
              );
            })}
          </div>
          {items.length === 0 && (
            <p className="hint">사용할 만한 장면을 찾지 못했어요. 다른 영상을 올리거나 직접 이미지를 올려주세요.</p>
          )}
        </>
      ) : (
        <>
          <div className="grid-2">
            {items.map((it, i) => (
              <div className="thumb" key={it.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.storageUrl} alt={`이미지 ${i + 1}`} />
                <span className="idx">{i + 1}</span>
                <button className="remove" onClick={() => removeAt(i)} aria-label="삭제">
                  ×
                </button>
                <span className="order">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="앞으로">
                    ↑
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    aria-label="뒤로"
                  >
                    ↓
                  </button>
                </span>
              </div>
            ))}
          </div>
          <input
            ref={addInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={onAddImages}
          />
          <button
            className="btn btn-ghost"
            style={{ marginTop: 12 }}
            disabled={busy || items.length >= MAX_IMAGES}
            onClick={() => addInput.current?.click()}
          >
            이미지 추가 ({items.length}/{MAX_IMAGES})
          </button>
        </>
      )}

      <div className="bottom-cta">
        <button className="btn" disabled={busy} onClick={onNext}>
          {busy ? "저장 중…" : "다음"}
        </button>
      </div>
    </main>
  );
}
