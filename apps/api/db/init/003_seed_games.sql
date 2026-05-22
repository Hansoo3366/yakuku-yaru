SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

INSERT INTO games (
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
  ('2026-05-17 14:00:00', '잠실야구장', 1, 2, 5, 3, 'finished', 'https://www.ticketlink.co.kr/sports/baseball', '2026-05-10 11:00:00'),
  ('2026-05-20 18:30:00', '광주-KIA 챔피언스 필드', 3, 4, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-05-13 11:00:00'),
  ('2026-05-21 18:30:00', '대전 한화생명 볼파크', 5, 1, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-05-14 11:00:00'),
  ('2026-05-22 18:30:00', '사직야구장', 6, 7, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-05-15 11:00:00'),
  ('2026-05-23 17:00:00', '창원 NC파크', 8, 9, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-05-16 11:00:00'),
  ('2026-05-24 14:00:00', '고척스카이돔', 10, 3, NULL, NULL, 'scheduled', 'https://www.ticketlink.co.kr/sports/baseball', '2026-05-17 11:00:00'),
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
  ticket_open_at = VALUES(ticket_open_at);
