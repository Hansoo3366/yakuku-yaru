# HttpOnly 쿠키 인증

## 결정

JWT를 **`HttpOnly` 쿠키** (`yakuku_session`)로 내려주고, 프론트엔드는 토큰 값을 localStorage에 저장하지 않는다.

## 배경

- 초기에는 Bearer + localStorage 패턴을 고려
- XSS 시 토큰 탈취 위험을 줄이고, 브라우저가 자동으로 쿠키 전송하게 하려는 목적

## 구현 요약

```typescript
res.cookie('yakuku_session', token, {
  httpOnly: true,
  sameSite: 'lax',
  secure: production,
});
```

- 프론트 `fetch`: `credentials: 'include'`
- API 미들웨어: Cookie 우선, **Bearer 헤더 호환** 유지 (Swagger·테스트)
- Remember me: `maxAge`로 30일 등 연장

## 트레이드오프

| 장점 | 단점 |
|------|------|
| XSS로 토큰 읽기 어려움 | cross-domain API 시 CORS·쿠키 설정 주의 |
| 새로고침 후 세션 유지 단순 | 모바일 WebView 등 edge case 테스트 필요 |

## 관련

- [[06 재사용 코드#2. `HttpOnly` 쿠키 JWT 인증]]
- [[게시판]] (인증 필요 API)
