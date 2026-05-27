SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS teams (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  short_name VARCHAR(20) NOT NULL,
  primary_color VARCHAR(20) NULL,
  ticket_url VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_teams_name (name)
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  profile_image_url VARCHAR(500) NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  favorite_team_id BIGINT UNSIGNED NULL,
  email_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT fk_users_favorite_team
    FOREIGN KEY (favorite_team_id) REFERENCES teams(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_verification_tokens_token (token),
  KEY idx_email_verification_tokens_user_id (user_id),
  CONSTRAINT fk_email_verification_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_tokens_token (token),
  KEY idx_password_reset_tokens_user_id (user_id),
  CONSTRAINT fk_password_reset_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS games (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  game_date DATETIME NOT NULL,
  stadium VARCHAR(100) NOT NULL,
  home_team_id BIGINT UNSIGNED NOT NULL,
  away_team_id BIGINT UNSIGNED NOT NULL,
  home_score INT NULL,
  away_score INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  cancellation_reason VARCHAR(30) NULL,
  lineup_confirmed BOOLEAN NULL,
  external_source VARCHAR(20) NULL,
  external_id VARCHAR(64) NULL,
  ticket_url VARCHAR(500) NULL,
  ticket_open_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_games_date_home_away (game_date, home_team_id, away_team_id),
  UNIQUE KEY uq_games_external (external_source, external_id),
  KEY idx_games_game_date (game_date),
  KEY idx_games_home_team_id (home_team_id),
  KEY idx_games_away_team_id (away_team_id),
  CONSTRAINT fk_games_home_team
    FOREIGN KEY (home_team_id) REFERENCES teams(id),
  CONSTRAINT fk_games_away_team
    FOREIGN KEY (away_team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS players (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id BIGINT UNSIGNED NOT NULL,
  kbo_player_id VARCHAR(64) NULL,
  name VARCHAR(50) NOT NULL,
  back_number VARCHAR(10) NULL,
  position VARCHAR(20) NULL,
  height_cm INT NULL,
  weight_kg INT NULL,
  throws_hand VARCHAR(10) NULL,
  bats_hand VARCHAR(10) NULL,
  birth_date DATE NULL,
  school VARCHAR(500) NULL,
  profile_image_url VARCHAR(500) NULL,
  season_batting_avg DECIMAL(5,3) NULL,
  season_ops DECIMAL(5,3) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_players_kbo_player_id (kbo_player_id),
  KEY idx_players_team_id (team_id),
  KEY idx_players_name (name),
  CONSTRAINT fk_players_team
    FOREIGN KEY (team_id) REFERENCES teams(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_starting_pitchers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  game_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  player_id BIGINT UNSIGNED NOT NULL,
  is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  era DECIMAL(5,2) NULL,
  war DECIMAL(5,2) NULL,
  games INT NULL,
  starter_average_innings VARCHAR(10) NULL,
  quality_starts INT NULL,
  whip DECIMAL(5,2) NULL,
  season_record VARCHAR(50) NULL,
  source VARCHAR(20) NULL,
  synced_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_starting_pitchers_game_team (game_id, team_id),
  KEY idx_game_starting_pitchers_player_id (player_id),
  CONSTRAINT fk_game_starting_pitchers_game
    FOREIGN KEY (game_id) REFERENCES games(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_game_starting_pitchers_team
    FOREIGN KEY (team_id) REFERENCES teams(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_game_starting_pitchers_player
    FOREIGN KEY (player_id) REFERENCES players(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_lineups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  game_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  player_id BIGINT UNSIGNED NOT NULL,
  batting_order INT NULL,
  field_position VARCHAR(20) NULL,
  war DECIMAL(5,2) NULL,
  is_starter BOOLEAN NOT NULL DEFAULT TRUE,
  source VARCHAR(20) NULL,
  synced_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_lineups_game_team_order (game_id, team_id, batting_order),
  KEY idx_game_lineups_player_id (player_id),
  CONSTRAINT fk_game_lineups_game
    FOREIGN KEY (game_id) REFERENCES games(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_game_lineups_team
    FOREIGN KEY (team_id) REFERENCES teams(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_game_lineups_player
    FOREIGN KEY (player_id) REFERENCES players(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stadium_guides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  stadium VARCHAR(100) NOT NULL,
  food_summary TEXT NULL,
  parking_summary TEXT NULL,
  map_url VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stadium_guides_stadium (stadium)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  last_modified_by_user_id BIGINT UNSIGNED NULL,
  game_id BIGINT UNSIGNED NOT NULL,
  watch_type VARCHAR(20) NOT NULL DEFAULT 'stadium',
  cheered_team_id BIGINT UNSIGNED NULL,
  photo_url VARCHAR(500) NULL,
  memo TEXT NULL,
  my_team_score INT NULL,
  opponent_score INT NULL,
  result VARCHAR(10) NULL,
  is_score_modified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_user_game (user_id, game_id),
  KEY idx_attendance_game_id (game_id),
  CONSTRAINT fk_attendance_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_attendance_last_modified_by
    FOREIGN KEY (last_modified_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_attendance_game
    FOREIGN KEY (game_id) REFERENCES games(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_attendance_cheered_team
    FOREIGN KEY (cheered_team_id) REFERENCES teams(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance_companions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  attendance_record_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  responded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_companions_record_user (attendance_record_id, user_id),
  KEY idx_attendance_companions_user_id (user_id),
  CONSTRAINT fk_attendance_companions_record
    FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_attendance_companions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  attendance_record_id BIGINT UNSIGNED NULL,
  post_id BIGINT UNSIGNED NULL,
  type VARCHAR(50) NOT NULL,
  message VARCHAR(255) NOT NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_read (user_id, read_at, created_at),
  KEY idx_notifications_attendance_record_id (attendance_record_id),
  KEY idx_notifications_post_id (post_id),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_notifications_actor_user
    FOREIGN KEY (actor_user_id) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_notifications_attendance_record
    FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_reminders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  game_id BIGINT UNSIGNED NOT NULL,
  reminder_type VARCHAR(20) NOT NULL DEFAULT 'game_day',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_reminders_user_game_type (user_id, game_id, reminder_type),
  KEY idx_game_reminders_game_id (game_id),
  CONSTRAINT fk_game_reminders_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_game_reminders_game
    FOREIGN KEY (game_id) REFERENCES games(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_posts_created_at (created_at),
  KEY idx_posts_user_id (user_id),
  CONSTRAINT fk_posts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_post_id (post_id),
  KEY idx_comments_user_id (user_id),
  CONSTRAINT fk_comments_post
    FOREIGN KEY (post_id) REFERENCES posts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_comments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
