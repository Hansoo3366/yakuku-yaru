import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './guide.module.css';

export const metadata: Metadata = {
  title: '기술 흐름 치트시트',
};

type Term = {
  name: string;
  meaning: string;
  role: string;
};

type TermGroup = {
  id: string;
  label: string;
  title: string;
  terms: Term[];
};

type FollowUp = {
  question: string;
  answer: string;
};

type Question = {
  question: string;
  answer: string;
  followUps?: FollowUp[];
  paths?: string[];
};

type QuestionGroup = {
  label: string;
  title: string;
  questions: Question[];
};

const requestFlow = [
  'Browser',
  'Caddy :443',
  'Nginx :8080',
  'Next.js :3000 / Express :4000',
  'MySQL :3306',
  'TanStack Query cache',
  'React UI',
];

const deployFlow = [
  'main push',
  'GitHub Actions',
  'Docker build',
  'GHCR push',
  'SSH',
  'Compose pull / up',
  'nginx -t · caddy validate',
  'Health check 12회',
];

const stats = [
  ['81', 'Express route handler'],
  ['14', '마운트된 router'],
  ['25', 'MySQL 테이블'],
  ['26', 'App Router 페이지'],
  ['16', 'useQuery hook'],
  ['2', 'Zustand store'],
  ['19', 'rate-limit scope'],
  ['5', '운영 컨테이너'],
];

