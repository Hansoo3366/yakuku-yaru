# MySQL 직접 사용

## 결정

Supabase / Firebase 등 BaaS 대신 **MySQL 8.4를 Docker로 직접 운영**한다.

## 배경

- 과제에서 DB 관계·스키마 설계·마이그레이션을 직접 경험해야 함
- KBO 도메인 테이블(경기, 선수, 라인업 등)이 많아 RLS·NoSQL보다 관계형이 자연스러움
- Express API가 이미 있어 Supabase Auth/Realtime 이점이 크지 않음

## 대안

| 대안 | 기각 이유 |
|------|----------|
| Supabase | 과제 목적(직접 SQL·관계 설계)과 겹침, KBO 대용량 sync에 Postgres도 동일 운영 부담 |
| SQLite | 프로덕션 멀티 컨테이너·동시 쓰기에 부적합 |
| MongoDB | 게시판·경기·동행자 관계가 정규화에 유리 |

## 결과

- `001_schema.sql` + seed로 스키마 버전 관리
- Docker volume `mysql_data`로 데이터 영속
- 추후 Cloud SQL 등 managed DB로 이전 가능 (연결 문자열만 변경)

## 관련

- [[Project/야크크 야르 섹시야구/03 DB 설계]]
- [[Project/야크크 야르 섹시야구/05 배포 및 운영]]

## 날짜

프로젝트 초기 (Phase 0~1)
