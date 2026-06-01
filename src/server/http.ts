// App Router 라우트 핸들러는 표준 Web Response 반환을 허용한다.
// next/server 의존을 피해 단위 테스트(node 환경)에서도 그대로 호출 가능하게 한다.
export function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorJson(message: string, status = 400, code?: string): Response {
  return json({ error: message, code }, status);
}
