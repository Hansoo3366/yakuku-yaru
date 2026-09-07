# Evaluation Notes

과제 발표와 질의응답을 대비하기 위한 구현 설명 문서입니다.

## Backend

### JWT 인증 구현

로그인 성공 시 백엔드가 access token을 발급하고 httpOnly cookie로 내려줍니다.

토큰 payload:

```json
{
  "userId": 1,
  "email": "user@example.com",
  "sessionVersion": 0
}
```

JWT 라이브러리가 발급 시각(`iat`), 만료 시각(`exp`), 발급자(`iss`), 대상(`aud`)도 추가합니다. 토큰에는 비밀번호나 프로필 같은 민감정보를 넣지 않습니다. API 요청 시 브라우저가 쿠키를 함께 보내고, 프론트엔드는 토큰 값을 직접 읽거나 저장하지 않습니다.

```txt
Cookie: yakuku_session=<httpOnly JWT>
```

백엔드의 `authenticate` middleware는 JWT의 서명·만료·발급자·대상을 검사하고, 토큰의 `sessionVersion`을 DB의 `users.session_version`과 비교합니다. 검증이 끝나면 `req.user`에 사용자 정보를 넣습니다. 기존 Bearer 헤더도 호환 경로로 유지합니다.

비밀번호 재설정 시 `users.session_version`을 증가시킵니다. 그 결과 이전 버전이 들어 있는 기존 JWT는 다음 인증 요청부터 거부됩니다. 일반 로그아웃은 현재 브라우저의 쿠키만 삭제하며 세션 버전을 올리지는 않습니다.

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

현재는 TanStack Query, Zustand, React state를 역할별로 나눠 사용합니다.

관리 대상:

- access token: API가 `yakuku_session` httpOnly cookie로 설정하며 프론트 JS에서는 값을 읽지 않음
- 로그인 사용자 정보: Zustand store + TanStack Query의 `/auth/me` 캐시
- 팀/경기/직관 기록/순위/게시글/댓글: TanStack Query 캐시
- 캘린더 보기/필터: Zustand store
- 캘린더 기준 월/주: 페이지 state
- 사진 미리보기: object URL state

같은 API를 여러 컴포넌트가 호출하는 문제를 줄이기 위해 공통 query hook을 `src/lib/queries.ts`에 모았습니다.

### 로그인 상태 유지

로그인 성공 시 API가 httpOnly cookie로 access token을 설정합니다.

새로고침 후에는 앱 provider가 `cookie-session`이라는 메모리 마커를 Zustand에 세팅합니다. 이 값은 JWT도 아니고 외부 라이브러리도 아니며, 쿠키 인증을 시도하기 위한 내부 표시입니다. 이후 TanStack Query가 `/auth/me`를 호출하고 브라우저가 실제 httpOnly 쿠키를 전송합니다.

`/auth/me`가 성공하면 사용자 정보를 Zustand와 Query 캐시에 반영합니다. 실패하면 세션 상태를 제거하고, `useAuthGuard`가 인증 화면의 이동을 제어합니다. 새로고침 후 로그인이 유지되는 근거는 Zustand가 아니라 브라우저에 남아 있는 httpOnly 쿠키입니다.

### API 호출 구조

공통 API client:

- `apps/web/src/lib/api.ts`

역할:

- base URL 관리
- JSON request/response 처리
- `credentials: 'include'`를 통한 쿠키 전송
- 실제 Bearer token을 전달한 호환 요청에서만 Authorization header 주입
- 에러 응답을 `ApiError`로 변환
- `204 No Content` 응답 처리

`request<T>`의 `T`는 TypeScript가 성공 응답 형태를 추론하도록 돕는 제네릭이며, 런타임 응답 검증 기능은 아닙니다.

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
- Swagger: 로컬 `http://localhost:4000/api-docs`, 운영 `https://yakuku-yaru.today/api-docs`에서 제공

구성:

- `caddy`: HTTPS reverse proxy
- `gateway`: Nginx 경로 분기·요청/연결 제한
- `web`: Next.js production server
- `api`: Express API server
- `mysql`: MySQL 8.4

요청은 `Browser → Caddy → Nginx gateway → Next.js 또는 Express → MySQL` 순서로 흐릅니다. `/api`, `/api-docs`, `/uploads`는 Express로, 나머지 경로는 Next.js로 전달됩니다.

GitHub Actions는 `main` 브랜치 push 시 Web/API Docker 이미지를 빌드해 GHCR에 push합니다. 이후 SSH로 VM에 접속해 이미지를 pull하고 `docker compose up -d --no-build`로 컨테이너를 교체한 뒤 `/api/health`를 확인합니다. 작은 VM에서 빌드하지 않도록 이미지 빌드와 실행 위치를 분리했습니다.

현재는 단일 VM 구조이므로 배포 중 짧은 다운타임이 발생할 수 있습니다. 무중단 배포가 필요하면 Caddy 기반 blue-green 배포 또는 Load Balancer와 다중 인스턴스 구조로 확장할 수 있습니다.

## Current Limitations

- 이메일 인증은 Gmail SMTP로 인증번호를 발송합니다. 개발 환경에서 SMTP 설정이 없을 때만 개발용 인증 정보를 응답으로 보여줍니다.
- KBO 데이터는 크롤링/파싱 기반이므로 장애 대응과 fallback seed가 필요합니다.
- 예매처/예매 오픈 시간은 팀/경기 데이터 기반이며 일부는 관리자가 보정해야 합니다.
- 업로드 파일은 서버 volume 저장 방식입니다. 사용량이 늘면 Object Storage 또는 NAS로 확장하는 것이 좋습니다.
- UI는 기능 검증을 넘어 기본 사용성 개선까지 반영했지만, 시각 완성도는 계속 개선 대상입니다.
- 현재는 단일 VM 배포이므로 배포 중 짧은 다운타임이 발생할 수 있습니다.
