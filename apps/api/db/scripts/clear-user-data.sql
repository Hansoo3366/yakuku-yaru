-- 사용자·가입·게시판·직관·알림 등 사용자 생성 데이터만 삭제합니다.
-- teams, games, stadium_guides 등 마스터/일정 데이터는 유지합니다.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE comments;
TRUNCATE TABLE posts;
TRUNCATE TABLE notifications;
TRUNCATE TABLE attendance_companions;
TRUNCATE TABLE attendance_records;
TRUNCATE TABLE game_reminders;
TRUNCATE TABLE password_reset_tokens;
TRUNCATE TABLE email_verification_tokens;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;
