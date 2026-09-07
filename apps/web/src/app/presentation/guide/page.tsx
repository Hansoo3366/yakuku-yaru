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

type QuestionGroup = {
  label: string;
  title: string;
  questions: Array<{
    question: string;
    answer: string;
  }>;
};

const requestFlow = [
  'Browser',
  'Caddy',
  'Nginx',
  'Next.js / Express',
  'MySQL',
  'TanStack Query',
  'React UI',
];

const deployFlow = [
  'main push',
  'GitHub Actions',
  'Docker build',
  'GHCR push',
  'SSH',
  'Compose up',
  'Health check',
];

const groups: TermGroup[] = [
  {
    id: 'backend',
    label: '01 / BACKEND',
    title: '서버와 API',
    terms: [
      {
        name: 'Node.js',
        meaning: '서버에서 JavaScript를 실행하는 환경',
        role: 'Express API, MySQL 접근, JWT 발급, 이메일 전송 코드를 실행',
      },
      {
        name: 'Express',
        meaning: 'Node.js용 웹 서버 프레임워크',
        role: '/api/auth, /api/posts 같은 REST route와 middleware를 구성',
      },
      {
        name: 'REST API',
        meaning: 'HTTP method와 URL로 자원 동작을 표현하는 방식',
        role: 'GET 조회, POST 작성, PATCH 수정, DELETE 삭제로 CRUD 제공',
      },
      {
        name: 'Middleware',
        meaning: 'route handler 전후의 공통 처리 단계',
        role: '인증, 요청 제한, 출처 검사, 공통 에러 처리에 사용',
      },
      {
        name: 'Repository',
        meaning: 'DB 접근과 SQL을 모아 둔 계층',
        role: 'route의 HTTP 처리와 MySQL 조회·저장 책임을 분리',
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
        meaning: '사용자를 증명하는 서명된 문자열',
        role: 'userId, email, sessionVersion과 발급·만료 정보를 포함',
      },
      {
        name: 'HttpOnly cookie',
        meaning: 'JavaScript가 읽지 못하고 브라우저가 전송하는 쿠키',
        role: '실제 JWT를 yakuku_session에 보관해 새로고침 후에도 인증 유지',
      },
      {
        name: 'authenticate',
        meaning: '보호 API 앞의 Express middleware',
        role: 'JWT와 DB sessionVersion을 검증하고 req.user를 설정',
      },
      {
        name: 'sessionVersion',
        meaning: '기존 JWT를 무효화하는 사용자별 숫자',
        role: '비밀번호 재설정 시 증가해 이전 버전의 JWT를 거부',
      },
      {
        name: 'cookie-session',
        meaning: '쿠키 인증을 시도한다는 메모리 marker',
        role: '실제 토큰이나 패키지가 아니며 /auth/me 호출을 활성화',
      },
      {
        name: 'hydrate()',
        meaning: 'Zustand 인증 store의 초기화 함수',
        role: 'marker와 hasHydrated를 설정하고 인증 확인 준비를 완료',
      },
      {
        name: 'credentials',
        meaning: 'fetch 요청에 쿠키를 포함하는 옵션',
        role: "request<T>가 'include'로 설정해 HttpOnly JWT를 API에 전달",
      },
      {
        name: 'useAuthGuard',
        meaning: '인증 화면 이동을 제어하는 custom hook',
        role: '초기화 후 marker가 없으면 이동하며 실제 보안은 authenticate가 담당',
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
          'React 컴포넌트가 화면에 반영할 값을 기억하고, 값이 바뀌면 해당 화면을 다시 렌더링하는 기본 상태 기능',
        role: '페이지 번호·폼 입력·팝업·이미지 미리보기는 현재 화면 안에서만 필요하므로 전역 Store로 올리지 않고 React state로 관리',
      },
      {
        name: 'Zustand',
        meaning:
          '컴포넌트 바깥에 전역 Store를 만들고, 여러 컴포넌트가 같은 값을 구독·수정하게 하는 클라이언트 상태관리 라이브러리',
        role: '로그인 사용자·세션 초기화 상태·캘린더 필터는 여러 화면과 컴포넌트가 함께 사용하므로 Zustand Store에서 공유',
      },
      {
        name: 'TanStack Query',
        meaning:
          'API로 가져온 서버 데이터의 요청·로딩·에러·캐시·중복 요청·재요청 시점을 관리하는 서버 상태 라이브러리',
        role: '사용자·팀·경기·게시글·댓글은 서버가 원본이고 반복 조회되므로 Query 캐시에 보관하고, 변경 후 관련 데이터를 다시 요청',
      },
      {
        name: 'Query hook',
        meaning:
          'React hook 규칙을 이용해 useQuery의 query key·요청 함수·실행 조건을 하나의 재사용 함수로 묶는 프로젝트 패턴',
        role: 'useMeQuery·usePostsQuery처럼 반복 설정을 queries.ts에 모아, 페이지가 캐시 key와 요청 조건을 매번 작성하지 않게 함',
      },
      {
        name: 'Domain API',
        meaning:
          '기능 영역별로 API URL·요청 값·응답 타입을 묶어 화면과 HTTP 세부사항을 분리하는 코드 구조',
        role: 'auth-api·post-api·attendance-api로 나눠, 화면에서는 URL 대신 login()·createPost()처럼 업무 이름의 함수를 호출',
      },
      {
        name: 'request<T>',
        meaning:
          'fetch에 반복되는 base URL·method·header·body·응답·에러 처리를 한 번에 수행하는 공통 함수. T는 성공 응답 타입을 알려주는 TypeScript generic',
        role: '모든 JSON Domain API가 이 함수를 사용해 쿠키 전송·JSON 변환·ApiError 생성·204 응답을 같은 방식으로 처리',
      },
      {
        name: 'ApiError',
        meaning:
          '일반 Error에 HTTP status와 서버 error code를 추가해, 프로그램이 실패 원인을 구분할 수 있게 만든 custom error',
        role: 'request<T>가 실패 응답을 ApiError로 통일하므로, 화면은 EMAIL_NOT_VERIFIED 같은 code로 이동을 결정하고 message를 표시',
      },
    ],
  },
  {
    id: 'account',
    label: '04 / ACCOUNT',
    title: '회원가입',
    terms: [
      {
        name: 'bcryptjs',
        meaning: '비밀번호를 단방향 hash로 바꾸는 라이브러리',
        role: 'cost 12 hash만 DB에 저장하고 compare로 로그인 검증',
      },
      {
        name: 'Nodemailer',
        meaning: 'Node.js에서 이메일 발송을 요청하는 라이브러리',
        role: 'Gmail SMTP로 회원가입 인증번호와 비밀번호 재설정 메일 전송',
      },
      {
        name: 'SMTP',
        meaning: '이메일을 보내기 위한 통신 규칙',
        role: 'Nodemailer와 Gmail 메일 서버 사이의 발송 통신에 사용',
      },
      {
        name: 'Verification code',
        meaning: '이메일 소유 여부를 확인하는 6자리 번호',
        role: '3분 만료, 30초 재전송 대기, 최대 4회 발송으로 DB 관리',
      },
    ],
  },
  {
    id: 'infra',
    label: '05 / INFRA',
    title: '서버와 자동 배포',
    terms: [
      {
        name: 'GCP VM',
        meaning: 'Google Cloud의 원격 Linux 가상 서버',
        role: '한 대의 Compute Engine VM에서 전체 컨테이너 실행',
      },
      {
        name: 'Docker',
        meaning: '앱과 실행 환경을 image로 포장하고 container로 실행',
        role: 'Web/API를 같은 환경으로 빌드하고 VM에서 동일하게 실행',
      },
      {
        name: 'Docker Compose',
        meaning: '여러 container를 한 파일로 관리하는 도구',
        role: 'web, api, mysql, gateway, caddy의 환경·의존·volume 관리',
      },
      {
        name: 'Caddy',
        meaning: 'HTTPS 인증서를 관리하는 reverse proxy',
        role: '80·443 요청을 받아 Nginx gateway로 전달',
      },
      {
        name: 'Nginx',
        meaning: '내부 요청을 분기하고 제한하는 gateway',
        role: '/api·/uploads는 Express, 나머지는 Next.js로 전달',
      },
      {
        name: 'GitHub Actions',
        meaning: 'push를 감지해 작업을 실행하는 CI/CD 환경',
        role: 'main push 후 이미지 빌드부터 배포 검증까지 자동 실행',
      },
      {
        name: 'GHCR push',
        meaning: 'Docker image를 GitHub Container Registry에 업로드',
        role: 'Web/API image를 commit SHA와 latest tag로 보관',
      },
      {
        name: 'SSH deploy',
        meaning: 'private key로 VM에 원격 접속해 배포 명령 실행',
        role: 'GHCR image를 pull하고 Compose로 container를 교체',
      },
      {
        name: 'Health check',
        meaning: '배포된 서비스가 실제 응답하는지 확인하는 검사',
        role: '/api/health가 12회 안에 성공하지 않으면 배포 실패 처리',
      },
    ],
  },
];

