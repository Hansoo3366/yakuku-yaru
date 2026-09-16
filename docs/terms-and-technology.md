# Terms and Technology

발표와 질의응답에서 사용하는 용어를 현재 코드 기준으로 정리한 문서입니다.

웹 치트시트는 `/presentation/guide`에서 확인할 수 있습니다.

## 전체 요청 흐름

```txt
Browser
  → Caddy (HTTPS)
  → Nginx gateway (경로 분기·요청 제한)
  → Next.js 화면 또는 Express API
  → authenticate middleware (보호 API)
  → repository
  → MySQL
  → JSON 응답
  → TanStack Query
  → React 화면
```

## 자동 배포 흐름

```txt
main push
  → GitHub Actions
  → Web/API Docker image build
  → GHCR push
  → SSH로 GCP VM 접속
  → Docker Compose pull/up --no-build
  → /api/health 확인
```

## Backend

### Node.js

브라우저 밖의 서버에서 JavaScript를 실행하는 환경입니다. 이 프로젝트에서는 Express API, MySQL 접근, JWT 발급, 이메일 전송 코드를 실행합니다.

### Express

Node.js 위에서 HTTP API 경로와 미들웨어를 구성하는 프레임워크입니다. `apps/api/src/app.ts`에서 `/api/auth`, `/api/posts`, `/api/comments` 등의 router를 연결합니다.

### REST API

HTTP method와 URL로 자원에 대한 동작을 표현하는 API 방식입니다. 예를 들어 `GET /api/posts`는 목록 조회, `POST /api/posts`는 작성, `PATCH /api/posts/:postId`는 수정, `DELETE /api/posts/:postId`는 삭제입니다.

### Middleware

실제 route handler 전후에 공통 작업을 수행하는 함수입니다. `authenticate`, rate limit, 요청 출처 검사, 공통 에러 처리가 여기에 해당합니다.

### authenticate

보호 API 앞에서 JWT를 검증하는 Express middleware입니다. 쿠키 또는 Bearer header에서 토큰을 찾고, 서명·만료·발급자·대상과 DB의 `session_version`을 확인합니다. 성공하면 `req.user`를 설정하고 `next()`를 호출하며, 실패하면 401 에러를 전달합니다.

### Repository

SQL과 데이터 변환을 담당하는 계층입니다. route가 HTTP 요청과 권한을 처리하고, repository가 MySQL의 조회·추가·수정·삭제를 담당하도록 역할을 나눴습니다.

## Authentication

### JWT

로그인 사용자를 짧게 증명하는 서명된 문자열입니다. Access Token payload에는 `userId`, `sessionVersion`, `tokenType`이 들어가고, 라이브러리가 `iat`, `exp`, `iss`, `aud`를 추가합니다. JWT는 암호화 문서가 아니므로 비밀번호 같은 민감정보를 넣지 않습니다.

### HttpOnly cookie

JavaScript가 값을 읽을 수 없고 브라우저가 요청에 자동으로 첨부하는 쿠키입니다. API는 Access Token을 `yakuku_access`, Refresh Token을 `yakuku_refresh` 쿠키로 설정합니다. 두 토큰의 원문은 프론트엔드 코드에 노출되지 않습니다.

### sessionVersion

기존 Access Token을 서버에서 무효화하기 위한 사용자별 숫자입니다. 토큰의 값과 DB의 `users.session_version`이 다르면 인증을 거부합니다. 비밀번호 재설정 시 DB 값을 증가시키고 해당 사용자의 Refresh 세션도 모두 폐기합니다. 일반 로그아웃은 현재 Refresh Token family를 폐기합니다.

### `cookie-session` marker

외부 패키지나 실제 JWT가 아니라 프론트에서 사용하는 메모리 문자열입니다. HttpOnly JWT를 읽을 수 없으므로 “쿠키 인증을 시도할 상태”임을 나타냅니다. 실제 로그인 여부는 `/auth/me` 응답으로 확인합니다.

### hydrate

이 프로젝트에서 Zustand store 초기화를 위해 만든 함수명입니다. 앱이 마운트되면 과거 localStorage JWT를 제거하고 `cookie-session` marker와 `hasHydrated`를 설정합니다. Zustand persist가 저장 데이터를 복구하는 동작과는 다릅니다.

### credentials: include

`fetch` 요청에 브라우저 쿠키를 포함하라는 옵션입니다. 실제 JWT가 HttpOnly cookie에 있기 때문에 공통 `request<T>`가 모든 JSON API 요청에 설정합니다. API의 CORS 설정도 `credentials: true`로 맞췄습니다.

### useAuthGuard

Zustand 초기화가 끝난 뒤 인증 marker가 없으면 페이지를 이동시키는 커스텀 React hook입니다. 화면 접근 UX를 담당할 뿐, 실제 보안은 백엔드의 `authenticate`가 담당합니다.

## Frontend State and API

### React state

