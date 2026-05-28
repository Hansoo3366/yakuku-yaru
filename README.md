# 야크크 야르~ 섹시야구

야구장 직관과 집관 기록을 캘린더에 남기고, 사진, 메모, 경기 결과, 동행자 태그를 함께 관리하는 PWA 웹앱입니다.

사용자는 내 팀을 설정한 뒤 팀 경기 일정을 캘린더에서 확인하고, 직관/집관 기록을 남길 수 있습니다. KBO 일정/결과/선발 투수/라인업 데이터를 동기화해 캘린더와 경기 상세에서 보여주며, 직관 승률이 50% 이상이면 `승리요정` 타이틀을 표시합니다.

## Tech Stack

| Area | Stack |
| --- | --- |
| Frontend | Next.js, TypeScript, custom CSS |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Auth | JWT, bcrypt, email verification |
| API Docs | Swagger / OpenAPI |
| Infra | Docker Compose, Google Cloud Compute Engine, Caddy |
| App Experience | PWA |

## Study Requirements Mapping

| 과제 요구사항 | 구현 내용 |
| --- | --- |
| 로그인 | 이메일/비밀번호 기반 JWT 로그인 |
| 회원가입 | 이메일 중복 검사, Gmail SMTP 인증번호, 비밀번호 암호화 |
| 게시판 | 후기 게시판 CRUD, 검색, 페이징 |
| 댓글 | 댓글 작성/조회/삭제, 댓글 알림 |
| CRUD | 게시글, 댓글, 직관/집관 기록, 내 팀, 알림, 관리자 데이터 |
| 페이징 | 게시글 목록 페이지네이션 |
| 파일 업로드 | 직관 사진, 프로필 사진 업로드 및 WebP 최적화 |
| DB 관계 | 사용자, 팀, 경기, 선수, 기록, 동행자, 게시글, 댓글, 알림 |
| Swagger | REST API 문서화 |
| Docker | Web/API/MySQL/Caddy 프로덕션 구성 |

## Core Features

- 회원가입, 이메일 인증, 로그인, JWT 인증
- 회원가입 시 내 팀 설정, 마이페이지 내 팀 변경
- 팀 로고와 선택 팀 기준 테마 컬러 적용
- KBO 경기 일정, 결과, 순위, 선수, 선발 투수, 라인업 동기화
- 월간 캘린더에서 내 팀/전체 경기, 직관/집관, 기록 있는 날 필터
- PC/tablet sticky 캘린더 필터와 `오늘` 이동 버튼
- 경기 카드의 스코어, 취소 사유, 선발 투수 표시
- 경기 상세의 선발 투수 프로필/ERA/WHIP/WAR/QS와 라인업 표시
- 직관/집관 기록 작성, 수정, 삭제
- 사진 업로드, WebP 변환, 캘린더 썸네일 표시
- 동행자 태그, 수락/거절, 동행 기록 캘린더 반영
- 직관 승률 계산과 `승리요정` 타이틀
- 경기 알림 설정/해제
- 구장별 맛집/주차 정보와 개인 메모
- 게시판, 댓글, 프로필 이미지, 댓글 알림
- 관리자 페이지에서 사용자, 게시글/댓글, 경기/KBO 데이터 관리
- 모바일 홈 화면에 설치 가능한 PWA

## Current Scope

현재 버전은 MVP를 넘어 운영 실습용 기능까지 포함합니다.

- 스코어는 KBO 동기화 결과를 기준으로 표시합니다. 직관 기록에서 사용자가 점수를 임의 수정하지 않습니다.
- KBO 데이터는 공식 공개 API가 아니라 KBO 웹 페이지/브라우저 호출 데이터를 기반으로 동기화합니다.
- 업로드 파일은 현재 서버 로컬 Docker volume에 저장합니다. 사용량이 커지면 Object Storage 또는 NAS 연동을 검토합니다.
- 실시간 푸시 알림은 아직 구현하지 않았고, 앱 내부 알림 상태를 저장합니다.

## Docs

- [Product Spec](docs/product-spec.md)
- [Architecture](docs/architecture.md)
- [Database Design](docs/database.md)
- [API Spec](docs/api-spec.md)
- [Frontend Spec](docs/frontend-spec.md)
- [Design System](docs/design-system.md)
- [KBO Data Sync](docs/kbo-data-sync.md)
- [PWA Spec](docs/pwa-spec.md)
- [Docker Setup](docs/docker-setup.md)
- [Deployment](docs/deployment.md)
- [Evaluation Notes](docs/evaluation-notes.md)
- [Development Plan](docs/development-plan.md)
- [Work Order](docs/work-order.md)

## Local Development

로컬 개발은 Node.js, npm, Docker Desktop이 필요합니다.

```bash
cp .env.example .env
npm install
docker compose up -d mysql
npm run dev
```

개별 실행:

```bash
npm run dev:web
npm run dev:api
```

기본 주소:

| Service | URL |
| --- | --- |
| Web | `http://localhost:3000` |
| API health | `http://localhost:4000/api/health` |
| Swagger | `http://localhost:4000/api-docs` |
| OpenAPI JSON | `http://localhost:4000/api-docs.json` |
| PWA manifest | `http://localhost:3000/manifest.webmanifest` |
| Offline fallback | `http://localhost:3000/offline` |

## KBO Sync

로컬 개발:

```bash
npm run sync:kbo-schedule:dev --workspace @yakuku-yaru/api -- --mode=week
npm run sync:kbo-players:dev --workspace @yakuku-yaru/api
npm run sync:kbo-game-center:dev --workspace @yakuku-yaru/api -- --mode=today
```

운영 서버에서는 `scripts/kbo-sync/`의 cron 스크립트로 일정, 순위, 선수, 경기센터 데이터를 주기적으로 동기화합니다.

## Production Deployment

현재 Google Cloud Compute Engine VM에 Docker Compose 기반으로 배포합니다.

| Service | URL |
| --- | --- |
| Web | `https://yakuku-yaru.today` |
| API health | `https://yakuku-yaru.today/api/health` |
| Swagger | `https://yakuku-yaru.today/api-docs` |
| OpenAPI JSON | `https://yakuku-yaru.today/api-docs.json` |

배포 구조:

- Google Cloud Compute Engine
- Docker Compose
- Next.js web container
- Express API container
- MySQL 8.4 container
- Caddy HTTPS reverse proxy
- GitHub Actions SSH 자동 배포

현재는 Caddy reverse proxy를 통해 `80/443` 포트와 HTTPS 중심으로 접근합니다. `3000`, `4000` 포트는 외부 직접 접근을 닫고 내부 컨테이너 통신용으로만 사용하는 것을 권장합니다.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```

## Naming

`야크크 야르~ 섹시야구`는 야구 직관 기록을 꾸준히 남기는 웹앱의 작업명입니다. 서비스명은 기획 과정에서 변경될 수 있습니다.
