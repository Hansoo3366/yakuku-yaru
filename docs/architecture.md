# Architecture

## Repository Structure

```txt
yakuku-yaru/
  apps/
    web/              # Next.js frontend
    api/              # Express backend
  docs/
  scripts/kbo-sync/   # production KBO sync cron wrappers
  docker-compose.yml
  docker-compose.prod.yml
```

프론트엔드와 백엔드를 한 저장소에서 관리하는 npm workspace 기반 모노레포입니다.

## System Overview

```txt
Browser / Installed PWA
  |
  | HTTPS
  v
Caddy reverse proxy
  |---------------------> Next.js web
  | /api, /api-docs ----> Express API
  | /uploads -----------> Express static uploads
                         |
                         v
                       MySQL 8.4
```

운영 환경은 Google Cloud Compute Engine VM 한 대에서 Docker Compose로 실행합니다.

## External Data Flow

```txt
KBO web pages / browser endpoints
  |
  | scheduled sync scripts
  v
Express API scripts
  |
  | upsert
  v
MySQL games / players / starting pitchers / lineups / standings
```

KBO 공식 공개 API가 없으므로, KBO 일정/결과 페이지와 경기센터에서 사용하는 브라우저 호출 데이터를 파싱해 저장합니다. 동기화는 서버 호스트 cron과 `scripts/kbo-sync/` 래퍼로 운영하는 것을 기본으로 합니다.

## Frontend Responsibilities

- Next.js App Router 화면 제공
- TanStack Query 기반 서버 데이터 캐싱과 중복 호출 방지
- Zustand 기반 로그인 세션 전역 상태 관리
- 로그인 토큰 저장과 인증 상태 복원
- 캘린더, 경기 상세, 직관/집관 기록, 게시판, 마이페이지, 관리자 UI
- 팀 로고와 팀 컬러 기반 테마 적용
- PWA manifest, service worker, offline fallback
- 사진 업로드 전 미리보기와 클라이언트 검증
- 모바일 하단 내비게이션, PC/tablet sticky 캘린더 필터

## Backend Responsibilities

- REST API 제공
- JWT 발급 및 인증/관리자 권한 미들웨어
- 비밀번호 암호화, 이메일 인증, 비밀번호 재설정
- MySQL 접근과 트랜잭션 처리
- 게시판/댓글/직관 기록/동행자 권한 검증
- 업로드 파일 형식/용량 제한, WebP 최적화, static serving
- KBO 일정/선수/경기센터/순위 동기화 스크립트
- Swagger/OpenAPI 문서 제공
- rate limit 적용

## Database Responsibilities

- 사용자, 팀, 경기, 선수, 선발 투수, 라인업 저장
- 직관/집관 기록, 동행자 상태, 알림, 경기 알림 저장
- 게시글, 댓글, 관리자 운영 데이터 저장
- 업로드 파일 자체는 DB가 아니라 서버 volume에 저장하고, DB에는 URL만 저장

## Authentication Flow

1. 사용자가 이메일과 비밀번호로 회원가입한다.
2. API가 이메일 인증번호를 발송하고 인증 토큰을 저장한다.
3. 사용자가 인증번호를 확인하면 `email_verified_at`을 기록한다.
4. 로그인 성공 시 JWT를 발급한다.
5. 프론트엔드는 토큰을 저장하고 인증 API 요청에 `Authorization: Bearer <token>` 헤더를 보낸다.
6. API 인증 미들웨어가 토큰을 검증하고 요청 사용자 정보를 주입한다.
7. 관리자 API는 추가로 `users.role = 'admin'`을 검사한다.

## Deployment

```txt
GitHub push
  |
  v
GitHub Actions
  |
  | SSH
  v
Google Cloud VM
  |
  | git pull + docker compose build/up
  v
Caddy + Web + API + MySQL containers
```

현재 구조는 단일 VM 배포입니다. 비용과 학습 목적에는 적합하지만, 배포 중 짧은 중단이 있을 수 있습니다. 무중단 배포가 필요해지면 로드밸런서, 다중 인스턴스, managed DB, object storage 분리를 검토합니다.

## Docker Services

- `web`: Next.js frontend
- `api`: Express backend and upload static serving
- `mysql`: MySQL database
- `caddy`: HTTPS reverse proxy and automatic TLS

## Key Design Decisions

- Supabase를 사용하지 않고 MySQL을 직접 사용한다.
- API는 REST 방식으로 설계한다.
- 인증은 JWT 기반으로 구현한다.
- 디자인은 Tailwind/shadcn 없이 custom CSS로 구현한다.
- 스코어는 사용자가 직접 수정하지 않고 KBO 동기화 결과를 기준으로 한다.
- 사진은 현재 API 서버의 Docker volume에 저장하고 WebP로 최적화한다.
- KBO 데이터는 seed fallback을 유지하되 운영에서는 주기 동기화를 사용한다.
- 동행 기록은 수락된 경우에만 동행자 캘린더와 승률 인사이트에 반영한다.
