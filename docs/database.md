# Database Design

## ERD Summary

```txt
teams 1 ── N users(favorite_team_id)
teams 1 ── N games(home_team_id / away_team_id)
teams 1 ── N players
players 1 ── 0..1 player_cheers

games 1 ── N attendance_records
games 1 ── N game_starting_pitchers
games 1 ── N game_lineups
games 1 ── N game_reminders

users 1 ── N posts
users 1 ── N comments
users 1 ── N attendance_records
users 1 ── N notifications
users N ── N attendance_records via attendance_companions

posts 1 ── N comments
players 1 ── N game_starting_pitchers
players 1 ── N game_lineups
```

스키마 원본은 [001_schema.sql](/Users/hansookim/Desktop/Web/yakuku-yaru/apps/api/db/init/001_schema.sql)를 기준으로 합니다.

## Core Tables

### users

사용자 계정, 프로필, 권한, 내 팀 정보를 저장합니다.

| Column | Note |
| --- | --- |
| `id` | 사용자 ID |
| `email` | 로그인 이메일, unique |
| `password_hash` | bcrypt 해시 |
| `nickname` | 닉네임 |
| `profile_image_url` | 프로필 이미지 URL |
| `role` | `user`, `admin` |
| `favorite_team_id` | 내 팀, nullable |
| `email_verified_at` | 이메일 인증 시각 |
| `created_at`, `updated_at` | 생성/수정 시각 |

### email_verification_tokens

회원가입 이메일 인증 토큰을 저장합니다.

| Column | Note |
| --- | --- |
| `user_id` | 사용자 ID |
| `token` | 인증번호/토큰, unique |
| `expires_at` | 만료 시각 |
| `used_at` | 사용 시각 |
| `created_at` | 생성 시각 |

### password_reset_tokens

비밀번호 재설정 토큰을 저장합니다.

| Column | Note |
| --- | --- |
| `user_id` | 사용자 ID |
| `token` | 재설정 토큰, unique |
| `expires_at` | 만료 시각 |
| `used_at` | 사용 시각 |
| `created_at` | 생성 시각 |

### teams

KBO 팀 정보를 저장합니다.

| Column | Note |
| --- | --- |
| `id` | 팀 ID |
| `name` | 팀명 |
| `short_name` | 짧은 팀명 |
| `primary_color` | 팀 컬러 |
| `ticket_url` | 기본 예매처 URL |

### games

KBO 경기 일정, 결과, 취소 사유, 외부 ID를 저장합니다.

| Column | Note |
| --- | --- |
| `game_date` | 경기 일시 |
| `stadium` | 구장 |
| `home_team_id`, `away_team_id` | 홈/원정 팀 |
| `home_score`, `away_score` | 공식 스코어 |
| `status` | `scheduled`, `finished`, `cancelled` |
| `cancellation_reason` | `rain`, `dust`, `ground`, `heat`, `cold`, `other` |
| `lineup_confirmed` | 라인업 확정 여부 |
| `external_source`, `external_id` | KBO 동기화 식별자 |
| `ticket_url`, `ticket_open_at` | 예매 정보 |

### players

KBO 선수 마스터 데이터를 저장합니다.

| Column | Note |
| --- | --- |
| `team_id` | 소속 팀 |
| `kbo_player_id` | KBO 선수 ID |
| `name` | 선수명 |
| `back_number` | 등번호 |
| `position` | 포지션 |
| `height_cm`, `weight_kg` | 신체 정보 |
| `throws_hand`, `bats_hand` | 투타 |
| `birth_date`, `school` | 생년월일/출신교 |
| `profile_image_url` | 선수 프로필 이미지 |
| `season_batting_avg`, `season_ops` | 시즌 타격 지표 |
| `is_active` | 현역 여부 |

### player_cheers

선수별 응원가 운영 데이터를 저장합니다.

| Column | Note |
| --- | --- |
| `player_id` | 선수 ID, unique |
| `title` | 응원가 제목 |
| `youtube_id` | 유튜브 영상 ID |
| `youtube_url` | 과거 호환용 유튜브 링크 |
| `lyrics` | 관리자 입력 가사 |
| `created_at`, `updated_at` | 생성/수정 시각 |

### game_starting_pitchers

경기별 선발/예상 선발 투수와 주요 스탯을 저장합니다.

