import type { RowDataPacket } from 'mysql2';
import { db } from './database.js';
import { env } from './env.js';

async function tableExists(tableName: string) {
  const [rows] = await db.query<(RowDataPacket & { count: number })[]>(
    `SELECT COUNT(*) AS count
     FROM information_schema.tables
     WHERE table_schema = ?
       AND table_name = ?`,
    [env.database.name, tableName],
  );

  return Number(rows[0]?.count ?? 0) > 0;
}

async function columnExists(tableName: string, columnName: string) {
  const [rows] = await db.query<(RowDataPacket & { count: number })[]>(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = ?
       AND table_name = ?
       AND column_name = ?`,
    [env.database.name, tableName, columnName],
  );

  return Number(rows[0]?.count ?? 0) > 0;
}

export async function runMigrations() {
  const hasWatchType = await columnExists('attendance_records', 'watch_type');

  if (!hasWatchType) {
    await db.execute(
      `ALTER TABLE attendance_records
       ADD COLUMN watch_type VARCHAR(20) NOT NULL DEFAULT 'stadium'
       AFTER game_id`,
    );
  }

  const hasLastModifiedByUserId = await columnExists(
    'attendance_records',
    'last_modified_by_user_id',
  );

  if (!hasLastModifiedByUserId) {
    await db.execute(
      `ALTER TABLE attendance_records
       ADD COLUMN last_modified_by_user_id BIGINT UNSIGNED NULL AFTER user_id`,
    );

    await db.execute(
      `UPDATE attendance_records
       SET last_modified_by_user_id = user_id
       WHERE last_modified_by_user_id IS NULL`,
    );
  }

  const hasTeamTicketUrl = await columnExists('teams', 'ticket_url');

  if (!hasTeamTicketUrl) {
    await db.execute(
      `ALTER TABLE teams
       ADD COLUMN ticket_url VARCHAR(500) NULL AFTER primary_color`,
    );
  }

  const hasGameExternalSource = await columnExists('games', 'external_source');

  if (!hasGameExternalSource) {
    await db.execute(
      `ALTER TABLE games
       ADD COLUMN external_source VARCHAR(20) NULL AFTER status,
       ADD COLUMN external_id VARCHAR(64) NULL AFTER external_source`,
    );

    await db.execute(
      `CREATE UNIQUE INDEX uq_games_external
       ON games (external_source, external_id)`,
    );
  }

  const hasCancellationReason = await columnExists('games', 'cancellation_reason');

  if (!hasCancellationReason) {
    await db.execute(
      `ALTER TABLE games
       ADD COLUMN cancellation_reason VARCHAR(30) NULL AFTER status`,
    );
  }

  const hasLineupConfirmed = await columnExists('games', 'lineup_confirmed');

  if (!hasLineupConfirmed) {
    await db.execute(
      `ALTER TABLE games
       ADD COLUMN lineup_confirmed BOOLEAN NULL AFTER cancellation_reason`,
    );
  }

  const hasProfileImageUrl = await columnExists('users', 'profile_image_url');

  if (!hasProfileImageUrl) {
    await db.execute(
      `ALTER TABLE users
       ADD COLUMN profile_image_url VARCHAR(500) NULL AFTER nickname`,
    );
  }

  await db.execute(
    `UPDATE attendance_records
     SET photo_url = SUBSTRING(photo_url, LOCATE('/uploads/', photo_url))
     WHERE photo_url IS NOT NULL
       AND photo_url NOT LIKE '/uploads/%'
       AND LOCATE('/uploads/', photo_url) > 0`,
  );

  await db.execute(
    `UPDATE users
     SET profile_image_url = SUBSTRING(profile_image_url, LOCATE('/uploads/', profile_image_url))
     WHERE profile_image_url IS NOT NULL
       AND profile_image_url NOT LIKE '/uploads/%'
       AND LOCATE('/uploads/', profile_image_url) > 0`,
  );

  const hasUserRole = await columnExists('users', 'role');

  if (!hasUserRole) {
    await db.execute(
      `ALTER TABLE users
       ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user' AFTER profile_image_url`,
    );
  }

  await db.execute(
    `UPDATE teams
     SET ticket_url = CASE short_name
       WHEN 'LG' THEN 'https://www.ticketlink.co.kr/sports/137/59'
       WHEN '두산' THEN 'https://ticket.interpark.com/Contents/Sports/GoodsInfo?SportsCode=07001&TeamCode=PB004'
       WHEN 'KIA' THEN 'https://www.ticketlink.co.kr/sports/137/58'
       WHEN '삼성' THEN 'https://www.ticketlink.co.kr/sports/137/57'
       WHEN '한화' THEN 'https://www.ticketlink.co.kr/sports/137/63'
       WHEN '롯데' THEN 'https://ticket.giantsclub.com/loginForm.do'
       WHEN 'SSG' THEN 'https://ticket.ssg.com/ticket'
       WHEN 'NC' THEN 'https://ticket.ncdinos.com/games'
       WHEN 'KT' THEN 'https://www.ticketlink.co.kr/sports/137/62'
       WHEN '키움' THEN 'https://ticket.interpark.com/Contents/Sports/GoodsInfo?SportsCode=07001&TeamCode=PB003'
       ELSE ticket_url
     END
     WHERE short_name IN ('LG', '두산', 'KIA', '삼성', '한화', '롯데', 'SSG', 'NC', 'KT', '키움')`,
  );

  await db.execute(
    `UPDATE games SET ticket_url = NULL
     WHERE ticket_url = 'https://www.ticketlink.co.kr/sports/baseball'`,
  );

  await db.execute(
    `CREATE TABLE IF NOT EXISTS stadium_guides (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      stadium VARCHAR(100) NOT NULL,
      food_summary TEXT NULL,
      parking_summary TEXT NULL,
      map_url VARCHAR(500) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_stadium_guides_stadium (stadium)
    )`,
  );

  await db.execute(
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
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
    )`,
  );

  await db.execute(
    `CREATE TABLE IF NOT EXISTS game_reminders (
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
    )`,
  );

  await db.execute(
    `CREATE TABLE IF NOT EXISTS players (
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
    )`,
  );

  const hasPlayerHeight = await columnExists('players', 'height_cm');

  if (!hasPlayerHeight) {
    await db.execute(
      `ALTER TABLE players
       ADD COLUMN height_cm INT NULL AFTER position,
       ADD COLUMN weight_kg INT NULL AFTER height_cm`,
    );
  }

  const hasPlayerSchool = await columnExists('players', 'school');

  if (!hasPlayerSchool) {
    await db.execute(
      `ALTER TABLE players
       ADD COLUMN school VARCHAR(500) NULL AFTER birth_date`,
    );
  }

  const hasPlayerProfileImageUrl = await columnExists(
    'players',
    'profile_image_url',
  );

  if (!hasPlayerProfileImageUrl) {
    await db.execute(
      `ALTER TABLE players
       ADD COLUMN profile_image_url VARCHAR(500) NULL AFTER school`,
    );
  }

  const hasPlayerSeasonBattingAvg = await columnExists(
    'players',
    'season_batting_avg',
  );

  if (!hasPlayerSeasonBattingAvg) {
    await db.execute(
      `ALTER TABLE players
       ADD COLUMN season_batting_avg DECIMAL(5,3) NULL AFTER profile_image_url,
       ADD COLUMN season_ops DECIMAL(5,3) NULL AFTER season_batting_avg`,
    );
  }

  await db.execute(
    `CREATE TABLE IF NOT EXISTS game_starting_pitchers (
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
    )`,
  );

  const startingPitcherStatColumns = [
    ['era', 'DECIMAL(5,2) NULL AFTER is_confirmed'],
    ['war', 'DECIMAL(5,2) NULL AFTER era'],
    ['games', 'INT NULL AFTER war'],
    ['starter_average_innings', 'VARCHAR(10) NULL AFTER games'],
    ['quality_starts', 'INT NULL AFTER starter_average_innings'],
    ['whip', 'DECIMAL(5,2) NULL AFTER quality_starts'],
    ['season_record', 'VARCHAR(50) NULL AFTER whip'],
  ] as const;

  for (const [columnName, columnSql] of startingPitcherStatColumns) {
    const exists = await columnExists('game_starting_pitchers', columnName);

    if (!exists) {
      await db.execute(
        `ALTER TABLE game_starting_pitchers
         ADD COLUMN ${columnName} ${columnSql}`,
      );
    }
  }

  await db.execute(
    `CREATE TABLE IF NOT EXISTS game_lineups (
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
    )`,
  );

  const hasLineupWar = await columnExists('game_lineups', 'war');

  if (!hasLineupWar) {
    await db.execute(
      `ALTER TABLE game_lineups
       ADD COLUMN war DECIMAL(5,2) NULL AFTER field_position`,
    );
  }

  await db.execute(
    `CREATE TABLE IF NOT EXISTS player_cheers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      player_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(100) NULL,
      youtube_id VARCHAR(32) NULL,
      youtube_url VARCHAR(500) NULL,
      lyrics TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_player_cheers_player_id (player_id),
      CONSTRAINT fk_player_cheers_player
        FOREIGN KEY (player_id) REFERENCES players(id)
        ON DELETE CASCADE
    )`,
  );

  await db.execute(
    `CREATE TABLE IF NOT EXISTS team_cheers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      team_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(100) NULL,
      youtube_id VARCHAR(32) NULL,
      youtube_url VARCHAR(500) NULL,
      lyrics TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_team_cheers_team_id (team_id),
      CONSTRAINT fk_team_cheers_team
        FOREIGN KEY (team_id) REFERENCES teams(id)
        ON DELETE CASCADE
    )`,
  );

  const hasPlayerCheerYoutubeId = await columnExists('player_cheers', 'youtube_id');

  if (!hasPlayerCheerYoutubeId) {
    await db.execute(
      `ALTER TABLE player_cheers
       ADD COLUMN youtube_id VARCHAR(32) NULL AFTER title`,
    );
  }

  await db.execute(
    `CREATE TABLE IF NOT EXISTS attendance_companions (
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
    )`,
  );

  await db.execute(
    `CREATE TABLE IF NOT EXISTS user_follows (
      follower_user_id BIGINT UNSIGNED NOT NULL,
      followed_user_id BIGINT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_user_id, followed_user_id),
      KEY idx_user_follows_followed_created (followed_user_id, created_at),
      CONSTRAINT fk_user_follows_follower
        FOREIGN KEY (follower_user_id) REFERENCES users(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_user_follows_followed
        FOREIGN KEY (followed_user_id) REFERENCES users(id)
        ON DELETE CASCADE,
      CONSTRAINT chk_user_follows_different_users
        CHECK (follower_user_id <> followed_user_id)
    )`,
  );

  const hasCompanionRespondedAt = await columnExists(
    'attendance_companions',
    'responded_at',
  );

  if (!hasCompanionRespondedAt) {
    await db.execute(
      `ALTER TABLE attendance_companions
       ADD COLUMN responded_at DATETIME NULL AFTER status`,
    );
  }

  await db.execute(
    `UPDATE attendance_companions
     SET status = 'pending'
     WHERE status NOT IN ('pending', 'accepted', 'rejected')`,
  );

  await db.execute(
    `CREATE TABLE IF NOT EXISTS attendance_viewer_preferences (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      game_id BIGINT UNSIGNED NOT NULL,
      cheered_team_id BIGINT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_attendance_viewer_preferences_user_game (user_id, game_id),
      KEY idx_attendance_viewer_preferences_game_id (game_id),
      KEY idx_attendance_viewer_preferences_cheered_team_id (cheered_team_id),
      CONSTRAINT fk_attendance_viewer_preferences_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_attendance_viewer_preferences_game
        FOREIGN KEY (game_id) REFERENCES games(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_attendance_viewer_preferences_cheered_team
        FOREIGN KEY (cheered_team_id) REFERENCES teams(id)
        ON DELETE CASCADE
    )`,
  );

  await db.execute(
    `CREATE TABLE IF NOT EXISTS notifications (
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
    )`,
  );

  const hasNotificationPostId = await columnExists('notifications', 'post_id');

  if (!hasNotificationPostId) {
    await db.execute(
      `ALTER TABLE notifications
       ADD COLUMN post_id BIGINT UNSIGNED NULL AFTER attendance_record_id,
       ADD KEY idx_notifications_post_id (post_id)`,
    );
  }

  await db.execute(
    `INSERT INTO stadium_guides (stadium, food_summary, parking_summary, map_url)
     VALUES
       ('잠실야구장', '종합운동장역 주변 분식, 치킨, 맥주 포장 매장이 많습니다. 경기 전에는 새내역 방면 식당도 선택지가 좋습니다.', '종합운동장 부설 주차장은 경기일 혼잡이 심합니다. 대중교통 이용을 권장하고, 차량 이용 시 탄천 주차장과 주변 공영주차장을 함께 확인하세요.', 'https://map.naver.com/p/search/잠실야구장'),
       ('광주-KIA 챔피언스 필드', '구장 주변 상무지구와 광주송정역 방면 식당을 함께 보기 좋습니다. 경기 전후 이동 시간을 고려하세요.', '챔피언스 필드 주차장은 조기 만차 가능성이 높습니다. 임시 주차장 운영 여부와 셔틀 안내를 경기일에 확인하세요.', 'https://map.naver.com/p/search/광주-KIA%20챔피언스%20필드'),
       ('대전 한화생명 볼파크', '대전역, 중앙로, 둔산동 방면 맛집을 경기 일정과 함께 묶어보기 좋습니다.', '구장 인근 교통 통제가 있을 수 있어 공영주차장과 대중교통 동선을 함께 확인하세요.', 'https://map.naver.com/p/search/대전%20한화생명%20볼파크'),
       ('사직야구장', '사직동, 미남역, 동래 방면에 부산식 돼지국밥, 밀면, 치킨 포장 선택지가 많습니다.', '사직종합운동장 주차장은 경기일 혼잡합니다. 주변 공영주차장과 도시철도 이동을 우선 검토하세요.', 'https://map.naver.com/p/search/사직야구장'),
       ('창원 NC파크', '마산회원구와 창동 방면 식당을 함께 보기 좋고, 구장 주변 포장 메뉴도 많습니다.', 'NC파크 주차장은 경기일 빠르게 혼잡해질 수 있습니다. 임시 주차장 안내와 셔틀 정보를 확인하세요.', 'https://map.naver.com/p/search/창원%20NC파크'),
       ('고척스카이돔', '고척돔 주변과 구일역, 개봉역 방면 식당을 함께 찾기 좋습니다. 실내 구장이라 우천 시에도 일정 활용도가 높습니다.', '구장 주차 공간이 제한적입니다. 지하철 1호선 구일역 이용을 권장합니다.', 'https://map.naver.com/p/search/고척스카이돔'),
       ('수원 KT위즈파크', '수원종합운동장 주변과 화서역 방면 식당을 함께 보기 좋습니다.', '종합운동장 주차장은 경기일 혼잡합니다. 대중교통과 주변 공영주차장을 함께 확인하세요.', 'https://map.naver.com/p/search/수원%20KT위즈파크'),
       ('인천 SSG랜더스필드', '문학경기장역 주변 포장 메뉴와 인천터미널 방면 식당을 함께 보기 좋습니다.', '문학경기장 주차장은 경기일 혼잡할 수 있습니다. 지하철 문학경기장역 이용을 권장합니다.', 'https://map.naver.com/p/search/인천%20SSG랜더스필드')
     ON DUPLICATE KEY UPDATE
       food_summary = VALUES(food_summary),
       parking_summary = VALUES(parking_summary),
       map_url = VALUES(map_url)`,
  );

  const hasTeamStandings = await tableExists('team_standings');

  if (!hasTeamStandings) {
    await db.execute(
      `CREATE TABLE team_standings (
         id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
         season_year INT NOT NULL,
         rank_date DATE NOT NULL,
         series_id VARCHAR(20) NOT NULL DEFAULT '0',
         team_id BIGINT UNSIGNED NOT NULL,
         rank_position INT NOT NULL,
         games INT NOT NULL,
         wins INT NOT NULL,
         losses INT NOT NULL,
         draws INT NOT NULL,
         win_rate DECIMAL(5, 3) NOT NULL,
         games_behind DECIMAL(4, 1) NOT NULL DEFAULT 0,
         recent_ten VARCHAR(20) NULL,
         streak VARCHAR(20) NULL,
         synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (id),
         UNIQUE KEY uq_team_standings_snapshot (season_year, rank_date, series_id, team_id),
         KEY idx_team_standings_lookup (season_year, series_id, rank_date),
         CONSTRAINT fk_team_standings_team
           FOREIGN KEY (team_id) REFERENCES teams(id)
           ON DELETE CASCADE
       )`,
    );
  }

  const hasTeamStandingsRecentTen = await columnExists(
    'team_standings',
    'recent_ten',
  );

  if (!hasTeamStandingsRecentTen) {
    await db.execute(
      `ALTER TABLE team_standings
       ADD COLUMN recent_ten VARCHAR(20) NULL AFTER games_behind`,
    );
  }

  const hasTeamStandingsStreak = await columnExists('team_standings', 'streak');

  if (!hasTeamStandingsStreak) {
    await db.execute(
      `ALTER TABLE team_standings
       ADD COLUMN streak VARCHAR(20) NULL AFTER recent_ten`,
    );
  }

  const hasSeasonProjectionSnapshots = await tableExists(
    'season_projection_snapshots',
  );

  if (!hasSeasonProjectionSnapshots) {
    await db.execute(
      `CREATE TABLE season_projection_snapshots (
         id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
         season_year INT NOT NULL,
         rank_date DATE NOT NULL,
         series_id VARCHAR(20) NOT NULL DEFAULT '0',
         model_version VARCHAR(80) NOT NULL,
         simulations INT NOT NULL,
         min_games INT NOT NULL,
         remaining_games INT NOT NULL,
         projected_games INT NOT NULL,
         generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (id),
         UNIQUE KEY uq_season_projection_snapshot (season_year, rank_date, series_id, model_version),
         KEY idx_season_projection_lookup (season_year, series_id, model_version, rank_date, generated_at)
       )`,
    );
  }

  const hasSeasonProjectionRows = await tableExists('season_projection_rows');

  if (!hasSeasonProjectionRows) {
    await db.execute(
      `CREATE TABLE season_projection_rows (
         id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
         snapshot_id BIGINT UNSIGNED NOT NULL,
         team_id BIGINT UNSIGNED NOT NULL,
         playoff_probability DECIMAL(7, 4) NOT NULL DEFAULT 0,
         average_rank DECIMAL(8, 4) NOT NULL,
         average_wins DECIMAL(8, 4) NOT NULL,
         average_draws DECIMAL(8, 4) NOT NULL,
         average_losses DECIMAL(8, 4) NOT NULL,
         expected_win_rate DECIMAL(7, 4) NOT NULL,
         current_win_rate DECIMAL(7, 4) NOT NULL,
         pythagorean_win_rate DECIMAL(7, 4) NOT NULL,
         schedule_adjusted_win_rate DECIMAL(7, 4) NOT NULL,
         current_rank INT NOT NULL,
         PRIMARY KEY (id),
         UNIQUE KEY uq_season_projection_row (snapshot_id, team_id),
         KEY idx_season_projection_rows_team (team_id),
         CONSTRAINT fk_season_projection_rows_snapshot
           FOREIGN KEY (snapshot_id) REFERENCES season_projection_snapshots(id)
           ON DELETE CASCADE,
         CONSTRAINT fk_season_projection_rows_team
           FOREIGN KEY (team_id) REFERENCES teams(id)
           ON DELETE CASCADE
       )`,
    );
  }

  const hasSeasonProjectionRowsPlayoffProbability = await columnExists(
    'season_projection_rows',
    'playoff_probability',
  );

  if (!hasSeasonProjectionRowsPlayoffProbability) {
    await db.execute(
      `ALTER TABLE season_projection_rows
       ADD COLUMN playoff_probability DECIMAL(7, 4) NOT NULL DEFAULT 0
       AFTER team_id`,
    );
  }

  const hasSeasonPostseasonProjectionRows = await tableExists(
    'season_postseason_projection_rows',
  );

  if (!hasSeasonPostseasonProjectionRows) {
    await db.execute(
      `CREATE TABLE season_postseason_projection_rows (
         id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
         snapshot_id BIGINT UNSIGNED NOT NULL,
         team_id BIGINT UNSIGNED NOT NULL,
         seed INT NOT NULL,
         average_final_rank DECIMAL(8, 4) NOT NULL,
         korean_series_probability DECIMAL(7, 4) NOT NULL,
         championship_probability DECIMAL(7, 4) NOT NULL,
         pythagorean_win_rate DECIMAL(7, 4) NOT NULL,
         projected_win_rate DECIMAL(7, 4) NOT NULL,
         PRIMARY KEY (id),
         UNIQUE KEY uq_season_postseason_projection_row (snapshot_id, team_id),
         KEY idx_season_postseason_projection_rows_team (team_id),
         CONSTRAINT fk_season_postseason_projection_rows_snapshot
           FOREIGN KEY (snapshot_id) REFERENCES season_projection_snapshots(id)
           ON DELETE CASCADE,
         CONSTRAINT fk_season_postseason_projection_rows_team
           FOREIGN KEY (team_id) REFERENCES teams(id)
           ON DELETE CASCADE
       )`,
    );
  }

  await db.execute(
    `INSERT INTO games (
      game_date,
      stadium,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      status,
      ticket_url,
      ticket_open_at
    )
    VALUES
      ('2026-06-02 18:30:00', '잠실야구장', 1, 5, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-05-26 11:00:00'),
      ('2026-06-03 18:30:00', '잠실야구장', 1, 5, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-05-27 11:00:00'),
      ('2026-06-04 18:30:00', '잠실야구장', 1, 5, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-05-28 11:00:00'),
      ('2026-06-05 18:30:00', '수원 KT위즈파크', 9, 6, 4, 6, 'finished', 'https://www.ticketlink.co.kr/sports/baseball', '2026-05-29 11:00:00'),
      ('2026-06-06 17:00:00', '인천 SSG랜더스필드', 7, 2, 2, 7, 'finished', 'https://www.ticketlink.co.kr/sports/baseball', '2026-05-30 11:00:00'),
      ('2026-06-07 14:00:00', '광주-KIA 챔피언스 필드', 3, 8, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-05-31 11:00:00'),
      ('2026-06-11 18:30:00', '대전 한화생명 볼파크', 5, 10, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-06-04 11:00:00'),
      ('2026-06-13 17:00:00', '사직야구장', 6, 4, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-06-06 11:00:00'),
      ('2026-06-14 14:00:00', '고척스카이돔', 10, 1, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-06-07 11:00:00'),
      ('2026-06-20 17:00:00', '창원 NC파크', 8, 7, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-06-13 11:00:00'),
      ('2026-06-21 14:00:00', '잠실야구장', 2, 3, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-06-14 11:00:00')
    ON DUPLICATE KEY UPDATE
      stadium = VALUES(stadium),
      home_score = VALUES(home_score),
      away_score = VALUES(away_score),
      status = VALUES(status),
      ticket_url = VALUES(ticket_url),
      ticket_open_at = VALUES(ticket_open_at)`,
  );

  const hasCheeredTeamId = await columnExists(
    'attendance_records',
    'cheered_team_id',
  );

  if (!hasCheeredTeamId) {
    await db.execute(
      `ALTER TABLE attendance_records
       ADD COLUMN cheered_team_id BIGINT UNSIGNED NULL AFTER watch_type,
       ADD KEY idx_attendance_cheered_team_id (cheered_team_id),
       ADD CONSTRAINT fk_attendance_cheered_team
         FOREIGN KEY (cheered_team_id) REFERENCES teams(id)
         ON DELETE SET NULL`,
    );
  }

  const hasUserStadiumNotes = await tableExists('user_stadium_notes');

  if (!hasUserStadiumNotes) {
    await db.execute(
      `CREATE TABLE user_stadium_notes (
         id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
         user_id BIGINT UNSIGNED NOT NULL,
         stadium VARCHAR(100) NOT NULL,
         food_memo TEXT NOT NULL,
         parking_memo TEXT NOT NULL,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
         PRIMARY KEY (id),
         UNIQUE KEY uq_user_stadium_notes_user_stadium (user_id, stadium),
         KEY idx_user_stadium_notes_stadium (stadium),
         CONSTRAINT fk_user_stadium_notes_user
           FOREIGN KEY (user_id) REFERENCES users(id)
           ON DELETE CASCADE
       )`,
    );
  } else {
    const hasFoodMemo = await columnExists('user_stadium_notes', 'food_memo');

    if (!hasFoodMemo) {
      await db.execute(
        `ALTER TABLE user_stadium_notes
         ADD COLUMN food_memo TEXT NULL AFTER stadium,
         ADD COLUMN parking_memo TEXT NULL AFTER food_memo`,
      );

      const hasLegacyMemo = await columnExists('user_stadium_notes', 'memo');

      if (hasLegacyMemo) {
        await db.execute(
          `UPDATE user_stadium_notes
           SET food_memo = COALESCE(NULLIF(memo, ''), food_memo, '')`,
        );
        await db.execute(`ALTER TABLE user_stadium_notes DROP COLUMN memo`);
      }

      await db.execute(
        `UPDATE user_stadium_notes
         SET food_memo = COALESCE(food_memo, ''),
             parking_memo = COALESCE(parking_memo, '')`,
      );

      await db.execute(
        `ALTER TABLE user_stadium_notes
         MODIFY COLUMN food_memo TEXT NOT NULL,
         MODIFY COLUMN parking_memo TEXT NOT NULL`,
      );
    }
  }
}
