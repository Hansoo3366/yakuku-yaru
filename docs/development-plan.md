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
- 회원가입 시 내 팀 설정 API
- 마이페이지 내 팀 변경 API
- 팀 로고 및 팀 컬러 테마
- 경기 일정 seed 데이터
- 경기 일정 조회 API
- 캘린더 UI
- 내 팀/전체 경기 필터
- 경기 상세 UI
- 예매처, 예매 오픈 시간 표시

## Phase 5. Attendance Records

- 직관 기록 CRUD API
- 집관 기록 구분
- 사진 업로드 API
- 직관 기록 작성/수정 UI
- 캘린더 사진 썸네일 표시
- 기록 있는 날짜 필터
- 스코어 수정 가능 처리
- 승률 계산 API
- 직관/집관 분리 통계
- 마이페이지 통계 UI
- `승리요정` 타이틀 표시

## Phase 6. Game Reminder and Stadium Guide

- 경기 알림 설정 저장 API
- 경기 알림 설정/해제 UI
- 구장별 맛집 메모 seed 데이터
- 구장별 주차 정보 seed 데이터
- 경기 상세 구장 정보 UI

## Phase 7. PWA and Deployment

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
4. 알림/구장 정보 같은 확장 기능
5. 실제 경기 일정 동기화

## Planned Backlog

아래 단계는 이번 스터디 프로젝트에서 추가 개발할 예정이지만, 오늘 작업 범위에는 포함하지 않는다.

### Phase 8. Companion Tags and Notifications

- 회원 검색 API
- 직관 기록 동행자 태그 테이블 추가
- 태그 알림 API
- 태그 수락/거절 또는 자동 반영 정책 결정
- 내가 태그된 기록을 내 캘린더에 표시

### Phase 9. Real Schedule Sync

- KBO 일정 데이터 수집 방식 결정
- 수집 실패 시 재시도/로그 정책
- 외부 데이터 출처 변경에 대비한 fallback seed 유지
- 경기 결과 자동 갱신 정책

## Risks

- 이메일 인증은 SMTP 설정에서 시간이 걸릴 수 있다.
- 실제 경기 데이터 자동 연동은 안정적인 API 확보가 필요하다.
- 사진 업로드는 서버 저장소와 배포 환경 경로 처리가 필요하다.
- PWA 알림은 브라우저별 지원 차이가 있다.
- 회원 태그와 알림은 개인정보 노출과 승인 흐름을 신중히 설계해야 한다.
- 지도 API는 무료 사용량, 도메인 제한, 모바일 UX를 함께 검토해야 한다.
- KBO 공식 공개 API가 없으므로 일정 동기화는 크롤링 정책과 장애 대응이 필요하다.

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