| Column | Note |
| --- | --- |
| `game_id`, `team_id`, `player_id` | 경기/팀/선수 |
| `is_confirmed` | 확정 선발 여부 |
| `era` | 평균자책점 |
| `war` | WAR |
| `games` | 등판 경기 수 |
| `starter_average_innings` | 선발 평균 이닝 |
| `quality_starts` | QS |
| `whip` | WHIP |
| `season_record` | 시즌 승패 요약 |
| `source`, `synced_at` | 출처/동기화 시각 |

### game_lineups

경기별 라인업을 저장합니다.

| Column | Note |
| --- | --- |
| `game_id`, `team_id`, `player_id` | 경기/팀/선수 |
| `batting_order` | 타순 |
| `field_position` | 수비 위치 |
| `war` | 라인업 분석 WAR |
| `is_starter` | 선발 여부 |
| `source`, `synced_at` | 출처/동기화 시각 |

## Attendance and Notifications

### attendance_records

직관/집관 기록을 저장합니다.

| Column | Note |
| --- | --- |
| `user_id` | 기록 소유자 |
| `last_modified_by_user_id` | 최종 수정자 |
| `game_id` | 경기 |
| `watch_type` | `stadium`, `home` |
| `cheered_team_id` | 응원 팀. 내 팀 경기가 아닐 때 필요 |
| `photo_url` | WebP 업로드 사진 URL |
| `memo` | 메모 |
| `my_team_score`, `opponent_score`, `result` | 공식 스코어 기준 계산 결과 |
| `is_score_modified` | 과거 호환 필드. 현재는 수동 수정하지 않음 |

### attendance_companions

동행자 태그 상태를 저장합니다.

| Column | Note |
| --- | --- |
| `attendance_record_id` | 기록 ID |
| `user_id` | 태그된 사용자 |
| `status` | `pending`, `accepted`, `rejected` |
| `responded_at` | 응답 시각 |

### notifications

앱 내부 알림을 저장합니다.

| Column | Note |
| --- | --- |
| `user_id` | 알림 수신자 |
| `actor_user_id` | 알림을 유발한 사용자 |
| `attendance_record_id` | 관련 기록 |
| `post_id` | 관련 게시글 |
| `type` | `attendance_tagged`, `companion_accepted`, `companion_rejected`, `post_commented` 등 |
| `message` | 알림 문구 |
| `read_at` | 읽은 시각 |

### game_reminders

경기 알림 설정 상태를 저장합니다.

| Column | Note |
| --- | --- |
| `user_id` | 사용자 |
| `game_id` | 경기 |
| `reminder_type` | 기본값 `game_day` |

## Community and Stadium

### posts

게시판 글을 저장합니다.

| Column | Note |
| --- | --- |
| `user_id` | 작성자 |
| `title` | 제목 |
| `content` | 본문 |
| `created_at`, `updated_at` | 생성/수정 시각 |

### comments

게시글 댓글을 저장합니다.

| Column | Note |
| --- | --- |
| `post_id` | 게시글 |
| `user_id` | 작성자 |
| `content` | 댓글 내용 |
| `created_at`, `updated_at` | 생성/수정 시각 |

### stadium_guides

구장별 공통 맛집/주차 정보를 저장합니다.

| Column | Note |
| --- | --- |
| `stadium` | 구장명 |
| `food_summary` | 맛집 요약 |
| `parking_summary` | 주차 요약 |
| `map_url` | 외부 지도 URL |

### user_stadium_notes

사용자별 구장 개인 메모를 저장합니다.

| Column | Note |
| --- | --- |
| `user_id` | 사용자 |
| `stadium` | 구장명 |
| `food_memo` | 개인 맛집 메모 |
| `parking_memo` | 개인 주차 메모 |

## Important Constraints

- `users.email`은 unique입니다.
- 한 사용자는 동일 경기의 기록을 하나만 작성할 수 있습니다.
- 동행자 row는 한 기록과 한 사용자 조합에 하나만 존재합니다.
- 수락된 동행 기록만 동행자 캘린더와 인사이트에 반영합니다.
- 경기 스코어는 nullable입니다. 예정/취소/미동기화 경기는 스코어가 없을 수 있습니다.
- 선수/선발/라인업 데이터는 외부 페이지 구조 변경에 영향을 받을 수 있습니다.
