# Evaluation Notes

과제 발표와 질의응답을 대비하기 위한 구현 설명 문서입니다.

## Backend

### JWT 인증 구현

로그인 성공 시 백엔드가 access token을 발급합니다.

토큰 payload:

```json
{
  "userId": 1,
  "email": "user@example.com"
}
```

토큰에는 민감한 정보나 비밀번호를 넣지 않습니다. API 요청 시 프론트엔드는 아래 헤더로 토큰을 전달합니다.

```txt
Authorization: Bearer <accessToken>
```

백엔드의 `authenticate` middleware가 토큰을 검증하고 `req.user`에 사용자 정보를 넣습니다.

### 비밀번호 저장

비밀번호는 원문으로 저장하지 않고 bcrypt hash로 저장합니다.

구현 위치:

- `apps/api/src/utils/password.ts`

### 권한 처리

게시글, 댓글, 직관 기록은 작성자만 수정/삭제할 수 있습니다.

예:

- 게시글 수정/삭제 시 `post.user_id === req.user.id` 확인
- 댓글 삭제 시 `comment.user_id === req.user.id` 확인
- 직관 기록 수정/삭제 시 `record.userId === req.user.id` 확인

## Database

### 주요 테이블

- `users`: 사용자 계정, 내 팀 설정
- `teams`: KBO 팀
- `games`: 경기 일정, 스코어, 예매 정보
- `attendance_records`: 직관 기록, 사진, 수정 스코어, 승패
- `posts`: 직관 후기 게시글
- `comments`: 게시글 댓글
- `email_verification_tokens`: 이메일 인증 토큰

### 관계 설계 기준

- 한 사용자는 여러 게시글을 작성할 수 있습니다.
- 한 게시글은 여러 댓글을 가질 수 있습니다.
- 한 사용자는 여러 직관 기록을 가질 수 있습니다.
- 한 직관 기록은 하나의 경기와 연결됩니다.
- 한 경기는 홈 팀과 원정 팀을 각각 참조합니다.
- 한 사용자는 하나의 내 팀을 설정할 수 있습니다.

### 중복 방지

한 사용자가 같은 경기에 직관 기록을 여러 개 만들지 않도록 `attendance_records(user_id, game_id)` unique key를 둡니다.

## Frontend

### 상태 관리

현재는 별도 전역 상태관리 라이브러리 없이 React state와 localStorage를 사용합니다.

관리 대상:

- access token: localStorage
- 로그인 사용자 정보: 페이지 진입 시 `/auth/me`로 복원
- 캘린더 월/경기/직관 기록: 페이지 state
- 게시글/댓글 목록: 페이지 state
- 사진 미리보기: object URL state

초기 MVP에서는 화면 간 공유 상태가 복잡하지 않기 때문에 Zustand 같은 전역 store를 추가하지 않았습니다. 필요해지면 auth/user 상태부터 store로 분리할 수 있습니다.

### 로그인 상태 유지

로그인 성공 시 access token을 localStorage에 저장합니다.

새로고침 후에는 보호 페이지에서 localStorage의 token을 읽고 `/auth/me`를 호출합니다.

토큰이 없거나 `/auth/me`가 실패하면 로그인 페이지로 이동합니다.

### API 호출 구조

공통 API client:

- `apps/web/src/lib/api.ts`

역할:

- base URL 관리
- JSON request/response 처리
- Authorization header 주입
- 에러 응답을 `ApiError`로 변환
- `204 No Content` 응답 처리

도메인별 API 함수:

- `auth-api.ts`
- `baseball-api.ts`
- `post-api.ts`
- `attendance-api.ts`

### 에러 처리

백엔드는 공통 에러 포맷을 반환합니다.

```json
{
  "code": "AUTH_REQUIRED",
  "message": "로그인이 필요합니다."
}
```

프론트엔드는 `ApiError`를 catch해서 폼 에러 메시지로 표시합니다.

## File Upload

직관 사진은 `multipart/form-data`로 업로드합니다.

저장 방식:

- API 서버의 `apps/api/uploads`
- `/uploads/<filename>` 정적 파일로 제공

프론트엔드는 업로드 전에는 `URL.createObjectURL(file)`로 미리보기를 표시하고, 저장 후에는 API 서버의 `/uploads` URL을 사용합니다.

## PWA

PWA 구성:

- `manifest.ts`
- `/icons/icon.svg`
- `/sw.js`
- `/offline`

production 환경에서 service worker를 등록합니다. 개발 중 service worker 캐시가 방해되지 않도록 dev 모드에서는 등록하지 않습니다.

## Deployment

현재 배포는 Google Cloud Compute Engine 단일 VM에서 Docker Compose로 구성합니다.

배포 URL:

- Web: `https://yakuku-yaru.today`
- API health: `https://yakuku-yaru.today/api/health`
- Swagger: `https://yakuku-yaru.today/api-docs`

구성:

- `caddy`: HTTPS reverse proxy
- `web`: Next.js production server
- `api`: Express API server
- `mysql`: MySQL 8.4

GitHub Actions는 `main` 브랜치 push 시 VM에 SSH로 접속해 최신 코드를 반영하고 Docker Compose를 다시 실행합니다.

현재는 단일 VM 구조이므로 배포 중 짧은 다운타임이 발생할 수 있습니다. 무중단 배포가 필요하면 Caddy/Nginx 기반 blue-green 배포 또는 Load Balancer와 다중 인스턴스 구조로 확장할 수 있습니다.

## Current Limitations

- 이메일 인증은 Gmail SMTP로 인증 링크를 발송합니다. 개발 환경에서 SMTP 설정이 없을 때만 개발용 인증 링크를 응답으로 보여줍니다.
- 경기 일정은 seed 데이터 기반입니다.
- 예매처/예매 오픈 시간은 seed 데이터 기반입니다.
- 업로드 파일은 로컬 디스크 저장 방식입니다. 배포 환경에서는 object storage로 확장하는 것이 좋습니다.
- 디자인은 기능 검증용 MVP 수준이며 추후 개선 예정입니다.
- 현재는 단일 VM 배포이므로 배포 중 짧은 다운타임이 발생할 수 있습니다.
