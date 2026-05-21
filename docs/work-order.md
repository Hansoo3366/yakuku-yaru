# Work Order

이 문서는 야크크 야르~ 섹시야구를 실제로 구현할 때의 추천 작업 순서입니다.

우선순위는 과제 필수 요구사항을 먼저 만족하고, 그 위에 야구 직관 앱 기능을 얹는 방식입니다.

## 0. Repository Setup

목표: 프로젝트 뼈대를 만든다.

작업:

- [x] 디자인 시스템 문서 작성
- [x] Git repository 초기화
- [x] Next.js 앱 생성
- [x] Express API 앱 생성
- [x] TypeScript 기본 설정
- [x] ESLint/Prettier 설정
- [x] `.env.example` 작성
- [x] 기본 README 실행 방법 업데이트

추천 완료 기준:

- [ ] `npm run dev` 또는 각 앱 dev 명령으로 프론트/백엔드가 실행된다.
- [ ] 브라우저에서 Next.js 첫 화면이 보인다.
- [x] API health check가 응답한다.

## 1. Docker and MySQL

목표: MySQL을 로컬에서 안정적으로 실행한다.

작업:

- [x] `docker-compose.yml` 작성
- [x] MySQL 컨테이너 설정
- [x] API 서버에서 MySQL 연결 확인
- [x] DB migration 또는 schema 초기화 방식 결정
- [x] `teams` seed 데이터 준비

추천 완료 기준:

- [x] `docker compose up -d`로 MySQL이 실행된다.
- [x] API 서버에서 DB 연결 성공 로그가 나온다.
- [x] 팀 목록 seed 데이터가 들어간다.

## 2. Backend Auth First

목표: 과제의 핵심인 로그인 흐름을 먼저 만든다.

작업:

- [x] `users` 테이블 생성
- [x] 회원가입 API
- [x] 이메일 중복 검사
- [x] bcrypt 비밀번호 암호화
- [x] 로그인 API
- [x] JWT 발급
- [x] 인증 미들웨어
- [x] `/auth/me` API
- [x] Swagger 기본 문서화

추천 완료 기준:

- [x] 회원가입 가능.
- [x] 로그인 시 JWT 발급.
- [x] JWT로 보호된 API 호출 가능.
- [x] Swagger에서 Auth API 확인 가능.

## 3. Frontend Auth

목표: 브라우저에서 로그인 상태를 유지한다.

작업:

- [x] 로그인 페이지
- [x] 회원가입 페이지
- [x] API client 작성
- [x] 로그인 토큰 저장 방식 결정
- [x] `/auth/me`로 로그인 상태 복원
- [x] 인증 필요 페이지 보호
- [x] 공통 에러 처리 기본 구조

추천 완료 기준:

- [ ] 브라우저에서 회원가입/로그인 가능
- [ ] 새로고침 후 로그인 상태가 유지된다.
- [ ] 비로그인 사용자가 보호 페이지 접근 시 로그인 화면으로 이동한다.

## 4. Required Board and Comments

목표: 과제 필수 CRUD를 먼저 끝낸다.

작업:

- [x] `posts` 테이블 생성
- [x] `comments` 테이블 생성
- [x] 게시글 작성/목록/상세/수정/삭제 API
- [x] 게시글 목록 페이징
- [x] 댓글 작성/조회/삭제 API
- [x] 작성자 권한 검증
- [x] 게시판 화면 구현
- [x] 댓글 UI 구현

추천 완료 기준:

- [x] 로그인 사용자가 글을 작성할 수 있다.
- [x] 본인 글만 수정/삭제할 수 있다.
- [x] 댓글 작성/조회/삭제가 가능하다.
- [x] 게시글 목록 페이징이 동작한다.

## 5. Baseball Domain Foundation

목표: 야구 앱의 기본 데이터 구조를 만든다.

작업:

