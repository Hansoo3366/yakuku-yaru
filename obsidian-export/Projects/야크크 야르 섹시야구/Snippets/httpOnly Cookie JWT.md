# httpOnly Cookie JWT

**위치**: `apps/api/src/modules/auth/auth-cookie.ts`

```typescript
export const AUTH_COOKIE_NAME = 'yakuku_session';

export function setAuthCookie(res: Response, token: string, options = {}) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: options.rememberMe
      ? getCookieMaxAgeMs(env.jwt.rememberExpiresIn)
      : undefined,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
  });
}
```

## 재사용 포인트

- XSS로 access token 탈취 방지
- 프론트는 `localStorage`에 토큰 저장하지 않음
- Bearer 헤더는 Swagger·테스트 호환용으로 미들웨어에서 병행 지원

## 관련

- [[Decisions/httpOnly Cookie 인증]]
- [[Snippets/ApiError 공통 API 클라이언트]]
