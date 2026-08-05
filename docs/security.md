# Production security

## 적용된 방어 계층

- Caddy: TLS, 잘못된 SNI 차단, 헤더·본문 읽기 시간 제한
- Nginx gateway: IP별 웹/API/이미지 요청 속도 제한, 동시 연결 제한, 13MB 본문 제한
- API: 프록시 공유 비밀값, 허용 Origin·Fetch Metadata 확인, 전역/기능별 rate limit
- Web: 요청별 nonce를 사용하는 CSP, 외부 스크립트·프레임·이미지 출처 제한
- Uploads: UUID 파일명만 조회, SVG 금지, magic byte 확인, Sharp 디코딩·WebP 재인코딩, 4천만 입력 픽셀 제한, 메타데이터 제거

업로드 이미지는 게시글과 프로필 표시를 위해 `/uploads/<uuid>.webp` 경로 자체는 공개입니다. 대신 디렉터리 조회와 임의 파일 경로는 막혀 있고, 교차 사이트 이미지 요청과 과도한 요청은 거부됩니다. 사용자별 비공개 사진이 필요해지면 공개 URL이 아니라 인증된 다운로드 라우트 또는 만료되는 서명 URL로 별도 설계해야 합니다.

## 서버 반영

```bash
cd ~/yakuku-yaru
git pull
bash scripts/deploy/setup-security-gateway.sh
docker compose -f docker-compose.prod.yml --env-file .env.production --profile proxy up -d --build api web gateway caddy
docker compose -f docker-compose.prod.yml --env-file .env.production --profile proxy ps
```

공개 도메인으로 확인합니다.

```bash
curl -I https://YOUR_DOMAIN/
curl -I https://YOUR_DOMAIN/api/health
curl -I https://YOUR_DOMAIN/uploads/not-a-valid-file.jpg
```

마지막 요청은 `404`가 정상입니다. 서버 IP의 `3000`, `4000`은 외부에서 연결되지 않아야 합니다. 운영 API를 localhost에서 직접 호출해도 프록시 비밀 헤더가 없으므로 `404`가 정상입니다.

## DDoS 경계

현재 gateway는 API 남용, 크롤러 폭주, 느린 요청, 소규모 L7 공격이 Node 프로세스를 고갈시키는 것을 줄입니다. 단일 VM 회선보다 큰 트래픽은 VM에 도착하기 전에 막아야 하므로 코드만으로 완전 차단할 수 없습니다.

실서비스 권장 순서:

1. Cloudflare Proxy 또는 Google Cloud HTTPS Load Balancer를 도메인 앞단에 둡니다.
2. 관리 화면에서 WAF, bot challenge, IP rate limiting을 켭니다.
3. GCP 방화벽의 80/443 인바운드를 선택한 프록시의 출발지 대역으로만 제한합니다.
4. 원본 VM IP를 DNS, 오류 페이지, 로그에 노출하지 않습니다.
5. 429/5xx 비율과 CPU·네트워크 사용량 경보를 설정합니다.

프록시 없이 GCP VM에 도메인이 직접 연결된 상태에서 3번을 먼저 적용하면 사이트가 끊기므로, CDN/LB 전환과 방화벽 변경은 같은 작업 창에서 진행해야 합니다.
