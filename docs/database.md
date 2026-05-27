# Database Design

## ERD Draft

```txt
users 1 ── N posts
users 1 ── N comments
users 1 ── N attendance_records
users N ── 1 teams

teams 1 ── N games(home_team_id)
teams 1 ── N games(away_team_id)

games 1 ── N attendance_records
posts 1 ── N comments
```

## Tables

### users

사용자 계정과 기본 프로필 정보를 저장합니다.

| Column | Type | Note |
| --- | --- | --- |
| id | BIGINT PK | 사용자 ID |
| email | VARCHAR(255) UNIQUE | 로그인 이메일 |
| password_hash | VARCHAR(255) | bcrypt 해시 |
| nickname | VARCHAR(50) | 닉네임 |
| favorite_team_id | BIGINT FK NULL | 내 팀 |
| email_verified_at | DATETIME NULL | 이메일 인증 시각 |
| created_at | DATETIME | 생성일 |
| updated_at | DATETIME | 수정일 |

### email_verification_tokens

이메일 인증 토큰을 저장합니다.

| Column | Type | Note |
| --- | --- | --- |
| id | BIGINT PK | 토큰 ID |
| user_id | BIGINT FK | 사용자 ID |
| token | VARCHAR(255) UNIQUE | 인증 토큰 |
| expires_at | DATETIME | 만료 시각 |
| used_at | DATETIME NULL | 사용 시각 |
| created_at | DATETIME | 생성일 |

### teams

KBO 팀 정보를 저장합니다.

| Column | Type | Note |
| --- | --- | --- |
| id | BIGINT PK | 팀 ID |
| name | VARCHAR(50) | 팀명 |
| short_name | VARCHAR(20) | 짧은 팀명 |
| primary_color | VARCHAR(20) NULL | UI 색상 |
| created_at | DATETIME | 생성일 |

### games

경기 일정과 기본 스코어를 저장합니다.

| Column | Type | Note |
| --- | --- | --- |
| id | BIGINT PK | 경기 ID |
| game_date | DATETIME | 경기 일시 |
| stadium | VARCHAR(100) | 구장 |
| home_team_id | BIGINT FK | 홈 팀 |
| away_team_id | BIGINT FK | 원정 팀 |
| home_score | INT NULL | 홈 점수 |
| away_score | INT NULL | 원정 점수 |
| status | VARCHAR(20) | scheduled, finished, cancelled |
| cancellation_reason | VARCHAR(30) NULL | rain, dust, ground, heat, cold, other |
| ticket_url | VARCHAR(500) NULL | 예매처 |
| ticket_open_at | DATETIME NULL | 예매 오픈 시각 |
| created_at | DATETIME | 생성일 |
| updated_at | DATETIME | 수정일 |

### players

KBO 선수 마스터 데이터를 저장합니다.

| Column | Type | Note |
| --- | --- | --- |
| id | BIGINT PK | 내부 선수 ID |
| team_id | BIGINT FK | 소속 팀 |
| kbo_player_id | VARCHAR(64) NULL | KBO 선수 ID |
| name | VARCHAR(50) | 선수명 |
| back_number | VARCHAR(10) NULL | 등번호 |
| position | VARCHAR(20) NULL | 포지션 |
| height_cm | INT NULL | 신장 |
| weight_kg | INT NULL | 체중 |
| throws_hand | VARCHAR(10) NULL | 투구 손 |
| bats_hand | VARCHAR(10) NULL | 타격 손 |
| birth_date | DATE NULL | 생년월일 |
| school | VARCHAR(500) NULL | 출신교 |
| profile_image_url | VARCHAR(500) NULL | 선수 프로필 이미지 |
| is_active | BOOLEAN | 현역 여부 |

### game_starting_pitchers

경기별 선발/예상 선발 투수를 저장합니다.

| Column | Type | Note |
| --- | --- | --- |
| id | BIGINT PK | ID |
| game_id | BIGINT FK | 경기 |
| team_id | BIGINT FK | 팀 |
| player_id | BIGINT FK | 선수 |
| is_confirmed | BOOLEAN | 확정 선발 여부 |
| era | DECIMAL(5,2) NULL | 평균자책점 |
| war | DECIMAL(5,2) NULL | WAR |
| games | INT NULL | 등판 경기 수 |
| starter_average_innings | VARCHAR(10) NULL | 선발 평균 이닝 |
| quality_starts | INT NULL | QS |
| whip | DECIMAL(5,2) NULL | WHIP |
| season_record | VARCHAR(50) NULL | 시즌 승패 요약 |
| source | VARCHAR(20) NULL | 데이터 출처 |
| synced_at | DATETIME NULL | 동기화 시각 |

### game_lineups

경기별 라인업을 저장합니다.

| Column | Type | Note |
| --- | --- | --- |
| id | BIGINT PK | ID |
| game_id | BIGINT FK | 경기 |
| team_id | BIGINT FK | 팀 |
| player_id | BIGINT FK | 선수 |
| batting_order | INT NULL | 타순 |
| field_position | VARCHAR(20) NULL | 수비 위치 |
| war | DECIMAL(5,2) NULL | 라인업 분석 WAR |
| is_starter | BOOLEAN | 선발 여부 |
| source | VARCHAR(20) NULL | 데이터 출처 |
| synced_at | DATETIME NULL | 동기화 시각 |

### attendance_records

직관 기록을 저장합니다.

| Column | Type | Note |
| --- | --- | --- |
| id | BIGINT PK | 기록 ID |
| user_id | BIGINT FK | 사용자 ID |
| game_id | BIGINT FK | 경기 ID |
| photo_url | VARCHAR(500) NULL | 업로드 사진 |
| memo | TEXT NULL | 메모 |
| my_team_score | INT NULL | 사용자 기준 내 팀 점수 |
| opponent_score | INT NULL | 상대 점수 |
| result | VARCHAR(10) NULL | win, lose, draw |
| is_score_modified | BOOLEAN | 스코어 직접 수정 여부 |
| created_at | DATETIME | 생성일 |
| updated_at | DATETIME | 수정일 |

### posts

직관 후기 게시판 글을 저장합니다.

| Column | Type | Note |
| --- | --- | --- |
| id | BIGINT PK | 게시글 ID |
| user_id | BIGINT FK | 작성자 |
| title | VARCHAR(200) | 제목 |
| content | TEXT | 본문 |
| created_at | DATETIME | 생성일 |
| updated_at | DATETIME | 수정일 |

### comments

게시글 댓글을 저장합니다.

| Column | Type | Note |
| --- | --- | --- |
| id | BIGINT PK | 댓글 ID |
| post_id | BIGINT FK | 게시글 ID |
| user_id | BIGINT FK | 작성자 |
| content | TEXT | 댓글 내용 |
| created_at | DATETIME | 생성일 |
| updated_at | DATETIME | 수정일 |

## Indexes

- `users.email`
- `games.game_date`
- `games.home_team_id`
- `games.away_team_id`
- `attendance_records.user_id`
- `attendance_records.game_id`
- `posts.created_at`
- `comments.post_id`

## Constraints

- 이메일은 중복될 수 없다.
- 게시글 수정/삭제는 작성자만 가능하다.
- 댓글 삭제는 작성자만 가능하다.
- 한 사용자는 동일 경기의 직관 기록을 하나만 작성할 수 있다.
- 경기 스코어가 아직 없을 수 있으므로 score 컬럼은 nullable로 둔다.
