import { hasFalKey } from "@/lib/config";
import { FalProvider } from "./fal";
import { MockProvider } from "./mock";
import type { ProviderAdapter } from "./types";

let cached: ProviderAdapter | null = null;

// FAL_KEY 가 있으면 실제 fal, 없으면 mock.
export function getProvider(): ProviderAdapter {
  if (cached) return cached;
  cached = hasFalKey() ? new FalProvider() : new MockProvider();
  return cached;
}
