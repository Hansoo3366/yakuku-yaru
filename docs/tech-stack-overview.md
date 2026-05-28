# Yakuku Yaru 기술 스택 (과제 제출용)

## 1. 프로젝트 개요

Yakuku Yaru는 KBO 팬을 위한 기록 웹앱으로,  
캘린더 기반 일정/직관 기록, 경기 상세 프리뷰, 게시판, 마이페이지 통계를 제공합니다.

## 2. 시스템 아키텍처

```txt
Client (Browser / PWA 성격)
  -> Next.js Web (apps/web)
      -> Express API (apps/api)
          -> MySQL 8.4
```

외부 데이터는 KBO 페이지/엔드포인트를 크롤링/파싱하여 API 서버가 DB에 적재합니다.

## 3. 프론트엔드 스택

- **Next.js 15**
- **React 19**
- **TypeScript**
- 스타일링: 프로젝트 단일 CSS 설계(`globals.css` + 페이지별 CSS)
- 데이터 통신: `fetch` 기반 API 모듈(`src/lib/*-api.ts`)

핵심 화면:
- 캘린더(월간/주간, 필터, 승률 인사이트)
- 경기 상세(스코어보드, 선발/라인업, 예매/알림, 구장 메모)
- 게시판(검색/리스트/상세/댓글)
- 마이페이지(프로필/통계/팀 설정)

## 4. 백엔드 스택

- **Node.js + Express 4**
- **TypeScript (ESM)**
- **MySQL2 드라이버**
- 보안/인증:
  - `jsonwebtoken` (JWT 인증)
  - `bcryptjs` (비밀번호 해시)
  - `helmet`, `cors`
- 기타:
  - `multer` (이미지 업로드)
  - `nodemailer` (메일)
  - `swagger-ui-express` (API 문서)

## 5. 데이터베이스

- **MySQL 8.4**
- 주요 테이블:
  - `users`, `teams`
  - `games`
  - `attendance_records`, `attendance_companions`
  - `players`, `game_starting_pitchers`, `game_lineups`
  - `team_standings`
  - `notifications`, `game_reminders`

특징:
- `games`는 KBO 외부 ID와 내부 키를 함께 관리
- `team_standings`에 순위/승률/최근 10경기/연속 기록 저장

## 6. 데이터 동기화(ETL)

KBO 소스에서 서버가 주기적으로 동기화:
- 일정/결과
- 팀 순위
- 선수
- 게임센터(선발/라인업)

운영은 GitHub Actions 스케줄 대신 **서버 cron + Docker Compose exec** 방식 사용.

## 7. 배포/운영 스택

- **Docker Compose**
  - `web` (Next.js)
  - `api` (Express)
  - `mysql` (MySQL 8.4)
  - `caddy` (리버스 프록시/HTTPS, 선택 프로필)
- 운영 환경 변수: `.env.production`
- 배포 자동화: GitHub Actions 기반 VM 배포 워크플로우

## 8. 개발 생산성 도구

- ESLint
- TypeScript typecheck
- tsx (API 개발 서버/스크립트 실행)
- npm workspaces (monorepo 구조)

## 9. 이 스택을 선택한 이유

- Next.js + Express 분리로 화면/도메인 로직 역할 분담이 명확함
- MySQL 기반 관계형 데이터 모델이 경기/기록/통계 도메인과 잘 맞음
- Docker Compose로 로컬-운영 실행 방식 통일
- KBO 데이터 동기화를 서버 측 배치로 처리해 프론트 성능과 안정성 확보

