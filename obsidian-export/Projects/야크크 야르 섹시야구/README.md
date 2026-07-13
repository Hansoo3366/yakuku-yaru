# 야크크 야르~ 섹시야구 — Obsidian 인덱스

> 레포: `yakuku-yaru`  
> 옵시디언 vault의 `Projects/야크크 야르 섹시야구/` 폴더로 복사하거나, vault root를 레포로 두면 됩니다.

## 시작하기

1. [[00 프로젝트 개요]]
2. [[01 요구사항]]
3. [[02 기능 목록]]

## 설계

- [[03 DB 설계]]
- [[04 화면 구조]]
- [[05 배포 및 운영]]

## 의사결정 (`Decisions/`)

- [[Decisions/MySQL 직접 사용]]
- [[Decisions/KBO 크롤링 방식]]
- [[Decisions/httpOnly Cookie 인증]]
- [[Decisions/GHCR 빌드 분리 배포]]
- [[Decisions/공식 스코어 사용자 수정 불가]]

## 이슈 (`Issues/`)

- [[Issues/GitHub Actions SSH 인증 실패]]
- [[Issues/KBO 파서 구조 변경 대응]]
- [[Issues/e2-small VM 빌드 부담]]
- [[Issues/Docker MySQL 초기화]]

## 기능 (`Features/`)

- [[Features/직관 집관 기록]]
- [[Features/KBO 데이터 동기화]]
- [[Features/동행자 태그]]
- [[Features/승리요정 타이틀]]
- [[Features/게시판]]

## 재사용 코드 (`Snippets/`)

- [[Snippets/ApiError 공통 API 클라이언트]]
- [[Snippets/httpOnly Cookie JWT]]
- [[Snippets/인메모리 rate limit]]
- [[Snippets/클라이언트 WebP 리사이즈]]
- [[Snippets/XSS 입력 정제]]
- [[Snippets/KBO 경기 upsert 키]]
- [[Snippets/GHCR 빌드 분리 배포]]

> 전체 목록·요약: [[06 재사용 코드]]

## 회고

- [[회고]]

---

## 레포 원본 문서 (상세)

| 파일 | 내용 |
|------|------|
| `README.md` | 프로젝트 소개, 로컬 실행, 배포 URL |
| `docs/product-spec.md` | 제품 스펙, 사용자 흐름, Non-Goals |
| `docs/architecture.md` | 모노레포 구조, 시스템·인증·배포 흐름 |
| `docs/database.md` | 테이블 상세, 제약 조건 |
| `docs/api-spec.md` | REST API 엔드포인트 |
| `docs/frontend-spec.md` | 라우트, 상태 관리, 화면 구성 |
| `docs/design-system.md` | 디자인 토큰, 컴포넌트 규칙 |
| `docs/kbo-data-sync.md` | KBO 동기화 모드, cron, 파싱 규칙 |
| `docs/pwa-spec.md` | manifest, service worker |
| `docs/docker-setup.md` | 로컬 Docker, 자주 나는 문제 |
| `docs/deployment.md` | GCE 배포, GHA, SSH, HTTPS |
| `docs/evaluation-notes.md` | 발표·질의응답용 구현 설명 |
| `docs/development-plan.md` | 개발 단계(Phase) 요약 |
| `docs/work-order.md` | 세부 작업 체크리스트 |
| `apps/api/db/init/001_schema.sql` | DB 스키마 원본 |

## 운영 URL

| 서비스 | URL |
|--------|-----|
| Web | https://yakuku-yaru.today |
| API health | https://yakuku-yaru.today/api/health |
| Swagger | https://yakuku-yaru.today/api-docs |
