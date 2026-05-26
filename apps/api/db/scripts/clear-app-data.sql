-- 앱 데이터 전부 삭제 (팀·구장 가이드 마스터는 유지)
-- 이후: npm run db:reset-app 또는 KBO season 동기화

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
TRUNCATE TABLE games;

SET FOREIGN_KEY_CHECKS = 1;
