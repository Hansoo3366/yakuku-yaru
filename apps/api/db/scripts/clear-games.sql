-- 경기 일정 및 경기에 묶인 직관·알림 예약만 삭제 (users·게시판 유지)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE attendance_companions;
TRUNCATE TABLE attendance_records;
TRUNCATE TABLE game_reminders;
TRUNCATE TABLE games;

SET FOREIGN_KEY_CHECKS = 1;
