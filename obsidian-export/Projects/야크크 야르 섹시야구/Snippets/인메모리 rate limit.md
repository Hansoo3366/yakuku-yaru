# 인메모리 rate limit

**위치**: `apps/api/src/middleware/rate-limit.ts`

```typescript
export function rateLimit(options: RateLimitOptions): RequestHandler {
  return (req, res, next) => {
    const key = `${options.scope}:${
      req.user ? `user:${req.user.id}` : `ip:${req.ip}`
    }`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= Date.now()) {
      buckets.set(key, { count: 1, resetAt: Date.now() + options.windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - Date.now()) / 1000)));
      return next(new HttpError(429, 'RATE_LIMITED', options.message));
    }
    next();
  };
}
```

## 적용 예

- 회원가입·로그인·이메일 인증
- 게시글·댓글·직관 기록 작성
- 관리자 쓰기 API

## 재사용 포인트

- Redis 없이 단일 인스턴스에서 남용 방지
- 로그인 사용자는 `user:id`, 비로그인은 `ip` 기준

## 관련

- [[Features/게시판]]
- [[06 재사용 코드]]
