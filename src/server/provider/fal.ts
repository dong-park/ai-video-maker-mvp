import { FAL_DEFAULT_MODEL, publicBaseUrl } from "@/lib/config";
import type {
  NormalizedProviderEvent,
  ProviderAdapter,
  ProviderStatus,
  SubmitResult,
  VideoGenerationInput,
} from "./types";

// 실제 fal.ai 어댑터. FAL_KEY 가 있을 때만 활성화된다 (config.hasFalKey).
// fal queue API: https://fal.ai/docs/model-endpoints/queue
// 멀티 이미지는 hero(첫) 이미지로 호출한다 (IMPLEMENTATION_PLAN Technical Risks).
const QUEUE_BASE = "https://queue.fal.run";

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Key ${process.env.FAL_KEY}`,
    "Content-Type": "application/json",
  };
}

function mapStatus(falStatus: string): ProviderStatus["status"] {
  switch (falStatus) {
    case "IN_QUEUE":
      return "queued";
    case "IN_PROGRESS":
      return "generating";
    case "COMPLETED":
      return "succeeded";
    default:
      return "failed";
  }
}

function extractOutputUrl(payload: unknown): string | undefined {
  const p = payload as { video?: { url?: string }; url?: string } | undefined;
  return p?.video?.url ?? p?.url;
}

export class FalProvider implements ProviderAdapter {
  readonly name = "fal";
  private model = FAL_DEFAULT_MODEL;

  async submit(input: VideoGenerationInput): Promise<SubmitResult> {
    const webhook = `${publicBaseUrl()}/api/webhooks/fal`;
    const body = {
      prompt: input.prompt,
      negative_prompt: input.negativePrompt,
      image_url: input.imageUrls[0],
      duration: String(input.durationSeconds),
      aspect_ratio: input.aspectRatio,
    };
    const res = await fetch(
      `${QUEUE_BASE}/${this.model}?fal_webhook=${encodeURIComponent(webhook)}`,
      { method: "POST", headers: authHeaders(), body: JSON.stringify(body) },
    );
    if (!res.ok) {
      throw new Error(`fal submit failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { request_id: string; status?: string };
    return {
      provider: this.name,
      providerModel: this.model,
      providerJobId: data.request_id,
      status: data.status === "IN_PROGRESS" ? "generating" : "queued",
    };
  }

  async getStatus(providerJobId: string): Promise<ProviderStatus> {
    const statusRes = await fetch(
      `${QUEUE_BASE}/${this.model}/requests/${providerJobId}/status`,
      { headers: authHeaders() },
    );
    if (!statusRes.ok) {
      throw new Error(`fal status failed: ${statusRes.status}`);
    }
    const statusData = (await statusRes.json()) as { status: string };
    const status = mapStatus(statusData.status);

    if (status !== "succeeded") {
      return { status, progress: status === "generating" ? 50 : 10 };
    }

    const resultRes = await fetch(
      `${QUEUE_BASE}/${this.model}/requests/${providerJobId}`,
      { headers: authHeaders() },
    );
    if (!resultRes.ok) {
      throw new Error(`fal result failed: ${resultRes.status}`);
    }
    const result = await resultRes.json();
    return { status: "succeeded", progress: 100, outputUrl: extractOutputUrl(result) };
  }

  normalizeWebhook(payload: unknown): NormalizedProviderEvent {
    const body = (payload ?? {}) as {
      request_id?: string;
      gateway_request_id?: string;
      status?: string;
      payload?: unknown;
      error?: string;
    };
    const ok = body.status === "OK";
    return {
      provider: this.name,
      providerJobId: body.request_id ?? body.gateway_request_id ?? null,
      eventType: ok ? "completed" : "failed",
      status: ok ? "succeeded" : "failed",
      outputUrl: ok ? extractOutputUrl(body.payload) : undefined,
      errorMessage: ok ? undefined : body.error,
      raw: body as Record<string, unknown>,
    };
  }
}