const groups: TermGroup[] = [
  {
    id: 'backend',
    label: '01 / BACKEND',
    title: '서버와 API',
    terms: [
      {
        name: 'Node.js',
        meaning:
          '브라우저 밖에서 JavaScript를 실행하게 해주는 런타임. V8 엔진 위에 파일 시스템·네트워크·프로세스 같은 운영체제 기능을 API로 올려둡니다.',
        role: 'apps/api 전체가 Node.js 프로세스 하나로 뜹니다. Express 라우팅, MySQL 접근, JWT 발급, Gmail 발송, KBO 페이지 크롤링이 전부 이 프로세스 안의 코드입니다.',
      },
      {
        name: 'Express',
        meaning:
          'Node.js용 웹 프레임워크. 요청을 받는 router, 요청 사이에 끼워 넣는 middleware, 응답을 만드는 헬퍼를 제공합니다. 프레임워크 자체가 아주 얇아서 순서를 직접 조립해야 합니다.',
        role: 'src/app.ts의 createApp()이 전역 미들웨어 체인을 조립하고 14개 router를 /api/*에 마운트합니다. 실제 handler는 81개입니다.',
      },
      {
        name: 'REST API',
        meaning:
          'URL로 자원을, HTTP method로 행동을 표현하는 설계 방식. 서버가 이전 요청을 기억하지 않고 요청 한 번으로 완결됩니다.',
        role: 'GET /api/posts 조회, POST /api/posts 작성, PATCH /api/posts/:postId 수정, DELETE /api/posts/:postId 삭제. 생성은 201, 삭제 성공은 본문 없이 204로 응답합니다.',
      },
      {
        name: 'Middleware',
        meaning:
          'route handler에 도달하기 전에 순서대로 실행되는 함수. next()를 호출해야 다음 단계로 넘어가고 next(error)를 호출하면 에러 핸들러로 곧장 갑니다.',
        role: '전역은 helmet → cors → requireTrustedOrigin → globalApiRateLimit → express.json 순서로 붙습니다. 라우트 단위로는 authenticate → requireAdmin → multer 순서입니다. 순서가 곧 보안입니다.',
      },
      {
        name: 'Repository',
        meaning:
          'SQL과 DB 접근만 모아두는 계층. 비즈니스 규칙은 라우터에 남기고 "어떻게 읽고 쓰는가"만 담당하도록 책임을 나누는 패턴입니다.',
        role: '*repository.ts 파일이 SQL을 소유합니다. 라우터는 HTTP를, repository는 MySQL을 다루므로 쿼리를 바꿀 때 화면 코드를 건드리지 않습니다.',
      },
      {
        name: 'HttpError',
        meaning:
          'statusCode, code, message 세 개만 담는 얇은 Error 서브클래스. "이 실패는 예상된 실패다"를 타입으로 표시하는 신호입니다.',
        role: "src/utils/http-error.ts에 정의되고 모든 라우터가 new HttpError(401, 'AUTH_REQUIRED', '로그인이 필요합니다.')처럼 던집니다. errorHandler는 이 인스턴스면 statusCode를 그대로 씁니다.",
      },
      {
        name: 'errorHandler',
        meaning:
          'Express의 4인자 에러 미들웨어. 체인 맨 마지막에 등록되어 모든 next(error)를 받아 하나의 응답 형태로 만듭니다.',
        role: 'src/middleware/error-handler.ts. HttpError면 해당 status, MulterError면 400, MySQL ER_DUP_ENTRY면 409, 나머지는 console.error 후 500. 응답 본문은 항상 { code, message } 두 필드뿐입니다.',
      },
      {
        name: 'next(error) 패턴',
        meaning:
          'Express 4는 async handler 안에서 던진 에러를 자동으로 잡지 못합니다. try/catch로 직접 잡아 next(error)에 넘겨야 에러 미들웨어에 도달합니다.',
        role: 'apps/api의 모든 handler가 동일한 try { … } catch (error) { next(error); } 형태를 씁니다. 이 규칙이 빠지면 요청이 응답 없이 멈춥니다.',
      },
      {
        name: 'Swagger / OpenAPI',
        meaning:
          'OpenAPI는 API를 기계가 읽는 JSON으로 기술하는 규격이고, Swagger UI는 그 JSON을 사람이 쓰는 문서 화면으로 그려주는 도구입니다.',
        role: 'src/config/openapi.ts에 889줄짜리 OpenAPI 3.0 객체를 손으로 작성합니다. swagger-ui-express가 /api-docs에 띄우고 /api-docs.json으로 원본도 노출합니다. 로컬과 운영이 같은 문서를 제공하고 운영 주소는 yakuku-yaru.today/api-docs입니다. 81개 경로 중 24개가 문서화되어 있습니다.',
      },
    ],
  },
  {
    id: 'auth',
    label: '02 / AUTH',
    title: '로그인과 인증',
    terms: [
      {
        name: 'JWT',
        meaning:
          '헤더·페이로드·서명을 점으로 이어 붙인 서명된 문자열. 서버가 세션을 기억하지 않아도 "누가 발급했는지"를 증명할 수 있어 상태 없는 인증을 가능하게 합니다.',
        role: 'src/utils/jwt.ts가 15분짜리 Access Token을 HS256으로 서명합니다. 페이로드에는 userId, sessionVersion, tokenType만 담고, iss는 yakuku-yaru-api, aud는 yakuku-yaru-web으로 제한합니다.',
      },
      {
        name: 'HttpOnly cookie',
        meaning:
          'JavaScript가 document.cookie로 읽을 수 없고 브라우저가 같은 도메인 요청에 자동으로 붙여 보내는 쿠키. XSS가 토큰을 훔쳐 가는 경로를 브라우저 단계에서 막습니다.',
        role: 'yakuku_access와 yakuku_refresh를 각각 HttpOnly, SameSite=Lax, 운영 Secure 쿠키로 설정합니다. 프론트엔드 JavaScript는 두 토큰 문자열을 읽지 않습니다.',
      },
      {
        name: 'SameSite=Lax',
        meaning:
          '교차 사이트 요청에 쿠키를 보낼지 정하는 속성. Lax는 링크 클릭 같은 최상위 내비게이션 GET만 허용하고 iframe·XHR 같은 교차 요청에는 쿠키를 싣지 않습니다.',
        role: 'CSRF의 주된 경로를 브라우저가 먼저 막아줍니다. 여기에 requireTrustedOrigin이 Origin과 Sec-Fetch-Site를 다시 검사해 2중으로 방어합니다.',
      },
      {
        name: 'authenticate',
        meaning:
          '보호 API 앞에 세우는 미들웨어. 토큰을 찾아 서명·만료를 검증하고, 통과한 사용자만 req.user에 넣습니다.',
        role: 'src/middleware/authenticate.ts. Authorization: Bearer 헤더와 yakuku_access 쿠키를 보고, 성공하면 users.session_version을 DB에서 다시 읽어 Access Token의 sessionVersion과 비교합니다. 실패는 401 AUTH_REQUIRED 또는 401 INVALID_TOKEN.',
      },
      {
        name: 'optionalAuthenticate',
        meaning:
          'authenticate와 같은 검증 로직을 돌리되, 실패해도 에러를 던지지 않고 비로그인 상태로 통과시키는 변형입니다.',
        role: 'GET /api/posts(목록), GET /api/users/discover, GET /api/users/:userId/profile처럼 누구나 보지만 로그인 사용자에게는 isFollowing·isSelf 같은 플래그를 더해야 하는 조회에 사용합니다.',
      },
      {
        name: 'sessionVersion',
        meaning:
          'users 테이블의 정수 컬럼. 서버가 "이 버전 이전에 발급된 토큰은 모두 무효"라고 선언하는 장치입니다. JWT는 한 번 발급하면 스스로 취소할 수 없으므로 이 값을 둡니다.',
        role: '비밀번호 재설정 성공 시 1 증가시킵니다. 기존 Access Token이 즉시 거부되고, refresh_sessions의 사용자 세션도 전부 폐기해 새 Access Token 발급까지 막습니다.',
      },
      {
        name: 'Refresh Token rotation',
        meaning:
          'Access Token이 만료됐을 때 로그인 상태를 연장하는 일회용 토큰. 한 번 쓸 때마다 새 값으로 교체해 탈취한 옛 토큰의 재사용을 감지합니다.',
        role: 'refresh_sessions에는 원문 대신 SHA-256 해시, 사용자, 토큰 묶음, 만료·교체·폐기 시각을 저장합니다. 일반 로그인은 7일, 로그인 상태 유지는 30일이며 재사용 감지 시 같은 묶음을 모두 폐기합니다.',
      },
      {
        name: 'cookie-session marker',
        meaning:
          "Zustand auth-store의 token 필드에 들어가는 'cookie-session' 문자열 상수. 실제 토큰이 아니라 '쿠키 인증을 시도해볼 만하다'는 메모리 표시입니다.",
        role: 'src/lib/auth.ts의 COOKIE_SESSION_TOKEN. HttpOnly 쿠키는 JavaScript로 존재를 확인할 수 없으니, hydrate()가 이 마커를 넣어 /auth/me를 호출할 근거를 만듭니다.',
      },
      {
        name: 'hydrate()',
        meaning:
          '앱이 켜질 때 인증 store를 "확인 준비 완료" 상태로 만드는 초기화 함수. SSR과 클라이언트 렌더 사이의 상태 차이를 맞추는 역할도 합니다.',
        role: 'hasHydrated를 true로, token을 cookie-session 마커로 설정합니다. 옛 localStorage 토큰이 남아 있으면 clearLegacyStoredAccessToken()으로 지우고 document.documentElement.dataset.authState도 갱신합니다.',
      },
      {
        name: "credentials: 'include'",
        meaning:
          "fetch가 교차 출처 요청에도 쿠키를 함께 보내게 하는 옵션. 기본값은 'same-origin'이라 다른 도메인의 API에는 쿠키가 실리지 않습니다.",
        role: "src/lib/api.ts의 request<T>가 모든 요청에 credentials: 'include'를 고정합니다. 서버 쪽 cors도 credentials: true여야 양쪽이 맞물립니다.",
      },
      {
        name: 'useAuthGuard',
        meaning:
          '"세션 확인이 끝났는데도 로그인이 아니면 로그인 페이지로 보낸다"는 useEffect 기반 훅. 화면 진입을 막는 UX 장치입니다.',
        role: 'src/lib/use-auth-guard.ts. attendance/new, attendance/[recordId], attendance/[recordId]/edit, me, posts/new, posts/[postId]/edit 여섯 화면만 사용합니다. /admin은 이 훅 대신 role을 직접 확인하고, /calendar는 비로그인에도 열립니다.',
      },
      {
        name: 'clearSession()',
        meaning:
          '로그아웃 API를 호출해 서버의 Refresh Token 묶음을 폐기하고, 클라이언트 store와 DOM 마커도 정리하는 함수입니다.',
        role: "src/lib/auth-store.ts. 서버가 두 쿠키를 지운 뒤 window에 'yakuku:auth:logout' 이벤트를 보내 보호 화면도 로그인 화면으로 이동시킵니다.",
      },
    ],
  },
  {
    id: 'frontend',
    label: '03 / FRONTEND',
    title: '상태와 API 호출',
    terms: [
      {
        name: 'React state',
        meaning:
          'React 컴포넌트가 화면에 반영할 값을 기억하고, 값이 바뀌면 해당 화면을 다시 렌더링하는 기본 상태 기능. 컴포넌트가 언마운트되면 값도 사라집니다.',
        role: '페이지 번호·폼 입력·팝업 열림 여부·이미지 미리보기는 현재 화면 안에서만 필요하므로 전역 store로 올리지 않고 React state로 관리합니다.',
      },
      {
        name: 'Zustand',
        meaning:
          '컴포넌트 바깥에 전역 store를 만들고 여러 컴포넌트가 같은 값을 구독·수정하게 하는 클라이언트 상태관리 라이브러리. Provider로 감쌀 필요가 없고 selector로 필요한 조각만 구독합니다.',
        role: '로그인 사용자·세션 확인 상태(auth-store)와 캘린더 뷰·필터(calendar-ui-store) 딱 2개 store만 씁니다. 여러 화면이 함께 보는 값이고 서버 원본이 아닌 값만 넣습니다.',
      },
      {
        name: 'TanStack Query',
        meaning:
          'API로 가져온 서버 데이터의 요청·로딩·에러·캐시·중복 요청 제거·재요청 시점을 관리하는 서버 상태 라이브러리. "언제 다시 불러올 것인가"를 선언적으로 다룹니다.',
        role: '사용자·팀·순위·경기·게시글·댓글·팬 조회를 useQuery hook 16개로 묶었습니다. 같은 key로 여러 화면이 요청해도 실제 네트워크 요청은 한 번만 나갑니다.',
      },
      {
        name: 'query key',
        meaning:
          'TanStack Query가 캐시 데이터를 구분하는 배열. key가 같으면 같은 캐시를 공유하고, key가 달라지면 완전히 다른 데이터로 취급합니다.',
        role: 'src/lib/query-keys.ts의 queryKeys factory가 모든 key를 만듭니다. 화면에서 문자열을 직접 쓰지 않으므로 key 철자 때문에 캐시가 갈리는 사고를 막습니다.',
      },
      {
        name: 'invalidateQueries',
        meaning:
          '"이 캐시는 이제 믿을 수 없다"고 표시하는 함수. 표시된 query는 다음에 화면이 구독하는 순간 다시 요청됩니다. 즉시 다시 부르지는 않습니다.',
        role: 'useMutation을 쓰지 않아 쓰기 성공 후 화면에서 직접 호출합니다. 9개 파일 21곳 — 관람 기록 수정 화면은 기록·통계·경기·프로필 query를 한 번에 무효화합니다.',
      },
      {
        name: 'QueryClient 기본값',
        meaning:
          '전역 캐시 동작을 정하는 설정. 개별 query가 지정하지 않으면 이 값이 적용됩니다.',
        role: 'src/components/AppProviders.tsx에서 staleTime 60초, retry 1, refetchOnWindowFocus false. 팀 목록은 1시간, 순위·시즌 예측은 10분, 팀 응원가는 5분처럼 데이터 성격별로 덮어씁니다.',
      },
      {
        name: 'Query hook',
        meaning:
          'React hook 규칙을 이용해 useQuery의 query key·요청 함수·실행 조건을 하나의 재사용 함수로 묶는 프로젝트 패턴입니다.',
        role: 'useMeQuery·usePostsQuery처럼 반복 설정을 src/lib/queries.ts에 모아, 페이지가 캐시 key와 요청 조건을 매번 작성하지 않게 합니다. 16개 전부 useQuery이고 useMutation은 없습니다.',
      },
      {
        name: 'Domain API',
        meaning:
          '기능 영역별로 API URL·요청 값·응답 타입을 묶어 화면과 HTTP 세부사항을 분리하는 코드 구조입니다.',
        role: 'auth-api·post-api·attendance-api·baseball-api·stadium-note-api로 나눠, 화면에서는 URL 대신 login()이나 createPost()처럼 업무 이름의 함수를 호출합니다.',
      },
      {
        name: 'request<T>',
        meaning:
          'fetch에 반복되는 base URL·method·header·body·응답·에러 처리를 한 번에 수행하는 공통 함수. T는 성공 응답 타입을 알려주는 TypeScript generic입니다.',
        role: "src/lib/api.ts. Content-Type: application/json과 credentials: 'include'를 항상 붙이고, 204면 undefined를, 빈 본문도 undefined를 반환합니다. 실패 응답은 ApiError로 던집니다. T에 대한 런타임 검증은 하지 않습니다.",
      },
      {
        name: 'ApiError',
        meaning:
          '일반 Error에 HTTP status와 서버 error code를 추가해, 프로그램이 실패 원인을 구분할 수 있게 만든 custom error입니다.',
        role: 'request<T>가 실패 응답을 ApiError로 통일하므로 화면은 EMAIL_NOT_VERIFIED 같은 code로 이동할 화면을 결정하고 message를 그대로 표시합니다.',
      },
      {
        name: 'react-hook-form + zod',
        meaning:
          'RHF는 입력값을 컴포넌트 상태 대신 자체 store에 담아 keystroke마다 리렌더되는 것을 막는 폼 라이브러리이고, zod는 런타임 타입 검증을 스키마로 선언하는 라이브러리입니다.',
        role: 'src/lib/form-schemas.ts의 loginSchema·postFormSchema·commentFormSchema·attendanceFormSchema 네 개를 zodResolver로 연결합니다. 회원가입 화면은 아직 useState로 직접 검증합니다.',
      },
      {
        name: 'getAssetUrl',
        meaning:
          'DB에 저장된 상대 경로(/uploads/…)를 실제 이미지 URL로 바꿔주는 헬퍼입니다.',
        role: 'src/lib/api.ts. API_URL에서 /api를 잘라 ASSET_URL을 만든 뒤 붙입니다. 업로드 이미지가 Next.js가 아니라 Express 쪽 정적 경로라 도메인이 달라서 필요합니다.',
      },
    ],
  },
  {
    id: 'account',
    label: '04 / ACCOUNT',
    title: '회원가입과 계정',
    terms: [
      {
        name: 'bcryptjs',
        meaning:
          '비밀번호를 되돌릴 수 없는 단방향 hash로 바꾸는 라이브러리. 같은 입력이라도 salt가 달라 매번 다른 결과가 나오고 cost 값이 클수록 계산이 느려집니다.',
        role: 'src/utils/password.ts가 SALT_ROUNDS 12로 hash하고 compare로 로그인 검증합니다. DB에 평문이 들어가지 않고, cost 12는 brute-force 한 번을 충분히 비싸게 만드는 값입니다.',
      },
      {
        name: 'Nodemailer',
        meaning:
          'Node.js에서 이메일 발송을 요청하는 라이브러리. SMTP 서버 주소·계정·메시지를 넘기면 전송을 대신 처리합니다.',
        role: 'Gmail SMTP로 회원가입 인증번호와 비밀번호 재설정 링크를 보냅니다. SMTP 환경변수가 비어 있으면 보내지 않고 false를 반환해 경고를 남기고, 개발 환경에서는 그 경우 응답에 인증번호를 담아 확인할 수 있게 분기합니다.',
      },
      {
        name: 'SMTP',
        meaning:
          '메일 서버 사이에서 메일을 주고받기 위한 통신 규약. HTTP처럼 요청·응답 구조이지만 메일 전송에 특화되어 있습니다.',
        role: 'Nodemailer와 Gmail 메일 서버 사이의 발송 통신에 사용합니다. 수신 규약은 POP3·IMAP으로 별개입니다.',
      },
      {
        name: 'email_verification_tokens',
        meaning:
          '이메일로 보낸 인증번호와 만료 시각을 담아두는 테이블. 사용자가 입력한 번호가 실제로 발급된 번호인지 대조합니다.',
        role: '6자리 코드를 3분 만료로 저장하고 30초 재전송 대기·1시간에 최대 4회 발송 제한을 겁니다. 코드는 사용자끼리 겹칠 수 있어 전역 unique를 두지 않고 이메일+코드로 찾습니다. users(id)에 ON DELETE CASCADE라 회원이 사라지면 함께 정리됩니다.',
      },
      {
        name: 'email_verified_at',
        meaning:
          'users 테이블의 nullable 타임스탬프. 값이 있으면 이메일 소유가 확인된 계정입니다.',
        role: '인증번호 검증 성공 시 기록됩니다. 이 값이 없으면 로그인해도 403 EMAIL_NOT_VERIFIED로 막히고 인증 화면으로 이동합니다.',
      },
      {
        name: 'password_reset_tokens',
        meaning:
          '비밀번호 재설정 링크의 일회용 토큰과 만료 시각을 담는 테이블. 링크를 클릭한 사람이 정말 메일을 받은 사람인지 확인합니다.',
        role: 'POST /api/auth/forgot-password가 토큰을 만들어 메일로 보내고 POST /api/auth/reset-password가 대조합니다. 성공 시 users.session_version을 1 올려 기존 JWT를 전부 무효화합니다.',
      },
      {
        name: '약관 동의 3종',
        meaning:
          '서비스 이용약관, 개인정보 처리방침, 만 14세 이상 확인. 각각 언제 동의했는지를 별도 컬럼에 기록합니다.',
        role: 'terms_agreed_at·privacy_agreed_at·age_confirmed_at. 하나라도 빠지면 400 CONSENT_REQUIRED로 가입을 거절합니다. 동의 사실 자체가 증거라 boolean이 아니라 시각으로 남깁니다.',
      },
    ],
  },
  {
    id: 'database',
    label: '05 / DATABASE',
    title: '테이블과 제약',
    terms: [
      {
        name: 'Foreign Key',
        meaning:
          '한 테이블의 컬럼이 다른 테이블의 행을 가리키게 하고, 없는 값을 넣으면 DB가 거절하는 제약입니다. 참조 무결성을 애플리케이션이 아니라 DB가 보장합니다.',
        role: 'posts.user_id, comments.post_id, attendance_records.game_id 등이 FK입니다. 잘못된 ID로 쓰려는 시도는 애플리케이션을 통과해도 DB에서 실패합니다.',
      },
      {
        name: 'ON DELETE CASCADE / SET NULL',
        meaning:
          '부모 행이 삭제될 때 자식 행을 어떻게 할지 정하는 FK 옵션. CASCADE는 함께 삭제하고 SET NULL은 참조만 비워 행은 남깁니다.',
        role: '회원 탈퇴 시 게시글·댓글·관람 기록은 CASCADE로 함께 정리됩니다. 반면 users.favorite_team과 attendance_records.cheered_team은 SET NULL이라 팀이 사라져도 기록은 남습니다.',
      },
      {
        name: 'Unique Key',
        meaning:
          '컬럼이나 컬럼 조합의 값이 테이블 안에서 중복되지 못하게 하는 제약입니다. 중복 시도는 ER_DUP_ENTRY 에러로 돌아옵니다.',
        role: 'uq_users_email, uq_users_nickname이 계정 중복을 막고 uq_attendance_user_game이 "한 경기에 한 사람이 기록 하나"를 강제합니다. errorHandler가 ER_DUP_ENTRY를 409로 변환합니다.',
      },
      {
        name: '연결 테이블 (N:M 분리)',
        meaning:
          '다대다 관계를 두 개의 일대다로 쪼개는 중간 테이블. 양쪽 FK를 갖고 자기 자신의 unique 조합을 갖습니다.',
        role: 'attendance_companions가 attendance_records와 users를 잇습니다. (attendance_record_id, user_id) unique로 같은 사람을 두 번 태그하지 못하게 막고 status로 pending·accepted·rejected를 관리합니다.',
      },
      {
        name: '복합 기본키 + CHECK',
        meaning:
          'id 컬럼 없이 두 컬럼의 조합 자체를 기본키로 쓰는 방식과, 행 단위의 조건을 DB가 검사하게 하는 제약입니다.',
        role: 'user_follows는 (follower_user_id, followed_user_id)가 그대로 PK라 중복 팔로우가 구조적으로 불가능하고, CHECK (follower_user_id <> followed_user_id)로 자기 팔로우를 막습니다.',
      },
      {
        name: 'polymorphic 컬럼',
        meaning:
          '하나의 컬럼이 여러 종류의 대상을 가리키는 설계. FK를 걸 수 없다는 trade-off가 있습니다.',
        role: 'content_reports.target_id는 target_type(post·comment·user·attendance)과 짝을 이뤄 대상을 정합니다. FK가 없으므로 삭제된 대상을 코드가 직접 처리해야 합니다.',
      },
      {
        name: '버전 마이그레이션 (schema_migrations)',
        meaning:
          '적용한 마이그레이션 id를 테이블에 기록해 각 변경을 한 번만 실행하는 방식입니다.',
        role: 'src/config/migrations.ts의 runMigrations()가 schema_migrations에 없는 항목만 순서대로 실행하고 기록합니다. API와 동기화 스크립트가 동시에 떠도 MySQL GET_LOCK으로 한 번에 하나만 적용합니다. 도입 전 내용은 0001_baseline 하나로 묶었고, 그 안의 단계는 information_schema로 존재 여부를 확인해 기존 DB에서도 안전합니다.',
      },
      {
        name: 'db/init 스크립트',
        meaning:
          'MySQL 컨테이너의 docker-entrypoint-initdb.d에 마운트되는 SQL 파일들. 데이터 볼륨이 처음 생성될 때 단 한 번만 실행됩니다.',
        role: '001_schema.sql이 테이블 20개를 만들고 002~005가 팀·구장 가이드를 seed합니다. 나머지 테이블 5개는 migrations.ts에만 있어 API가 부팅해야 생깁니다.',
      },
      {
        name: 'connection pool',
        meaning:
          'DB 연결을 미리 여러 개 만들어 재사용하는 방식. 요청마다 연결을 열고 닫는 비용을 없애고 동시 접속 수를 제한합니다.',
        role: 'src/config/database.ts가 mysql2/promise pool을 connectionLimit 10으로 만듭니다. charset은 utf8mb4라 이모지와 한글이 잘리지 않습니다.',
      },
      {
        name: 'typeCast와 KST',
        meaning:
          'mysql2가 드라이버 수준에서 컬럼 값을 JavaScript 타입으로 바꾸는 훅. 이 변환을 직접 가로채 원하는 시간대로 해석할 수 있습니다.',
        role: "timezone: 'Z'로 두고 created_at 같은 감사 컬럼은 UTC로, game_date와 ticket_open_at만 +09:00 벽시각으로 다시 파싱합니다. 경기 날짜가 자정에 밀리는 문제를 여기서 막습니다.",
      },
      {
        name: 'LIMIT / OFFSET',
        meaning:
          '조회 결과 중 몇 행만 가져올지(LIMIT)와 몇 행을 건너뛸지(OFFSET)를 DB에 지시하는 절입니다.',
        role: '게시글 목록이 page·size를 받아 LIMIT 10 OFFSET 10 형태로 현재 구간만 가져오고 COUNT(*)로 total을 함께 계산합니다. page가 깊어질수록 건너뛰는 비용이 커지는 한계가 있습니다.',
      },
    ],
  },
  {
    id: 'security',
    label: '06 / SECURITY',
    title: '방어 계층',
    terms: [
      {
        name: 'helmet',
        meaning:
          '알려진 보안 응답 헤더들을 한 번에 설정해주는 Express 미들웨어입니다.',
        role: "app.ts의 첫 미들웨어입니다. 단 crossOriginResourcePolicy는 'same-site'로 완화해 /uploads 이미지를 같은 사이트의 Next.js 화면이 가져올 수 있게 합니다.",
      },
      {
        name: 'CORS allowlist',
        meaning:
          '어떤 출처의 브라우저 요청을 허용할지 응답 헤더로 알려주는 규칙입니다. credentials를 쓰려면 origin을 *로 둘 수 없습니다.',
        role: 'env.allowedOrigins에 있는 출처만 콜백으로 통과시키고 credentials: true를 켭니다. 쿠키 기반 인증이라 와일드카드를 쓸 수 없습니다.',
      },
      {
        name: 'requireTrustedOrigin',
        meaning:
          '브라우저가 자동으로 붙여주는 Sec-Fetch-Site와 Origin 헤더를 검사해, 다른 사이트에서 보낸 쓰기 요청을 거르는 커스텀 미들웨어입니다.',
        role: "src/middleware/request-origin.ts. Sec-Fetch-Site가 'cross-site'면 즉시 403 UNTRUSTED_ORIGIN이고, 안전하지 않은 method는 Origin(없으면 Referer)을 allowlist와 대조합니다. SameSite=Lax와 짝을 이루는 CSRF 방어입니다.",
      },
      {
        name: 'rate limit scope',
        meaning:
          '"누가"를 기준으로 카운트할지와 "얼마 동안 몇 번"을 묶은 단위. 로그인 제한과 게시글 작성 제한은 성격이 달라 별도 scope가 필요합니다.',
        role: 'src/middleware/rate-limit.ts가 Map 기반 sliding bucket으로 구현했습니다. scope 19개 — api:global 240/60s, auth:register 5/1h, auth:login 15/5m, posts:create 5/60s, attendance:photo 6/10m. 키는 로그인 사용자는 user id, 아니면 IP입니다.',
      },
      {
        name: 'RateLimit-* 헤더',
        meaning:
          '남은 허용 횟수와 초기화 시각을 응답 헤더로 클라이언트에 알려주는 표준 헤더입니다.',
        role: 'RateLimit-Limit·RateLimit-Remaining·RateLimit-Reset을 매 응답에 붙이고 초과 시 Retry-After와 함께 429 RATE_LIMITED를 반환합니다. nginx의 limit_req와는 별개의 계층입니다.',
      },
      {
        name: 'sanitizeUserInput',
        meaning:
          '사용자가 보낸 텍스트에서 제어문자와 태그를 제거하고 위험한 패턴을 찾아 거절하는 입력 정제 함수입니다.',
        role: 'src/utils/user-input.ts. <script, javascript:, on\\w+=, <style, expression(, @import 등 9개 패턴을 차단해 400 UNSAFE_CONTENT를 던집니다. 길이 제한도 여기 — 제목 200, 본문 10000, 댓글 2000, 메모 4000, 닉네임 2~20.',
      },
      {
        name: 'CSP nonce',
        meaning:
          '요청마다 무작위 값을 만들어 그 값이 붙은 script만 실행을 허용하는 Content-Security-Policy 기법입니다. 주입된 스크립트는 nonce를 알 수 없어 실행되지 않습니다.',
        role: "src/proxy.ts가 요청마다 crypto.randomUUID()로 nonce를 만들고 script-src에 'nonce-…' 'strict-dynamic'을, frame-ancestors 'none'을 설정합니다. img-src는 네이버·KBO 도메인만 허용합니다.",
      },
      {
        name: '보안 응답 헤더',
        meaning:
          '브라우저의 특정 동작을 꺼서 공격 표면을 줄이는 헤더 모음입니다.',
        role: 'next.config.ts가 모든 경로에 X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy: camera=(), microphone=(), geolocation=(), COOP: same-origin, HSTS max-age=31536000을 붙입니다.',
      },
      {
        name: 'magic bytes 검사',
        meaning:
          '파일의 첫 몇 바이트에 있는 서명으로 실제 포맷을 판별하는 방법. 확장자나 MIME 선언은 얼마든지 위장할 수 있으므로 파일 자체를 봅니다.',
        role: 'src/modules/attendance/upload.ts의 assertUploadedImageFile이 첫 64바이트와 ftyp brand를 선언된 MIME과 대조합니다. 다르면 400 INVALID_FILE_TYPE. SVG는 스크립트를 담을 수 있어 허용 목록에서 아예 뺐습니다.',
      },
      {
        name: 'sharp 재인코딩',
        meaning:
          '이미지를 디코딩한 뒤 다른 포맷으로 다시 인코딩하는 처리. 원본에 숨어 있던 이미지가 아닌 데이터를 이 과정에서 사라지게 합니다.',
        role: 'WebP quality 84·effort 4로 다시 인코딩하고 EXIF 방향으로 rotate, limitInputPixels 40M으로 압력 폭탄을 막습니다. 직관은 1600px, 프로필은 512px로 resize합니다.',
      },
      {
        name: 'trust proxy',
        meaning:
          '앞에 reverse proxy가 있을 때 X-Forwarded-For 헤더를 믿고 실제 클라이언트 IP를 복원하라는 Express 설정입니다.',
        role: "app.set('trust proxy', 1)로 Caddy·Nginx 2단을 통과한 IP를 rate limit 키로 씁니다. nginx 쪽도 set_real_ip_from으로 사설 대역만 신뢰합니다.",
      },
    ],
  },
  {
    id: 'nextjs',
    label: '07 / NEXT.JS',
    title: '렌더링과 라우팅',
    terms: [
      {
        name: 'App Router',
        meaning:
          'app/ 디렉터리의 폴더 구조가 곧 URL이 되는 Next.js 라우팅 방식. 폴더마다 layout·page·loading을 둡니다.',
        role: '26개 페이지 라우트가 있습니다. /calendar와 /posts는 자체 layout과 CSS를 갖고, Next.js API route(app/api)는 하나도 쓰지 않아 모든 API 트래픽이 Express로 갑니다.',
      },
      {
        name: 'Server Component',
        meaning:
          '서버에서만 실행되고 클라이언트로 보낸 HTML에 녹아드는 컴포넌트. JavaScript 번들에 포함되지 않습니다.',
        role: 'app/games/[gameId]/page.tsx가 서버 컴포넌트로 데이터를 먼저 가져오고, 화면 조작이 필요한 부분만 GameDetailPageClient.tsx로 넘깁니다.',
      },
      {
        name: "'use client'",
        meaning:
          '이 파일부터는 브라우저에서도 실행되는 Client Component라는 선언. useState·useEffect·이벤트 핸들러를 쓰려면 필요합니다.',
        role: '발표 화면, 캘린더, 각종 대화형 화면이 클라이언트 컴포넌트입니다. TanStack Query와 Zustand는 브라우저에서 돌므로 항상 클라이언트 쪽에 있습니다.',
      },
      {
        name: 'ISR / revalidate',
        meaning:
          '정적 생성과 서버 렌더링의 중간 방식. 만든 페이지를 정해진 시간 동안 재사용하고 시간이 지나면 다음 요청에 다시 생성합니다.',
        role: '경기 상세에만 revalidate = 3600을 걸었습니다. 경기 정보가 하루 단위로 바뀌므로 1시간 캐시가 적당하고, 나머지 화면은 요청 시점에 데이터를 봅니다.',
      },
      {
        name: 'generateMetadata',
        meaning:
          '라우트별로 title·description·OG 태그를 동적으로 만드는 함수입니다.',
        role: '경기 상세에서 팀명과 날짜를 넣어 제목을 만듭니다. app/layout.tsx에는 기본 SEO 메타데이터와 JSON-LD 구조화 데이터가 있습니다.',
      },
      {
        name: 'proxy.ts',
        meaning:
          'Next.js 16에서 middleware.ts를 대체하는 파일. 페이지가 렌더링되기 전에 요청을 가로채 헤더를 붙이거나 리다이렉트할 수 있습니다.',
        role: 'src/proxy.ts가 요청마다 CSP nonce를 만들어 헤더로 붙입니다. matcher에서 api·uploads·_next/static·_next/image·favicon·manifest·sw.js와 prefetch 요청은 제외합니다.',
      },
      {
        name: 'CSS Modules',
        meaning:
          '파일 단위로 클래스 이름이 자동으로 고유해지는 CSS 방식. 전역 오염 없이 컴포넌트별 스타일을 갖습니다.',
        role: '*.module.css와 일반 *.css, app/globals.css가 섞여 있습니다. Tailwind나 shadcn/ui 같은 UI 킷은 쓰지 않고 CSS custom property로 색 토큰을 관리합니다.',
      },
      {
        name: 'PWA / service worker',
        meaning:
          '웹앱을 설치 가능하게 하고 네트워크가 끊겨도 미리 캐시한 화면을 보여주는 기술입니다.',
        role: 'app/manifest.ts가 이름과 아이콘을 정의하고 public/sw.js가 yakuku-yaru-v3 캐시로 /·/calendar·/posts·/me·/offline을 precache합니다. 내비게이션은 network-first, 실패 시 /offline. /api와 /uploads는 건너뜁니다. ServiceWorkerRegister는 production에서만 등록합니다.',
      },
    ],
  },
  {
    id: 'infra',
    label: '08 / INFRA',
    title: '컨테이너와 자동 배포',
    terms: [
      {
        name: 'GCP VM',
        meaning:
          'Google Cloud의 원격 Linux 가상 서버. Compute Engine 인스턴스 한 대가 이 서비스의 전부입니다.',
        role: 'e-small 계열 VM 한 대에서 컨테이너 5개가 함께 뜹니다. 단일 VM이라 배포 중 짧은 다운타임이 생기는 구조적 한계가 있습니다.',
      },
      {
        name: 'Docker image / container',
        meaning:
          'image는 앱과 실행 환경을 파일로 포장한 것이고, container는 그 image를 실제로 실행한 프로세스입니다.',
        role: 'apps/web/Dockerfile과 apps/api/Dockerfile이 둘 다 node:22-alpine 기반 3단계(deps → builder → runner) 빌드입니다. npm ci로 lockfile 그대로 설치하고 runner는 빌드 도구를 갖지 않습니다.',
      },
      {
        name: 'Docker Compose',
        meaning:
          '여러 컨테이너의 이미지·환경변수·의존 순서·볼륨·포트를 한 파일로 선언하고 함께 띄우는 도구입니다.',
        role: 'docker-compose.prod.yml이 mysql·api·web·gateway·caddy 5개를 정의합니다. 개발용 docker-compose.yml은 mysql 하나만 있고 web·api는 호스트에서 npm run dev로 돌립니다.',
      },
      {
        name: 'Caddy',
        meaning:
          '설정 파일 한 줄로 인증서 발급·갱신을 자동으로 처리해주는 reverse proxy입니다.',
        role: 'caddy:2.9-alpine이 80·443을 받아 gateway:8080으로 넘깁니다. Caddyfile에 strict_sni_host on, read_body 2m, zstd·gzip 인코딩이 있고 TLS 블록은 없는데 자동 HTTPS가 처리하기 때문입니다. compose profile이 proxy라 --profile proxy로 켭니다.',
      },
      {
        name: 'Nginx gateway',
        meaning:
          '내부 컨테이너로 요청을 분기하고 속도·크기·연결 수를 제한하는 내부 reverse proxy입니다.',
        role: 'infra/nginx/default.conf.template이 8080에서 받아 /api와 /api-docs와 /uploads는 api:4000으로, 나머지는 web:3000으로 보냅니다. limit_req는 web 20r/s·api 8r/s·uploads 15r/s, limit_conn 30, client_max_body_size 13m, 초과 시 429.',
      },
      {
        name: 'GitHub Actions',
        meaning:
          'GitHub 저장소의 이벤트(push, 수동 실행)를 감지해 서버 없이 작업을 실행해주는 CI/CD 환경입니다.',
        role: '.github/workflows/deploy.yml 하나뿐입니다. main push 또는 workflow_dispatch로 돌고 concurrency 그룹이 production-deploy라 이전 실행을 취소합니다. job 1개, step 8개.',
      },
      {
        name: 'GHCR',
        meaning:
          'GitHub Container Registry. Docker image를 GitHub 계정의 패키지 형태로 보관하는 저장소입니다.',
        role: 'docker/login-action이 GITHUB_TOKEN으로 로그인한 뒤 api·web 이미지를 commit SHA와 latest 두 태그로 push합니다. cache-from/to를 type=gha, scope=api/web로 나눠 빌드를 재사용합니다.',
      },
      {
        name: 'SSH deploy',
        meaning:
          'private key로 원격 서버에 접속해 배포 명령을 실행하는 단계입니다.',
        role: 'appleboy/ssh-action이 VM에서 git reset --hard origin/main → 이미지 prune → compose pull api web → --profile proxy up -d --no-build → gateway만 --force-recreate로 설정 반영을 합니다.',
      },
      {
        name: 'Health check',
        meaning:
          '배포된 서비스가 실제로 응답하는지 확인하는 검사. 컨테이너가 떴다는 것과 서비스가 건강하다는 것은 다릅니다.',
        role: 'gateway 컨테이너 안에서 wget으로 http://127.0.0.1:8080/api/health와 /api-docs.json을 12번 × 5초 간격으로 시도합니다. 둘 중 하나라도 실패면 workflow가 실패하지만 되돌리는 단계는 없습니다.',
      },
      {
        name: 'named volume',
        meaning:
          'Docker가 관리하는 영속 저장 공간. 컨테이너를 지우고 다시 만들어도 데이터가 남습니다.',
        role: 'mysql_data(DB)·api_uploads(업로드 이미지)·caddy_data(인증서)·caddy_config 4개입니다. uploads는 UPLOADS_HOST_DIR를 지정하면 호스트 경로로도 마운트됩니다.',
      },
      {
        name: 'node-cron / host crontab',
        meaning:
          'node-cron은 Node 프로세스 안에서 스케줄을 돌리는 라이브러리이고, crontab은 운영체제 수준의 스케줄러입니다.',
        role: 'src/jobs/kbo-schedule-sync.job.ts가 Asia/Seoul로 3개 일정을 갖지만 운영 compose에서는 KBO_SYNC_ENABLED가 기본 false입니다. 실제 운영은 scripts/kbo-sync의 셸 스크립트를 호스트 crontab이 flock과 함께 돌립니다.',
      },
    ],
  },
  {
    id: 'data',
    label: '09 / KBO DATA',
    title: '외부 데이터 수집과 계산',
    terms: [
      {
        name: 'ETL',
        meaning:
          'Extract(가져오기) - Transform(정제하기) - Load(적재하기)의 줄임말. 외부 데이터를 우리 스키마에 맞게 옮겨 담는 파이프라인입니다.',
        role: 'KBO 사이트에서 일정·순위·선수·경기센터를 뽑아 파싱한 뒤 games·team_standings·players·game_lineups에 upsert합니다. HTTP 라우트가 없는 모듈 7개가 이 일만 합니다.',
      },
      {
        name: 'parser',
        meaning:
          '정형화되지 않은 응답(HTML 표, 느슨한 JSON)을 고정된 타입의 객체로 바꾸는 순수 함수입니다.',
        role: 'parse-schedule.ts·parse-team-rank.ts·parse-player-search.ts처럼 파일이 분리되어 있습니다. 순수 함수라 apps/api의 assert 기반 테스트 12개 중 다수가 이 파서를 검증합니다.',
      },
      {
        name: 'upsert',
        meaning:
          '있으면 갱신하고 없으면 삽입하는 연산. 매번 전체를 지우고 다시 넣으면 사라지면 안 되는 사용자 데이터까지 날아갑니다.',
        role: 'ON DUPLICATE KEY UPDATE로 경기와 순위를 갱신합니다. uq_games_external(external_source, external_id)이 있어 같은 KBO 경기가 두 번 들어오지 않습니다.',
      },
      {
        name: 'external_source / external_id',
        meaning:
          '외부 시스템이 붙인 원본 식별자를 그대로 보관하는 컬럼. 우리 내부 id와 외부 id를 분리합니다.',
        role: "KBO에서 온 경기는 external_source가 'kbo'입니다. games API는 이 값이 'kbo'인 행만 반환해서, 로컬 테스트용으로 넣은 가짜 경기가 화면에 섞이지 않게 합니다.",
      },
      {
        name: 'Monte-Carlo 시뮬레이션',
        meaning:
          '확률적으로 결정되는 사건을 무작위로 아주 많이 재현해 결과를 분포로 추정하는 방법입니다.',
        role: '남은 경기를 KBO_PROJECTION_SIMULATIONS(기본 100,000)번 무작위 시뮬레이션해 팀별 포스트시즌 확률·평균 순위·기대 승률을 season_projection_rows에, 한국시리즈 확률을 season_postseason_projection_rows에 저장합니다.',
      },
      {
        name: '취소 사유 taxonomy',
        meaning:
          '자유 텍스트로 들어오는 값을 미리 정한 고정 목록으로 정규화하는 것. 화면이 아이콘과 문구를 안정적으로 고를 수 있게 합니다.',
        role: 'games.cancellation_reason을 우천·황사·그라운드·폭염·한파·기타로 한정하고, 화면은 이 값으로 아이콘을 고릅니다. status도 scheduled·finished·cancelled 세 값뿐입니다.',
      },
      {
        name: '칭호 계산',
        meaning:
          '원본 데이터에서 파생된 값을 규칙으로 계산해내는 로직. 저장하지 않고 매번 계산하면 원본이 바뀔 때 자동으로 따라옵니다.',
        role: 'apps/api/src/modules/attendance/attendance-score.ts의 resolveAttendanceTitles가 승리요정·패배요정·프로 직관러 등 22종을 계산합니다. 화면용 미러가 apps/web/src/lib/attendance-score.ts에 있어 같은 규칙을 씁니다.',
      },
    ],
  },
];

