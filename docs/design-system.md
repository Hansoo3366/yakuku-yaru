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
- 팀 컬러 면은 헤더(GNB)에만 씁니다. 그 밖의 화면에서는 선·글자·작은 표시 같은 accent로만 씁니다.
- 넓은 면적은 neutral surface 토큰을 사용하고, 대비가 필요한 곳만 어두운 면(`--color-night-navy`, `--home-night`)을 씁니다.
- 반경은 토큰을 씁니다: `--radius-sm` 6px, `--radius-md` 8px, `--radius-lg` 12px, `--radius-xl` 16px(히어로 같은 큰 패널), `--radius-pill`.
- 텍스트는 좁은 카드 안에서 잘리지 않도록 크기와 줄 수를 안정적으로 제한합니다.
- letter spacing은 기본값 0을 사용합니다.
- 색은 리터럴(`#fff`, `#111`)로 쓰지 않고 토큰으로 씁니다. 라이트·다크 두 모드에서 같은 CSS 가 동작해야 하기 때문입니다.

## Color Palette

색은 전부 `apps/web/src/styles/tokens.css` 의 CSS 변수로 정의합니다. 아래 값은 그 파일과 같아야 하며, 값을 바꿀 때는 이 표도 함께 고칩니다. 다크 값은 `html[data-theme='dark']` 블록에서 같은 이름의 토큰을 덮어씁니다.

### 면과 선

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--color-canvas` | `#FFFFFF` | `#0F1216` | 페이지 바탕 (`body`) |
| `--color-paper` | `#FFFFFF` | `#171B21` | 카드·패널·입력창 면 |
| `--color-surface-soft` | `#F8F9FA` | `#1B2027` | 가장 옅은 구분 면 |
| `--color-surface-card`, `--color-paper-deep` | `#F5F5F5` | `#1F242C`, `#1D2229` | 카드 안의 보조 면 |
| `--color-surface-strong` | `#E5E7EB` | `#2A303A` | 강조 면, 비활성 컨트롤 |
| `--color-line` | `#E5E7EB` | `#2A303A` | 기본 선 |
| `--color-line-strong` | `#D1D5DB` | `#3A424E` | 강한 선 |

### 글자

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--color-ink` | `#111111` | `#ECEEF1` | 본문·제목 |
| `--color-muted` | `#6B7280` | `#A0A8B4` | 보조 글자 |
| `--color-muted-soft` | `#898989` | `#8A929E` | 가장 옅은 보조 글자 |
| `--color-white` | `#FFFFFF` | `#FFFFFF` | 어두운 면·팀 컬러 면 위의 글자 (테마와 무관) |

### 어두운 면

원래도 어두운 패널과 버튼입니다. 다크 모드에서는 바탕과 구분되도록 한 단계 밝아집니다. 그 위의 글자는 양쪽 모두 `--color-white` 입니다.

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--color-night-navy` | `#111111` | `#222831` | 어두운 패널, 비로그인 헤더, 표 머리 |
| `--color-night-navy-soft` | `#242424` | `#2C333E` | 어두운 패널의 hover·보조 면 |
| `--color-brand` | `#111111` | `#3B4352` | 주 버튼 |
| `--color-brand-active` | `#242424` | `#4A5364` | 주 버튼 hover |
| `--color-brand-disabled` | `#E5E7EB` | `#2A303A` | 비활성 버튼 |
| `--home-night` | `#101722` | `#1A2130` | 홈 히어로·대시보드 인사 영역 |
| `--home-night-soft` | `#1A2433` | `#242D3E` | 위 영역의 보조 면 |

### 홈·순위표의 남색 계열

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--home-ink` | `#172033` | `#E6E9EE` | 제목·숫자 |
| `--home-muted` | `#687386` | `#9AA4B3` | 보조 글자 |
| `--home-line` | `#DFE3E8` | `#2A303A` | 선 |
| `--home-chalk` | `#F7F8F5` | `#1B2027` | 옅은 면 |

### 상태색

면으로 쓸 때(흰 글자가 올라감)와 글자로 쓸 때의 값을 나눕니다. 어두운 바탕에서는 글자가 더 밝아야 읽히기 때문입니다. **글자에는 반드시 `-ink` 토큰을 씁니다.**

