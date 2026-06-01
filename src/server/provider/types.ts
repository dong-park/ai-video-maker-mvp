import type { AspectRatio, Duration } from "@/lib/types";

// ARCHITECTURE.md 5절 Provider Adapter Interface 그대로.
export type VideoGenerationInput = {
  jobId: string;
  prompt: string;
  negativePrompt?: string;
  imageUrls: string[];
  aspectRatio: AspectRatio;
  durationSeconds: Duration;
  style: string;
};

export type SubmitResult = {
  provider: string;
  providerModel: string;
  providerJobId: string;
  status: "queued" | "generating";
};

export type ProviderStatusValue = "queued" | "generating" | "succeeded" | "failed";

export type ProviderStatus = {
  status: ProviderStatusValue;
  progress?: number;
  outputUrl?: string;
  errorCode?: string;
  errorMessage?: string;
};

// normalizeWebhook 결과 (정규화된 provider 이벤트).
export type NormalizedProviderEvent = {
  provider: string;
  providerJobId: string | null;
  eventType: string;
  status: ProviderStatusValue;
  outputUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  raw: Record<string, unknown>;
};

export type ProviderAdapter = {
  readonly name: string;
  submit(input: VideoGenerationInput): Promise<SubmitResult>;
  getStatus(providerJobId: string): Promise<ProviderStatus>;
  normalizeWebhook(payload: unknown): NormalizedProviderEvent;
};