const errorContract = [
  {
    status: '400',
    codes: [
      'INVALID_INPUT',
      'WEAK_PASSWORD',
      'CONSENT_REQUIRED',
      'UNSAFE_CONTENT',
      'EMAIL_ALREADY_VERIFIED',
      'INVALID_FILE_TYPE',
      'INVALID_IMAGE',
      'UPLOAD_QUOTA_EXCEEDED',
      'CANNOT_FOLLOW_SELF',
    ],
    action: 'message를 폼 필드 아래나 화면 안내로 표시하고 입력을 유지',
  },
  {
    status: '401',
    codes: ['AUTH_REQUIRED', 'INVALID_TOKEN', 'INVALID_CREDENTIALS'],
    action:
      'INVALID_CREDENTIALS는 로그인 실패 안내만, 나머지는 clearSession() 후 로그인 화면으로 이동',
  },
  {
    status: '403',
    codes: [
      'EMAIL_NOT_VERIFIED',
      'FORBIDDEN',
      'ADMIN_REQUIRED',
      'UNTRUSTED_ORIGIN',
    ],
    action:
      'EMAIL_NOT_VERIFIED는 인증번호 화면으로, FORBIDDEN·ADMIN_REQUIRED는 권한 없음 안내',
  },
  {
    status: '404',
    codes: [
      'USER_NOT_FOUND',
      'TEAM_NOT_FOUND',
      'GAME_NOT_FOUND',
      'POST_NOT_FOUND',
      'COMMENT_NOT_FOUND',
      'PLAYER_NOT_FOUND',
      'ATTENDANCE_NOT_FOUND',
      'COMPANION_NOT_FOUND',
      'ASSET_NOT_FOUND',
      'REPORT_TARGET_NOT_FOUND',
    ],
    action: '"찾을 수 없음" 안내 후 목록으로 이동',
  },
  {
    status: '409',
    codes: ['EMAIL_ALREADY_EXISTS', 'NICKNAME_ALREADY_EXISTS'],
    action: '중복된 필드에 포커스를 주고 message 표시',
  },
  {
    status: '429',
    codes: ['RATE_LIMITED'],
    action: '"잠시 후 다시 시도" 안내 · Retry-After 헤더로 대기 시간 확인',
  },
  {
    status: '500',
    codes: [
      'INTERNAL_SERVER_ERROR',
      'USER_CREATE_FAILED',
      'POST_CREATE_FAILED',
    ],
    action: '공통 서버 오류 문구만 표시 · 원인은 서버 로그로만 확인',
  },
];

