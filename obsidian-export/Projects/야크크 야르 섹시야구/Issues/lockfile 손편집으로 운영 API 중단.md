# lockfile 손편집으로 운영 API 중단

## 증상

- 2026-11-16 9d962d7 배포 직후부터 `/api/*`가 모두 502/504. 웹 화면(`/`)은 200.
- 약 30분 동안 로그인·글쓰기 등 API 기능 전체 중단. d2bdbf1 배포로 복구.

## 원인

보안 패치 중 `package.json`의 `overrides`(body-parser 1.20.6, qs 6.15.3)가 옛 버전을 붙잡고 있어 `npm install`이 버전을 올리지 않았다. 이를 풀려고 `package-lock.json`에서 body-parser·qs 항목을 지웠다가 다시 넣는 과정에서, **body-parser의 하위 의존성(`bytes`, `raw-body` 등) 항목이 lockfile에서 빠졌다**.

- 개발 PC의 `node_modules`에는 이미 패키지가 있어서 typecheck·lint·test·build가 모두 통과했다.
- 운영 이미지는 `npm ci --workspace @yakuku-yaru/api --omit=dev`로 lockfile대로만 설치하므로 `bytes`가 없었고, express를 불러오는 순간 `Cannot find module 'bytes'`로 죽었다.
- 배포 health 체크는 [[배포 스크립트가 중간에 조용히 끝남]] 때문에 실행되지 않아 장애를 잡지 못했다.

## 재현

```bash
mkdir -p /tmp/prodci/apps/{api,web}
cp package.json package-lock.json /tmp/prodci/
cp apps/api/package.json /tmp/prodci/apps/api/; cp apps/web/package.json /tmp/prodci/apps/web/
cd /tmp/prodci && npm ci --workspace @yakuku-yaru/api --omit=dev --ignore-scripts
node -e "require('express')"   # Cannot find module 'bytes'
```

## 해결 (d2bdbf1)

1. 정상이던 직전 커밋(74d21a0)의 lockfile에서 다시 시작.
2. body-parser·qs 두 항목의 `version`/`resolved`/`integrity`만 바꾸고 `npm install`로 lockfile을 다시 만듦.
3. 위 재현 방식으로 설치한 뒤 빌드한 API를 실제로 띄워, DB 연결 단계까지 가는지 확인하고 배포.

## 예방

- lockfile을 고쳤으면 **운영과 같은 방식**(`npm ci --workspace ... --omit=dev`)으로 깨끗한 폴더에 설치해 API를 띄워 본다. 개발 PC의 `node_modules` 기준 검사는 믿지 않는다.
- 배포는 새 컨테이너가 재시작 없이 떠 있는지까지 확인한다 (da93bb0에서 추가).

## 관련

- [[배포 스크립트가 중간에 조용히 끝남]]
- [[Project/야크크 야르 섹시야구/작업 기록/2026-11-16 보안 점검·관리자 개편]]
