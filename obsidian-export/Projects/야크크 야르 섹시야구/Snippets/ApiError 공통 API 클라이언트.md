# ApiError 공통 API 클라이언트

**위치**: `apps/web/src/lib/api.ts`

```typescript
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      code: 'UNKNOWN_ERROR',
      message: '요청 처리 중 오류가 발생했습니다.',
    }));
    throw new ApiError(response.status, error.code, error.message);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
```

## 재사용 포인트

- `credentials: 'include'` — httpOnly Cookie 세션
- `204 No Content` 처리
- 백엔드 `{ code, message }` 에러 포맷 통일

## 관련

- [[Decisions/httpOnly Cookie 인증]]
- [[06 재사용 코드]]