const fileMap = [
  ['공통 HTTP · ApiError · getAssetUrl', 'apps/web/src/lib/api.ts'],
  [
    '화면별 API 함수',
    'apps/web/src/lib/{auth,post,attendance,baseball,user,stadium-note}-api.ts',
  ],
  ['조회 캐시 · query key', 'apps/web/src/lib/queries.ts · query-keys.ts'],
  [
    '인증 store · 마커 · 가드',
    'apps/web/src/lib/auth-store.ts · auth.ts · use-auth-guard.ts',
  ],
  ['캘린더 UI store', 'apps/web/src/lib/calendar-ui-store.ts'],
  ['폼 스키마 (zod)', 'apps/web/src/lib/form-schemas.ts'],
  ['QueryClient 설정 · SW 등록', 'apps/web/src/components/AppProviders.tsx'],
  ['CSP nonce · 보안 헤더', 'apps/web/src/proxy.ts · next.config.ts'],
  ['칭호·승률 계산 (화면)', 'apps/web/src/lib/attendance-score.ts'],
  ['앱 조립 · 미들웨어 체인', 'apps/api/src/app.ts'],
  ['JWT 발급', 'apps/api/src/utils/jwt.ts'],
  ['쿠키 옵션', 'apps/api/src/modules/auth/auth-cookie.ts'],
  ['비밀번호 hash', 'apps/api/src/utils/password.ts'],
  [
    '이메일 인증 · 비밀번호 재설정',
    'apps/api/src/modules/auth/email-verification.ts · email.service.ts · password-reset.repository.ts',
  ],
  [
    '인증 미들웨어',
    'apps/api/src/middleware/authenticate.ts · require-admin.ts',
  ],
  [
    '에러 클래스 · 핸들러',
    'apps/api/src/utils/http-error.ts · middleware/error-handler.ts',
  ],
  ['요청 제한', 'apps/api/src/middleware/rate-limit.ts'],
  ['출처 검사', 'apps/api/src/middleware/request-origin.ts'],
  ['업로드 · 이미지 검증', 'apps/api/src/modules/attendance/upload.ts'],
  ['입력 정제', 'apps/api/src/utils/user-input.ts'],
  ['DB 연결 · 시간대', 'apps/api/src/config/database.ts'],
  [
    '스키마 · 마이그레이션',
    'apps/api/db/init/001_schema.sql · src/config/migrations.ts',
  ],
  ['OpenAPI 문서', 'apps/api/src/config/openapi.ts'],
  [
    '칭호·승률 계산 (서버)',
    'apps/api/src/modules/attendance/attendance-score.ts',
  ],
  ['gateway · edge 설정', 'infra/nginx/default.conf.template · Caddyfile'],
  ['배포 workflow', '.github/workflows/deploy.yml'],
];

const limitations = [
  [
    '배포 중 짧은 다운타임',
    '단일 VM에서 pull 후 up --no-build를 실행하므로 수 초 멈춥니다. health check가 12회 × 5초 재시도하지만 실패해도 되돌리는 단계는 없습니다.',
    '2 VM + LB 또는 blue-green, 실패 시 이전 SHA로 자동 rollback',
  ],
  [
    'rate limiter가 프로세스 메모리',
    'Map 기반 sliding bucket이라 재시작하면 카운트가 초기화되고, 인스턴스를 늘리면 서로 다른 카운트를 봅니다. 지금은 단일 프로세스라 동작합니다.',
    'Redis 같은 공유 스토어로 교체',
  ],
  [
    'useMutation 미사용',
    '쓰기 성공 후 9개 파일 21곳에서 invalidateQueries를 직접 호출합니다. 일관성은 유지되지만 낙관적 업데이트와 에러 처리 중앙화가 안 됩니다.',
    'useMutation으로 성공·실패 처리를 한곳에 모으기',
  ],
  [
    'OpenAPI 문서 24 / 81',
    'admin·reports·fans·notifications 일부 경로가 미문서화입니다. 문서를 config/openapi.ts에 손으로 작성합니다.',
    '문서 보강 후 스키마와 실제 응답을 자동 검증',
  ],
  [
    '품질 게이트 없음',
    'assert 기반 스크립트 12개가 파서·칭호 계산 같은 순수 함수만 검증합니다. 테스트 러너와 test 스크립트가 없고 CI도 lint·typecheck를 돌리지 않습니다.',
    'vitest 도입 + Actions에 lint·typecheck·test job',
  ],
  [
    'LIMIT / OFFSET 페이징',
    'page가 깊어질수록 offset만큼 행을 읽고 버리므로 비용이 커집니다.',
    'cursor(keyset) 페이징으로 전환',
  ],
  [
    '댓글 수정 미구현',
    '댓글은 작성·조회·삭제만 있고 PATCH 경로가 없습니다. 게시글 수정은 있습니다.',
    'PATCH /api/comments/:commentId + 작성자 검사 추가',
  ],
];

