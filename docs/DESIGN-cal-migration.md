# Cal.com Style Migration Plan

This document tracks the Yakuku Yaru visual-system migration based on
`docs/DESIGN-cal.md`.

## Source Direction

Use `DESIGN-cal.md` as the primary design reference.

Core direction:
- White canvas and light gray product surfaces.
- Black primary CTAs.
- 8px radius for buttons and inputs.
- 12px radius for cards.
- 16px radius only for marquee/product mockup containers.
- Hairline borders and subtle shadows instead of heavy decoration.
- Product UI fragments inside cards should carry the visual interest.
- Dark surfaces should be rare and deliberate.

## Current Progress

### 0. Pre-Migration Explorations

Status: partially applied, needs review during later passes.

Completed:
- Calendar received earlier visual adjustments in `apps/web/src/app/calendar/calendar.css`.
- Main ranking was changed from table-only to a leaderboard variant:
  - `apps/web/src/components/TeamStandingsTable.tsx`
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/app/globals.css`
- Leaderboard now supports `variant="leaderboard"` while preserving the default table variant.

Notes:
- These changes were made before the Cal.com migration direction was finalized.
- Keep the layout idea, but continue harmonizing colors and surfaces with the Cal.com system.

### 1. Global Tokens And Shared Components

Status: completed.

Files changed:
- `apps/web/src/app/globals.css`

Completed:
- Added font tokens:
  - `--font-body`
  - `--font-display`
- Rebased core colors toward Cal.com:
  - `--color-brand: #111111`
  - `--color-brand-active: #242424`
  - `--color-paper: #ffffff`
  - `--color-paper-deep: #f5f5f5`
  - `--color-surface-soft: #f8f9fa`
  - `--color-surface-card: #f5f5f5`
  - `--color-surface-strong: #e5e7eb`
  - `--color-line: #e5e7eb`
  - `--color-ink: #111111`
  - `--color-muted: #6b7280`
- Adjusted common radius:
  - buttons/inputs around 8px
  - cards around 12px
  - added 16px large-card token
- Adjusted common weights toward 400/600 rather than very heavy 700/900 usage.
- Softened shadows to Cal-like subtle elevation.
- Updated shared component primitives:
  - `.card`
  - `.card-accent`
  - `.card-dark`
  - `.card-field`
  - `.section-heading`
  - `.eyebrow`
  - `.btn`
  - `.icon-btn`
  - `.icon-button`
  - `.badge`
  - form inputs/selects/textareas
  - choice group and toggle switch
  - photo dropzone
  - team selection card
  - standings table base styles

Verification:
- `npm run typecheck --workspace @yakuku-yaru/web`
- `npm run lint --workspace @yakuku-yaru/web`

Re-verification (later pass):
- Found the bottom "Visual refinement layer - Modern Sports Utility" in `globals.css`
  was still re-overriding the clean Cal base with the old palette and undoing Phase 1:
  - `.btn-primary` was forced back to team color (green default) -> restored to black
    (`--color-brand` / `--color-brand-active`).
  - `.btn-secondary` was a filled navy -> restored to white + hairline.
  - `.btn-ghost` / `.icon-button` hover used team tint -> neutral `--color-surface-*`.
  - `.eyebrow` was team color + 0.08em uppercase tracking -> muted, no tracking.
  - `.card` / `.card-accent` / shared cards used a glassy inset + heavy blue-gray shadow
    -> hairline `--color-line` + subtle `--shadow-sm`.
  - `.site-header` heavy shadow -> `--shadow-sm` (header chrome itself is Phase 8).
- Header login/signup use `.account-link` (not `.btn-primary`), so the black-CTA change
  does not affect the dark header.

### 2. Main Page Cal.com Pass

Status: completed.

