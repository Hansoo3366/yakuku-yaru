# GHCR 빌드 분리 배포

**위치**: `.github/workflows/deploy.yml`

## 패턴

```yaml
# 1. GitHub Actions (ubuntu-latest)에서 빌드
- docker build → ghcr.io/<owner>/yakuku-yaru-web:${GITHUB_SHA}
- docker push

# 2. SSH로 VM 접속
- docker compose pull
- docker compose up -d --no-build
```

## 재사용 포인트

- 소형 VM(e2-small)에서 `next build` OOM 방지
- 배포 시간 단축 (VM은 pull만)
- `NEXT_PUBLIC_*`는 빌드 타임 bake → Secret으로 주입

## 주의

- 환경 변수만 바꿀 때도 web 이미지 **재빌드** 필요
- VM에서 `--build` 붙이지 않기

## 관련

- [[Decisions/GHCR 빌드 분리 배포]]
- [[Issues/e2-small VM 빌드 부담]]
- [[05 배포 및 운영]]
