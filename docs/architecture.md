# Architecture

## Recommended Structure

```txt
yakuku-yaru/
  apps/
    web/              # Next.js frontend
    api/              # Express backend
  packages/
    shared/           # shared types/constants, optional
  docs/
  docker-compose.yml
```

초기 구현은 모노레포 형태를 권장합니다. 프론트엔드와 백엔드를 한 저장소에서 관리하면 과제 제출, Docker 구성, 타입 공유가 단순해집니다.

## System Overview

```txt
Browser / PWA
  |
  | HTTPS / REST API
  v
Next.js Frontend
  |
  | REST API with JWT
  v
Express API Server
  |
  | MySQL driver / ORM
  v
MySQL
```

## Frontend Responsibilities

- 사용자 화면 제공
- 로그인 상태 관리
- JWT 저장 및 API 요청 시 Authorization 헤더 전달
- 캘린더, 게시판, 직관 기록 UI 구성
- API 에러 처리
- PWA manifest 및 service worker 설정

## Backend Responsibilities

- REST API 제공
- JWT 발급 및 인증 미들웨어
- 비밀번호 암호화
- 이메일 인증 처리
- MySQL 접근
- 게시판/댓글/직관 기록 권한 검증
- Swagger 문서 제공

## Database Responsibilities

- 사용자, 팀, 경기, 직관 기록, 게시글, 댓글 데이터 저장
- 테이블 간 관계와 제약 조건 관리
- 조회 성능을 위한 인덱스 관리

## Authentication Flow

1. 사용자가 이메일과 비밀번호로 로그인 요청
2. 백엔드가 비밀번호 해시를 검증
3. 성공 시 JWT 발급
4. 프론트엔드가 토큰 저장
5. 인증 API 요청 시 `Authorization: Bearer <token>` 헤더 전달
6. 백엔드 인증 미들웨어가 토큰을 검증하고 `userId`를 요청 객체에 추가

## Deployment Direction

초기 배포는 하나의 Cloud Server에서 Docker Compose로 실행합니다.

```txt
Nginx
  |
  | /          -> Next.js
  | /api       -> Express API
  | /api-docs  -> Swagger
  v
Docker Compose
```

## Docker Services

- `web`: Next.js frontend
- `api`: Express backend
- `mysql`: MySQL database
- `nginx`: reverse proxy, optional

## Key Design Decisions

- Supabase를 사용하지 않고 MySQL을 직접 사용한다.
- API는 REST 방식으로 설계한다.
- 인증은 JWT 기반으로 구현한다.
- 사진 업로드는 초기에는 백엔드 서버 파일 저장 방식으로 시작한다.
- 경기 일정/스코어는 초기에는 seed 데이터 기반으로 구현한다.
