import path from "node:path";
import { newId } from "@/lib/ids";
import { MOCK_MODEL } from "@/lib/config";
import type {
  NormalizedProviderEvent,
  ProviderAdapter,
  ProviderStatus,
  SubmitResult,
  VideoGenerationInput,
} from "./types";

// 키 없이도 전체 플로우가 돌도록 하는 가짜 provider.
// 고정 샘플 MP4(번들된 public/mock/sample.mp4)를 결과로 반환한다.
// getStatus 폴링 횟수 기반으로 결정적으로 진행한다 (queued→generating→succeeded).

const POLLS_TO_COMPLETE = Number(process.env.MOCK_POLLS_TO_COMPLETE ?? 2);

type MockState = { polls: number };

declare global {
  // eslint-disable-next-line no-var
  var __aiVideoMockState: Map<string, MockState> | undefined;
}

function states(): Map<string, MockState> {
  if (!globalThis.__aiVideoMockState) {
    globalThis.__aiVideoMockState = new Map();
  }
  return globalThis.__aiVideoMockState;
}

export function mockSamplePath(): string {
  return path.join(process.cwd(), "public", "mock", "sample.mp4");
}

export class MockProvider implements ProviderAdapter {
  readonly name = "mock";

  async submit(_input: VideoGenerationInput): Promise<SubmitResult> {
    void _input;
    const providerJobId = newId("mockreq");
    states().set(providerJobId, { polls: 0 });
    return {
      provider: this.name,
      providerModel: MOCK_MODEL,
      providerJobId,
      status: "queued",
    };
  }

  async getStatus(providerJobId: string): Promise<ProviderStatus> {
    const state = states().get(providerJobId) ?? { polls: 0 };
    state.polls += 1;
    states().set(providerJobId, state);

    if (state.polls >= POLLS_TO_COMPLETE) {
      return {
        status: "succeeded",
        progress: 100,
        outputUrl: mockSamplePath(),
      };
    }
    return { status: "generating", progress: 50 };
  }

  normalizeWebhook(payload: unknown): NormalizedProviderEvent {
    const body = (payload ?? {}) as Record<string, unknown>;
    const providerJobId =
      typeof body.providerJobId === "string" ? body.providerJobId : null;
    const ok = body.status === "succeeded" || body.status === "OK";
    return {
      provider: this.name,
      providerJobId,
      eventType: ok ? "completed" : "failed",
      status: ok ? "succeeded" : "failed",
      outputUrl: ok ? mockSamplePath() : undefined,
      raw: body,
    };
  }
}
