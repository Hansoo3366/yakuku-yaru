# GHCR 이미지 분리 배포

## 결정

Next.js·API Docker 이미지는 **GitHub Actions에서 빌드해 GHCR로 `push`**하고, GCP VM에서는 **`pull`과 `up --no-build`**만 수행한다.

## 배경

- e2-small(2 vCPU, 2GB)에서 `next build` 시 OOM·극심한 지연
- 배포할 때마다 VM에서 `npm install`과 빌드를 수행하면 시간이 오래 걸리거나 실패함

## 흐름

1. `main` push → GHA
2. Buildx로 `ghcr.io/<owner>/yakuku-yaru-web:sha` 빌드
3. SSH로 VM 접속
4. `docker compose pull && up -d --no-build`

## Secrets

`NEXT_PUBLIC_API_URL`은 **빌드 타임**에 web 이미지에 bake — 도메인 변경 시 Secret + 재배포 필요.

## 트레이드오프

| 장점 | 단점 |
|------|------|
| 소형 VM 배포 가능 | GHCR 권한·이미지 태그 관리 필요 |
| 배포 시간 단축 | 환경 변수 변경 시 이미지 재빌드 |

## 관련

- [[Project/야크크 야르 섹시야구/05 배포 및 운영]]
- [[e2-small VM 빌드 문제]]
- [[GitHub Actions SSH 인증 실패]]
