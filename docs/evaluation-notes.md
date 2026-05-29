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

게시글, 댓글, 직관/집관 기록은 작성자 또는 허용된 관리자만 수정/삭제할 수 있습니다.

예:

- 게시글 수정/삭제 시 `post.user_id === req.user.id` 확인
- 댓글 삭제 시 `comment.user_id === req.user.id` 확인
- 직관 기록 수정/삭제 시 소유자 또는 수락된 동행자 편집 정책 확인
- 관리자 API 접근 시 `users.role === 'admin'` 확인

## Database

### 주요 테이블

- `users`: 사용자 계정, 프로필, 내 팀, 관리자 권한
- `teams`: KBO 팀
- `games`: 경기 일정, 스코어, 취소 사유, 예매 정보, KBO 외부 ID
- `players`: KBO 선수 마스터
- `game_starting_pitchers`: 경기별 선발 투수와 ERA/WHIP/WAR/QS
- `game_lineups`: 경기별 라인업
- `attendance_records`: 직관/집관 기록, 사진, 공식 스코어 기준 승패
- `attendance_companions`: 동행자 태그와 수락/거절 상태
- `notifications`: 동행 태그, 댓글, 응답 결과 알림
- `posts`: 직관 후기 게시글
- `comments`: 게시글 댓글
- `email_verification_tokens`: 이메일 인증 토큰

### 관계 설계 기준

- 한 사용자는 여러 게시글을 작성할 수 있습니다.
- 한 게시글은 여러 댓글을 가질 수 있습니다.
- 한 사용자는 여러 직관/집관 기록을 가질 수 있습니다.
- 한 직관 기록은 하나의 경기와 연결됩니다.
- 한 경기는 홈 팀과 원정 팀을 각각 참조합니다.
- 한 사용자는 하나의 내 팀을 설정할 수 있습니다.
- 한 기록은 여러 동행자를 가질 수 있고, 수락된 동행자에게만 캘린더에 노출됩니다.

### 중복 방지

한 사용자가 같은 경기에 직관 기록을 여러 개 만들지 않도록 `attendance_records(user_id, game_id)` unique key를 둡니다.

## Frontend

### 상태 관리

현재는 TanStack Query, Zustand, React state, localStorage를 역할별로 나눠 사용합니다.

관리 대상:

- access token: localStorage
- 로그인 사용자 정보: Zustand store + TanStack Query의 `/auth/me` 캐시
- 팀/경기/직관 기록/순위/게시글/댓글: TanStack Query 캐시
- 캘린더 보기/필터: Zustand store
- 캘린더 기준 월/주: 페이지 state
- 사진 미리보기: object URL state

같은 API를 여러 컴포넌트가 호출하는 문제를 줄이기 위해 공통 query hook을 `src/lib/queries.ts`에 모았습니다.

### 로그인 상태 유지

로그인 성공 시 access token을 localStorage에 저장합니다.

새로고침 후에는 앱 provider가 localStorage의 token을 Zustand에 복원하고, `/auth/me`는 TanStack Query 캐시를 통해 공유합니다.

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

직관 사진과 프로필 사진은 `multipart/form-data`로 업로드합니다.

저장 방식:

- API 서버의 Docker upload volume
- `/uploads/<filename>` 정적 파일로 제공
- 서버에서 형식/용량을 검증하고 WebP로 변환

프론트엔드는 업로드 전에는 `URL.createObjectURL(file)`로 미리보기를 표시하고, 저장 후에는 API 서버의 `/uploads` URL을 사용합니다.

## KBO Data

KBO 공식 공개 API가 없기 때문에 웹 페이지와 브라우저 호출 데이터를 기반으로 동기화합니다.

동기화 대상:

- 일정/결과/취소 사유
- 팀 순위
- 선수 마스터
- 선발 투수
- 선발 투수 스탯
- 라인업

운영 서버에서는 `scripts/kbo-sync/`와 crontab으로 주기 실행합니다. 외부 페이지 구조가 바뀌면 파서 수정이 필요합니다.

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

현재는 단일 VM 구조이므로 배포 중 짧은 다운타임이 발생할 수 있습니다. 무중단 배포가 필요하면 Caddy 기반 blue-green 배포 또는 Load Balancer와 다중 인스턴스 구조로 확장할 수 있습니다.

## Current Limitations

- 이메일 인증은 Gmail SMTP로 인증번호를 발송합니다. 개발 환경에서 SMTP 설정이 없을 때만 개발용 인증 정보를 응답으로 보여줍니다.
- KBO 데이터는 크롤링/파싱 기반이므로 장애 대응과 fallback seed가 필요합니다.
- 예매처/예매 오픈 시간은 팀/경기 데이터 기반이며 일부는 관리자가 보정해야 합니다.
- 업로드 파일은 서버 volume 저장 방식입니다. 사용량이 늘면 Object Storage 또는 NAS로 확장하는 것이 좋습니다.
- UI는 기능 검증을 넘어 기본 사용성 개선까지 반영했지만, 시각 완성도는 계속 개선 대상입니다.
- 현재는 단일 VM 배포이므로 배포 중 짧은 다운타임이 발생할 수 있습니다.
