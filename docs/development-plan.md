# Development Plan

이 문서는 현재 구현 상태를 기준으로 한 개발 단계 요약입니다. 세부 체크리스트는 [Work Order](work-order.md)를 기준으로 합니다.

## Phase 0. Project Setup

- Next.js 앱 생성
- Express API 앱 생성
- MySQL Docker 설정
- ESLint/Prettier 설정
- 환경 변수 정리

상태: 완료

## Phase 1. Database and Auth

- MySQL 스키마 작성
- 팀 seed 데이터 작성
- 회원가입 API
- 이메일 중복 검사
- Gmail SMTP 이메일 인증
- 비밀번호 bcrypt 암호화
- 로그인 API
- JWT 인증 미들웨어
- 비밀번호 재설정
- Swagger 기본 설정

상태: 완료

## Phase 2. Required Board Features

- 게시글 작성/목록/상세/수정/삭제
- 댓글 작성/조회/삭제
- 게시글 검색과 페이징
- 작성자 권한 검증
- 댓글 알림
- 게시글/댓글 프로필 이미지 표시

상태: 완료

## Phase 3. Frontend Auth and Board

- 로그인/회원가입/이메일 인증 화면
- 로그인 상태 관리
- 인증 필요 페이지 보호
- GNB, Footer, 모바일 내비게이션
- 게시판 목록/상세/작성/수정 화면
- 댓글 UI
- API 에러 처리

상태: 완료

## Phase 4. Baseball Calendar

- 팀 목록 API
- 회원가입 시 내 팀 설정
- 마이페이지 내 팀 변경
- 팀 로고 및 팀 컬러 테마
- 경기 일정 조회 API
- 캘린더 UI
- 내 팀/전체 경기 필터
- 직관/집관/기록 있는 날 필터
- PC/tablet sticky 필터와 오늘 이동
- 모바일 필터 dock과 오늘 이동
- 경기 상세 UI
- 예매처, 예매 오픈 시간 표시

상태: 완료

## Phase 5. Attendance Records

- 직관/집관 기록 CRUD API
- 사진 업로드 API
- WebP 이미지 최적화
- 직관 기록 작성/수정 UI
- 캘린더 사진 썸네일 표시
- 공식 스코어 기준 승/패/무 계산
- 내 팀 외 경기 응원 팀 선택
- 직관/집관 분리 통계
- 마이페이지 통계 UI
- `승리요정` 타이틀 표시

상태: 완료

## Phase 6. Game Reminder and Stadium Guide

- 경기 알림 설정 저장 API
- 경기 알림 설정/해제 UI
- 구장별 맛집 메모 seed 데이터
- 구장별 주차 정보 seed 데이터
- 구장별 개인 메모
- 경기 상세 구장 정보 UI

상태: 완료

## Phase 7. Companion Tags and Notifications

- 회원 검색 API
- 동행자 태그 테이블
- 태그 알림 API
- 동행 태그 수락/거절 API
- 수락된 동행 기록만 캘린더 표시
- 호스트에게 응답 결과 알림
- 직관 기록 수정 화면 동행자 상태 표시
- 동행 직관의 캘린더 인사이트 반영

상태: 완료

## Phase 8. PWA and Deployment

- Manifest 설정
- 앱 아이콘과 favicon 설정
- Service worker 설정
- Offline fallback
- Docker Compose production 구성
- Google Cloud Compute Engine 배포
- Caddy HTTPS reverse proxy
- GitHub Actions SSH 자동 배포

상태: 완료

## Phase 9. KBO Data Sync

- KBO 일정/결과 동기화
- KBO 순위 동기화
- KBO 선수 DB 적재
- KBO 경기센터 선발 투수 동기화
- 선발 투수 스탯 동기화
- 라인업 동기화
- 취소 사유 세분화
- 서버 cron 운영 문서화

상태: 완료

## Phase 10. Admin and Security

- 관리자 권한 모델
- 관리자 페이지
- 사용자 검색/역할 변경/삭제
- 게시글/댓글 관리
- 경기 생성/수정 관리
- 업로드 형식/용량 제한
- WebP 변환
- 게시글/댓글 입력 정제
- 쓰기 API rate limit

상태: 대부분 완료

## Remaining Backlog

- 키플레이어 데이터 구조와 UI
- 관리자 API OpenAPI 상세 보강
- 구장별 맛집 지도 API 연동
- 주차장 세부 모델 고도화
- Object Storage 또는 NAS 저장소 분리
- 브라우저 푸시 알림
- 무중단 배포 구조

## Current Risks

- KBO 웹 페이지 구조가 바뀌면 파서 수정이 필요하다.
- 단일 VM과 로컬 업로드 volume 구조라 트래픽/저장소 확장에 한계가 있다.
- Gmail SMTP는 발송량과 별칭 정책 제한이 있다.
- 무료/저가 도메인과 단일 서버 운영은 보안/신뢰도 관리가 필요하다.

## Suggested Next Milestone

다음 마일스톤은 `운영 안정화와 데이터 품질 개선`입니다.

완료 기준:

- KBO sync cron이 운영 서버에서 안정적으로 돈다.
- 관리자 화면에서 주요 데이터 이상 여부를 확인할 수 있다.
- 업로드 저장소 사용량과 DB 백업 절차가 문서화된다.
- 키플레이어 또는 구장 지도 중 하나를 실제 사용자 가치가 있는 수준으로 확장한다.