| 의미 | 면 (`--color-*`) | 글자 Light (`--color-*-ink`) | 글자 Dark |
| --- | --- | --- | --- |
| 승 `win` | `#CF2F27` | `#CF2F27` | `#FF7B72` |
| 패 `lose` | `#1A56B8` | `#1A56B8` | `#7AA7FF` |
| 무 `draw` | `#6B6B6B` | `#6B6B6B` | `#A8ADB5` |
| 취소 `cancelled` | `#8A6D62` | `#8A6D62` | `#C7AB9F` |
| 예정 `scheduled` | `#0B8F7F` | `#0B8F7F` | `#45D0BD` |
| 오류 `error` (`score-red` 포함) | `#EF4444` | `#EF4444` | `#FF7B72` |
| 성공 `success` | `#10B981` | `#10B981` | `#3FD6A0` |
| 필드 그린 `field-700` → `--color-field-ink` | `#176B4D` | `#176B4D` | `#55CDA0` |

그 밖에 `--color-warning` `#F59E0B`, `--color-brand-accent` `#3B82F6`, `--color-ticket-gold` `#C99433`, `--color-ticket-gold-soft` `#F3E3BE` 는 테마와 무관하게 같은 값을 씁니다.

### 팀 컬러

팀 컬러는 `lib/team-theme.ts` (와 `layout.tsx` 의 부트 스크립트)가 구단의 `primaryColor` 에서 계산해 `<html>` 에 인라인으로 넣습니다.

| Token | 값 | Usage |
| --- | --- | --- |
| `--team-color` | 구단 색 그대로 | 선·점·배지 같은 accent |
| `--team-color-display` | 구단 색에 흰색 5% | 헤더(GNB) 면 |
| `--team-color-display-contrast` | `#111111` 또는 `#FFFFFF` 중 대비가 높은 쪽 | 헤더 위 글자 |
| `--team-color-contrast` | 위와 같은 방식 | 팀 컬러 accent 위 글자 |
| `--team-color-soft` | 구단 색 + 알파 12% | 옅은 틴트 |
| `--team-ink-light` | 흰 바탕과 대비 7:1 이 될 때까지 어둡게 | 밝은 바탕의 팀 컬러 글자 |
| `--team-ink-dark` | 어두운 면(`#171B21`)과 대비 7:1 이 될 때까지 밝게 | 어두운 바탕의 팀 컬러 글자 |
| `--team-accent-dark` | 어두운 면과 대비 3:1 이 될 때까지 밝게 | 다크 모드의 accent |
| `--team-color-ink` | 테마에 따라 위 두 글자색 중 하나 | CSS 에서는 이 토큰만 쓴다 |

비로그인일 때는 `--team-color` 가 `--color-ink` 이고, 헤더는 `--color-night-navy` 를 씁니다.

## Team Color Policy

**헤더(GNB)를 응원 팀 컬러로 채우는 것이 이 서비스의 핵심 아이덴티티입니다.** 헤더는 항상 팀 컬러 면으로 두고, 헤더 아래 콘텐츠는 그 색과 경쟁하지 않도록 중립 색으로 둡니다. 같은 원색이 헤더 밖에서 반복되면 헤더의 "내 팀 색"이 흐려집니다.

팀 컬러를 **면으로** 쓰는 곳:

- 헤더(GNB) 전체
- 직관 포토 티켓 (내 팀 경기 기록이라는 한 장의 오브제)

팀 컬러를 **accent로만** 쓰는 곳 (선, 글자, 점, 작은 배지, 옅은 틴트):

- 헤더 아래 히어로의 상단 얇은 띠
- 활성 탭의 밑줄, 선택된 필터의 점
- 캘린더의 오늘 날짜 배지, 오늘 칸의 옅은 틴트
- 순위표에서 내 팀 행의 옅은 틴트
- 하단 탭 바의 활성 표시

팀 컬러를 쓰지 않는 곳:

- 카드·패널의 왼쪽 세로 강조 바 (템플릿 같은 인상을 주므로 쓰지 않는다)
- 페이지 히어로·패널 헤더·툴바 같은 넓은 면 (흰색 또는 중립 잉크)
- 버튼 (중립 잉크 `#111` 계열)
- 표 머리 (`--home-night`)
- 예정 경기 카드, 목록 행의 배경
- 전체 page background

