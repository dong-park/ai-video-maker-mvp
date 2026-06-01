import { errorJson, json } from "@/server/http";
import { handleProviderWebhook } from "@/server/jobs/webhook";
import { getProvider } from "@/server/provider";

// POST /api/webhooks/fal — provider 완료/실패 webhook. idempotent.
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return errorJson("잘못된 요청 본문입니다.", 400, "invalid_input");
  }

  const event = getProvider().normalizeWebhook(payload);
  await handleProviderWebhook(event);
  return json({ ok: true });
}