const distinctions = [
  [
    'useAuthGuard',
    '화면 이동을 제어하는 UX 장치',
    'authenticate',
    'API를 보호하는 실제 보안',
  ],
  [
    'cookie-session',
    '메모리에 있는 마커 문자열',
    'HttpOnly cookie',
    'Access·Refresh Token이 들어 있는 곳',
  ],
  [
    'Zustand',
    '클라이언트 상태 — 서버 원본을 복제하지 않음',
    'TanStack Query',
    '서버 상태 — 캐시와 재요청 시점 관리',
  ],
  [
    'request<T>',
    'JSON 요청과 공통 401 처리',
    '이미지 업로드',
    'FormData지만 같은 재발급 helper 사용',
  ],
  [
    '로그아웃',
    '현재 Refresh Token 묶음 폐기',
    '비밀번호 재설정',
    'sessionVersion 증가 + 모든 세션 폐기',
  ],
  ['401', '누구인지 모름 — 다시 로그인', '403', '누구인지는 앎 — 권한이 없음'],
  [
    'nginx limit_req',
    '초당 요청 속도 제한',
    'Express rate-limit scope',
    '시간 창당 횟수 제한',
  ],
  [
    '001_schema.sql',
    '볼륨 최초 생성 시 1회 실행',
    'runMigrations()',
    'API 부팅마다 실행 — 테이블 5개는 여기만 존재',
  ],
  [
    'game_date',
    'KST 벽시각으로 다시 파싱',
    'created_at 등 감사 컬럼',
    'UTC 그대로',
  ],
  [
    '화면에서 버튼 숨기기',
    'UX — 개발자 도구로 되돌릴 수 있음',
    'API의 작성자 검사',
    '최종 권한 판단은 항상 여기서',
  ],
];

