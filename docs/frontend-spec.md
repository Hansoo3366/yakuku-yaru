# Frontend Spec

## Framework

- Next.js App Router
- TypeScript
- PWA 설정
- Tailwind CSS 미사용
- shadcn/ui 미사용
- 커스텀 CSS와 자체 컴포넌트 사용

## Main Routes

| Route | Description | Auth |
| --- | --- | --- |
| `/` | 홈, 다가오는 경기, 요약 정보 | optional |
| `/login` | 로그인 | public |
| `/register` | 회원가입, 내 팀 선택, 이메일 인증 | public |
| `/verify-email` | 이메일 인증 | public |
| `/forgot-password` | 비밀번호 재설정 요청 | public |
| `/reset-password` | 비밀번호 재설정 | public |
| `/calendar` | 경기 캘린더와 기록 필터 | required |
| `/games/[gameId]` | 경기 상세, 선발 투수, 라인업, 알림, 구장 정보 | optional |
| `/attendance/new` | 직관/집관 기록 작성 | required |
| `/attendance/[recordId]/edit` | 직관/집관 기록 수정 | required |
| `/posts` | 게시판 목록 | public |
| `/posts/new` | 게시글 작성 | required |
| `/posts/[postId]` | 게시글 상세 및 댓글 | public |
| `/posts/[postId]/edit` | 게시글 수정 | required |
| `/me` | 마이페이지, 내 팀, 프로필, 승률, 알림 | required |
| `/admin` | 관리자 대시보드 | admin |
| `/offline` | PWA 오프라인 fallback | public |

## State Management

현재 구현은 외부 상태 관리 라이브러리 없이 React state, effect, localStorage, 공통 API client를 사용합니다.

### Server State

- 사용자 정보
- 팀 목록
- 경기 일정/상세
- 직관/집관 기록
- 동행자 상태와 알림
- 게시글/댓글
- 관리자 데이터

### Client State

- 로그인 토큰
- 현재 선택한 캘린더 월
- 캘린더 필터
- 업로드 미리보기 이미지
- 폼 입력 상태
- 모바일 알림 팝업/필터 dock 상태

## API Client

공통 API 요청 함수의 책임:

- `NEXT_PUBLIC_API_URL` 관리
- JSON 요청/응답 처리
- JWT Authorization 헤더 주입
- 공통 에러 포맷 변환
- 401 발생 시 토큰 제거와 로그인 유도

## Key Screens

### Global Navigation

- GNB에 홈, 캘린더, 게시판, 마이페이지, 관리자 링크를 배치한다.
- 로그인 사용자 닉네임과 프로필 이미지를 표시한다.
- 로그아웃과 마이페이지 접근을 명확히 제공한다.
- 모바일에서는 하단 내비게이션으로 주요 탭을 빠르게 접근한다.

### Calendar

- 월간 캘린더
- 내 팀/전체 경기 필터
- 직관/집관 기록 필터
- 기록 있는 날짜만 보기 필터
- PC/tablet sticky 필터 영역
- PC/tablet와 모바일 모두 `오늘` 이동 제공
- 경기 카드에 시간, 팀, 스코어, 취소 사유, 선발 투수 표시
- 팀명이 중복되어 보이지 않도록 스코어는 간결하게 표시
- 직관 기록 사진 썸네일과 동행 배지 표시

### Game Detail

- 경기 일시, 구장, 홈/원정 팀, 스코어, 상태 표시
- 취소 사유별 아이콘 표시
- 예매처 링크와 예매 오픈 시간
- 경기 알림 설정/해제
- 직관/집관 기록 작성 또는 티켓 형태의 기존 기록 보기
- 선발 투수 프로필 이미지, ERA, WHIP, WAR, QS, 경기 수 표시
- 양 팀 라인업, 타순, 포지션, 선수 프로필, WAR 표시
- 구장별 맛집/주차 정보와 개인 메모

### Attendance Form

- 관람 유형 선택: 직관/집관
- 내 팀 경기는 응원 팀 선택을 생략
- 내 팀 경기가 아닌 경우에만 응원 팀 선택
- 사진 업로드와 미리보기
- 업로드된 기존 사진 미리보기
- 메모 입력
- 공식 스코어와 결과 안내
- 같이 간 회원 검색 및 동행자 선택
- 동행자별 응답 상태 표시

### My Page

- 프로필 이미지와 닉네임 표시/수정
- 내 팀 변경
- 팀 로고와 팀 컬러 표시
- 전체/직관/집관 통계
- 승/패/무, 승률, `승리요정` 타이틀
- 동행 태그 수락/거절 알림
- 댓글 알림 등 앱 내부 알림

### Board

- 게시글 목록은 컴팩트한 리스트 형태
- 제목, 작성자, 댓글 수, 게시 날짜 표시
- 작성자와 댓글 작성자 프로필 이미지 표시
- 게시글 작성/수정/삭제
- 댓글 목록 아래에 댓글 입력 영역 배치
- 댓글 작성 직후에도 정상 날짜 표시

### Admin

- 관리자 권한 사용자만 접근
- 사용자 검색, 역할 변경, 이메일 인증 상태 관리, 삭제
- 게시글/댓글 검색과 삭제
- 경기 생성/수정, KBO 데이터 확인
- 운영 요약 카드

## Error UX

- API 에러는 인라인 메시지 또는 토스트 성격의 알림으로 표시한다.
- 폼 검증 실패는 필드 아래 메시지로 표시한다.
- 이메일 인증 타이머는 서버가 내려준 남은 초 기준으로 표시한다.
- 인증 만료는 로그인 화면으로 이동하면서 안내한다.

## Mobile UX

- 하단 내비게이션 사용
- 주요 탭: 홈, 캘린더, 게시판, 마이페이지
- 버튼 터치 영역은 최소 44px 이상
- 사진 업로드는 모바일 카메라/앨범 선택 지원
- 알림 팝업은 화면 폭을 넘지 않게 배치

## Styling

- 디자인 기준은 [Design System](design-system.md)을 따른다.
- CSS custom properties로 색상 토큰과 팀 컬러를 관리한다.
- 공통 UI 컴포넌트는 직접 구현한다.
- 외부 UI kit에 의존하지 않는다.