const questionGroups: QuestionGroup[] = [
  {
    label: 'BACKEND',
    title: 'JWT 인증',
    questions: [
      {
        question: 'JWT 토큰에는 어떤 정보를 포함하셨나요?',
        answer:
          'userId, email, sessionVersion을 담습니다. JWT 라이브러리가 발급·만료 시간(iat, exp), 발급자(iss), 대상(aud)도 추가하며 비밀번호와 프로필은 제외합니다.',
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
          '실제 업무의 소유 관계와 1:N·N:M 카디널리티를 기준으로 나눴습니다. users–posts–comments는 foreign key로 연결하고, 동행자처럼 N:M 관계는 연결 테이블로 분리했으며, 이메일과 경기별 관람 기록은 unique key로 중복을 막습니다.',
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
          '공유 클라이언트 상태는 Zustand, 서버 데이터는 TanStack Query, 현재 컴포넌트의 UI 값은 React state로 구분합니다.',
      },
      {
        question: '어떤 데이터들을 상태 관리로 관리하셨나요?',
        answer:
          'Zustand에는 로그인 사용자·세션 초기화·캘린더 필터, Query 캐시에는 팀·경기·게시글·댓글, React state에는 폼·팝업·페이지·이미지 미리보기를 담습니다.',
      },
      {
        question: '상태관리 라이브러리를 선택한 이유는 무엇인가요?',
        answer:
          'Zustand는 설정과 boilerplate가 적고 필요한 Store 조각만 구독하기 쉬워 공유 UI 상태에 사용합니다. 서버 데이터는 캐시·재요청이 필요해 TanStack Query로 분리하여 전역 Store의 중복 저장을 피합니다.',
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
          '브라우저 fetch를 generic 함수 request<T>로 감싸 호출합니다. 조회는 주로 TanStack Query hook을 통하고, 쓰기는 화면 이벤트에서 Domain API를 호출한 뒤 관련 query를 invalidate합니다.',
      },
      {
        question: 'API 호출 로직은 어떤 위치에서 관리하고 있나요?',
        answer:
          '공통 HTTP 처리는 src/lib/api.ts, 업무별 함수는 auth-api.ts·post-api.ts·attendance-api.ts, 조회 설정은 src/lib/queries.ts에 나눠 관리합니다.',
      },
      {
        question: '공통 API 요청 처리를 위해 어떤 구조를 사용하셨나요?',
        answer:
          'Page → Query hook → Domain API → request<T> 순서로 나눕니다. request<T>가 base URL·method·JSON·cookie·ApiError·204 응답을 공통 처리합니다.',
      },
      {
        question: 'API 요청 시 인증 토큰은 어떻게 전달하셨나요?',
        answer:
          'JWT는 yakuku_session HttpOnly cookie에 보관하고 request<T>의 credentials: include로 브라우저가 자동 전송합니다. 프론트 JavaScript는 토큰 값을 읽거나 localStorage에 저장하지 않습니다.',
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
          '화면이 ApiError를 catch해 message를 폼과 화면의 안내로 표시하고, status와 code에 따라 이메일 인증·로그인 화면 이동 같은 후속 행동을 결정합니다.',
      },
      {
        question: '공통 에러 처리를 위해 어떤 구조를 사용하셨나요?',
        answer:
          '백엔드는 code·message 형식으로 응답하고, 공통 request<T>가 이를 status·code·message를 갖는 ApiError로 변환합니다. 각 화면은 같은 에러 타입을 사용합니다.',
      },
    ],
  },
  {
    label: 'FRONTEND / LOGIN',
    title: '로그인',
    questions: [
      {
        question: '로그인 상태 확인은 어떤 방식으로 처리하셨나요?',
        answer:
          '앱 초기화 후 TanStack Query가 /auth/me를 호출합니다. API가 HttpOnly cookie의 JWT를 검증해 사용자를 돌려주면 로그인 상태로 판단합니다.',
      },
      {
        question: '로그인 상태는 어디에 저장하셨나요?',
        answer:
          '실제 JWT는 브라우저의 HttpOnly cookie, 화면이 사용하는 사용자 정보는 Zustand와 TanStack Query 캐시에 둡니다. Zustand에는 JWT 문자열을 저장하지 않습니다.',
      },
      {
        question: '페이지 새로고침 시 로그인 상태는 어떻게 유지되나요?',
        answer:
          '새로고침해도 HttpOnly cookie가 남아 있습니다. hydrate()가 쿠키 인증을 시도할 준비를 하고 /auth/me를 다시 호출해 사용자 정보를 복구합니다. 유지의 근거는 Zustand가 아니라 cookie입니다.',
      },
      {
        question: '인증이 필요한 페이지 접근은 어떻게 제어하셨나요?',
        answer:
          'useAuthGuard가 세션 초기화 후 비로그인 상태면 로그인 화면으로 이동시킵니다. 이것은 UX 제어이고, 실제 보안은 Express authenticate middleware가 API에서 보장합니다.',
      },
      {
        question: '토큰이 만료되면 어떻게 실행되고 있나요?',
        answer:
          '/auth/me 또는 보호 API가 401을 반환하면 프론트가 사용자·세션 상태를 제거하고 보호 페이지에서 로그인 화면으로 이동합니다. 비밀번호 재설정 후에는 sessionVersion 불일치로 기존 JWT도 거부됩니다.',
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
          'Nodemailer가 Gmail SMTP로 6자리 인증번호를 보냅니다. DB에 3분 만료로 저장하고 30초 재전송 대기·최대 4회를 적용하며, 검증 성공 시 email_verified_at을 기록해 로그인을 허용합니다.',
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
            정리했습니다. 하단에서는 평가 질문과 현재 코드 기준 답변을 바로
            확인할 수 있습니다.
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

      <nav className={styles.sectionIndex} aria-label="용어 분류">
        {groups.map((group) => (
          <a href={`#${group.id}`} key={group.id}>
            <span>{group.label.slice(0, 2)}</span>
            {group.title}
          </a>
        ))}
        <a href="#questions">
          <span>06</span>
          예상 질문
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

      <section className={styles.qaSection} id="questions">
        <header>
          <span>06 / EVALUATION Q&amp;A</span>
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
                    <dd>{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <aside className={styles.finalCheck}>
        <strong>구분해서 말하기</strong>
        <p>
          <b>useAuthGuard</b>는 화면 이동을 제어하고, <b>authenticate</b>는
          API를 보호합니다.
        </p>
        <p>
          <b>cookie-session</b>은 메모리 marker이고, 실제 JWT는{' '}
          <b>HttpOnly cookie</b>에 있습니다.
        </p>
      </aside>

      <footer className={styles.footer}>
        <span>현재 코드 기준 · 2026</span>
        <Link href="/presentation">Presentation ↗</Link>
      </footer>
    </main>
  );
}
