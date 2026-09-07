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
            정리했습니다. 발표 직전에는 위의 두 흐름과 용어를 함께 확인하면
            됩니다.
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
