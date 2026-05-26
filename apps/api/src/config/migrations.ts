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

  const hasProfileImageUrl = await columnExists('users', 'profile_image_url');

  if (!hasProfileImageUrl) {
    await db.execute(
      `ALTER TABLE users
       ADD COLUMN profile_image_url VARCHAR(500) NULL AFTER nickname`,
    );
  }

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
}
