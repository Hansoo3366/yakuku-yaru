# Frontend Spec

## Framework

- Next.js
- TypeScript
- PWA 설정
- Tailwind CSS 미사용
- shadcn/ui 미사용
- 커스텀 CSS와 자체 컴포넌트 사용

## Main Routes

| Route | Description | Auth |
| --- | --- | --- |
| `/` | 홈 또는 캘린더 | optional |
| `/login` | 로그인 | public |
| `/register` | 회원가입 | public |
| `/calendar` | 내 팀 경기 캘린더 | required |
| `/games/[gameId]` | 경기 상세 | required |
| `/attendance/[recordId]/edit` | 직관 기록 수정 | required |
| `/posts` | 게시판 목록 | public |
| `/posts/new` | 게시글 작성 | required |
| `/posts/[postId]` | 게시글 상세 및 댓글 | public |
| `/posts/[postId]/edit` | 게시글 수정 | required |
| `/me` | 마이페이지, 내 팀, 승률 | required |

## State Management

스터디 평가 질문에 답변하기 쉽게 상태 관리 대상을 명확히 분리합니다.

### Server State

API에서 가져오는 데이터입니다.

- 사용자 정보
- 팀 목록
- 경기 일정
- 직관 기록
- 게시글 목록
- 댓글 목록

권장: TanStack Query 또는 Next.js fetch 캐싱 정책

### Client State

브라우저 내 UI 상태입니다.

- 로그인 토큰
- 현재 선택한 캘린더 월
- 모달 열림 상태
- 업로드 미리보기 이미지
- 폼 입력 상태

권장: Zustand 또는 React Context

## API Client

공통 API 요청 함수를 둡니다.

Responsibilities:

- `baseUrl` 관리
- JSON 요청/응답 처리
- JWT Authorization 헤더 주입
- 공통 에러 포맷 변환
- 401 발생 시 로그인 페이지 이동 또는 토큰 제거

## Auth Handling

- 로그인 성공 시 access token 저장
- 새로고침 후 `/auth/me` 호출로 로그인 상태 복원
- 인증 필요 페이지는 route guard 또는 layout 단계에서 보호
- 토큰 만료 시 토큰 제거 후 로그인 페이지로 이동

## Key Screens

### Calendar

- 월간 캘린더
- 날짜별 경기 카드 표시
- 직관 기록이 있는 경기에는 사진 썸네일 표시
- 경기 클릭 시 경기 상세로 이동

### Game Detail

- 경기 일시, 구장, 홈/원정 팀 표시
- 스코어 표시
- 예매처 링크
- 예매 오픈 시간
- 직관 기록 작성 버튼
- 알림 설정 UI

### Attendance Form

- 사진 업로드
- 사진 미리보기
- 메모 입력
- 스코어 입력/수정
- 승/패/무 선택 또는 자동 계산

### My Page

- 내 팀 설정
- 직관 횟수
- 승/패/무
- 승률
- `승리요정` 타이틀

### Board

- 게시글 목록
- 페이지네이션
- 게시글 작성/수정/삭제
- 댓글 작성/조회/삭제

## Error UX

- API 에러는 공통 토스트 또는 인라인 메시지로 표시
- 폼 검증 실패는 필드 아래 메시지로 표시
- 인증 만료는 로그인 화면으로 이동하면서 안내

## Mobile UX

- 하단 네비게이션 사용을 고려한다.
- 주요 탭: 캘린더, 게시판, 마이페이지
- 버튼 터치 영역은 모바일에서 충분히 크게 둔다.
- 사진 업로드는 모바일 카메라/앨범 선택을 지원한다.

## Styling

- 디자인 기준은 [Design System](design-system.md)을 따른다.
- CSS custom properties로 색상 토큰을 관리한다.
- 공통 UI 컴포넌트는 직접 구현한다.
- 외부 UI kit에 의존하지 않는다.