글자색 주의: 어두운 면 위의 글자에 `--team-color-contrast` 를 쓰지 않습니다. 이 값은 팀 컬러 **위에** 올릴 글자색이라, 한화처럼 밝은 팀 컬러에서는 검정이 되어 어두운 면에서 보이지 않습니다.

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
| Compact meta | 12px |
| Score | 28-44px |

글자 크기는 12px 미만을 쓰지 않습니다. 작은 보조 글자는 `--type-caption`(12px)을 씁니다. 영문 대문자 장식 라벨(`YOUR SEASON`, `LEAGUE PULSE` 등)은 쓰지 않고, 필요한 소제목은 한국어로 씁니다.

## Layout

- 모바일 우선으로 설계합니다.
- 주요 화면은 최대 폭을 두고, 캘린더와 관리자 화면은 더 넓은 폭을 허용합니다.
- 섹션은 카드 중첩 없이 full-width flow로 배치합니다.
- 반복 아이템만 카드화합니다.
- 하단 내비게이션은 홈, 캘린더, 응원가, 라운지, 마이(로그인 시)를 탭으로 둡니다.
- 첫 화면에는 장식보다 데이터를 먼저 둡니다. 비로그인 홈은 소개 문구 옆에 오늘(또는 다음) 경기를, 바로 아래에 순위표를 보여 줍니다.
- 좁은 화면에서 표는 핵심 열만 남기고(`col-wide` 열 숨김) 가로 스크롤 없이 읽히게 합니다.
- 그리드 열은 `1fr` 대신 `minmax(0, 1fr)` 를 써서 넓은 내용이 페이지를 가로로 밀지 않게 합니다.

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
- 디자인 토큰은 CSS custom properties로 관리합니다.
- 공통 컴포넌트는 `apps/web/src/components`에 직접 작성합니다.

### 파일 구조

`app/globals.css` 는 규칙을 직접 담지 않고 `src/styles/` 의 모듈을 순서대로 불러오기만 합니다. **불러오는 순서가 곧 우선순위**이고, 공통 모듈이 앞, 화면 모듈이 뒤입니다.

| 순서 | 파일 | 내용 |
| --- | --- | --- |
| 1 | `tokens.css` | 색·간격·글자 크기 토큰, 다크 모드 값 |
| 2 | `base.css` | 기본 요소, 폰트, 화면 전환 애니메이션 |
| 3 | `layout.css` | 페이지 뼈대, 공통 배치 |
| 4 | `chrome.css` | 헤더(GNB)·푸터·하단 탭·알림 |
| 5 | `components.css` | 카드·버튼·배지 등 공통 컴포넌트 |
| 6 | `forms.css` | 폼 입력 요소 |
| 7 | `standings.css` | 순위표·시즌 예상 순위 |
| 8 | `companion.css` | 동행자 선택·칩 |
| 9–15 | `calendar.css`, `game-detail.css`, `cheers.css`, `auth.css`, `admin.css`, `profile.css`, `dashboard.css` | 화면별 공통 규칙 |

- 한 화면에서만 쓰는 스타일은 그 화면 폴더의 CSS 파일(`app/public-home.css`, `app/calendar/calendar.css`, `*.module.css`)에 둡니다.
- 같은 선택자를 뒤에서 다시 정의해 덮어쓰지 않습니다. 고칠 때는 원래 규칙을 고칩니다.
- 공통 클래스(`.card`, `.section-heading`)의 속성을 화면 클래스에서 바꿔야 하면, 화면 모듈이 뒤에 오므로 같은 명시도로 선언하면 됩니다.

## Dark Mode

- `<html data-theme="dark">` 일 때 `tokens.css` 의 다크 블록이 토큰 값을 바꿉니다. 화면 CSS 는 토큰만 쓰면 따로 할 일이 없습니다.
- `layout.tsx` 의 부트 스크립트가 첫 paint 전에 `data-theme` 을 정합니다. 저장된 선택(`localStorage` 의 `yakuku.theme` = `light` / `dark`)이 없으면 시스템 설정을 따릅니다.
- 사용자는 푸터의 "화면 모드" 버튼으로 시스템 설정 → 라이트 → 다크 순으로 바꿉니다 (`components/ThemeToggle.tsx`, `lib/theme.ts`).
- **헤더(GNB)는 다크 모드에서도 원래 팀 컬러 그대로입니다.** 헤더 아래의 accent 와 글자만 `--team-accent-dark`, `--team-ink-dark` 로 바뀝니다. 두산·롯데·KT 처럼 어두운 팀 컬러가 어두운 바탕에 묻히지 않게 하기 위해서입니다.
- 토큰에 없는 색이 꼭 필요하면 `light-dark(라이트값, 다크값)` 을 쓰고, 미지원 브라우저를 위해 같은 속성을 라이트값으로 한 줄 먼저 선언합니다.

  ```css
  background: #e9edf2;
  background: light-dark(#e9edf2, #20242a);
  ```