Files changed:
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`

Completed:
- Converted guest and logged-in hero/greeting surfaces from dark image-heavy banners toward white canvas cards.
- Unified main CTA buttons to black primary CTAs.
- Added `home-product-card` for main-page product UI cards.
- Converted upcoming games, recent records, and win-rate card toward light product-card surfaces.
- Removed inline white text assumptions from the win-rate card.
- Reworked game date chips and dashboard rows into white/light-gray UI fragments.
- Cleaned up lingering mobile dark hero background.

Re-verification (later pass):
- The KV hero (`.home-hero` guest + `.dashboard-greeting` logged-in) had been flattened to
  pure white, which removed/hid the `main_kv.png` / `main_kv_login.png` artwork. Because the
  KV photos are dark night-stadium images, dark ink text on a white wash is unusable.
- Decision: keep the KV as the single deliberate "dark marquee" surface (Cal allows scarce,
  deliberate dark surfaces). Restored:
  - Dark overlay gradient (`rgba(8,14,28,...)`) over the KV image, `--radius-xl` (16px),
    subtle `--shadow-md`.
  - White headline/body text, gold (`--color-ticket-gold`) eyebrow accent.
  - CTAs inverted for dark: primary = white fill + ink text; ghost = white outline.
  - Mobile media query background switched from white to the dark base so text stays legible.
- Everything else on the main page stays on the white-canvas Cal system.
- KBO standings leaderboard (`variant="leaderboard"`) was still using the old
  "Modern Sports Utility" decoration and felt disconnected from the Cal system. Harmonized:
  - `.home-leaderboard-card`: dropped green-tinted border + heavy `0 18px 44px` shadow
    -> hairline `--color-line` + `--shadow-sm`.
  - `.standings-leaderboard__hero` (podium): dropped green gradient + heavy shadow
    -> `--color-surface-soft` card, hairline, `--shadow-sm`, `--radius-lg`.
  - Rank medals: removed silver `#aeb8c2` / bronze `#b07a47`; now a black (`--color-night-navy`)
    chip for all, with a single gold (`--color-ticket-gold`) chip for the champion.
  - Win-rate number: removed gold/silver/bronze per-rank colors -> ink for all ranks.
  - Progress bars (leaderboard + playoff probability): green/green-to-gold gradient
    -> solid `--color-night-navy`.
  - Highlight (your team) ring kept as a functional accent.

Verification:
- `npm run typecheck --workspace @yakuku-yaru/web`
- `npm run lint --workspace @yakuku-yaru/web`

### 3. Calendar Page Cal.com Pass

Status: completed.

Files changed:
- `apps/web/src/app/calendar/calendar.css`

Completed:
- Removed the pre-migration blue-gray palette and translucent glassy surfaces:
  - Page canvas reset from `#eef1f6` to `var(--color-paper)` (white).
  - Replaced all hardcoded `rgba(23, 32, 51, ...)` / blue-gray hex with Cal tokens
    (`--color-white`, `--color-surface-soft`, `--color-line`, `--color-ink`, `--color-muted`).
- Toolbar / filter rail:
  - Toolbar, summary cards, filter panel, and win-rate panel now use white/light surfaces,
    hairline borders, and subtle `--shadow-sm` instead of heavy `0 10–12px ... ` shadows.
  - Filter panel card bumped to 12px (`--radius-lg`).
  - "오늘" button changed from a team-colored fill to a Cal secondary
    (`--color-surface-soft` fill, hairline border, ink text).
  - Month label / weekday labels recolored to ink + muted tokens, no uppercase tracking.
- Month/week grid:
  - White calendar shell card at 12px (`--radius-lg`) with hairline + subtle shadow.
  - Light-gray day cells (`--color-surface-soft`) with hairline borders, 8px radius.
  - Outside days drop to white with hairline; today keeps the black (`--color-ink`) inset ring.
  - Event cards rounded to `--radius-sm`; cancelled-legend stripe uses `--color-line`.
- Mobile agenda:
  - Agenda day cards and the filter dock use white/hairline surfaces with `--shadow-sm` /
    `--shadow-lg` instead of the prior heavy blue-gray shadows.
- Insight panels:
  - Win-rate panel uses `--color-surface-soft` with hairline and no drop shadow at >=721px;
    white summary cards sit on top for the Cal "cards on soft surface" look.

Notes:
- Win/lose/draw event tints are kept (mixed with white) because they are functional result
  indicators, not purely decorative — they are already desaturated via `color-mix`.
- All calendar visual overrides live in `calendar.css` (loaded after `globals.css` for the
  page), so no `globals.css` edits were needed in this pass.

Verification:
- `npm run typecheck --workspace @yakuku-yaru/web`
- `npm run lint --workspace @yakuku-yaru/web`
- `curl -I http://localhost:3000/calendar` → 200

### 3b. Color Cohesion Follow-up (team theme + scheduled)

Status: completed.

Files changed:
- `apps/web/src/app/globals.css`
- `apps/web/src/app/calendar/calendar.css`
- `apps/web/src/app/page.tsx`

Completed:
- Default `--team-color` changed from green (`--color-field-700`) to `--color-ink`, so the
  guest / no-favorite experience is monochrome Cal (black header, today marker, selected
  filter pills). Logged-in fans still get their team color via JS (`yakuku.teamColor`).