const questionGroups: QuestionGroup[] = [
  {
    label: 'BACKEND',
    title: 'JWT 인증',
    questions: [
      {
        question: 'JWT 토큰에는 어떤 정보를 포함하셨나요?',
        answer:
          'Access Token에는 userId, sessionVersion, tokenType 세 개만 담습니다. jsonwebtoken이 발급 시간(iat), 만료 시간(exp), 발급자(iss), 대상(aud)을 추가합니다. 표시용 닉네임과 프로필은 /auth/me 응답으로 따로 받습니다. Refresh Token은 JWT가 아닌 임의 문자열이고 DB에는 원문 대신 SHA-256 해시만 저장합니다.',
        followUps: [
          {
            question: '왜 프로필 정보를 토큰에 넣지 않나요?',
            answer:
              '토큰은 발급 후 만료 전까지 내용이 고정됩니다. 닉네임을 바꾸면 토큰 속 닉네임은 예전 값이라 화면이 stale한 데이터를 보여주거나, 값을 맞추려고 토큰을 재발급해야 합니다. 그래서 토큰에는 "누구인지 판단할 최소값"만 넣고 표시용 데이터는 /auth/me로 받습니다.',
          },
          {
            question: '서명 알고리즘은 무엇이고 secret은 어디에 있나요?',
            answer:
              'HS256 대칭 서명입니다. secret은 환경변수 JWT_SECRET로 받고, src/config/env.ts가 NODE_ENV=production인데 기본값이거나 32자 미만이면 부팅 자체를 실패시킵니다.',
          },
          {
            question: '토큰은 어디에 담아서 전달하나요?',
            answer:
              'Access Token은 yakuku_access, Refresh Token은 yakuku_refresh라는 별도 HttpOnly 쿠키에 담습니다. Access 쿠키는 /api, Refresh 쿠키는 /api/auth 경로로 제한해 필요한 요청에만 전송합니다.',
          },
          {
            question: '처음에는 왜 JWT 하나만 사용했나요?',
            answer:
              '초기 구현은 발급·검증·쿠키 삭제만으로 끝나는 단일 JWT 구조를 선택해 개발 범위를 줄였습니다. 다만 장기 JWT는 탈취됐을 때 만료 전까지 사용될 수 있다는 한계가 있어, 현재는 15분 Access Token과 DB에서 폐기·회전할 수 있는 Refresh Token으로 분리했습니다.',
          },
        ],
        paths: [
          'apps/api/src/utils/jwt.ts',
          'apps/api/src/middleware/authenticate.ts',
          'apps/api/src/config/env.ts',
        ],
      },
      {
        question:
          'JWT를 한 번 발급하면 취소할 수 없는데, 로그아웃이나 비밀번호 변경은 어떻게 처리하나요?',
        answer:
          '로그아웃은 현재 Refresh Token과 같은 family를 DB에서 폐기하고 두 쿠키를 삭제합니다. 비밀번호 재설정은 users.session_version을 올려 기존 Access Token을 즉시 거부하고, 해당 사용자의 Refresh 세션도 모두 폐기해 재발급까지 막습니다.',
        followUps: [
          {
            question: '그럼 매 요청 DB를 한 번 더 보는 것 아닌가요?',
            answer:
              '맞습니다. "상태 없는 JWT"의 장점을 일부 포기한 trade-off입니다. 대신 토큰 탈취·비밀번호 유출 상황에서 서버가 강제로 세션을 끊을 수단을 얻었습니다. 조회는 PK 단일 행이라 비용이 작습니다.',
          },
        ],
        paths: [
          'apps/api/src/middleware/authenticate.ts',
          'apps/api/src/modules/auth/password-reset.repository.ts',
        ],
      },
    ],
  },
  {
    label: 'DATABASE',
    title: '테이블 관계',
    questions: [
      {
        question: '테이블 간 관계를 어떤 기준으로 설계하셨나요?',
        answer:
          '실제 업무의 소유 관계와 카디널리티를 기준으로 나눴습니다. users–posts–comments는 "하나의 부모가 여러 자식을 소유"하는 1:N이라 자식 쪽에 FK를 두고 ON DELETE CASCADE를 걸었습니다. 관람 기록과 동행자는 N:M이라 attendance_companions 연결 테이블로 분리했고, 팔로우는 user_follows에 id 컬럼 없이 복합 기본키를 써서 중복 팔로우를 구조적으로 막았습니다. 이메일·닉네임·경기당 관람 기록은 unique key로 중복을 DB 수준에서 거절합니다.',
        followUps: [
          {
            question: 'CASCADE와 SET NULL은 어떻게 골랐나요?',
            answer:
              '"부모가 사라지면 이 행도 의미가 없는가"로 판단했습니다. 회원이 탈퇴하면 그 사람의 게시글·댓글·관람 기록은 남길 이유가 없어 CASCADE입니다. 반면 users.favorite_team이나 attendance_records.cheered_team은 팀이 사라져도 "이 사람이 이 기록을 남겼다"는 사실은 남아야 하므로 SET NULL입니다.',
          },
          {
            question: 'FK를 걸지 못한 곳도 있나요?',
            answer:
              'content_reports.target_id는 post·comment·user·attendance 네 종류를 모두 가리키는 polymorphic 컬럼이라 FK를 걸 수 없습니다. notifications.post_id도 인덱스만 있고 FK 제약은 없습니다. 대신 애플리케이션 코드에서 대상을 확인합니다.',
          },
          {
            question: '한 경기에 기록을 두 번 남기는 것은 어떻게 막나요?',
            answer:
              'uq_attendance_user_game(user_id, game_id) unique key입니다. 코드로 먼저 확인해도 동시 요청이면 뚫릴 수 있으므로 최종 방어는 DB 제약에 맡기고, errorHandler가 ER_DUP_ENTRY를 409로 변환합니다.',
          },
        ],
        paths: [
          'apps/api/db/init/001_schema.sql',
          'apps/api/src/config/migrations.ts',
          'docs/database.md',
        ],
      },
      {
        question: '스키마 관리는 어떻게 하고 있나요?',
        answer:
          '두 경로를 함께 씁니다. apps/api/db/init/001_schema.sql이 MySQL 볼륨 최초 생성 시 docker-entrypoint-initdb.d에서 한 번 실행되어 테이블 20개를 만듭니다. 이후 변경은 src/config/migrations.ts에 id를 붙인 마이그레이션으로 쌓고, runMigrations()가 schema_migrations 테이블에 없는 것만 실행한 뒤 기록합니다. 평소 부팅에서는 조회 한 번으로 끝납니다.',
        followUps: [
          {
            question: '처음부터 버전 관리를 했나요?',
            answer:
              '아니요. 처음에는 부팅마다 information_schema로 존재 여부를 확인하는 멱등 방식이었고, 일회성 데이터 보정과 시드까지 매번 다시 돌아 관리자가 고친 구장 가이드가 재시작 때 덮어써지는 문제가 있었습니다. 그 내용을 0001_baseline으로 묶어 한 번만 실행되게 하고, 이후 변경부터 새 id로 추가합니다. 여러 프로세스가 동시에 시작하는 경우는 MySQL GET_LOCK으로 직렬화합니다.',
          },
          {
            question: '남은 문제는 무엇인가요?',
            answer:
              '테이블 5개(player_cheers, team_standings, season_projection_*)는 migrations.ts에만 있어서, init 스크립트만 돌리고 API를 띄우지 않은 DB는 스키마가 불완전합니다. 스키마 원본이 두 곳이라, 장기적으로는 001_schema.sql을 migrations 쪽으로 합쳐 한 곳에서 관리하는 게 맞습니다.',
          },
        ],
        paths: [
          'apps/api/db/init/',
          'apps/api/src/config/migrations.ts',
          'apps/api/src/server.ts',
        ],
      },
      {
        question: '경기 날짜는 시간대를 어떻게 처리하셨나요?',
        answer:
          'mysql2 pool을 timezone: "Z"로 두고, src/config/database.ts에 커스텀 typeCast를 걸어 game_date와 ticket_open_at(및 camelCase alias)만 +09:00 KST 벽시각으로 다시 파싱합니다. created_at 같은 감사 컬럼은 UTC를 유지합니다. 경기 시작 시각은 사용자에게 "그날 몇 시"로 보여야 하는 벽시각이고, 로그 시각은 절대 시점이 맞으므로 성격을 나눠 처리했습니다.',
        paths: ['apps/api/src/config/database.ts'],
      },
    ],
  },
  {
    label: 'FRONTEND / STORE',
    title: '상태관리',
    questions: [
      {
        question: '상태 관리는 어떤 라이브러리를 사용하셨나요?',
        answer:
          '세 층으로 나눴습니다. 서버에서 온 데이터는 TanStack Query, 여러 화면이 공유하는 클라이언트 상태는 Zustand, 한 화면 안에서만 쓰는 값은 React state입니다. 라이브러리 2개 + React 기본 기능을 역할로 구분한 구조입니다.',
        followUps: [
          {
            question: '구체적으로 몇 개를 쓰고 있나요?',
            answer:
              'useQuery hook 16개(전부 src/lib/queries.ts), Zustand store 2개(auth-store, calendar-ui-store), useMutation은 0개입니다. src/lib/hooks·queries·stores 폴더는 비어 있고 실제 코드는 lib 바로 아래의 평면 파일에 있습니다.',
          },
          {
            question: '왜 Redux나 Context가 아니라 Zustand인가요?',
            answer:
              '이 프로젝트의 전역 클라이언트 상태는 로그인 사용자와 캘린더 필터뿐이라 규모가 작습니다. Zustand는 Provider로 감쌀 필요가 없고 selector로 필요한 조각만 구독해서 그 조각이 바뀔 때만 리렌더됩니다. Context는 값이 바뀔 때 소비하는 모든 컴포넌트가 리렌더되고, Redux는 그 규모에 비해 boilerplate가 많습니다.',
          },
        ],
        paths: [
          'apps/web/src/lib/queries.ts',
          'apps/web/src/lib/auth-store.ts',
          'apps/web/src/lib/calendar-ui-store.ts',
        ],
      },
      {
        question: '어떤 데이터들을 상태 관리로 관리하셨나요?',
        answer:
          'Zustand auth-store에는 로그인 사용자 객체, cookie-session 마커, hasHydrated. calendar-ui-store에는 월/주 뷰 모드, 일정 필터(favorite·favorite-home·all), 관람 형태 필터(all·stadium·home), 기본 필터 적용 여부. Query 캐시에는 사용자·팀·순위·시즌 예측·경기·게시글·댓글·팬·응원가·관람 기록·통계. React state에는 페이지 번호, 폼 입력, 팝업 열림, 이미지 미리보기 URL을 둡니다.',
        followUps: [
          {
            question: '판단 기준이 무엇인가요?',
            answer:
              '"원본이 서버에 있는가"와 "여러 화면이 함께 보는가"와 "이 화면을 떠나면 버려도 되는가" 세 질문으로 나눕니다. 서버에 원본이 있으면 Query, 여러 화면이 보는 클라이언트 값이면 Zustand, 그 화면 전용이면 React state입니다.',
          },
          {
            question:
              '사용자 정보를 Zustand에도 넣고 Query에도 넣는 것 아닌가요?',
            answer:
              '겹치는 부분이 있습니다. /auth/me 응답은 useMeQuery가 캐시하고, 그중 화면 전역이 필요한 사용자 객체만 auth-store에도 담습니다. 인증 여부 판단과 화면 이동을 store 기준으로 동기 처리해야 해서입니다. 대신 JWT 문자열 자체는 store에 넣지 않습니다.',
          },
        ],
        paths: [
          'apps/web/src/lib/queries.ts',
          'apps/web/src/lib/query-keys.ts',
        ],
      },
      {
        question: '상태관리 라이브러리를 선택한 이유는 무엇인가요?',
        answer:
          '서버 데이터와 클라이언트 상태의 수명주기가 완전히 다르기 때문입니다. 서버 데이터는 캐시·중복 요청 제거·재요청 시점·로딩/에러 상태가 필요해서 TanStack Query에 맡기고, 클라이언트 상태는 그런 기능이 불필요하고 즉시 동기적으로 읽고 써야 해서 Zustand에 맡깁니다. 서버 데이터를 전역 store에 복제하지 않으므로 "캐시와 store가 어긋나는" 동기화 지점 자체가 사라집니다.',
        followUps: [
          {
            question: 'QueryClient 기본값은 어떻게 설정했나요?',
            answer:
              'AppProviders.tsx에서 staleTime 60초, retry 1, refetchOnWindowFocus false입니다. 탭을 다시 켰을 때마다 재요청이 쏟아지는 것을 막으려 focus refetch를 껐고, 데이터 성격별로 staleTime을 덮어씁니다 — 팀 목록 1시간, 순위·시즌 예측 10분, 팀 응원가 5분.',
          },
        ],
        paths: ['apps/web/src/components/AppProviders.tsx'],
      },
    ],
  },
  {
    label: 'FRONTEND / API',
    title: 'API 연동',
    questions: [
      {
        question: 'API 요청은 어떤 방식으로 호출하셨나요?',
        answer:
          '브라우저 fetch를 generic 함수 request<T>로 감싸 호출합니다. 조회는 TanStack Query hook을 통해, 쓰기는 화면 이벤트 핸들러에서 Domain API 함수를 직접 호출한 뒤 관련 query를 invalidateQueries로 무효화하는 방식입니다.',
        followUps: [
          {
            question: 'request<T>가 정확히 무엇을 하나요?',
            answer:
              "API_URL을 붙이고 method를 정하고 Content-Type: application/json과 credentials: 'include'를 항상 설정합니다. body가 있으면 JSON.stringify하고, 응답이 2xx가 아니면 본문을 파싱해 ApiError를 던집니다. 204거나 본문이 비었으면 undefined를 반환하고, 아니면 text()로 읽어 JSON.parse합니다. T는 컴파일 타임 타입일 뿐 런타임 검증은 하지 않습니다.",
          },
          {
            question: '왜 useMutation을 쓰지 않았나요?',
            answer:
              '쓰기 후 invalidateQueries를 직접 부르는 편이 이 규모에서는 흐름이 눈에 보였습니다. 다만 21곳에 흩어져 있어 낙관적 업데이트나 에러 처리 중앙화가 안 되는 단점이 있고, 다음에 고친다면 useMutation으로 모으는 게 맞다고 봅니다.',
          },
          {
            question: '모든 요청이 request<T>를 통하나요?',
            answer:
              '아닙니다. uploadProfilePhoto와 uploadAttendancePhoto는 multipart/form-data를 보내야 해서 Content-Type을 고정하는 request<T>를 쓸 수 없습니다. 둘은 FormData와 credentials: include를 직접 넣은 raw fetch를 씁니다. 게임 상세의 서버 컴포넌트도 next: { revalidate: 3600 }이 필요한 별도 클라이언트를 씁니다.',
          },
        ],
        paths: [
          'apps/web/src/lib/api.ts',
          'apps/web/src/lib/auth-api.ts',
          'apps/web/src/lib/attendance-api.ts',
        ],
      },
      {
        question: 'API 호출 로직은 어떤 위치에서 관리하고 있나요?',
        answer:
          '세 층으로 나눴습니다. 공통 HTTP 처리는 src/lib/api.ts(request<T>, ApiError, getAssetUrl). 업무별 함수는 auth-api.ts·post-api.ts·attendance-api.ts·baseball-api.ts·stadium-note-api.ts. 조회 캐시 설정은 src/lib/queries.ts와 query key factory인 query-keys.ts입니다. 화면은 URL을 직접 만들지 않고 login()이나 createPost() 같은 업무 이름의 함수만 부릅니다.',
        paths: [
          'apps/web/src/lib/api.ts',
          'apps/web/src/lib/queries.ts',
          'apps/web/src/lib/query-keys.ts',
        ],
      },
      {
        question: '공통 API 요청 처리를 위해 어떤 구조를 사용하셨나요?',
        answer:
          'Page → Query hook → Domain API → request<T> → Express route 순서의 5단 구조입니다. Page는 쓰기 이벤트와 화면 메시지를, Query hook은 조회·캐시·재요청을, Domain API는 기능별 URL과 응답 타입을, request<T>는 base URL·JSON·쿠키·204를, Express route는 검증과 비즈니스 로직을 담당합니다.',
        followUps: [
          {
            question: '이렇게 나누면 좋은 점이 무엇인가요?',
            answer:
              'base URL이 바뀌거나 인증 방식이 바뀌면 request<T> 한 곳만 고치면 됩니다. 엔드포인트가 바뀌면 Domain API 한 파일만 고치고, 화면 코드는 업무 이름의 함수를 부르므로 영향이 없습니다. 반대로 화면 문구만 바꾸려면 query나 api를 건드리지 않습니다.',
          },
        ],
      },
      {
        question: 'API 요청 시 인증 토큰은 어떻게 전달하셨나요?',
        answer:
          'Access Token과 Refresh Token을 각각 HttpOnly 쿠키에 보관하고, request<T>가 모든 요청에 credentials: include를 붙여 브라우저가 자동 전송하게 합니다. 프론트엔드 JavaScript는 토큰 값을 읽거나 localStorage에 저장하지 않습니다. 서버 쪽 cors도 credentials: true와 명시적 origin allowlist를 함께 사용합니다.',
        followUps: [
          {
            question: 'localStorage에 넣는 방식과 비교하면 어떤 차이가 있나요?',
            answer:
              'localStorage는 JavaScript로 읽을 수 있으므로 XSS 한 번이면 토큰이 그대로 유출됩니다. HttpOnly 쿠키는 JavaScript가 읽을 수 없어 그 경로는 막히지만, 대신 교차 사이트 요청에 쿠키가 실리는 CSRF 위험이 생깁니다. 이 프로젝트는 SameSite=Lax와 requireTrustedOrigin의 Origin·Sec-Fetch-Site 검사로 CSRF 쪽을 막았습니다.',
          },
          {
            question: 'Authorization 헤더도 지원하나요?',
            answer:
              'authenticate가 Bearer 헤더와 쿠키를 둘 다 봅니다. request<T>에도 token 옵션이 있지만 브라우저 화면에서는 쓰지 않고, 쿠키를 못 쓰는 클라이언트를 위한 경로로 남아 있습니다.',
          },
        ],
        paths: [
          'apps/web/src/lib/api.ts',
          'apps/api/src/middleware/authenticate.ts',
          'apps/api/src/modules/auth/auth-cookie.ts',
        ],
      },
    ],
  },
  {
    label: 'FRONTEND / ERROR',
    title: '에러 처리',
    questions: [
      {
        question: '프론트엔드에서 API 에러는 어떻게 처리하셨나요?',
        answer:
          '화면이 ApiError를 catch해 message를 폼 필드 아래나 화면 안내로 표시하고, status와 code에 따라 후속 행동을 결정합니다. EMAIL_NOT_VERIFIED면 인증번호 화면으로, AUTH_REQUIRED·INVALID_TOKEN이면 clearSession() 후 로그인 화면으로, 409 중복이면 해당 필드에 포커스를 줍니다.',
        followUps: [
          {
            question: '전역 401 인터셉터가 있나요?',
            answer:
              'request<T>가 공통으로 401을 감지합니다. 로그인 같은 인증 API는 제외하고 /auth/refresh를 한 번 호출하며, 여러 요청이 동시에 실패해도 재발급 요청은 하나만 공유합니다. 성공하면 원래 요청을 한 번 재시도하고, 재발급도 401이면 전역 로그인 상태를 정리합니다.',
          },
          {
            question: 'Query의 에러와 화면 이벤트의 에러가 다르게 처리되나요?',
            answer:
              '조회 실패는 useQuery의 error로 들어와 화면이 isError 상태의 안내를 보여주고 retry 1번은 Query가 자동으로 시도합니다. 쓰기 실패는 이벤트 핸들러의 try/catch로 들어와 폼에 남습니다. 둘 다 최종적으로는 같은 ApiError 타입입니다.',
          },
        ],
        paths: ['apps/web/src/lib/api.ts'],
      },
      {
        question: '공통 에러 처리를 위해 어떤 구조를 사용하셨나요?',
        answer:
          '백엔드는 어떤 실패든 { code, message } 두 필드와 적절한 HTTP status로 응답합니다. HttpError가 예상된 실패를 taşı고, 체인 마지막의 errorHandler가 HttpError·MulterError·MySQL ER_DUP_ENTRY·기타를 각각 분류합니다. 프론트의 공통 request<T>가 이 응답을 status·code·message를 그대로 보존한 ApiError로 변환하므로, 화면은 하나의 에러 타입만 다루면 됩니다.',
        followUps: [
          {
            question: '예상하지 못한 에러는 어떻게 되나요?',
            answer:
              'errorHandler의 마지막 분기가 console.error로 서버 로그에 남기고 클라이언트에는 500 INTERNAL_SERVER_ERROR와 공통 문구만 반환합니다. 스택 트레이스나 SQL 조각이 응답으로 새지 않게 하기 위해서입니다.',
          },
          {
            question: '응답 본문을 파싱하지 못하면요?',
            answer:
              "request<T>가 .catch(() => ({ code: 'UNKNOWN_ERROR', message: '요청 처리 중 오류가 발생했습니다.' }))로 폴백합니다. 게이트웨이가 502 HTML을 반환하는 상황에서도 화면이 깨지지 않습니다.",
          },
        ],
        paths: [
          'apps/api/src/utils/http-error.ts',
          'apps/api/src/middleware/error-handler.ts',
          'apps/web/src/lib/api.ts',
        ],
      },
      {
        question: '입력값 검증은 프론트와 백엔드 중 어디에서 하나요?',
        answer:
          '둘 다 합니다. 프론트는 zod 스키마로 제출 전에 막아 불필요한 요청과 대기 시간을 줄이고, 백엔드는 sanitizeUserInput과 길이·패턴 검사로 다시 검증합니다. 화면 검증을 우회하는 요청(API 직접 호출)이 항상 가능하므로 최종 판단은 서버에 둡니다. 서버는 위반 시 400 INVALID_INPUT이나 400 UNSAFE_CONTENT를 반환합니다.',
        paths: [
          'apps/web/src/lib/form-schemas.ts',
          'apps/api/src/utils/user-input.ts',
        ],
      },
    ],
  },
  {
    label: 'FRONTEND / LOGIN',
    title: '로그인 상태',
    questions: [
      {
        question: '로그인 상태 확인은 어떤 방식으로 처리하셨나요?',
        answer:
          '앱 초기화 후 hydrate()가 hasHydrated와 cookie-session 마커를 세우고, TanStack Query의 useMeQuery가 GET /api/auth/me를 호출합니다. API가 HttpOnly 쿠키의 JWT를 검증해 사용자 객체를 돌려주면 로그인 상태로 판단합니다. 즉 "확인"의 근거는 클라이언트 쪽 저장이 아니라 서버 검증입니다.',
        followUps: [
          {
            question: '왜 /auth/me를 매번 부르나요?',
            answer:
              'HttpOnly 쿠키는 JavaScript로 존재를 확인할 수 없습니다. 쿠키가 있는지, 아직 유효한지, sessionVersion이 맞는지 아는 방법은 서버에 물어보는 것뿐입니다. staleTime 60초라 화면을 오갈 때마다 호출되지는 않습니다.',
          },
        ],
        paths: [
          'apps/web/src/lib/auth-store.ts',
          'apps/web/src/lib/queries.ts',
          'apps/api/src/modules/auth/auth.routes.ts',
        ],
      },
      {
        question: '로그인 상태는 어디에 저장하셨나요?',
        answer:
          'Access Token은 yakuku_access, Refresh Token은 yakuku_refresh HttpOnly 쿠키에 있고, 화면이 쓰는 사용자 정보는 TanStack Query 캐시와 Zustand auth-store에 있습니다. auth-store의 token 필드에는 JWT가 아니라 cookie-session 마커만 들어갑니다. localStorage와 sessionStorage는 사용하지 않습니다.',
        followUps: [
          {
            question: 'cookie-session 마커가 왜 필요한가요?',
            answer:
              '쿠키를 읽을 수 없으니 "로그인 시도해볼 만한 상태인지"를 나타낼 다른 신호가 필요합니다. 마커가 없으면 /auth/me를 부르지 않고, 있으면 부릅니다. 메모리에만 있으므로 새로고침하면 사라지고, 그래서 새로고침마다 hydrate()가 다시 세운 뒤 /auth/me로 실제 여부를 확인합니다.',
          },
        ],
        paths: ['apps/web/src/lib/auth.ts', 'apps/web/src/lib/auth-store.ts'],
      },
      {
        question: '페이지 새로고침 시 로그인 상태는 어떻게 유지되나요?',
        answer:
          '새로고침해도 HttpOnly 쿠키는 브라우저에 남아 있습니다. hydrate()가 마커와 hasHydrated를 다시 세우고 useMeQuery가 /auth/me를 다시 호출해 사용자 정보를 복구합니다. 유지의 근거는 Zustand가 아니라 쿠키입니다. rememberMe로 로그인한 경우에만 쿠키에 maxAge가 붙어 브라우저를 닫아도 유지되고, 아니면 세션 쿠키입니다.',
        paths: [
          'apps/web/src/lib/auth-store.ts',
          'apps/api/src/modules/auth/auth-cookie.ts',
        ],
      },
      {
        question: '인증이 필요한 페이지 접근은 어떻게 제어하셨나요?',
        answer:
          'useAuthGuard가 hasHydrated 이후 비로그인 상태면 로그인 화면으로 이동시킵니다. attendance/new, attendance/[recordId], attendance/[recordId]/edit, me, posts/new, posts/[postId]/edit 여섯 화면에 적용되어 있습니다. 이건 UX 제어이고 실제 보안은 Express의 authenticate가 API에서 보장합니다. /admin은 이 훅 대신 fetchMe 후 role !== "admin"을 직접 검사하고, /calendar는 비로그인에도 열리는 공개 화면입니다.',
        followUps: [
          {
            question: '화면에서 막는 것만으로 부족하지 않나요?',
            answer:
              '부족합니다. 클라이언트 코드는 사용자가 자유롭게 바꿀 수 있으므로 화면 가드는 "실수로 보호 화면에 들어가는 것"을 막는 UX일 뿐입니다. 데이터를 지키는 것은 authenticate이고, 소유자 판단은 수정·삭제 직전의 req.user.id 비교이며, 관리자 기능은 requireAdmin이 role을 DB에서 다시 조회합니다.',
          },
          {
            question: '서버 사이드에서 리다이렉트하지 않는 이유는?',
            answer:
              '인증 정보가 HttpOnly 쿠키에 있고 그 쿠키의 유효성을 판단하는 주체가 Express이기 때문입니다. Next.js 서버 컴포넌트에서 쿠키를 읽어 판단하려면 JWT secret을 웹 앱에도 공유해야 합니다. 대신 보호 화면은 클라이언트에서 확인 후 이동하고, 데이터는 항상 API가 지킵니다.',
          },
        ],
        paths: [
          'apps/web/src/lib/use-auth-guard.ts',
          'apps/web/src/app/admin/page.tsx',
          'apps/api/src/middleware/require-admin.ts',
        ],
      },
      {
        question: '토큰이 만료되면 어떻게 실행되고 있나요?',
        answer:
          'Access Token은 15분 뒤 만료됩니다. 보호 API가 401을 반환하면 request<T>가 Refresh Token으로 /auth/refresh를 호출합니다. 서버는 토큰을 DB에서 검증하고 새 Refresh Token으로 회전한 뒤 Access Token을 재발급합니다. 프론트는 원래 요청을 한 번 다시 보내며, 재발급이 실패한 경우에만 로그인 상태를 비웁니다.',
        followUps: [
          {
            question: '작성 중이던 폼이 있으면 어떻게 되나요?',
            answer:
              'Access Token 만료만 원인이면 백그라운드에서 재발급하고 같은 요청을 다시 보내므로 폼 화면을 유지합니다. Refresh Token까지 만료되거나 폐기된 경우에는 로그인 화면으로 이동하므로, 그 경우 때의 입력 복구는 별도 개선 과제입니다.',
          },
          {
            question: '401과 403은 어떻게 구분해서 쓰나요?',
            answer:
              '401은 "누구인지 모름"(AUTH_REQUIRED, INVALID_TOKEN, INVALID_CREDENTIALS)이고 403은 "누구인지는 알지만 권한 없음"(FORBIDDEN, ADMIN_REQUIRED)입니다. EMAIL_NOT_VERIFIED는 신원은 확인됐지만 아직 계정이 활성화되지 않은 상태라 403으로 보냅니다.',
          },
        ],
        paths: [
          'apps/web/src/lib/auth-store.ts',
          'apps/api/src/middleware/authenticate.ts',
        ],
      },
    ],
  },
  {
    label: 'FRONTEND / SIGN UP',
    title: '회원가입',
    questions: [
      {
        question: '메일 인증은 어떤 방식으로 하셨나요?',
        answer:
          'Nodemailer가 Gmail SMTP로 6자리 인증번호를 보냅니다. 번호는 email_verification_tokens 테이블에 3분 만료로 저장하고, 30초 재전송 대기·1시간에 최대 4회 발송 제한을 겁니다. 검증은 이메일과 번호를 함께 받아 그 사용자의 번호만 찾습니다. 성공하면 users.email_verified_at을 기록하고 그 사용자의 번호를 모두 지우며, 그 전에는 로그인해도 403 EMAIL_NOT_VERIFIED로 인증 화면으로 보냅니다.',
        followUps: [
          {
            question: '왜 링크가 아니라 번호인가요?',
            answer:
              '번호 방식은 사용자가 이미 열어둔 회원가입 화면에서 바로 입력할 수 있어 흐름이 끊기지 않습니다. 링크는 메일 클라이언트에서 브라우저로 넘어가며 세션이 바뀌는 경우가 있습니다. 비밀번호 재설정은 링크 방식을 쓰는데, 그쪽은 이미 로그인 상태가 아니라 이동이 자연스럽기 때문입니다.',
          },
          {
            question: '중복 검사는 언제 하나요?',
            answer:
              '두 번입니다. 가입 화면이 POST /api/auth/check-registration으로 이메일·닉네임 사용 가능 여부를 먼저 확인해 즉시 피드백을 주고, 실제 INSERT 시 uq_users_email·uq_users_nickname unique key가 최종 방어합니다. unique 위반은 ER_DUP_ENTRY로 들어와 errorHandler가 409로 변환합니다.',
          },
          {
            question: '발송 제한을 두는 이유는?',
            answer:
              'Gmail SMTP 발송량 한계를 소진시키는 것과, 특정 메일 주소로 인증 메일을 반복 발송하는 괴롭힘을 막기 위해서입니다. auth:resend-verification scope가 시간당 10회, 코드 검증 scope가 10분에 20회로 걸려 있습니다.',
          },
        ],
        paths: [
          'apps/api/src/modules/auth/auth.routes.ts',
          'apps/api/src/modules/auth/email-verification.ts',
          'apps/api/src/modules/auth/email.service.ts',
          'apps/web/src/app/register/page.tsx',
        ],
      },
      {
        question: '비밀번호는 어떻게 저장하나요?',
        answer:
          'bcryptjs로 cost 12 hash만 저장합니다. salt가 hash 안에 포함되어 있어 별도 컬럼이 없고, 로그인 시 bcrypt.compare로 대조합니다. 평문은 요청을 처리하는 동안에만 메모리에 존재하고 로그에도 남기지 않습니다. 길이는 8~128자로 제한하고 약한 비밀번호는 400 WEAK_PASSWORD로 거절합니다.',
        followUps: [
          {
            question: 'cost 12는 어떻게 정했나요?',
            answer:
              'hash 한 번의 비용을 의도적으로 키우는 값입니다. 너무 낮으면 유출 시 brute-force가 쉽고, 너무 높으면 로그인 지연과 서버 CPU 부담이 커집니다. 12는 한 번에 수십~수백 ms 수준으로, 정상 로그인에는 체감 부담이 없고 대량 시도에는 충분히 비싼 지점입니다.',
          },
          {
            question: 'SHA256 같은 일반 hash와 무슨 차이가 있나요?',
            answer:
              '일반 hash는 빠르게 계산되도록 설계되어 공격자도 초당 수십억 번 시도할 수 있고, 같은 입력이면 같은 결과가 나와 rainbow table에 취약합니다. bcrypt는 일부러 느리고 salt를 내장해 두 문제를 동시에 막습니다.',
          },
        ],
        paths: [
          'apps/api/src/utils/password.ts',
          'apps/api/src/modules/auth/auth.routes.ts',
        ],
      },
    ],
  },
  {
    label: 'BOARD / PAGING',
    title: '게시판과 페이징',
    questions: [
      {
        question: '본인 글만 수정·삭제 가능하게는 어떻게 처리했나요?',
        answer:
          'authenticate를 통과한 뒤 handler 안에서 req.user.id와 게시글의 user_id를 직접 비교합니다. 다르면 403 FORBIDDEN입니다. 화면에서도 작성자가 아니면 수정·삭제 버튼을 렌더링하지 않지만 그건 UX이고, 판단은 항상 API에서 다시 합니다. 관리자 삭제는 이 경로가 아니라 별도 /api/admin/posts/:postId로 분리되어 있고 requireAdmin이 role을 DB에서 다시 조회합니다.',
        followUps: [
          {
            question: '관람 기록도 같은 규칙인가요?',
            answer:
              '다릅니다. assertCanEdit은 소유자뿐 아니라 status가 accepted인 동행자에게도 수정을 허용합니다. 같이 간 사람이 점수나 메모를 고칠 수 있어야 하기 때문입니다. 삭제는 assertOwner로 소유자만 가능합니다.',
          },
        ],
        paths: [
          'apps/api/src/modules/posts/post.routes.ts',
          'apps/api/src/modules/comments/comment.routes.ts',
          'apps/api/src/modules/attendance/attendance.routes.ts',
        ],
      },
      {
        question: '페이징은 어떤 방식으로 구현했나요?',
        answer:
          'page와 size를 query string으로 받아 LIMIT과 OFFSET으로 환산하고, COUNT(*)로 전체 건수를 구해 { items, page, size, total, totalPages }를 반환합니다. size 기본값은 10, 상한은 50이라 한 번에 과도한 행을 요청할 수 없습니다. 화면은 이 메타데이터만으로 페이지 UI를 그리므로 별도로 전체 목록을 받지 않습니다.',
        followUps: [
          {
            question: 'LIMIT/OFFSET의 한계는?',
            answer:
              'OFFSET 10000이면 DB가 앞의 10000행을 읽고 버립니다. 목록이 깊어질수록 비용이 선형으로 커집니다. 지금 규모에서는 문제가 없지만 커지면 마지막 행의 정렬 키를 넘겨받는 cursor(keyset) 방식으로 바꾸는 게 맞습니다.',
          },
          {
            question: '검색·필터와 페이징은 어떻게 결합되나요?',
            answer:
              '같은 목록 API에서 keyword(제목·본문 LIKE), category(review·free·info·feature·notice), scope(latest·myTeam·following)를 WHERE 절에 먼저 적용한 뒤 LIMIT/OFFSET을 걸고, COUNT(*)도 같은 WHERE로 셉니다. 그래서 totalPages가 필터 결과 기준입니다.',
          },
        ],
        paths: [
          'apps/api/src/modules/posts/post.repository.ts',
          'apps/web/src/app/posts/page.tsx',
        ],
      },
      {
        question: '파일 업로드는 어떻게 처리했나요?',
        answer:
          '2단계입니다. 브라우저에서 createImageBitmap으로 이미지를 canvas에 그려 toBlob으로 WebP(직관 0.84, 프로필 0.82)로 먼저 압축해 FormData로 보냅니다. 서버에서는 multer가 diskStorage로 받고, MIME allowlist(avif·gif·heic·heif·jpeg·png·webp, SVG 제외)를 확인한 뒤 첫 64바이트 magic bytes를 선언 MIME과 대조하고, sharp로 WebP 재인코딩·EXIF rotate·resize(직관 1600px, 프로필 512px)를 합니다. 사용자별 100MB quota도 검사합니다.',
        followUps: [
          {
            question: '왜 SVG를 막나요?',
            answer:
              'SVG는 XML이라 <script>와 이벤트 핸들러를 담을 수 있습니다. 다른 사용자가 올린 SVG를 누가 열면 저장형 XSS가 됩니다. 이미지로만 쓸 거라면 SVG가 필요 없으므로 allowlist에서 뺐습니다.',
          },
          {
            question: '클라이언트에서 이미 압축했는데 서버에서 또 하나요?',
            answer:
              '네, 서로 목적이 다릅니다. 클라이언트 압축은 업로드 용량과 전송 시간을 줄이기 위한 최적화이고, 서버 재인코딩은 보안 검증입니다. 클라이언트 압축은 사용자가 우회할 수 있으므로 서버 검증을 생략할 수 없습니다.',
          },
          {
            question: '저장소는 어디인가요?',
            answer:
              'api_uploads named volume(또는 UPLOADS_HOST_DIR 호스트 경로)입니다. Object Storage를 쓰지 않아 VM 장애 시 이미지가 함께 유실될 수 있는 한계가 있고, orphan 파일을 지우는 prune 스크립트는 따로 있습니다.',
          },
        ],
        paths: [
          'apps/api/src/modules/attendance/upload.ts',
          'apps/web/src/lib/attendance-api.ts',
          'apps/web/src/lib/auth-api.ts',
        ],
      },
    ],
  },
  {
    label: 'INFRA',
    title: '배포와 운영',
    questions: [
      {
        question: '요청이 사용자 브라우저에서 DB까지 어떻게 흐르나요?',
        answer:
          'Browser → Caddy(:443, 자동 HTTPS) → Nginx gateway(:8080, 경로 분기와 요청 제한) → /api·/api-docs·/uploads는 Express(:4000), 나머지는 Next.js(:3000) → Express가 mysql2 pool로 MySQL(:3306)에 접속합니다. 5개 컨테이너가 GCP VM 한 대에서 docker-compose.prod.yml로 함께 뜹니다.',
        followUps: [
          {
            question: 'Caddy와 Nginx를 왜 둘 다 쓰나요?',
            answer:
              '역할이 다릅니다. Caddy는 외부에 노출되는 80·443을 담당하며 인증서 발급·갱신을 자동으로 처리합니다. Nginx는 내부 gateway로 경로 분기와 속도·연결 수 제한, body 크기 제한을 담당합니다. Caddy만으로 합칠 수도 있지만 제한 규칙과 라우팅을 앱 코드와 가까운 곳에서 관리하려고 분리했습니다.',
          },
          {
            question: '컨테이너 포트를 외부에 열지 않나요?',
            answer:
              'api와 web은 127.0.0.1에 bind하고 gateway와 mysql은 포트를 아예 publish하지 않습니다. 외부에서 닿을 수 있는 것은 Caddy의 80·443뿐입니다. api는 no-new-privileges와 cap_drop: ALL로 권한도 줄였습니다.',
          },
        ],
        paths: [
          'Caddyfile',
          'infra/nginx/default.conf.template',
          'docker-compose.prod.yml',
        ],
      },
      {
        question: '자동 배포는 어떤 순서로 실행되나요?',
        answer:
          'main에 push하면 .github/workflows/deploy.yml이 돕니다. secret 검증을 먼저 하고(없으면 배포를 시작하지 않음), buildx로 api·web 이미지를 빌드해 GHCR에 commit SHA와 latest 태그로 push합니다. 그다음 SSH로 VM에 접속해 git reset --hard origin/main → prune → compose pull api web → --profile proxy up -d --no-build → gateway만 --force-recreate로 설정을 반영합니다. 마지막으로 nginx -t와 caddy validate로 설정을 검사하고, gateway 안에서 /api/health와 /api-docs.json을 12회 × 5초 시도해 둘 다 성공해야 배포가 끝납니다.',
        followUps: [
          {
            question: 'VM에서 빌드하지 않나요?',
            answer:
              '아닙니다. VM에서는 pull과 up --no-build만 합니다. 빌드는 GitHub Actions 러너에서 끝나므로 VM의 작은 메모리 때문에 빌드가 죽는 문제가 없고, 이미지가 GHCR에 SHA 태그로 남아 언제든 그 버전으로 되돌릴 수 있습니다.',
          },
          {
            question: 'health check가 실패하면 어떻게 되나요?',
            answer:
              'workflow는 실패로 끝나지만 새 컨테이너는 그대로 떠 있습니다. rollback 단계가 없기 때문입니다. 이건 현재 구조의 실제 한계이고, 다음은 실패 시 이전 SHA 이미지로 되돌리는 단계를 추가하는 것입니다.',
          },
          {
            question: 'CI에서 lint나 테스트는 돌리나요?',
            answer:
              '아니요. workflow는 build-and-deploy job 하나뿐이고 lint·typecheck·test 단계가 없습니다. npm run lint와 typecheck는 로컬에서만 돌립니다. main에 push하면 바로 운영에 반영되는 구조라 품질 게이트 추가가 다음 과제입니다.',
          },
        ],
        paths: ['.github/workflows/deploy.yml', 'docker-compose.prod.yml'],
      },
      {
        question: 'Docker는 왜 사용했나요?',
        answer:
          '환경 의존성 문제를 없애기 위해서입니다. Web과 API를 각각 node:22-alpine 기반 3단계 이미지로 빌드해 두면 로컬·CI·VM에서 완전히 같은 환경으로 실행됩니다. MySQL 8.4도 이미지로 띄워 버전이 고정되고, db/init을 마운트해 최초 기동 시 스키마가 자동 적용됩니다. Compose가 5개 컨테이너의 환경변수·의존 순서·볼륨·보안 옵션을 한 파일로 선언합니다.',
        followUps: [
          {
            question: '3단계 빌드는 무슨 효과가 있나요?',
            answer:
              'deps에서 npm ci로 의존성만 설치하고, builder에서 빌드한 뒤, runner에는 실행에 필요한 결과물만 복사합니다. 최종 이미지에 TypeScript 컴파일러나 빌드 캐시가 남지 않아 크기가 줄고 공격 표면도 작아집니다. web 빌더는 .next/cache를 지운 뒤 runner가 .next를 복사합니다.',
          },
        ],
        paths: [
          'apps/web/Dockerfile',
          'apps/api/Dockerfile',
          'docker-compose.yml',
        ],
      },
      {
        question: 'KBO 데이터는 어떻게 가져오나요?',
        answer:
          'KBO 공식 사이트의 일정·순위·선수 검색·경기센터 응답을 HTTP로 받아 파싱한 뒤 upsert합니다. parse-schedule.ts 같은 순수 함수 파서가 응답을 고정 타입으로 바꾸고, ON DUPLICATE KEY UPDATE로 games·team_standings·players·game_lineups에 반영합니다. 스케줄은 개발에서 node-cron, 운영에서는 scripts/kbo-sync의 셸 스크립트를 호스트 crontab이 flock과 함께 실행합니다. 운영 compose에서는 KBO_SYNC_ENABLED가 기본 false라 API 프로세스 안에서 도는 cron은 꺼져 있습니다.',
        followUps: [
          {
            question: '왜 API 내부 cron과 외부 crontab을 둘 다 두었나요?',
            answer:
              '개발에서는 별도 설정 없이 돌아가게 API 내부 node-cron이 편하고, 운영에서는 컨테이너를 재시작해도 스케줄이 영향받지 않고 로그와 락을 따로 관리할 수 있는 호스트 crontab이 안정적입니다. 운영은 후자를 쓰고 전자는 환경변수로 끕니다.',
          },
          {
            question: '테스트용으로 넣은 가짜 경기가 화면에 섞이지 않나요?',
            answer:
              "games API가 external_source = 'kbo'인 행만 반환합니다. 로컬에서 심은 시드 경기는 external_source가 NULL이라 조회되지 않습니다.",
          },
        ],
        paths: [
          'apps/api/src/jobs/kbo-schedule-sync.job.ts',
          'scripts/kbo-sync/',
          'docs/kbo-data-sync.md',
        ],
      },
    ],
  },
];