- 사용자 지정 속성(`--x`)에는 `light-dark()` 를 넣지 않습니다. 미지원 브라우저에서 값 전체가 무효가 됩니다. 대신 `html[data-theme='dark'] .scope { --x: … }` 규칙으로 덮어씁니다.
- 흰색과 섞는 틴트는 `white` 대신 `var(--color-paper)` 와 섞습니다: `color-mix(in srgb, var(--team-color) 12%, var(--color-paper) 88%)`.
- 어두운 패널 위의 주 버튼처럼 다크 모드에서도 밝아야 하는 요소는 `html[data-theme='dark'] .selector` 규칙으로 직접 지정합니다.
- 구단 로고는 다크 모드에서 밝은 외곽선(`drop-shadow`)을 받아 어두운 로고도 보입니다.

## Empty and Status Copy

데이터가 비어 있을 때는 이유에 맞는 문구를 씁니다.

- 아직 발표 전: "선발 투수 발표 전입니다", "라인업은 보통 경기 시작 1시간쯤 전에 발표됩니다"
- 이미 지난 경기인데 기록이 없음: "이 경기의 라인업 기록이 없습니다"
- 취소된 경기: "취소된 경기입니다"

"동기화", "DB" 같은 내부 구현 용어는 화면 문구에 쓰지 않습니다.

## Server Rendering for Crawlers

검색·AI 크롤러는 대부분 JS를 실행하지 않으므로, 공개 페이지는 서버 컴포넌트(`page.tsx`)가 데이터를 먼저 받아 첫 HTML에 담습니다.

- 홈·경기 상세: 서버가 받은 값을 클라이언트 쿼리의 `initialData` 로 넘깁니다.
- 캘린더·응원가·게시판·구장: `QuerySeed` 로 쿼리 캐시에 미리 넣습니다. 클라이언트 화면은 `*PageClient.tsx` 에 그대로 둡니다.
- 경기 상세는 `SportsEvent`, 게시글은 `DiscussionForumPosting` 구조화 데이터를 함께 냅니다.
- 선수별 응원가는 `/cheers/{playerId}` 페이지가 가사와 영상을 HTML 로 내보냅니다 (`MusicComposition` 구조화 데이터 포함). 목록의 각 줄은 이 페이지로 가는 링크이고, 보통의 클릭만 가로채 창을 띄웁니다. 응원가가 등록된 선수의 주소는 사이트맵에 들어갑니다.
- `/standings` 는 순위 전용 페이지, `/schedule/YYYY-MM` 은 월별 경기 일정·결과 표입니다. 캘린더는 이번 달만 첫 HTML 에 담기므로, 지난 달 결과는 이 표로 읽힙니다.
- `/llms.txt` 에 주요 페이지와 공개 API 안내를, `/llms-full.txt` 에 현재 순위·최근 결과·다가오는 일정을 마크다운으로 둡니다.
- 사이트맵에는 경기, 월별 일정표, 선수 응원가, 구장, 게시글 주소가 모두 들어갑니다. 공개 페이지를 새로 만들면 `app/sitemap.ts` 에도 추가합니다.
- `robots.txt` 는 AI 크롤러(GPTBot, ClaudeBot, PerplexityBot 등)를 이름으로 허용합니다. 로그인 영역과 개인 기록은 제외합니다.
- 첫 방문 가이드는 화면을 가리는 모달이 아니라 아래쪽 안내 카드로 띄웁니다.

## Accessibility

- 버튼과 링크의 focus-visible 상태를 명확히 표시합니다.
- 색상만으로 승/패/무를 구분하지 않고 텍스트를 함께 표시합니다.
- 터치 대상은 최소 44px를 유지합니다. 인라인 링크는 위아래 padding 또는 `::after` 로 누르는 영역만 넓힙니다.
- 이미지 업로드 미리보기에는 의미 있는 대체 텍스트를 제공합니다.
- 아이콘 버튼에는 접근 가능한 label을 제공합니다.
