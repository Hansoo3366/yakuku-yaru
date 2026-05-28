# Design System

Yakuku Yaru는 Tailwind CSS와 shadcn/ui를 사용하지 않고, 서비스에 맞춘 커스텀 CSS와 자체 컴포넌트로 디자인합니다.

## Design Direction

현재 디자인 방향은 **Modern Sports Utility**입니다.

야구장 감성은 로고, 팀 컬러, 스코어보드, 티켓 정보에서 은근하게 드러내고, 실제 화면은 매일 쓰기 좋은 스포츠 기록 앱처럼 정돈합니다. 장식적인 팬시함보다 정보의 위계, 모바일 사용성, 반복 사용의 편안함을 우선합니다.

핵심 키워드:

- Clean KBO companion app
- Scoreboard clarity
- Ticket-like details
- Team-color accent
- Compact sports dashboard

## Principles

- 캘린더, 게시판, 관리자 화면은 정보 밀도가 높으므로 과한 히어로/장식 구성을 피합니다.
- 팀 컬러는 전체 화면을 물들이지 않고, 활성 상태와 핵심 액션의 accent로 씁니다.
- 넓은 면적은 밝은 neutral surface를 사용하고, 대비가 필요한 곳만 짙은 navy를 씁니다.
- 카드 반경은 8px 이하로 유지합니다.
- 텍스트는 좁은 카드 안에서 잘리지 않도록 크기와 줄 수를 안정적으로 제한합니다.
- letter spacing은 기본값 0을 사용합니다.

## Color Palette

### Core

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-ink` | `#161A1D` | Main text |
| `--color-night-navy` | `#172033` | Header, strong text, scoreboard |
| `--color-night-navy-soft` | `#24304A` | Hover, dark panel secondary |
| `--color-paper` | `#F6F7F4` | Page background |
| `--color-paper-deep` | `#ECEFE8` | Subtle blocks, inactive controls |
| `--color-white` | `#FFFFFF` | Main surface |
| `--color-line` | `#DCE1D8` | Border |
| `--color-line-strong` | `#BFC7BA` | Strong border |
| `--color-muted` | `#687266` | Secondary text |

### Brand and Team

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-field-700` | `#176B4D` | Default primary accent |
| `--color-field-800` | `#0D4A36` | Primary hover |
| `--color-field-100` | `#E5F1EA` | Soft selected state |
| `--team-color` | dynamic | User favorite team accent |
| `--team-color-soft` | dynamic | Soft team tint |

### Status

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-win` | `#C83B32` | Win |
| `--color-lose` | `#2F64A7` | Lose |
| `--color-draw` | `#747B83` | Draw |
| `--color-cancelled` | `#8A8F98` | Cancelled |
| `--color-ticket-gold` | `#C99433` | Ticket/time highlight |

## Team Color Policy

팀 컬러는 다음 요소에만 사용합니다.

- Primary button
- Active navigation item
- Selected filter pill
- Team badge and small highlight
- Calendar today/focused state
- Compact tint background where context is needed

사용하지 않는 곳:

- 전체 page background
- 대형 카드 전체 배경 반복
- 긴 문단/게시판 리스트 배경
- 통계 카드마다 무작위 파스텔 컬러

## Typography

- 기본 폰트는 Pretendard를 사용합니다.
- fallback은 `Apple SD Gothic Neo`, `Noto Sans KR`, `Arial` 순서를 사용합니다.
- 숫자와 스코어는 굵게, 설명 텍스트는 작고 차분하게 둡니다.
- 내부 화면에서 hero-scale type을 남발하지 않습니다.

권장 크기:

| Role | Size |
| --- | --- |
| Page title | 26-32px |
| Section title | 18-20px |
| Body | 15-16px |
| Caption | 12-13px |
| Compact meta | 11-12px |
| Score | 28-44px |

## Layout

- 모바일 우선으로 설계합니다.
- 주요 화면은 최대 폭을 두고, 캘린더와 관리자 화면은 더 넓은 폭을 허용합니다.
- 섹션은 카드 중첩 없이 full-width flow로 배치합니다.
- 반복 아이템만 카드화합니다.
- 하단 내비게이션은 홈, 캘린더, 게시판, 마이페이지를 기본 탭으로 둡니다.

## Components

### Buttons

- Primary: 저장, 로그인, 작성 완료
- Secondary: 기간 이동, 보조 실행
- Ghost: 취소, 뒤로, 덜 중요한 이동
- Icon button: 수정, 삭제, 월 이동, 사진 삭제

버튼은 최소 높이 44px 이상을 기본으로 하고, 반복 액션은 아이콘 버튼을 우선 사용합니다.

### Calendar

- 경기 카드는 시간, 매치업, 스코어, 선발 투수를 세로 흐름으로 표시합니다.
- 팀 이름과 스코어가 반복되지 않게 점수 표기는 compact하게 유지합니다.
- PC/tablet 필터 영역은 sticky로 유지하고, 모바일은 하단 dock을 사용합니다.
- 오늘 날짜와 focus 날짜는 명확한 outline으로 표시합니다.
- 직관 사진은 정보 가독성을 해치지 않는 작은 preview로 노출합니다.
- 취소 경기는 우천/황사/그라운드/폭염/한파/기타 사유별 아이콘과 텍스트를 함께 표시합니다.

### Game Detail

- 상단은 스코어보드 느낌의 dark match panel로 구성합니다.
- 선발 투수는 비교 카드로 보여주고, ERA/WHIP/WAR/QS를 같은 규칙으로 정렬합니다.
- 라인업은 번호, 선수 사진, 포지션, WAR 순서로 빠르게 훑을 수 있게 합니다.

### Board

- 게시글 리스트는 compact row로 표시합니다.
- 제목, 작성자, 댓글 수, 게시 날짜가 한눈에 보여야 합니다.
- 프로필 이미지는 작은 원형으로 통일합니다.
- 댓글 입력은 댓글 목록 아래에 둡니다.

### My Page

- 마이페이지는 기록 대시보드처럼 보이게 합니다.
- 승률은 크게, 보조 통계는 compact card로 정리합니다.
- 통계 카드는 왼쪽 라인이나 과한 파스텔 대신 차분한 배경색으로 구분합니다.

### Forms

- 라벨은 항상 표시합니다.
- 에러 메시지는 필드 아래에 표시합니다.
- 파일 업로드는 업로드 전/후 미리보기를 제공합니다.
- 직관 기록의 스코어는 수동 입력하지 않고 공식 스코어를 안내합니다.
- 내 팀 경기가 아닌 경우에만 응원 팀 선택을 노출합니다.

## CSS Strategy

- Tailwind CSS를 사용하지 않습니다.
- shadcn/ui를 사용하지 않습니다.
- 전역 CSS와 명확한 class naming을 사용합니다.
- 디자인 토큰은 CSS custom properties로 관리합니다.
- 공통 컴포넌트는 `apps/web/src/components`에 직접 작성합니다.

## Accessibility

- 버튼과 링크의 focus-visible 상태를 명확히 표시합니다.
- 색상만으로 승/패/무를 구분하지 않고 텍스트를 함께 표시합니다.
- 터치 대상은 최소 44px를 유지합니다.
- 이미지 업로드 미리보기에는 의미 있는 대체 텍스트를 제공합니다.
- 아이콘 버튼에는 접근 가능한 label을 제공합니다.
