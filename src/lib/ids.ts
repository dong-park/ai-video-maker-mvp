import { randomUUID } from "node:crypto";

// 추측 불가능한 id. ARCHITECTURE 8절: public result URL은 guess 불가능한 path 사용.
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}
