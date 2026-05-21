# 야크크 야르~ 섹시야구

야구장 직관 기록을 캘린더에 남기고, 사진과 스코어를 함께 관리하는 PWA 웹앱입니다.

사용자는 내 팀을 설정한 뒤 팀 경기 일정을 캘린더에서 확인하고, 직관한 경기에 사진과 메모를 업로드할 수 있습니다. 직관 경기의 승패와 승률을 계산해 일정 조건을 만족하면 `승리요정` 타이틀을 보여줍니다.

## Tech Stack

| Area           | Stack                |
| -------------- | -------------------- |
| Frontend       | Next.js, TypeScript  |
| Backend        | Node.js, Express.js  |
| Database       | MySQL                |
| Auth           | JWT, bcrypt          |
| API Docs       | Swagger              |
| Infra          | Docker, Cloud Server |
| App Experience | PWA                  |

## Study Requirements Mapping

| 과제 요구사항 | 야크크 야르~ 섹시야구 구현 방향                     |
| ------------- | --------------------------------------------------- |
| 로그인        | 이메일/비밀번호 기반 JWT 로그인                     |
| 회원가입      | 이메일 중복 검사, 이메일 인증, 비밀번호 암호화      |
| 게시판        | 직관 후기 게시판                                    |
| 댓글          | 후기 댓글 작성/조회/삭제                            |
| CRUD          | 게시글, 댓글, 직관 기록, 내 팀 설정                 |
| 페이징        | 게시글 목록 페이지네이션                            |
| 파일 업로드   | 직관 사진 업로드                                    |
| DB 관계       | 사용자, 팀, 경기, 직관 기록, 게시글, 댓글 관계 설계 |
| Swagger       | REST API 문서화                                     |
| Docker        | 프론트엔드/백엔드/MySQL 실행 환경 구성              |

## Core Features

- 회원가입, 로그인, JWT 인증
- 내 팀 설정
- 내 팀 경기 일정 캘린더 조회
- 직관 기록 작성, 수정, 삭제
- 직관 사진 업로드 및 캘린더 썸네일 표시
- 경기 스코어 표시 및 사용자 수정
- 직관 승률 계산
- 승률 50% 이상 `승리요정` 타이틀 표시
- 직관 후기 게시판과 댓글
- 경기 상세에서 알림 설정 정보, 예매처, 예매 오픈 시간 확인
- 모바일 홈 화면에 설치 가능한 PWA

## MVP Scope

1. 회원가입/로그인/JWT 인증
2. 게시판 CRUD, 댓글 CRUD, 게시글 페이징
3. 내 팀 설정
4. 경기 일정 캘린더
5. 직관 기록 CRUD
6. 사진 업로드 및 캘린더 미리보기
7. 스코어 입력/수정, 승률 계산
8. PWA 기본 설정

## Docs

- [Product Spec](docs/product-spec.md)
- [Architecture](docs/architecture.md)
- [Database Design](docs/database.md)
- [API Spec](docs/api-spec.md)
- [Frontend Spec](docs/frontend-spec.md)
- [Design System](docs/design-system.md)
- [PWA Spec](docs/pwa-spec.md)
- [Docker Setup](docs/docker-setup.md)
- [Deployment](docs/deployment.md)
- [Evaluation Notes](docs/evaluation-notes.md)
- [Development Plan](docs/development-plan.md)
- [Work Order](docs/work-order.md)

## Local Development

로컬 개발은 Node.js, npm, Docker Desktop이 필요합니다.

1. 환경 변수 파일을 준비합니다.

```bash
cp .env.example .env
```

2. 의존성을 설치합니다.

```bash
npm install
```

3. MySQL을 실행합니다.

```bash
docker compose up -d mysql
```

4. 프론트엔드와 API 서버를 실행합니다.

```bash
npm run dev
```

개별 실행도 가능합니다.

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

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```

## Current Status

MVP 기능은 대부분 구현되어 있습니다.

- 인증, 게시판, 댓글, 페이징
- MySQL 기반 DB 관계
- 내 팀 설정, 경기 일정, 경기 상세
- 직관 기록 CRUD, 사진 업로드, 캘린더 썸네일
- 승률 계산과 `승리요정` 타이틀
- PWA 기본 설정

남은 큰 작업은 production 배포, GitHub Actions 자동 배포, 디자인 고도화입니다.

## Naming

야크크 야르~ 섹시야구
`야크크 야르~ 섹시야구`는 야구 직관 기록을 꾸준히 남기는 웹앱의 작업명입니다. 서비스명은 기획 과정에서 변경될 수 있습니다.
