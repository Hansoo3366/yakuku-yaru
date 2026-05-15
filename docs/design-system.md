# Design System

Yakuku Yaru는 Tailwind CSS와 shadcn/ui를 사용하지 않고, 서비스에 맞춘 커스텀 CSS와 자체 컴포넌트로 디자인합니다.

## Design Direction

한국 프로야구 직관 앱에 어울리도록 다음 분위기를 목표로 합니다.

- 야구장 잔디와 조명에서 오는 선명한 대비
- 티켓, 기록지, 전광판을 떠올리는 정돈된 정보 구조
- 팬 서비스답게 너무 딱딱하지 않지만, 경기 일정과 기록을 빠르게 확인할 수 있는 실용적인 UI
- 모바일에서 앱처럼 쓰기 좋은 하단 내비게이션과 큰 터치 영역

## Color Palette

한 팀의 색으로 치우치지 않도록 KBO 전체를 담을 수 있는 중립 기반 팔레트를 사용합니다. 메인 컬러는 야구장 잔디에서 가져온 그린, 강조 컬러는 야간 경기 전광판과 응원 도구에 어울리는 레드/골드 계열을 사용합니다.

### Primary

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-field-700` | `#0F6B4F` | Primary button, active navigation |
| `--color-field-800` | `#0A4A3A` | Header, pressed state |
| `--color-field-100` | `#E4F3EC` | Selected calendar day background |

### Accent

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-score-red` | `#D63B2A` | Win badge, important score |
| `--color-ticket-gold` | `#D9A441` | Ticket/open time emphasis |
| `--color-night-navy` | `#14213D` | Dark text, night game accent |

### Neutral

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-paper` | `#FBFAF6` | Page background |
| `--color-white` | `#FFFFFF` | Surface |
| `--color-line` | `#D8DED8` | Border |
| `--color-ink` | `#18201C` | Main text |
| `--color-muted` | `#66736D` | Secondary text |

### Status

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-win` | `#D63B2A` | Win |
| `--color-lose` | `#3662B8` | Lose |
| `--color-draw` | `#737373` | Draw |
| `--color-scheduled` | `#0F6B4F` | Scheduled game |

## Team Colors

팀별 색상은 보조 정보로만 사용합니다. 앱 전체 테마를 팀 색상으로 바꾸지 않고, 경기 카드의 작은 라벨, 팀 배지, 상대팀 표시 정도에 제한해서 사용합니다.

초기 팀 컬러는 seed 데이터에 넣되, UI 기본 팔레트는 위의 공통 팔레트를 유지합니다.

## Typography

- 기본 폰트는 시스템 산세리프를 사용합니다.
- 한국어 가독성을 위해 `Apple SD Gothic Neo`, `Noto Sans KR`, `Arial` 순서를 사용합니다.
- 제목은 큼직하되, 앱 내부 화면에서는 과한 hero 스타일을 피합니다.
- letter spacing은 기본값 `0`을 유지합니다.

권장 크기:

| Role | Size |
| --- | --- |
| Page title | 28-32px |
| Section title | 18-22px |
| Body | 15-16px |
| Caption | 12-13px |
| Score | 28-48px |

## Layout

- 모바일 우선으로 설계합니다.
- 주요 화면은 최대 폭을 두되, 캘린더와 리스트는 모바일에서 꽉 차게 사용합니다.
- 카드 반경은 최대 8px로 제한합니다.
- 카드 안에 카드를 중첩하지 않습니다.
- 하단 내비게이션은 캘린더, 게시판, 마이페이지를 기본 탭으로 둡니다.

## Components

모든 컴포넌트는 직접 구현합니다.

### Buttons

- Primary: 경기 기록 저장, 로그인, 작성 완료
- Secondary: 취소, 뒤로, 보조 이동
- Icon button: 월 이동, 사진 삭제, 수정

버튼은 최소 높이 44px 이상으로 유지합니다.

### Calendar

- 날짜 셀은 일정한 높이를 유지합니다.
- 경기 일정은 팀명, 시간, 홈/원정 정보를 짧게 표시합니다.
- 직관 기록이 있으면 사진 썸네일을 우선 노출합니다.
- 오늘 날짜, 선택 날짜, 경기 있는 날짜를 서로 다른 상태로 구분합니다.

### Game Card

- 경기 시간
- 홈/원정 팀
- 구장
- 스코어 또는 예정 상태
- 예매 정보 표시 가능 여부

### Attendance Card

- 사진 썸네일
- 경기 정보
- 내 팀 기준 결과
- 메모 일부

### Form

- 라벨은 항상 표시합니다.
- 에러 메시지는 필드 아래에 표시합니다.
- 파일 업로드는 업로드 전 미리보기를 제공합니다.

## CSS Strategy

- Tailwind CSS를 사용하지 않습니다.
- shadcn/ui를 사용하지 않습니다.
- CSS Modules 또는 전역 CSS + 명확한 class naming을 사용합니다.
- 디자인 토큰은 CSS custom properties로 관리합니다.
- 공통 컴포넌트는 `apps/web/src/components`에 직접 작성합니다.

## Accessibility

- 버튼과 링크의 focus-visible 상태를 명확히 표시합니다.
- 색상만으로 승/패/무를 구분하지 않고 텍스트를 함께 표시합니다.
- 터치 대상은 최소 44px를 유지합니다.
- 이미지 업로드 미리보기에는 의미 있는 대체 텍스트를 제공합니다.

## Initial Visual Keywords

- Field green
- Night game navy
- Ticket gold
- Scoreboard red
- Record paper
- Clean mobile utility