- [x] `teams` 테이블 확정
- [x] `games` 테이블 생성
- [x] 경기 일정 seed 데이터 작성
- [x] 팀 목록 API
- [x] 내 팀 설정 API
- [x] 경기 일정 조회 API
- [x] 경기 상세 API

추천 완료 기준:

- [x] 사용자가 내 팀을 설정할 수 있다.
- [x] 내 팀 경기 일정만 조회할 수 있다.
- [x] 경기 상세에서 구장, 시간, 예매처, 예매 오픈 시간을 볼 수 있다.

## 6. Calendar UI

목표: 앱의 핵심 화면인 캘린더를 만든다.

작업:

- [x] 월간 캘린더 UI
- [x] 내 팀 경기 일정 표시
- [x] 경기 클릭 시 상세 이동
- [x] 모바일 하단 네비게이션 초안
- [x] 월 이동 기능

추천 완료 기준:

- [x] `/calendar`에서 월간 경기 일정이 보인다.
- [x] 내 팀을 바꾸면 캘린더 일정이 바뀐다.
- [x] 모바일 화면에서도 주요 흐름이 사용 가능하다.

## 7. Attendance Records and Photo Upload

목표: 직관 인증 기능을 구현한다.

작업:

- [x] `attendance_records` 테이블 생성
- [x] 직관 기록 작성/수정/삭제 API
- [x] 사진 업로드 API
- [x] 사진 저장 경로 정책 정리
- [x] 직관 기록 작성/수정 화면
- [x] 캘린더 사진 썸네일 표시

추천 완료 기준:

- [x] 경기별 직관 기록을 만들 수 있다.
- [x] 사진을 업로드할 수 있다.
- [x] 기록이 있는 날짜에 캘린더 썸네일이 보인다.
- [x] 사용자가 기록을 수정/삭제할 수 있다.

## 8. Score and Winning Fairy

목표: 앱의 재미 요소를 완성한다.

작업:

- [x] 경기 기본 스코어 표시
- [x] 직관 기록에서 스코어 수정 가능 처리
- [x] 승/패/무 계산
- [x] 내 직관 통계 API
- [x] 마이페이지 통계 UI
- [x] 승률 50% 이상 `승리요정` 타이틀 표시

추천 완료 기준:

- [x] 마이페이지에서 직관 횟수, 승/패/무, 승률이 보인다.
- [x] 승률이 50% 이상이면 `승리요정` 타이틀이 보인다.

## 9. PWA

목표: 모바일에서 앱처럼 설치할 수 있게 만든다.

작업:

- [x] manifest 설정
- [x] 앱 아이콘 추가
- [x] theme color 설정
- [x] standalone display 설정
- [x] service worker 설정
- [x] offline fallback 페이지

추천 완료 기준:

- [ ] 모바일 브라우저에서 홈 화면 추가가 가능하다.
- [ ] 홈 화면에서 실행했을 때 앱처럼 열린다.

## 10. Deployment and Submission

목표: 제출 가능한 상태로 정리한다.

작업:

- [x] Docker production 설정
- [ ] Cloud Server 배포
- [x] Swagger URL 확인
- [x] GitHub repository 정리
- [ ] GitHub Actions 자동 배포
- [x] README에 실행/검증 URL 정리
- [x] Docker 배포 문서 정리
- [x] 평가 대비 설명 문서 정리

추천 완료 기준:

- [x] 제출 가능한 GitHub Repository가 있다.
- [ ] 배포 URL이 있다.
- [x] Swagger API 문서 URL이 있다.

## Recommended First Sprint

첫 번째 스프린트는 여기까지만 목표로 잡는 것을 추천합니다.

1. Repository setup
2. Docker and MySQL
3. Backend auth
4. Frontend auth

이 네 가지가 끝나면 과제의 핵심 흐름인 `프론트엔드 -> 백엔드 -> DB -> 인증`이 한 번 연결됩니다. 이후 게시판과 야구 기능을 붙이는 일이 훨씬 쉬워집니다.
