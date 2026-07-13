# XSS 입력 정제

**위치**: `apps/web/src/lib/user-input.ts` (클라이언트), API 라우트에서 동일 패턴 서버 검증

```typescript
const BLOCKED_INPUT_PATTERNS = [
  /<\/?[a-z][^>]*>/i,
  /<script\b/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<style\b/i,
];

export function sanitizePlainText(value: string, maxLength: number) {
  return stripControlCharacters(value.replace(/<[^>]*>/g, ''))
    .trim()
    .slice(0, maxLength);
}
```

## 적용 필드

- 닉네임, 게시글 제목·본문, 댓글, 직관 메모

## 재사용 포인트

- 게시판 plain text 렌더링과 짝 — `dangerouslySetInnerHTML` 미사용
- 클라이언트·서버 이중 검증

## 관련

- [[Features/게시판]]