- **원래 하는 기능:** React 컴포넌트가 화면에 반영할 값을 기억합니다. `useState` 등으로 값을 바꾸면 React가 해당 컴포넌트를 다시 렌더링해 화면과 데이터를 맞춰 줍니다.
- **이 프로젝트에서는:** 페이지 번호, 폼 입력, 팝업 여부, 이미지 미리보기처럼 현재 화면 안에서만 필요한 값을 관리합니다. 여러 화면이 공유할 필요가 없어 Zustand로 올리지 않습니다.

### Zustand

- **원래 하는 기능:** React 컴포넌트 바깥에 전역 Store를 만들고, 여러 컴포넌트가 같은 값을 구독하고 수정하게 하는 상태관리 라이브러리입니다. 멀리 떨어진 컴포넌트끼리 props를 계속 전달하지 않고도 같은 상태를 쓸 수 있습니다.
- **이 프로젝트에서는:** 로그인 사용자, 세션 초기화 상태, 캘린더 필터처럼 여러 화면과 컴포넌트가 함께 쓰는 값을 공유합니다. 실제 JWT 값은 저장하지 않습니다.

### TanStack Query

- **원래 하는 기능:** API로 가져온 서버 데이터의 로딩, 에러, 캐시, 중복 요청, 재요청 시점을 관리하는 라이브러리입니다. React state와 달리 서버가 원본인 데이터를 다루는 데 적합합니다.
- **이 프로젝트에서는:** 사용자, 팀, 경기, 게시글, 댓글, 관람 기록 등을 조회하고 캐시합니다. 작성·수정·삭제 후에는 관련 query key를 invalidate해 변경된 데이터를 다시 요청합니다.

### Query hook

- **원래 하는 기능:** 별도의 라이브러리가 아니라, React custom hook 패턴으로 `useQuery` 설정을 재사용 함수로 묶은 것입니다. query key, API 함수, 실행 조건을 한 번만 정의해 화면마다 설정이 달라지는 문제를 줄입니다.
- **이 프로젝트에서는:** `useMeQuery`, `usePostsQuery`, `useGamesQuery`처럼 목적이 보이는 이름으로 감싸고 `queries.ts`에 모아 재사용합니다.

### Query key

TanStack Query 캐시를 구분하는 주소입니다. 게시글이라도 페이지·검색어·카테고리가 다르면 서로 다른 key를 사용합니다. 작성·수정·삭제 후 관련 key를 invalidate하면 최신 데이터를 다시 요청합니다.

### Domain API

- **원래 하는 기능:** 별도의 라이브러리가 아니라, API 호출 코드를 로그인·게시글·관람 기록 같은 업무 영역별로 나누는 파일 구조입니다. 화면이 URL, HTTP method, 응답 타입 같은 통신 세부사항을 직접 알지 않게 합니다.
- **이 프로젝트에서는:** `auth-api.ts`, `post-api.ts`, `attendance-api.ts`, `baseball-api.ts`로 나뉩니다. 로그인 화면은 URL 대신 `login()`, 게시글 화면은 `createPost()`처럼 업무 이름의 함수를 호출합니다.

### request\<T\>

- **원래 하는 기능:** 매번 `fetch` 주변에 반복하는 base URL, HTTP method, header, body, JSON 변환, 에러 처리를 한 곳에 모은 공통 함수입니다. `<T>`는 TypeScript가 성공 응답 형태를 알도록 하는 제네릭이며, 실제 응답을 런타임에 검증하는 기능은 아닙니다.
- **이 프로젝트에서는:** 모든 JSON Domain API가 `request<T>`를 통해 요청합니다. 그 덕분에 쿠키 전송, JSON 변환, `ApiError` 생성, 204 응답 처리가 모든 API에 동일하게 적용됩니다.

### ApiError

- **원래 하는 기능:** JavaScript의 일반 `Error`에 HTTP status와 서버 error code를 추가한 custom error입니다. 문자열 message만으로 판단하지 않고, 프로그램이 `401`, `EMAIL_NOT_VERIFIED` 같은 값으로 실패 종류를 구분하게 합니다.
- **이 프로젝트에서는:** `request<T>`가 실패 응답을 `ApiError` 형태로 통일합니다. 화면은 `code`를 보고 이메일 인증 화면 이동 같은 행동을 결정하고, `message`는 사용자 안내에 쓸 수 있습니다.

## Sign-up

### bcryptjs hash

비밀번호를 원문으로 저장하지 않기 위한 단방향 변환입니다. cost 12로 hash를 저장하고, 로그인 시 복호화하지 않고 `bcrypt.compare()`로 일치 여부만 확인합니다.

### Nodemailer

Node.js에서 SMTP 서버에 이메일 발송을 요청하는 라이브러리입니다. 현재 Gmail SMTP를 통해 회원가입 인증번호와 비밀번호 재설정 메일을 보냅니다.

### SMTP

이메일을 보내는 통신 규칙입니다. Nodemailer가 Gmail SMTP 서버에 접속하고 Gmail이 실제 메일을 전달합니다.

