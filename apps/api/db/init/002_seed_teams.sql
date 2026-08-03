SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

INSERT INTO teams (name, short_name, primary_color, ticket_url)
VALUES
  ('LG 트윈스', 'LG', '#C30452', 'https://www.ticketlink.co.kr/sports/137/59'),
  ('두산 베어스', '두산', '#131230', 'https://nol.yanolja.com/ticket/genre/sports/bears'),
  ('KIA 타이거즈', 'KIA', '#EA0029', 'https://www.ticketlink.co.kr/sports/137/58'),
  ('삼성 라이온즈', '삼성', '#074CA1', 'https://www.ticketlink.co.kr/sports/137/57'),
  ('한화 이글스', '한화', '#FF6600', 'https://www.ticketlink.co.kr/sports/137/63'),
  ('롯데 자이언츠', '롯데', '#041E42', 'https://ticket.giantsclub.com/loginForm.do'),
  ('SSG 랜더스', 'SSG', '#CE0E2D', 'https://ticket.ssg.com/ticket'),
  ('NC 다이노스', 'NC', '#315288', 'https://ticket.ncdinos.com/games'),
  ('KT 위즈', 'KT', '#000000', 'https://www.ticketlink.co.kr/sports/137/62'),
  ('키움 히어로즈', '키움', '#570514', 'https://nol.yanolja.com/ticket/genre/sports/heroes')
ON DUPLICATE KEY UPDATE
  short_name = VALUES(short_name),
  primary_color = VALUES(primary_color),
  ticket_url = VALUES(ticket_url);
