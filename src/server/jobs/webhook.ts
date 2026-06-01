import { createProviderEvent, findJobByProviderJobId } from "@/server/db/repo";
import type { NormalizedProviderEvent } from "@/server/provider/types";
import { completeJob, failJob } from "./service";

// provider webhook 처리. 이벤트를 저장하고 job 상태를 갱신한다.
// completeJob 이 idempotent 하므로 중복 완료 이벤트는 중복 output 을 만들지 않는다
// (ARCHITECTURE: webhook handler must be idempotent — 최소 보장).
export async function handleProviderWebhook(
  event: NormalizedProviderEvent,
): Promise<void> {
  createProviderEvent({
    provider: event.provider,
    providerJobId: event.providerJobId,
    eventType: event.eventType,
    payloadJson: event.raw,
    processedAt: new Date().toISOString(),
  });

  if (!event.providerJobId) return;
  const job = findJobByProviderJobId(event.providerJobId);
  if (!job) return;

  if (event.status === "succeeded" && event.outputUrl) {
    await completeJob(job, event.outputUrl);
  } else if (event.status === "failed") {
    failJob(
      job.id,
      "provider_failed",
      event.errorMessage ?? "AI 영상 생성에 실패했습니다. 다시 시도해주세요.",
    );
  }
}
