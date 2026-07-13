# Docker MySQL 초기화

## 증상

- 스키마 변경 후 테이블이 안 생김
- seed 데이터가 반영되지 않음
- `001_schema.sql` 수정해도 DB가 옛 상태

## 원인

MySQL Docker 이미지는 **최초 volume 생성 시에만** `docker-entrypoint-initdb.d` SQL을 실행한다. 이후 volume이 있으면 init 스크립트를 **다시 실행하지 않음**.

## 해결

### 개발 DB 완전 초기화

```bash
docker compose down -v
docker compose up -d mysql
```

⚠️ **모든 로컬 DB 데이터 삭제**

### 스키마 변경만 적용 (데이터 유지)

- 수동 migration SQL 실행
- 또는 `docker compose exec mysql mysql ... < migration.sql`

## 예방

- 스키마 변경은 `001_schema.sql` + 별도 migration 파일 습관화
- 프로덕션은 `down -v` 절대 금지 (volume 백업 먼저)

## 관련

- [[Project/야크크 야르 섹시야구/03 DB 설계]]
- [[Project/야크크 야르 섹시야구/05 배포 및 운영#데이터 보존 (Docker Volume)]]

## 로컬 기타

| 문제 | 해결 |
|------|------|
| Docker daemon 연결 실패 | Docker Desktop 실행 |
| 3306 포트 충돌 | `.env`에서 `MYSQL_PORT=3307` |