- Team-colored header is intentionally KEPT (user-requested feature): `.site-header`
  background = `var(--team-color, ...)`, so it shows the favorite team color when logged in
  and falls back to ink (#111, like the footer) for guests.
- Scheduled ("경기전") calendar events were a saturated teal (`--color-scheduled`) that
  dominated the month grid. Neutralized to white cards with a dashed `--color-line-strong`
  outline and muted time, so played-game result colors (win red / lose blue) read clearly
  and the team accent stands out intentionally.
- Guest hero headline given a controlled line break.

## Next Steps

### 4. Profile / My Page Pass

Status: completed.

Files changed:
- `apps/web/src/app/globals.css`

Completed:
- Stat summary cards: dropped blue-gray border (`rgba(23,32,51,...)`) + heavy `0 8px 20px`
  shadow and uppercase label tracking -> hairline `--color-line`, `--radius-lg`, `--shadow-sm`,
  no tracking.
- Stat tabs: removed green tint (`--color-field-700`) background -> `--color-surface-soft`;
  selected tab keeps the team accent (`var(--team-color, --color-ink)`) with `--shadow-sm`
  instead of a heavy `0 8px 18px` shadow.
- Win/lose/draw donut, legend dots, and result tally colors aligned to the shared semantic
  tokens (`--color-win` / `--color-lose` / `--color-draw`) so the profile matches the calendar.
- Result tally cards: converted from saturated filled blocks (red/blue/grey with white text)
  to light `--color-surface-soft` cards with a thin colored indicator + colored number.
- Donut shadow softened to a hairline inset ring.
- `.profile-hero` kept as a deliberate dark/team marquee (same decision as KV hero/header) but
  heavy `0 16px 38px` shadow softened to `--shadow-md`, stray green fallback -> `--color-ink`.

### 5. Attendance Create/Edit/Detail Pass

Status: completed.

Files changed:
- `apps/web/src/app/globals.css`

Completed:
- Photo dropzone, form cards, action bars, info rows were already on the shared Cal primitives.
- Cheer picker: removed green tint background -> `--color-surface-soft`; selected cheer button
  green fill/border/text -> neutral `--color-surface-card` + `--color-ink`.
- Photo ticket (personality element kept): default accent green fallback -> `--color-ink`,
  cancelled accent brown (`--color-cancelled`) -> neutral `--color-muted`, heavy
  `0 16px 40px` shadow -> hairline border + `--shadow-md`.
- Ticket-list cancelled outcome label brown -> `--color-muted`.
- Score input kept as a deliberate dark "scoreboard" panel (night-navy is now #111).

### 6. Game Detail Pass

Status: completed.

Files changed:
- `apps/web/src/app/globals.css`

Completed:
- `.match-hero` stays in the dark-marquee group (shadow already softened to `--shadow-md` in
  Phase 4 edit shared with `.card-dark` / `.profile-hero`).
- Starter pitcher cards + lineup panels: blue-gray border/heavy shadow -> `--color-line` +
  `--shadow-sm`; starter photo shadow -> `--shadow-sm`.
- `.lineup-order` / `.stadium-info a` green text -> `--color-ink`.

### 7. Posts / Community Pass

Status: completed.

Files changed:
- `apps/web/src/app/globals.css`

Completed:
- `.post-surface` border + `.post-search-input` border moved from `rgba(23,32,51,...)` to
  `--color-line` / `--color-line-strong`.
- List rows, pagination, detail header, and comments were already token-based.
- Primary post buttons and the write FAB keep the team accent
  (`var(--team-color, --color-ink)`).

### 8. Auth / Admin / Misc Pass

Status: completed.

Files changed:
- `apps/web/src/app/globals.css`

Completed:
- Auth: `.auth-footnote a` green link -> `--color-ink`; `.notice-card` green surface
  (`--color-field-50/100/800`) -> neutral `--color-surface-soft` + `--color-line` + ink.
- Admin: already fully token-based (white cards, hairline, team accent for the active tab).
- Notification popover: heavy `0 12px 32px` shadow -> hairline border + `--shadow-lg`.
- Calendar misc: `.calendar-today-fab` green + green-tinted heavy shadow -> team/ink fill +
  `--shadow-lg`; `.calendar-event-ticket-count` green chip -> neutral surface/line/ink;
  `.filter-toggle input` accent-color green -> `var(--team-color, --color-ink)`.
- Cheers search focus ring green (`--color-field-100/700`) -> ink border + neutral ring.

Intentionally KEPT (semantic, not theme decoration):
- `.badge-green`, `.companion-status-pill[accepted]`, `.notification-result` — positive/accept
  status indicators.
- All `var(--team-color, ...)` accents — resolve to the user's team color (or ink for guests).

Verification:
- `npm run typecheck --workspace @yakuku-yaru/web`
- `npm run lint --workspace @yakuku-yaru/web`

## Validation Checklist

Run after each phase:
- `npm run typecheck --workspace @yakuku-yaru/web`
- `npm run lint --workspace @yakuku-yaru/web`
- `curl -I http://localhost:3000`

Visual checks after major phases:
- Desktop main page.
- Mobile main page.
- Desktop calendar.
- Mobile calendar.
- Form-heavy attendance page.
- Profile stats page.

## Current Known Dirty Files

At the time this document was created, these local files had changes:
- `apps/web/src/app/calendar/calendar.css`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/TeamStandingsTable.tsx`
- `docs/DESIGN-cal.md` was untracked.

