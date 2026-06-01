import type {
  GeneratedOutput,
  MediaAsset,
  ProviderEvent,
  VideoJob,
} from "@/lib/types";

// 키 없이도 게이트가 돌도록 하는 in-memory 폴백 스토어.
// Postgres 스키마는 db/migrations/0001_init.sql 가 단일 진실원이고,
// 이 스토어는 동일한 5테이블을 메모리에 표현한다.
// HMR/요청 간 유지를 위해 globalThis 싱글턴으로 둔다.
type Store = {
  mediaAssets: Map<string, MediaAsset>;
  videoJobs: Map<string, VideoJob>;
  generatedOutputs: Map<string, GeneratedOutput>;
  providerEvents: Map<string, ProviderEvent>;
};

declare global {
  // eslint-disable-next-line no-var
  var __aiVideoStore: Store | undefined;
}

function createStore(): Store {
  return {
    mediaAssets: new Map(),
    videoJobs: new Map(),
    generatedOutputs: new Map(),
    providerEvents: new Map(),
  };
}

export function getStore(): Store {
  if (!globalThis.__aiVideoStore) {
    globalThis.__aiVideoStore = createStore();
  }
  return globalThis.__aiVideoStore;
}

// 테스트 격리용.
export function resetStore(): void {
  globalThis.__aiVideoStore = createStore();
}
