# e2-small VM 빌드 문제

## 증상

GCP VM에서 `docker compose up --build` 시:

- Next.js `next build` 메모리 부족 (OOM kill)
- 배포 10분+ 소요 또는 실패
- 배포 중 API·Web 동시 중단

## 원인

- e2-small: 2 vCPU, 2GB RAM
- Next.js production build는 단일 프로세스에 1GB+ 사용 가능
- MySQL·API·빌드가 같은 VM에서 경쟁

## 해결

→ [[GHCR 이미지 분리 배포]]

1. GitHub Actions (ubuntu-latest)에서 이미지 빌드
2. GHCR push
3. VM: `docker compose pull && up -d --no-build`

추가:

- `concurrency: production-deploy`로 중복 배포 취소
- VM에서 `--build` 사용 금지 (문서·workflow 통일)

## 여전히 남는 제약

- 단일 인스턴스 → `up` 시 짧은 다운타임
- 이미지 pull 크기·시간 (캐시 layer 활용)

## 관련

- [[Project/야크크 야르 섹시야구/05 배포 및 운영]]
