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
| status | VARCHAR(20) | scheduled, finished, canceled |
| ticket_url | VARCHAR(500) NULL | 예매처 |
| ticket_open_at | DATETIME NULL | 예매 오픈 시각 |
| created_at | DATETIME | 생성일 |
| updated_at | DATETIME | 수정일 |

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
