SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

INSERT INTO teams (name, short_name, primary_color)
VALUES
  ('LG 트윈스', 'LG', '#C30452'),
  ('두산 베어스', '두산', '#131230'),
  ('KIA 타이거즈', 'KIA', '#EA0029'),
  ('삼성 라이온즈', '삼성', '#074CA1'),
  ('한화 이글스', '한화', '#FF6600'),
  ('롯데 자이언츠', '롯데', '#041E42'),
  ('SSG 랜더스', 'SSG', '#CE0E2D'),
  ('NC 다이노스', 'NC', '#315288'),
  ('KT 위즈', 'KT', '#000000'),
  ('키움 히어로즈', '키움', '#570514')
ON DUPLICATE KEY UPDATE
  short_name = VALUES(short_name),
  primary_color = VALUES(primary_color);