function Flow({ items }: { items: string[] }) {
  return (
    <ol className={styles.flowList}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}

export default function PresentationGuidePage() {
  return (
    <main className={styles.guideRoot}>
      <header className={styles.hero}>
        <div className={styles.heroTopline}>
          <span>YAKUKU YARU / TECH MAP</span>
          <Link href="/presentation">발표 화면으로</Link>
        </div>
        <div className={styles.heroBody}>
          <div>
            <p className={styles.eyebrow}>Frontend to FullStack</p>
            <h1>기술 흐름 치트시트</h1>
          </div>
          <p>
            각 기술이 원래 해결하는 문제와 이 프로젝트에서의 적용을 연결해
            정리했습니다. 용어 표는 &quot;이 기술이 원래 무엇인가&quot;와
            &quot;그래서 여기서 어디에 쓰였는가&quot;를 한 줄로 붙여 읽는
            구조이고, 하단에는 에러 응답 계약, 코드 위치 지도, 예상 질문과
            꼬리질문 답변, 현재 한계와 답하는 요령을 모았습니다.
          </p>
        </div>
      </header>

      <section className={styles.flowBoard} aria-label="핵심 흐름">
        <div>
          <span>사용자 요청</span>
          <Flow items={requestFlow} />
        </div>
        <div>
          <span>자동 배포</span>
          <Flow items={deployFlow} />
        </div>
      </section>

      <section className={styles.statsStrip} aria-label="구현 규모">
        {stats.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <nav className={styles.sectionIndex} aria-label="용어 분류">
        {groups.map((group) => (
          <a href={`#${group.id}`} key={group.id}>
            <span>{group.label.slice(0, 2)}</span>
            {group.title}
          </a>
        ))}
        <a href="#errors">
          <span>10</span>
          에러 계약
        </a>
        <a href="#files">
          <span>11</span>
          코드 위치
        </a>
        <a href="#questions">
          <span>12</span>
          예상 질문
        </a>
        <a href="#limits">
          <span>13</span>
          한계
        </a>
      </nav>

      <div className={styles.termGroups}>
        {groups.map((group) => (
          <section className={styles.termGroup} id={group.id} key={group.id}>
            <header>
              <span>{group.label}</span>
              <h2>{group.title}</h2>
            </header>
            <div className={styles.columnLabels} aria-hidden="true">
              <span>용어</span>
              <span>원래 하는 기능</span>
              <span>그래서 이 프로젝트에서는</span>
            </div>
            <dl>
              {group.terms.map((term) => (
                <div key={term.name}>
                  <dt>{term.name}</dt>
                  <dd>{term.meaning}</dd>
                  <dd>{term.role}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <section className={styles.errorBoard} id="errors">
        <header>
          <span>10 / ERROR CONTRACT</span>
          <div>
            <p>하나의 응답 형식</p>
            <h2>에러 코드와 화면 동작</h2>
          </div>
        </header>
        <p className={styles.boardLead}>
          백엔드는 어떤 실패든 HTTP status와 <code>{'{ code, message }'}</code>{' '}
          두 필드만 반환합니다. 프론트의 <code>request&lt;T&gt;</code>가 이를{' '}
          <code>ApiError(status, code, message)</code>로 그대로 옮겨 담으므로,
          화면은 status로 큰 분류를 나누고 code로 행동을 정합니다.
        </p>
        <div className={styles.errorRows}>
          {errorContract.map((row) => (
            <div key={row.status}>
              <code className={styles.errorStatus}>{row.status}</code>
              <ul>
                {row.codes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>{row.action}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.fileBoard} id="files">
        <header>
          <span>11 / FILE MAP</span>
          <div>
            <p>이 얘기가 나오면 이 파일을 엽니다</p>
            <h2>코드 위치 지도</h2>
          </div>
        </header>
        <dl>
          {fileMap.map(([topic, location]) => (
            <div key={topic}>
              <dt>{topic}</dt>
              <dd>
                <code>{location}</code>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.qaSection} id="questions">
        <header>
          <span>12 / EVALUATION Q&amp;A</span>
          <div>
            <p>발표 예상 질문</p>
            <h2>질문에서 구현으로</h2>
          </div>
        </header>
        <div className={styles.qaGroups}>
          {questionGroups.map((group) => (
            <article className={styles.qaGroup} key={group.label}>
              <header>
                <span>{group.label}</span>
                <h3>{group.title}</h3>
              </header>
              <dl>
                {group.questions.map((item) => (
                  <div key={item.question}>
                    <dt>{item.question}</dt>
                    <dd>
                      <p>{item.answer}</p>
                      {item.followUps && item.followUps.length > 0 ? (
                        <div className={styles.followUps}>
                          <span>꼬리질문</span>
                          <dl>
                            {item.followUps.map((follow) => (
                              <div key={follow.question}>
                                <dt>{follow.question}</dt>
                                <dd>{follow.answer}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ) : null}
                      {item.paths && item.paths.length > 0 ? (
                        <ul className={styles.codePaths}>
                          {item.paths.map((path) => (
                            <li key={path}>
                              <code>{path}</code>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.limitBoard} id="limits">
        <header>
          <span>13 / LIMITATIONS</span>
          <div>
            <p>물어보면 이렇게 답합니다</p>
            <h2>현재 한계와 다음 단계</h2>
          </div>
        </header>
        <p className={styles.boardLead}>
          한계를 숨기지 않고 &quot;왜 지금 이렇게 되어 있는지&quot;와
          &quot;다음에 어떻게 바꿀지&quot;를 함께 말하는 것이 이해도를 보여주는
          방법입니다.
        </p>
        <div className={styles.limitRows}>
          {limitations.map(([limit, reason, next]) => (
            <div key={limit}>
              <strong>{limit}</strong>
              <p>{reason}</p>
              <span>
                <b>NEXT</b>
                {next}
              </span>
            </div>
          ))}
        </div>
      </section>

      <aside className={styles.finalCheck}>
        <strong>구분해서 말하기</strong>
        <div className={styles.distinctions}>
          {distinctions.map(([left, leftDetail, right, rightDetail]) => (
            <p key={left}>
              <b>{left}</b> {leftDetail}
              <i aria-hidden="true">vs</i>
              <b>{right}</b> {rightDetail}
            </p>
          ))}
        </div>
      </aside>

      <footer className={styles.footer}>
        <span>현재 코드 기준 · 2026</span>
        <Link href="/presentation">Presentation ↗</Link>
      </footer>
    </main>
  );
}
