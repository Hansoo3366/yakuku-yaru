/// <reference types="react/canary" />

'use client';

import Link from 'next/link';
import {
  addTransitionType,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  ViewTransition,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Boxes,
  Check,
  Cloud,
  Cookie,
  Database,
  Eraser,
  FileCode2,
  GitBranch,
  KeyRound,
  Layers3,
  MailCheck,
  Maximize2,
  MessageSquareText,
  MonitorCog,
  Network,
  Server,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import styles from './presentation.module.css';

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  content: ReactNode;
};

const slides: Slide[] = [
  {
    id: 'opening',
    eyebrow: '2026 FRONTEND TO FULLSTACK STUDY',
    title: '야크크 야르~ 섹시야구',
    content: (
      <div className={styles.openingContent}>
        <div className={styles.openingIntro}>
          <p>KBO 경기 일정과 직관·집관 기록을 함께 관리하는 웹 서비스</p>
          <div className={styles.openingTopics} aria-label="주요 기능">
            <span>경기 일정</span>
            <span>관람 기록</span>
            <span>팬 커뮤니티</span>
          </div>
        </div>
        <span aria-hidden="true" className={styles.openingMark}>
          KBO
        </span>
        <div className={styles.openingMeta}>
          <span>Build &amp; Understand</span>
          <span>Next.js · Express · MySQL · Docker · GCP</span>
        </div>
      </div>
    ),
  },
  {
    id: 'tech-stack',
    eyebrow: '01 · TECH STACK',
    title: '기술별 담당 영역',
    content: (
      <div className={styles.requirementsGrid}>
        {[
          ['Frontend', 'Next.js 16.3 · React 19 · TypeScript', MonitorCog],
          ['Backend API', 'Node.js · Express 4.22 · Swagger', Server],
          ['Database', 'MySQL 8.4 · Foreign/Unique Key', Database],
          ['Gateway', 'Caddy HTTPS · Nginx 경로 분기', Network],
          ['실행 환경', 'Docker Compose · 5개 container', Boxes],
          ['Cloud / 배포', 'GCP VM · Actions · GHCR · SSH', Cloud],
        ].map(([label, value, Icon]) => {
          const ItemIcon = Icon as typeof Server;
          return (
            <div className={styles.requirement} key={String(label)}>
              <ItemIcon aria-hidden="true" />
              <div>
                <strong>{label as string}</strong>
                <span>{value as string}</span>
              </div>
              <Check aria-label="구현 완료" className={styles.check} />
            </div>
          );
        })}
        <div className={styles.requirementSummary}>
          실행 위치: GCP VM · 실행 단위: Docker container · 앱: Next.js /
          Express · 저장소: MySQL
        </div>
      </div>
    ),
  },
  {
    id: 'architecture',
    eyebrow: '02 · ARCHITECTURE',
    title: '시스템 구성과 요청 흐름',
    content: (
      <div className={styles.architecture}>
        <div className={styles.archNode}>
          <MonitorCog aria-hidden="true" />
          <strong>Browser</strong>
          <span>HTTPS 요청</span>
        </div>
        <ArrowRight aria-hidden="true" className={styles.archArrow} />
        <div className={styles.archNode}>
          <ShieldCheck aria-hidden="true" />
          <strong>Caddy</strong>
          <span>인증서 · HTTPS</span>
        </div>
        <ArrowRight aria-hidden="true" className={styles.archArrow} />
        <div className={styles.archNode}>
          <Network aria-hidden="true" />
          <strong>Nginx</strong>
          <span>경로 분기 · 요청 제한</span>
        </div>
        <ArrowRight aria-hidden="true" className={styles.archArrow} />
        <div className={`${styles.archNode} ${styles.archNodeAccent}`}>
          <Server aria-hidden="true" />
          <strong>Next.js / Express</strong>
          <span>UI 또는 REST API</span>
        </div>
        <ArrowRight aria-hidden="true" className={styles.archArrow} />
        <div className={styles.archNode}>
          <Database aria-hidden="true" />
          <strong>MySQL 8.4</strong>
          <span>관계 · 트랜잭션</span>
        </div>
        <div className={styles.archFooter}>
          <span>GCP VM · Docker Compose</span>
          <span>/ → Next.js · /api → Express</span>
          <span>Express → MySQL</span>
        </div>
      </div>
    ),
  },
  {
    id: 'jwt',
    eyebrow: '03 · BACKEND',
    title: 'JWT 인증 구조',
    content: (
      <div className={styles.splitLayout}>
        <div className={styles.codePanel}>
          <span className={styles.codeLabel}>JWT PAYLOAD</span>
          <pre>{`{
  "userId": 27,
  "email": "user@example.com",
  "sessionVersion": 3,
  "iat": 1788390000,
  "exp": 1788476400
}`}</pre>
          <p>비밀번호·프로필 등 민감정보 미포함</p>
        </div>
        <div className={styles.explainStack}>
          <div>
            <Cookie aria-hidden="true" />
            <p>
              로그인 성공 시 JWT를 <strong>HttpOnly 쿠키</strong>로 전달
            </p>
          </div>
          <div>
            <ShieldCheck aria-hidden="true" />
            <p>
              <strong>authenticate 미들웨어</strong>가 서명·만료·발급 대상·세션
              버전을 검증
            </p>
          </div>
          <div>
            <KeyRound aria-hidden="true" />
            <p>
              비밀번호 재설정 시 sessionVersion 증가 →{' '}
              <strong>기존 토큰 거부</strong>
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'login-state',
    eyebrow: '04 · FRONTEND',
    title: '로그인 상태 유지',
    content: (
      <div className={styles.timeline}>
        {[
          ['1', '로그인', 'API가 yakuku_session 쿠키 설정'],
          ['2', '초기화', 'hydrate()가 cookie-session 메모리 마커 설정'],
          ['3', '상태 확인', 'TanStack Query가 /auth/me로 실제 쿠키 검증'],
          ['4', '인증 유지', "fetch의 credentials: 'include'로 쿠키 전송"],
          ['5', '만료 처리', '/auth/me 실패 → 세션 제거 → 보호 페이지 이동'],
        ].map(([number, label, detail]) => (
          <div className={styles.timelineItem} key={number}>
            <span>{number}</span>
            <strong>{label}</strong>
            <p>{detail}</p>
          </div>
        ))}
        <div className={styles.timelineAnswer}>
          실제 인증 기준: HttpOnly 쿠키 + /auth/me · useAuthGuard는 화면 이동
          제어
        </div>
      </div>
    ),
  },
  {
    id: 'state',
    eyebrow: '05 · FRONTEND',
    title: '상태관리 역할 분리',
    content: (
      <div className={styles.stateBands}>
        <div>
          <span className={styles.stateIndex}>SERVER STATE</span>
          <strong>TanStack Query</strong>
          <p>사용자·팀·경기·게시글·댓글 조회, 캐시와 중복 요청 관리</p>
        </div>
        <div>
          <span className={styles.stateIndex}>GLOBAL CLIENT STATE</span>
          <strong>Zustand</strong>
          <p>로그인 사용자, 세션 확인 상태, 캘린더 필터</p>
        </div>
        <div>
          <span className={styles.stateIndex}>LOCAL UI STATE</span>
          <strong>React state</strong>
          <p>페이지 번호, 폼 입력, 팝업, 이미지 미리보기</p>
        </div>
        <p className={styles.stateReason}>
          서버 데이터의 전역 Store 중복 저장 방지 · 동기화 지점 최소화
        </p>
      </div>
    ),
  },
  {
    id: 'api',
    eyebrow: '06 · FRONTEND',
    title: 'API 연동과 공통 에러 처리',
    content: (
      <div className={styles.apiLayout}>
        <div className={styles.apiFlow}>
          {[
            ['Page', '쓰기 이벤트·화면 메시지'],
            ['Query hook', '조회·캐시·재요청'],
            ['Domain API', '기능별 URL·응답 타입'],
            ['request<T>', 'base URL · JSON · cookie · 204'],
            ['Express route', '검증 · 비즈니스 로직 · 응답'],
          ].map(([name, detail], index) => (
            <div className={styles.apiStep} key={name}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{name}</strong>
              <p>{detail}</p>
            </div>
          ))}
        </div>
        <div className={styles.errorPanel}>
          <span>공통 에러 포맷</span>
          <pre>{`{
  "code": "AUTH_REQUIRED",
  "message": "로그인이 필요합니다."
}`}</pre>
          <p>
            공통 client에서 <code>ApiError</code>로 변환 · code/status 기준 안내
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'swagger',
    eyebrow: '07 · API DOCUMENTATION',
    title: 'Swagger UI로 API 계약 확인',
    content: (
      <div className={styles.swaggerLayout}>
        <div className={styles.swaggerEndpoints}>
          {[
            ['GET', '/health', 'API·DB 상태 확인'],
            ['POST', '/auth/login', '로그인·JWT 쿠키 발급'],
            ['GET', '/posts', 'page·size·keyword 조회'],
            ['PATCH', '/posts/{postId}', '작성자의 게시글 수정'],
            ['DELETE', '/comments/{commentId}', '작성자의 댓글 삭제'],
          ].map(([method, path, detail]) => (
            <div className={styles.swaggerEndpoint} key={`${method}-${path}`}>
              <span className={styles.swaggerMethod} data-method={method}>
                {method}
              </span>
              <code>{path}</code>
              <p>{detail}</p>
            </div>
          ))}
        </div>
        <aside className={styles.swaggerAside}>
          <span>OPENAPI 3.0</span>
          <strong>Yakuku Yaru API</strong>
          <ul>
            <li>method·URL·parameter 확인</li>
            <li>request·response schema 확인</li>
            <li>Try it out으로 직접 요청</li>
          </ul>
          <code>yakuku-yaru.today/api-docs</code>
          <p>로컬과 운영에서 같은 OpenAPI 문서 제공</p>
          <FileCode2 aria-hidden="true" />
        </aside>
      </div>
    ),
  },
  {
    id: 'signup',
    eyebrow: '08 · SIGN UP',
    title: '회원가입과 이메일 인증',
    content: (
      <div className={styles.signupFlow}>
        <div>
          <span>01</span>
          <strong>중복 검사</strong>
          <p>이메일·닉네임 unique 제약과 API 검사</p>
        </div>
        <div>
          <span>02</span>
          <strong>비밀번호 해시</strong>
          <p>bcryptjs cost 12 hash만 DB에 저장</p>
        </div>
        <div>
          <span>03</span>
          <strong>인증번호 발급</strong>
          <p>6자리·3분 만료·30초 대기·최대 4회</p>
        </div>
        <div>
          <span>04</span>
          <strong>Gmail SMTP</strong>
          <p>Nodemailer로 인증번호 전송</p>
        </div>
        <div>
          <span>05</span>
          <strong>인증 완료</strong>
          <p>email_verified_at 기록 후 로그인 허용</p>
        </div>
        <MailCheck aria-hidden="true" className={styles.signupIcon} />
      </div>
    ),
  },
  {
    id: 'database',
    eyebrow: '09 · DATABASE',
    title: '주요 테이블 관계',
    content: (
      <div className={styles.dbLayout}>
        <div className={styles.relationships}>
          <div className={styles.entityStrong}>users</div>
          <span>1 : N</span>
          <div>posts</div>
          <span>1 : N</span>
          <div>comments</div>
          <div className={styles.relationshipBranch}>
            <b>users</b> 1 : N <b>attendance_records</b> N : 1 <b>games</b>
          </div>
          <div className={styles.relationshipBranch}>
            <b>games</b> N : 1 <b>home_team / away_team</b>
          </div>
        </div>
        <div className={styles.dbNotes}>
          <p>
            <strong>Foreign Key</strong>
            잘못된 참조 방지
          </p>
          <p>
            <strong>Unique Key</strong>
            이메일·닉네임·경기별 중복 기록 방지
          </p>
          <p>
            <strong>다대다 분리</strong>
            동행자는 attendance_companions 연결 테이블로 관리
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'crud',
    eyebrow: '10 · BOARD & COMMENTS',
    title: '게시글·댓글 권한 처리',
    content: (
      <div className={styles.crudLayout}>
        <div className={styles.crudMethod}>
          <span>CREATE</span>
          <span>READ</span>
          <span>UPDATE</span>
          <span>DELETE</span>
        </div>
        <div className={styles.crudStatements}>
          <p>
            <MessageSquareText aria-hidden="true" /> 로그인 사용자만 게시글·댓글
            작성
          </p>
          <p>
            <ShieldCheck aria-hidden="true" /> 게시글 수정·삭제와 댓글 삭제 전
            작성자 ID 비교
          </p>
          <p>
            <Layers3 aria-hidden="true" /> 화면의 버튼을 숨겨도, 최종 권한
            검사는 반드시 API에서 수행
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'paging',
    eyebrow: '11 · PAGING',
    title: '게시글 페이징',
    content: (
      <div className={styles.pagingLayout}>
        <div className={styles.pagingNumber}>
          <strong>10</strong>
          <span>items per request</span>
        </div>
        <div className={styles.pagingEvidence}>
          <div>
            <code>LIMIT 10 OFFSET 10</code>
            <p>현재 페이지 구간만 서버에서 조회</p>
          </div>
          <div
            className={styles.paginationDemo}
            aria-label="페이지네이션 응답 예시"
          >
            <span>page 2</span>
            <span>size 10</span>
            <span>total 47</span>
            <strong>totalPages 5</strong>
          </div>
          <p>응답 메타데이터 기반 페이지 UI 구성</p>
        </div>
      </div>
    ),
  },
  {
    id: 'deployment',
    eyebrow: '12 · DEPLOYMENT',
    title: 'Docker와 GitHub Actions 자동 배포',
    content: (
      <div className={styles.deployLayout}>
        <div className={styles.deployRail}>
          {[
            [GitBranch, 'GitHub push', 'main 브랜치'],
            [Boxes, 'Actions build', 'Web / API 이미지'],
            [Cloud, 'GHCR push', 'commit SHA 태그'],
            [Workflow, 'SSH deploy', 'Compose pull / up'],
            [ShieldCheck, 'Health check', '/api/health 확인'],
          ].map(([Icon, title, detail]) => {
            const StepIcon = Icon as typeof GitBranch;
            return (
              <div key={title as string}>
                <StepIcon aria-hidden="true" />
                <strong>{title as string}</strong>
                <span>{detail as string}</span>
              </div>
            );
          })}
        </div>
        <div className={styles.deployProof}>
          <p>
            <FileCode2 aria-hidden="true" /> Swagger UI
            <strong>yakuku-yaru.today/api-docs</strong>
          </p>
          <p>
            <Cloud aria-hidden="true" /> Production
            <strong>yakuku-yaru.today</strong>
          </p>
          <p>
            <Boxes aria-hidden="true" /> Containers
            <strong>VM에서는 pull · up --no-build</strong>
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'closing',
    eyebrow: '13 · SUMMARY',
    title: '구현 범위 요약',
    content: (
      <div className={styles.closingLayout}>
        <div>
          <strong>인증</strong>
          <p>JWT 발급 → HttpOnly 쿠키 → Middleware 검증</p>
        </div>
        <div>
          <strong>데이터</strong>
          <p>Next.js → Express REST API → MySQL</p>
        </div>
        <div>
          <strong>배포</strong>
          <p>GitHub Actions → GHCR → GCP VM</p>
        </div>
        <span className={styles.qa}>Q&amp;A</span>
      </div>
    ),
  },
];

type DrawingState = {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
};

function isControl(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('button, a'));
}

export default function PresentationPage() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<HTMLSpanElement>(null);
  const drawingRef = useRef<DrawingState | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const clearTimerRef = useRef<number | null>(null);

  const cancelAnnotationFade = useCallback(() => {
    if (fadeTimerRef.current !== null)
      window.clearTimeout(fadeTimerRef.current);
    if (clearTimerRef.current !== null)
      window.clearTimeout(clearTimerRef.current);
    fadeTimerRef.current = null;
    clearTimerRef.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    cancelAnnotationFade();
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.opacity = '1';
  }, [cancelAnnotationFade]);

  const showAnnotations = useCallback(() => {
    cancelAnnotationFade();
    if (canvasRef.current) canvasRef.current.style.opacity = '1';
  }, [cancelAnnotationFade]);

  const fadeAnnotations = useCallback(() => {
    cancelAnnotationFade();
    fadeTimerRef.current = window.setTimeout(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = '0';
      clearTimerRef.current = window.setTimeout(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (canvas && context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          canvas.style.opacity = '1';
        }
      }, 700);
    }, 1100);
  }, [cancelAnnotationFade]);

  const goTo = useCallback(
    (nextIndex: number) => {
      const boundedIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
      if (boundedIndex === slideIndex) return;

      clearCanvas();
      startTransition(() => {
        addTransitionType(
          boundedIndex > slideIndex ? 'deck-forward' : 'deck-back',
        );
        setSlideIndex(boundedIndex);
      });
    },
    [clearCanvas, slideIndex],
  );

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await rootRef.current?.requestFullscreen();
  }, []);

  useEffect(() => {
    document.body.classList.add('presentation-mode');
    return () => {
      document.body.classList.remove('presentation-mode');
      cancelAnnotationFade();
    };
  }, [cancelAnnotationFade]);

  useEffect(() => {
    function resizeCanvas() {
      const canvas = canvasRef.current;
      const root = rootRef.current;
      if (!canvas || !root) return;

      const { width, height } = root.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext('2d')?.scale(ratio, ratio);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (
        event.key === 'ArrowRight' ||
        event.key === 'PageDown' ||
        event.key === ' '
      ) {
        event.preventDefault();
        goTo(slideIndex + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        goTo(slideIndex - 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        goTo(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        goTo(slides.length - 1);
      } else if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        void toggleFullscreen();
      } else if (event.key.toLowerCase() === 'c') {
        clearCanvas();
      }
    }

    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [clearCanvas, goTo, slideIndex, toggleFullscreen]);

  function getPoint(event: ReactPointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || isControl(event.target)) return;
    showAnnotations();
    const { x, y } = getPoint(event);
    drawingRef.current = {
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const { x, y } = getPoint(event);
    if (pointerRef.current) {
      pointerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      pointerRef.current.style.opacity = '1';
    }

    const drawing = drawingRef.current;
    const context = canvasRef.current?.getContext('2d');
    if (!drawing || !context) return;

    const moved = Math.hypot(x - drawing.startX, y - drawing.startY) > 4;
    drawing.moved ||= moved;
    context.save();
    context.strokeStyle = '#ff334f';
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.shadowColor = 'rgba(255, 51, 79, .72)';
    context.shadowBlur = 12;
    context.beginPath();
    context.moveTo(drawing.lastX, drawing.lastY);
    context.lineTo(x, y);
    context.stroke();
    context.restore();
    drawing.lastX = x;
    drawing.lastY = y;
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const drawing = drawingRef.current;
    const context = canvasRef.current?.getContext('2d');
    if (drawing && context && !drawing.moved) {
      context.save();
      context.fillStyle = '#ff334f';
      context.shadowColor = 'rgba(255, 51, 79, .72)';
      context.shadowBlur = 16;
      context.beginPath();
      context.arc(drawing.startX, drawing.startY, 5, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    drawingRef.current = null;
    if (drawing) fadeAnnotations();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const activeSlide = slides[slideIndex];

  return (
    <main
      aria-label="Frontend to FullStack 발표"
      className={styles.presentationRoot}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerLeave={() => {
        if (pointerRef.current) pointerRef.current.style.opacity = '0';
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={rootRef}
    >
      <canvas
        aria-hidden="true"
        className={styles.annotationCanvas}
        ref={canvasRef}
      />
      <span
        aria-hidden="true"
        className={styles.laserPointer}
        ref={pointerRef}
      />

      <ViewTransition
        default="none"
        enter={{
          'deck-forward': 'nav-forward',
          'deck-back': 'nav-back',
          default: 'none',
        }}
        exit={{
          'deck-forward': 'nav-forward',
          'deck-back': 'nav-back',
          default: 'none',
        }}
        key={activeSlide.id}
      >
        <article
          className={`${styles.slide} ${styles[`slide_${activeSlide.id}`] ?? ''}`}
        >
          <header className={styles.slideHeader}>
            <span>{activeSlide.eyebrow}</span>
            <span>YAKUKU YARU · BUILD &amp; UNDERSTAND</span>
          </header>
          <h1>{activeSlide.title}</h1>
          <div className={styles.slideContent}>{activeSlide.content}</div>
        </article>
      </ViewTransition>

      <div className={styles.progress} aria-hidden="true">
        <span
          style={{ width: `${((slideIndex + 1) / slides.length) * 100}%` }}
        />
      </div>

      <nav className={styles.controls} aria-label="발표 슬라이드 조작">
        <button
          aria-label="이전 슬라이드"
          disabled={slideIndex === 0}
          onClick={() => goTo(slideIndex - 1)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <span aria-live="polite">
          {String(slideIndex + 1).padStart(2, '0')} /{' '}
          {String(slides.length).padStart(2, '0')}
        </span>
        <button
          aria-label="다음 슬라이드"
          disabled={slideIndex === slides.length - 1}
          onClick={() => goTo(slideIndex + 1)}
          type="button"
        >
          <ArrowRight aria-hidden="true" />
        </button>
        <i aria-hidden="true" />
        <button
          aria-label="레이저 표시 지우기"
          onClick={clearCanvas}
          type="button"
        >
          <Eraser aria-hidden="true" />
        </button>
        <Link
          aria-label="기술 용어 치트시트 새 탭에서 열기"
          href="/presentation/guide"
          rel="noreferrer"
          target="_blank"
        >
          <BookOpenText aria-hidden="true" />
        </Link>
        <button
          aria-label={isFullscreen ? '전체화면 종료' : '전체화면 시작'}
          onClick={() => void toggleFullscreen()}
          type="button"
        >
          <Maximize2 aria-hidden="true" />
        </button>
      </nav>

      <p className={styles.keyboardHint}>
        ← → 이동 · F 전체화면 · 좌클릭 점 · 드래그 선 · 책 아이콘 용어집
      </p>
    </main>
  );
}
