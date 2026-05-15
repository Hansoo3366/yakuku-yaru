# Development Plan

## Phase 0. Project Setup

- Next.js 앱 생성
- Express API 앱 생성
- MySQL Docker 설정
- ESLint/Prettier 설정
- 환경 변수 정리

## Phase 1. Database and Auth

- MySQL 스키마 작성
- 팀 seed 데이터 작성
- 회원가입 API
- 이메일 중복 검사
- 비밀번호 bcrypt 암호화
- 로그인 API
- JWT 인증 미들웨어
- `/auth/me` API
- Swagger 기본 설정

## Phase 2. Required Board Features

- 게시글 작성 API
- 게시글 목록 API
- 게시글 상세 API
- 게시글 수정/삭제 API
- 댓글 작성 API
- 댓글 조회 API
- 댓글 삭제 API
- 게시글 페이징
- 작성자 권한 검증

## Phase 3. Frontend Auth and Board

- 로그인 페이지
- 회원가입 페이지
- 로그인 상태 관리
- 인증 필요 페이지 보호
- 게시판 목록/상세/작성/수정 화면
- 댓글 UI
- API 에러 처리

## Phase 4. Baseball Calendar

- 팀 목록 API
- 내 팀 설정 API
- 경기 일정 seed 데이터
- 경기 일정 조회 API
- 캘린더 UI
- 경기 상세 UI
- 예매처, 예매 오픈 시간 표시

## Phase 5. Attendance Records

- 직관 기록 CRUD API
- 사진 업로드 API
- 직관 기록 작성/수정 UI
- 캘린더 사진 썸네일 표시
- 스코어 수정 가능 처리
- 승률 계산 API
- 마이페이지 통계 UI
- `승리요정` 타이틀 표시

## Phase 6. PWA and Deployment

- Manifest 설정
- 아이콘 추가
- Service worker 설정
- 모바일 홈 화면 설치 확인
- Docker Compose 정리
- Cloud Server 배포
- GitHub Actions 자동 배포

## Priority

1. 과제 필수 요구사항
2. 직관 기록 핵심 기능
3. PWA 설치 경험
4. 알림/자동 스코어 연동 같은 확장 기능

## Risks

- 이메일 인증은 SMTP 설정에서 시간이 걸릴 수 있다.
- 실제 경기 데이터 자동 연동은 안정적인 API 확보가 필요하다.
- 사진 업로드는 서버 저장소와 배포 환경 경로 처리가 필요하다.
- PWA 알림은 브라우저별 지원 차이가 있다.

## Suggested First Milestone

첫 번째 마일스톤은 `로그인 가능한 게시판`입니다.

완료 기준:

- 회원가입 가능
- 로그인 가능
- JWT로 보호된 API 호출 가능
- 게시글 작성/조회/수정/삭제 가능
- 댓글 작성/조회/삭제 가능
- 게시글 목록 페이징 가능
- Swagger에서 API 확인 가능