### Email verification code

Node `crypto.randomInt`로 만든 6자리 번호입니다. DB에 3분 만료로 저장하며, 재전송 대기시간은 30초이고 최대 발송 횟수는 4회입니다. 새 번호를 만들면 기존 미사용 번호는 사용 처리합니다.

## Database

### MySQL

사용자, 팀, 경기, 관람 기록, 게시글, 댓글을 관계형 테이블로 저장합니다. API는 `mysql2` connection pool을 통해 접근합니다.

### Foreign key

테이블 사이의 유효한 관계를 DB가 보장하는 제약조건입니다. `posts.user_id`는 `users.id`, `comments.post_id`는 `posts.id`를 참조합니다.

### Unique key

중복 저장을 DB에서 차단합니다. 사용자 이메일·닉네임과 `(user_id, game_id)` 관람 기록 등에 적용합니다.

### LIMIT / OFFSET

게시글 전체를 한 번에 가져오지 않고 현재 페이지 구간만 조회하는 SQL입니다. `offset = (page - 1) × size`로 계산하며 기본 size는 10, API 최대값은 50입니다.

## Infrastructure and Deployment

### GCP Compute Engine VM

서비스가 실제로 실행되는 Google Cloud의 Linux 가상 서버입니다. 현재는 VM 한 대에서 모든 컨테이너를 실행합니다.

### Dockerfile / Image / Container

Dockerfile은 실행 환경을 만드는 조리법, image는 빌드가 끝난 배포 패키지, container는 image를 실제로 실행한 프로세스입니다.

### Docker Compose

`web`, `api`, `mysql`, `gateway`, `caddy` 컨테이너의 환경 변수, 네트워크, 의존 관계, volume을 한 파일에서 관리합니다.

### Caddy

외부의 80·443 포트를 받고 HTTPS 인증서를 관리하는 reverse proxy입니다. 받은 요청을 Nginx gateway의 8080 포트로 전달합니다.

### Nginx gateway

요청 경로와 목적지를 연결하고 IP별 속도·동시 연결을 제한합니다. `/api`와 `/uploads`는 Express로, 나머지는 Next.js로 전달합니다.

### Reverse proxy

사용자 대신 내부 서버를 선택해 요청을 전달하는 서버입니다. 내부의 Web/API 포트를 외부에 직접 공개하지 않고 하나의 도메인으로 묶을 수 있습니다.

### GitHub Actions

`main` push를 감지해 빌드와 배포 절차를 자동 실행하는 CI/CD 환경입니다.

### GHCR push

GHCR은 GitHub Container Registry입니다. GitHub Actions가 만든 Web/API Docker image를 커밋 SHA와 `latest` tag로 업로드합니다. 소스 코드를 Git에 push하는 것과 다른 단계입니다.

### SSH deploy

GitHub Actions가 private key로 GCP VM에 원격 접속해 배포 명령을 실행하는 단계입니다. VM은 GHCR에서 image를 pull하고 `docker compose up -d --no-build`로 컨테이너를 교체합니다.

### Volume

컨테이너를 교체해도 유지해야 하는 데이터를 저장하는 공간입니다. MySQL 데이터, 업로드 파일, Caddy 인증서에 사용합니다.

### Health check

배포 후 API와 DB가 실제로 응답하는지 `/api/health`로 확인하는 검사입니다. 12회 안에 성공하지 않으면 GitHub Actions 배포를 실패로 처리합니다.

## 발표용 핵심 답변

### API 요청 구조

> 화면에서는 Query hook을 사용하고, hook은 Domain API를 호출합니다. Domain API는 공통 `request<T>`를 사용해 base URL, JSON, 쿠키와 에러 처리를 공유합니다.

### 로그인 상태 유지

> 실제 JWT는 httpOnly cookie에 저장됩니다. 새로고침 시 Zustand가 메모리 marker를 초기화하고 TanStack Query의 `/auth/me` 요청으로 쿠키를 검증해 사용자 상태를 복원합니다.

### 인증 페이지 보호

> `useAuthGuard`가 프론트 페이지 이동을 제어하고, Express의 `authenticate` middleware가 JWT와 DB 세션 버전을 확인해 실제 API를 보호합니다.

### 자동 배포

> main push 시 GitHub Actions가 Web/API image를 빌드해 GHCR에 올리고, SSH로 GCP VM에 접속해 Compose로 image를 교체한 뒤 health check를 수행합니다.

## 현재 공개 범위

- 서비스: `https://yakuku-yaru.today`
- API health: `https://yakuku-yaru.today/api/health`
- Swagger UI: 로컬 `http://localhost:4000/api-docs`, 운영 `https://yakuku-yaru.today/api-docs`
- OpenAPI JSON: 로컬 `http://localhost:4000/api-docs.json`, 운영 `https://yakuku-yaru.today/api-docs.json`
- Nginx가 `/api-docs` 경로를 Express로 전달하고, Swagger는 현재 host 기준의 `/api`로 요청합니다.
