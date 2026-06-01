import { newId } from "@/lib/ids";
import type {
  GeneratedOutput,
  MediaAsset,
  ProviderEvent,
  VideoJob,
} from "@/lib/types";
import { getStore } from "./store";

function nowIso(): string {
  return new Date().toISOString();
}

// ---- media_assets ----

export function createMediaAsset(
  input: Omit<MediaAsset, "id" | "createdAt"> & { id?: string },
): MediaAsset {
  const asset: MediaAsset = {
    ...input,
    id: input.id ?? newId("asset"),
    createdAt: nowIso(),
  };
  getStore().mediaAssets.set(asset.id, asset);
  return asset;
}

export function getMediaAsset(id: string): MediaAsset | undefined {
  return getStore().mediaAssets.get(id);
}

export function updateMediaAsset(
  id: string,
  patch: Partial<MediaAsset>,
): MediaAsset | undefined {
  const existing = getStore().mediaAssets.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, id: existing.id };
  getStore().mediaAssets.set(id, updated);
  return updated;
}

export function deleteMediaAsset(id: string): void {
  getStore().mediaAssets.delete(id);
}

export function listAssetsByJob(jobId: string): MediaAsset[] {
  return [...getStore().mediaAssets.values()]
    .filter((a) => a.jobId === jobId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function listAssetsByJobAndType(
  jobId: string,
  type: MediaAsset["type"],
): MediaAsset[] {
  return listAssetsByJob(jobId).filter((a) => a.type === type);
}

// ---- video_jobs ----

export function createVideoJob(
  input: Omit<VideoJob, "id" | "createdAt"> & { id?: string },
): VideoJob {
  const job: VideoJob = {
    ...input,
    id: input.id ?? newId("job"),
    createdAt: nowIso(),
  };
  getStore().videoJobs.set(job.id, job);
  return job;
}

export function getVideoJob(id: string): VideoJob | undefined {
  return getStore().videoJobs.get(id);
}

export function updateVideoJob(
  id: string,
  patch: Partial<VideoJob>,
): VideoJob | undefined {
  const existing = getStore().videoJobs.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, id: existing.id };
  getStore().videoJobs.set(id, updated);
  return updated;
}

export function findJobByProviderJobId(
  providerJobId: string,
): VideoJob | undefined {
  return [...getStore().videoJobs.values()].find(
    (j) => j.providerJobId === providerJobId,
  );
}

// ---- generated_outputs ----

export function createGeneratedOutput(
  input: Omit<GeneratedOutput, "id" | "createdAt"> & { id?: string },
): GeneratedOutput {
  const output: GeneratedOutput = {
    ...input,
    id: input.id ?? newId("output"),
    createdAt: nowIso(),
  };
  getStore().generatedOutputs.set(output.id, output);
  return output;
}

export function getOutputByJob(jobId: string): GeneratedOutput | undefined {
  return [...getStore().generatedOutputs.values()].find(
    (o) => o.jobId === jobId,
  );
}

// ---- provider_events ----

export function createProviderEvent(
  input: Omit<ProviderEvent, "id" | "receivedAt"> & {
    id?: string;
    receivedAt?: string;
  },
): ProviderEvent {
  const event: ProviderEvent = {
    ...input,
    id: input.id ?? newId("evt"),
    receivedAt: input.receivedAt ?? nowIso(),
  };
  getStore().providerEvents.set(event.id, event);
  return event;
}
