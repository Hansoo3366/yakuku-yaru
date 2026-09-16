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
  Bell,
  BookOpenText,
  Boxes,
  CalendarDays,
  Camera,
  Check,
  Cloud,
  Cookie,
  Eraser,
  GitBranch,
  KeyRound,
  ListChecks,
  MailCheck,
  Maximize2,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Ticket,
  Timer,
  Trophy,
  UserPlus,
  Users,
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
        <div className={styles.openingMeta}>
          <span>야구를 보고 · 기록하고 · 함께 이야기하는 곳</span>
          <span>Next.js · Express · MySQL · Docker · GCP</span>
        </div>
      </div>
    ),
  },
  {
    id: 'overview',
    eyebrow: '01 · OVERVIEW',
    title: '무엇을 만들었나',
    content: (
      <div className={styles.serviceLayout}>
        <div className={styles.serviceGrid}>
          {[
            [
              CalendarDays,
              '캘린더',
              '월·주 단위 경기 일정과 내 관람 기록을 한 화면에',
            ],
            [Ticket, '경기 상세', '선발 투수·라인업·예매 링크와 구장 정보'],
            [
              Camera,
              '직관·집관 기록',
              '경기마다 한 번, 사진과 메모로 남기는 관람 기록',
            ],
            [Users, '동행자 태그', '함께 간 팬을 검색해 태그하고 수락·거절'],
            [
              Trophy,
              '승률과 명예 칭호',
              '내 기록으로 승률을 계산해 칭호를 자동으로 부여',
            ],
            [
              MessageSquareText,
              '팬 라운지',
              '카테고리별 게시글과 댓글, 검색과 페이지 나누기',
            ],
            [
              UserPlus,
              '팬 찾기·팔로우',
              '다른 팬의 공개 프로필과 기록을 보고 팔로우',
            ],
            [Bell, '알림', '댓글·태그·팔로우·신고 등 서비스 안 알림'],
          ].map(([Icon, label, detail]) => {
            const CardIcon = Icon as typeof CalendarDays;
            return (
              <div className={styles.serviceCard} key={label as string}>
                <CardIcon aria-hidden="true" />
                <strong>{label as string}</strong>
                <span>{detail as string}</span>
              </div>
            );
          })}
        </div>
        <div className={styles.overviewCheck}>
          {[
            ['필수 로직', '로그인 · 회원가입 · 게시판 · 댓글 · 페이징'],
            ['선택 구현', '파일 업로드 · 게시글 검색 · 사용자 프로필'],
            [
              '함께 구성',
              '자동 배포 · API 문서 · 관리자 화면 · 경기 데이터 수집',
            ],
          ].map(([label, items]) => (
            <div key={label}>
              <span>{label}</span>
              <p>{items}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'signup',
    eyebrow: '02 · AUTH / SIGN UP',
    title: '회원가입과 이메일 인증',
    content: (
      <div className={styles.signupFlow}>
        <div>
          <span>01</span>
          <strong>중복 확인</strong>
          <p>
            가입 화면에서 이메일·닉네임을 먼저 확인, 최종은 데이터베이스가 거절
          </p>
        </div>
        <div>
          <span>02</span>
          <strong>비밀번호 변환</strong>
          <p>되돌릴 수 없는 형태로 바꿔 저장, 평문은 남지 않음</p>
        </div>
        <div>
          <span>03</span>
          <strong>인증번호 발급</strong>
          <p>6자리 · 3분 안에 입력 · 재전송은 30초 대기 · 최대 4회</p>
        </div>
        <div>
          <span>04</span>
          <strong>메일 전송</strong>
          <p>메일 서버를 통해 인증번호 발송</p>
        </div>
        <div>
          <span>05</span>
          <strong>인증 완료</strong>
          <p>확인된 계정만 로그인 가능, 미인증은 인증 화면으로</p>
        </div>
        <MailCheck aria-hidden="true" className={styles.signupIcon} />
      </div>
    ),
  },
  {
    id: 'jwt',
    eyebrow: '03 · AUTH / TOKEN',
    title: '토큰에 무엇을 담고, 어떻게 전달하나',
    content: (
      <div className={styles.splitLayout}>
        <div className={styles.codePanel}>
          <span className={styles.codeLabel}>TOKEN PAYLOAD</span>
          <pre>{`{
  "userId": 27,
  "sessionVersion": 3,
  "tokenType": "access",
  "iat": 1788390000,
  "exp": 1788390900
}`}</pre>
          <p>
            누구인지 판단할 최소 정보만 담습니다. 화면에 보여줄 닉네임·프로필은
            토큰이 아니라 별도로 서버에 요청해 받습니다
          </p>
        </div>
        <div className={styles.explainStack}>
          <div>
            <ShieldCheck aria-hidden="true" />
            <p>
              토큰은 <strong>서명</strong>되어 있어, 중간에 내용을 바꾸면 검증
              단계에서 걸러집니다
            </p>
          </div>
          <div>
            <Timer aria-hidden="true" />
            <p>
              <strong>Access Token</strong>은 15분만 사용하고, 만료되면 서버가
              새 토큰을 발급합니다
            </p>
          </div>
          <div>
            <Cookie aria-hidden="true" />
            <p>
              <strong>Refresh Token</strong>은 일반 7일 · 로그인 상태 유지 30일,
              두 토큰 모두 HttpOnly 쿠키로 전달합니다
            </p>
          </div>
          <div>
            <KeyRound aria-hidden="true" />
            <p>
              재발급할 때마다 Refresh Token을 <strong>교체</strong>하고,
              재사용이 감지되면 같은 로그인 세션을 전부 끊습니다
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'login-state',
    eyebrow: '04 · AUTH / SESSION',
    title: '로그인 상태 확인과 보호',
    content: (
      <div className={styles.timeline}>
        <div className={styles.timelineSteps}>
          {[
            ['1', '앱 시작', '인증 확인을 시작하고 확인 중 상태를 표시'],
            [
              '2',
              '서버에 확인',
              '지금 쿠키로 로그인된 사용자인지 서버에 물어봄',
            ],
            ['3', 'Access 만료', 'Refresh Token으로 새 토큰을 한 번만 요청'],
            [
              '4',
              '자동 복구',
              '성공하면 원래 요청 재시도 · 실패하면 로그인 상태 정리',
            ],
          ].map(([number, label, detail]) => (
            <div className={styles.timelineItem} key={number}>
              <span>{number}</span>
              <strong>{label}</strong>
              <p>{detail}</p>
            </div>
          ))}
        </div>
        <div className={styles.timelineAnswer}>
          짧은 Access Token으로 탈취 피해 시간을 줄이고 · 긴 Refresh Token은
          DB에서 해시·회전·폐기 이력을 관리합니다 · 비밀번호 변경 시 모든
          Refresh 세션도 함께 폐기합니다
        </div>
      </div>
    ),
  },
  {
    id: 'api',
    eyebrow: '05 · DATA / API',
    title: 'API 요청은 한 경로로 모은다',
    content: (
      <div className={styles.apiBoard}>
        <div className={styles.apiSimpleFlow} aria-label="API 요청 처리 흐름">
          {[
            [
              '01',
              '화면에서 시작',
              '게시글 목록을 열거나 댓글 등록 버튼을 누르면 필요한 기능 함수를 호출',
              '목록 조회 · 댓글 등록',
            ],
            [
              '02',
              '기능 이름으로 요청',
              '화면은 서버 주소를 직접 만들지 않고 게시글·인증·관람 함수만 사용',
              'getPosts() · createComment()',
            ],
            [
              '03',
              '요청 준비를 한곳에서',
              '서버 주소 결합 · JSON 변환 · 로그인 쿠키 첨부 · 실패 응답 변환',
              'src/lib/api.ts · request<T>()',
            ],
            [
              '04',
              '서버 처리 후 응답',
              '로그인과 입력값 검증 → DB 조회·변경 → 화면에 JSON 결과 반환',
              'Express → Repository → MySQL',
            ],
          ].map(([number, label, detail, code], index) => (
            <div className={styles.apiSimpleItem} key={number}>
              <div className={styles.apiSimpleNode}>
                <span>{number}</span>
                <strong>{label}</strong>
                <p>{detail}</p>
                <code>{code}</code>
              </div>
              {index < 3 ? <i aria-hidden="true">→</i> : null}
            </div>
          ))}
        </div>

        <div className={styles.apiAnswerGrid}>
          {[
            ['호출 방식', '브라우저 fetch', '공통 request 함수로 감싸서 사용'],
            [
              '관리 위치',
              '기능별 API 파일',
              'post-api · auth-api · attendance-api',
            ],
            [
              '공통 처리',
              'src/lib/api.ts',
              '주소 · JSON · 쿠키 · ApiError 처리',
            ],
            ['토큰 전달', 'HttpOnly 쿠키', '브라우저가 요청마다 자동 첨부'],
          ].map(([question, answer, detail]) => (
            <div key={question}>
              <span>{question}</span>
              <strong>{answer}</strong>
              <p>{detail}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'state',
    eyebrow: '06 · DATA / STATE',
    title: '상태관리 역할 분리',
    content: (
      <div className={styles.stateBands}>
        <div>
          <span className={styles.stateIndex}>SERVER STATE</span>
          <strong>TanStack Query</strong>
          <p>
            서버에서 받아오는 데이터 — 사용자, 팀, 경기, 게시글, 댓글, 팬. 언제
            다시 불러올지와 캐시를 라이브러리에 맡깁니다
          </p>
        </div>
        <div>
          <span className={styles.stateIndex}>GLOBAL CLIENT STATE</span>
          <strong>Zustand</strong>
          <p>
            여러 화면이 함께 보는 클라이언트 값 — 로그인 사용자, 세션 확인 여부,
            캘린더의 보기 방식과 필터
          </p>
        </div>
        <div>
          <span className={styles.stateIndex}>LOCAL UI STATE</span>
          <strong>React state</strong>
          <p>
            그 화면에서만 쓰는 값 — 페이지 번호, 폼 입력, 팝업 열림, 이미지
            미리보기
          </p>
        </div>
        <p className={styles.stateReason}>
          서버 데이터는 캐시에, 화면이 공유할 값만 전역 Store에 — 서버 데이터를
          Store에 다시 담지 않아 둘이 어긋날 지점 자체를 없앱니다
        </p>
      </div>
    ),
  },
  {
    id: 'error-handling',
    eyebrow: '07 · DATA / ERROR',
    title: '실패 응답을 ApiError로 통일한다',
    content: (
      <div className={styles.errorSimple}>
        <div
          className={styles.errorSimpleFlow}
          aria-label="공통 에러 처리 흐름"
        >
          {[
            [
              '01 · SERVER',
              '서버 실패 응답',
              'HTTP 403',
              '{ code: “EMAIL_NOT_VERIFIED”, message: “이메일 인증이 필요합니다.” }',
            ],
            [
              '02 · REQUEST',
              '공통 함수가 변환',
              '!response.ok → throw ApiError',
              'status · code · message를 하나의 오류 객체에 그대로 담습니다',
            ],
            [
              '03 · SCREEN',
              '화면에서 사용',
              'catch (error)',
              'code로 다음 행동을 정하고 message를 사용자에게 표시합니다',
            ],
          ].map(([eyebrow, title, code, detail], index) => (
            <div className={styles.errorSimpleItem} key={eyebrow}>
              <div className={styles.errorSimpleNode}>
                <span>{eyebrow}</span>
                <strong>{title}</strong>
                <code>{code}</code>
                <p>{detail}</p>
              </div>
              {index < 2 ? <i aria-hidden="true">→</i> : null}
            </div>
          ))}
        </div>

        <div className={styles.errorWhy}>
          <span>WHY APIERROR?</span>
          <strong>fetch는 400·500 응답을 자동으로 오류로 던지지 않음</strong>
          <p>
            공통 함수에서 한 번 변환하면 각 화면이 response.ok 확인과 오류 JSON
            해석을 반복하지 않고 같은 방식으로 처리할 수 있습니다.
          </p>
        </div>

        <section className={styles.errorOutcome}>
          <header>
            <span>변환 후 화면이 받는 값</span>
            <strong>ApiError</strong>
          </header>
          <div className={styles.errorResultGrid}>
            {[
              ['status', '403', '요청 실패 종류 확인'],
              ['code', 'EMAIL_NOT_VERIFIED', '이메일 인증 화면으로 이동'],
              [
                'message',
                '이메일 인증이 필요합니다.',
                '사용자 안내로 바로 표시',
              ],
            ].map(([field, value, action]) => (
              <div key={field}>
                <code>{field}</code>
                <strong>{value}</strong>
                <p>{action}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    ),
  },
  {
    id: 'database',
    eyebrow: '08 · DATABASE',
    title: '관계는 소유자와 개수를 기준으로 설계했다',
    content: (
      <div className={styles.dbSimple}>
        <div
          className={styles.dbRelationBoard}
          aria-label="핵심 데이터베이스 관계도"
        >
          <div className={styles.dbRelationRow}>
            <span>팬 라운지</span>
            <div className={styles.dbRelationNode}>
              <strong>사용자</strong>
              <small>users</small>
              <div className={styles.dbNodeKeys}>
                <span data-key="primary">
                  <b>기본키</b>
                  <code>users.id</code>
                </span>
                <span data-key="candidate">
                  <b>후보키</b>
                  <code>users.email · users.nickname</code>
                </span>
              </div>
            </div>
            <b>1 : N</b>
            <div
              className={`${styles.dbRelationNode} ${styles.dbRelationAccent}`}
            >
              <strong>게시글</strong>
              <small>posts</small>
              <div className={styles.dbNodeKeys}>
                <span data-key="primary">
                  <b>기본키</b>
                  <code>posts.id</code>
                </span>
                <span data-key="foreign">
                  <b>외래키</b>
                  <code>posts.user_id → users.id</code>
                </span>
              </div>
            </div>
            <b>1 : N</b>
            <div className={styles.dbRelationNode}>
              <strong>댓글</strong>
              <small>comments</small>
              <div className={styles.dbNodeKeys}>
                <span data-key="primary">
                  <b>기본키</b>
                  <code>comments.id</code>
                </span>
                <span data-key="foreign">
                  <b>외래키</b>
                  <code>post_id → posts.id · user_id → users.id</code>
                </span>
              </div>
            </div>
          </div>

          <div className={styles.dbRelationRow}>
            <span>직관 기록</span>
            <div className={styles.dbRelationNode}>
              <strong>사용자</strong>
              <small>users</small>
              <div className={styles.dbNodeKeys}>
                <span data-key="primary">
                  <b>기본키</b>
                  <code>users.id</code>
                </span>
                <span data-key="candidate">
                  <b>후보키</b>
                  <code>users.email · users.nickname</code>
                </span>
              </div>
            </div>
            <b>1 : N</b>
            <div
              className={`${styles.dbRelationNode} ${styles.dbRelationAccent}`}
            >
              <strong>직관 기록</strong>
              <small>attendance_records</small>
              <div className={styles.dbNodeKeys}>
                <span data-key="primary">
                  <b>기본키</b>
                  <code>attendance_records.id</code>
                </span>
                <span data-key="foreign">
                  <b>외래키</b>
                  <code>user_id → users.id · game_id → games.id</code>
                </span>
              </div>
            </div>
            <b>N : 1</b>
            <div className={styles.dbRelationNode}>
              <strong>경기</strong>
              <small>games</small>
              <div className={styles.dbNodeKeys}>
                <span data-key="primary">
                  <b>기본키</b>
                  <code>games.id</code>
                </span>
              </div>
            </div>
          </div>

          <div className={styles.dbRelationRow}>
            <span>동행 연결</span>
            <div className={styles.dbRelationNode}>
              <strong>직관 기록</strong>
              <small>attendance_records</small>
              <div className={styles.dbNodeKeys}>
                <span data-key="primary">
                  <b>기본키</b>
                  <code>attendance_records.id</code>
                </span>
              </div>
            </div>
            <b>1 : N</b>
            <div
              className={`${styles.dbRelationNode} ${styles.dbRelationAccent}`}
            >
              <strong>동행자 연결</strong>
              <small>attendance_companions</small>
              <div className={styles.dbNodeKeys}>
                <span data-key="primary">
                  <b>기본키</b>
                  <code>attendance_companions.id</code>
                </span>
                <span data-key="foreign">
                  <b>외래키</b>
                  <code>attendance_record_id → attendance_records.id</code>
                </span>
                <span data-key="foreign">
                  <b>외래키</b>
                  <code>user_id → users.id</code>
                </span>
                <span className={styles.dbNodeState}>
                  <b>응답</b>
                  <code>대기 · 수락 · 거절</code>
                </span>
              </div>
            </div>
            <b>N : 1</b>
            <div className={styles.dbRelationNode}>
              <strong>동행자</strong>
              <small>users</small>
              <div className={styles.dbNodeKeys}>
                <span data-key="primary">
                  <b>기본키</b>
                  <code>users.id</code>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'board',
    eyebrow: '09 · BOARD & PAGING',
    title: '게시판·댓글 권한과 페이징',
    content: (
      <div className={styles.boardVisual}>
        <section className={styles.boardPanel}>
          <header>
            <ListChecks aria-hidden="true" />
            <div>
              <span>ACCESS CONTROL</span>
              <strong>작성자 기준 권한 확인</strong>
            </div>
          </header>
          <div
            className={styles.permissionFlow}
            aria-label="게시글 권한 확인 흐름"
          >
            <div>
              <small>요청</small>
              <strong>수정 · 삭제</strong>
            </div>
            <i>→</i>
            <div>
              <small>API 서버</small>
              <strong>로그인 ID = 작성자 ID</strong>
            </div>
            <i>→</i>
            <div>
              <small>결과</small>
              <strong>일치하면 허용</strong>
              <span>다르면 403 거부</span>
            </div>
          </div>
          <div className={styles.boardRules}>
            {[
              ['작성', '로그인한 사용자'],
              ['수정 · 삭제', '본인 게시글·댓글'],
              ['관리자', '별도 관리자 API'],
            ].map(([label, detail]) => (
              <div key={label}>
                <Check aria-hidden="true" />
                <strong>{label}</strong>
                <span>{detail}</span>
              </div>
            ))}
          </div>
          <footer>
            화면에서 버튼을 숨겨도 API 서버에서 작성자 여부를 다시 확인
          </footer>
        </section>

        <section className={styles.boardPanel}>
          <header>
            <Sparkles aria-hidden="true" />
            <div>
              <span>PAGED LIST</span>
              <strong>필요한 구간만 목록 조회</strong>
            </div>
          </header>
          <div
            className={styles.pagingFlow}
            aria-label="게시글 3페이지 조회 예시"
          >
            <div>
              <small>화면 요청</small>
              <code>page 3 · size 10</code>
            </div>
            <i>→</i>
            <div>
              <small>DB 조회</small>
              <code>LIMIT 10 · OFFSET 20</code>
            </div>
            <i>→</i>
            <div>
              <small>API 응답</small>
              <code>목록 10개 · 전체 개수</code>
            </div>
          </div>
          <div className={styles.pagingResponse}>
            <span>items</span>
            <strong>게시글 10개</strong>
            <span>total</span>
            <strong>전체 게시글 수</strong>
            <span>totalPages</span>
            <strong>화면에 그릴 페이지 수</strong>
          </div>
          <div className={styles.boardRules}>
            {[
              ['검색', '제목·내용 키워드'],
              ['필터', '카테고리·조회 범위'],
              ['상한', '요청당 최대 개수 제한'],
            ].map(([label, detail]) => (
              <div key={label}>
                <Check aria-hidden="true" />
                <strong>{label}</strong>
                <span>{detail}</span>
              </div>
            ))}
          </div>
          <footer>
            팬 라운지 목록은 한 번에 10개씩 받고 화면에서 페이지 구성
          </footer>
        </section>
      </div>
    ),
  },
  {
    id: 'deployment',
    eyebrow: '10 · DEPLOYMENT',
    title: '자동 배포',
    content: (
      <div className={styles.deployLayout}>
        <div className={styles.deployRail}>
          {[
            [GitBranch, 'GitHub push', 'main 브랜치에 반영되면 시작'],
            [Boxes, 'GitHub Actions 빌드', 'Web·API Docker 이미지 생성'],
            [
              Cloud,
              '이미지 저장소',
              'GHCR(GitHub Container Registry)에 Web·API Docker 이미지 보관',
            ],
            [
              Workflow,
              '서버 배포',
              'GCP VM이 새 이미지를 내려받아 기존 컨테이너 교체',
            ],
            [ShieldCheck, '배포 확인', '서비스가 실제 응답하는지 반복 확인'],
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
        <div className={styles.deployContainers}>
          <header>
            <div>
              <span>RUNNING CONTAINERS</span>
              <small>서버 안에서 역할별로 분리해 실행</small>
            </div>
            <strong>5개</strong>
          </header>
          {[
            ['caddy', '외부 요청을 HTTPS로 안전하게 받고 gateway로 전달'],
            ['gateway', '주소에 따라 Web·API로 나누고 과도한 요청을 제한'],
            ['web', '브라우저에 캘린더·팬 라운지 등 화면을 제공'],
            ['api', '로그인·게시글·직관 기록을 처리하고 DB와 연결'],
            ['mysql', '회원·선수·경기·게시글 등 서비스 데이터를 저장'],
          ].map(([name, role]) => (
            <div key={name}>
              <code>{name}</code>
              <span>{role}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'limits-ops',
    eyebrow: '11 · LIMITATIONS / OPS',
    title: '운영 구조에서 남은 과제',
    content: (
      <div className={styles.opsLimits}>
        <section className={styles.opsLimitCard}>
          <header>
            <span>DEPLOY</span>
            <strong>한 대의 서버에서 교체</strong>
          </header>
          <div
            className={styles.deployLimitDiagram}
            aria-label="현재 배포 흐름"
          >
            <span>사용자</span>
            <i>→</i>
            <span>GCP VM 1대</span>
            <i>↻</i>
            <span>Web · API 교체</span>
          </div>
          <p>
            현재는 한 서버 안에서 실행 중인 Web·API를 새 버전으로 바로
            교체합니다. 교체 순간에는 짧은 중단이 생길 수 있고, 실패해도 이전
            버전으로 자동 복귀하지 않습니다.
          </p>
          <footer>
            <ArrowRight aria-hidden="true" />
            <div>
              <b>개선 방안</b>
              <span>
                새 버전을 옆에 먼저 실행 → 정상 응답 확인 → 사용자 연결 전환 ·
                실패하면 기존 버전 유지
              </span>
            </div>
          </footer>
        </section>

        <section className={styles.opsLimitCard}>
          <header>
            <span>RATE LIMIT</span>
            <strong>서버가 늘어나면 요청 횟수가 나뉨</strong>
          </header>
          <div
            className={styles.memoryLimitDiagram}
            aria-label="메모리 기반 요청 제한"
          >
            <div>
              <small>현재 · API 서버 1대</small>
              <code>사용자 A · 요청 10회</code>
            </div>
            <span>서버 A에는 6회</span>
            <span>서버 B에는 4회</span>
          </div>
          <p>
            지금은 API 서버가 1대라 정확합니다. 서버가 여러 대가 되면 같은
            사용자의 요청 기록이 서버마다 따로 저장되어 실제 총 10회를 6회와
            4회로 나누어 인식할 수 있습니다.
          </p>
          <footer>
            <ArrowRight aria-hidden="true" />
            <div>
              <b>개선 방안</b>
              <span>
                모든 API 서버가 함께 보는 공용 저장소 Redis에 사용자 A의 총
                10회를 기록 → 어느 서버가 요청을 받아도 같은 횟수 확인
              </span>
            </div>
          </footer>
        </section>
      </div>
    ),
  },
  {
    id: 'limits-data',
    eyebrow: '12 · LIMITATIONS / QUALITY',
    title: '품질과 데이터 조회에서 남은 과제',
    content: (
      <div className={styles.dataLimits}>
        <section className={styles.dataLimitCard}>
          <header>
            <span>CI GATE</span>
            <strong>배포 전 자동 검사 부족</strong>
            <b>현재 BUILD → DEPLOY</b>
          </header>
          <div
            className={styles.ciLimitDiagram}
            aria-label="현재 자동 배포 검사 단계"
          >
            <span>push</span>
            <i>→</i>
            <span>Docker build</span>
            <i>→</i>
            <span>deploy</span>
            <b>lint · test 단계 없음</b>
          </div>
          <p>
            현재는 Docker 이미지가 만들어지면 바로 배포됩니다. 코드 검사나 주요
            기능 테스트의 통과 여부를 배포 조건으로 확인하는 단계가 없습니다.
          </p>
          <footer>
            <ArrowRight aria-hidden="true" />
            <div>
              <b>개선 방안</b>
              <span>
                push → 코드 검사 → 로그인·게시글 테스트 → 모두 통과한 경우에만
                이미지 생성·배포
              </span>
            </div>
          </footer>
        </section>

        <section className={styles.dataLimitCard}>
          <header>
            <span>OFFSET PAGING</span>
            <strong>뒤 페이지일수록 확인할 데이터 증가</strong>
            <b>/posts 10개 · /fans 18명</b>
          </header>
          <div
            className={styles.offsetLimitDiagram}
            aria-label="OFFSET 증가 예시"
          >
            {[
              ['1페이지', 'OFFSET 0', '10개 반환'],
              ['10페이지', 'OFFSET 90', '앞의 90개 통과 후 10개'],
              ['100페이지', 'OFFSET 990', '앞의 990개 통과 후 10개'],
            ].map(([page, offset, result]) => (
              <div key={page}>
                <span>{page}</span>
                <code>{offset}</code>
                <p>{result}</p>
              </div>
            ))}
          </div>
          <p>
            팬 라운지는 한 번에 10개, 팬 찾기는 18명씩 받습니다. 페이지 번호가
            커질수록 MySQL이 앞의 데이터를 더 많이 확인하고 건너뛴 뒤 필요한
            결과만 반환합니다.
          </p>
          <footer>
            <ArrowRight aria-hidden="true" />
            <div>
              <b>개선 방안</b>
              <span>
                “마지막으로 본 게시글의 작성 시각·ID 이후 10개” 요청 → 앞의
                990개를 다시 건너뛰지 않고 다음 결과부터 조회
              </span>
            </div>
          </footer>
        </section>
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
      window.history.replaceState(null, '', `#${slides[boundedIndex].id}`);
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
    const requestedSlide = window.location.hash.slice(1);
    const requestedIndex = slides.findIndex(
      (slide) => slide.id === requestedSlide,
    );

    if (requestedIndex >= 0) {
      setSlideIndex(requestedIndex);
    }

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
    event.preventDefault();
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
