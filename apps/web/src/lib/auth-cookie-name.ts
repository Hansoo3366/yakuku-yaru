/**
 * API 가 로그인 중에만 내려주는 비밀값 없는 표시 쿠키 (apps/api auth-cookie.ts 와 같은 이름).
 * 서버 레이아웃과 클라이언트가 함께 쓰므로 'use client' 모듈과 분리해 둔다.
 */
export const SIGNED_IN_COOKIE_NAME = 'yakuku_signed_in';
