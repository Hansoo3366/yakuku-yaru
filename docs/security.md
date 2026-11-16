# Production security

## 적용된 방어 계층

- Caddy: TLS, 잘못된 SNI 차단, 헤더·본문 읽기 시간 제한
- Nginx gateway: IP별 웹/API/이미지 요청 속도 제한, 동시 연결 제한, 13MB 본문 제한
- API: 허용 Origin·Fetch Metadata 확인, 전역/기능별 rate limit, JWT 권한 검사
- Web: 요청별 nonce를 사용하는 CSP, 외부 스크립트·프레임·이미지 출처 제한
- Uploads: UUID 파일명만 조회, SVG 금지, magic byte 확인, Sharp 디코딩·WebP 재인코딩, 4천만 입력 픽셀 제한, 메타데이터 제거

업로드 이미지는 게시글과 프로필 표시를 위해 `/uploads/<uuid>.webp` 경로 자체는 공개입니다. 대신 디렉터리 조회와 임의 파일 경로는 막혀 있고, 교차 사이트 이미지 요청과 과도한 요청은 거부됩니다. 사용자별 비공개 사진이 필요해지면 공개 URL이 아니라 인증된 다운로드 라우트 또는 만료되는 서명 URL로 별도 설계해야 합니다.

## 서버 접근

| 항목                | 현재 상태                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| SSH 22번            | GCP 방화벽에서 IAP 대역(`35.235.240.0/20`)에만 열림. 외부 IP로 직접 SSH 불가                            |
| 사람의 접속         | GCP Console 브라우저 SSH 또는 `gcloud compute ssh --tunnel-through-iap`                                 |
| 자동 배포 로그인    | GitHub Actions가 Workload Identity로 GCP에 로그인. 이 저장소의 `main`에서 돈 workflow만 허용            |
| 배포 키             | `deploy` 사용자 전용. `restrict,command="/usr/local/bin/yakuku-deploy"`로 셸·포트 포워딩·다른 명령 차단 |
| 배포 키로 가능한 일 | `deploy <커밋 SHA> <GitHub 사용자>` 하나. 이미 GHCR에 있는 이미지로 다시 배포하는 것까지만 가능         |
| 외부 공개 포트      | 80, 443만. API(4000)·웹(3000)·MySQL은 loopback 또는 Docker 내부망에만 바인딩                            |

배포 키 설정과 교체는 [deployment.md의 "배포 키 만들기"](deployment.md#배포-키-만들기)를 따릅니다. 배포 키를 GCP Console의 `SSH 키`(메타데이터)에 등록하지 않습니다. 메타데이터 키는 운영 계정에 셸 권한으로 다시 써집니다.

## 공급망

- GitHub 저장소는 public입니다. 비밀값은 GitHub Secrets와 서버 `.env.production`(권한 600)에만 둡니다.
- GitHub의 비밀값 검사(secret scanning)와 push 차단(push protection), Dependabot 보안 알림과 자동 PR이 켜져 있습니다.
- workflow의 Action은 태그가 아니라 커밋 SHA로 고정합니다.
- Dependabot PR은 CI가 돌지 않고, 머지하면 바로 배포됩니다. 머지 전에 로컬에서 `npm ci` → typecheck·lint·test·build를 돌리고, 운영 이미지와 같은 방식(`npm ci --workspace @yakuku-yaru/api --omit=dev`)으로 설치한 API를 실제로 띄워 확인합니다.
- `package-lock.json`은 손으로 고치지 않습니다. 고친 뒤에는 위의 운영 방식 설치로 `require` 오류가 없는지 반드시 확인합니다. (2026-11-16에 손편집한 lockfile 때문에 API가 약 30분 내려간 적이 있습니다.)

## 앱 권한 규칙

| 대상             | 규칙                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 갱신 토큰        | 회전된 토큰이 다시 오면 같은 계열을 모두 끊음. 회전 후 30초 안의 재사용(응답 유실, 탭 동시 갱신)만 같은 계열의 새 토큰 발급 |
| 이메일 인증번호  | 한 번 발급한 번호는 5번 틀리면 사용 불가                                                                                    |
| 동행자 태그      | 기록 하나에 최대 10명. 같은 기록으로 이미 알림을 받은 사람에게는 다시 보내지 않음                                           |
| 동행자 열람      | 대기 중이면 볼 수 있음(수락 여부를 정해야 하므로). 거절했으면 403                                                           |
| 동행자 수정      | 수락한 동행자만 가능. 작성자 기록의 응원 팀·승패는 바뀌지 않고, 동행자가 고른 팀은 본인의 경기별 응원 팀에만 저장           |
| 팔로우 알림      | 같은 사람이 24시간 안에 다시 팔로우하면 알림을 보내지 않음                                                                  |
| 숫자 입력        | `Number.isSafeInteger`로 검사. `page=1e300` 같은 값은 기본값 또는 400                                                       |
| 잘못된 요청 본문 | 깨진 JSON은 400, 너무 큰 본문은 413으로 답하고 오류 알림을 보내지 않음                                                      |
| `/api-docs`      | 의도적으로 공개. 저장소가 public이라 숨겨도 얻는 것이 없고, 공개 API만 문서에 있음(관리자 API 없음)                         |

## 서버 반영

운영 서버에서는 이미지를 빌드하지 않습니다. `main`에 push하면 GitHub Actions가 배포합니다([deployment.md](deployment.md) 9장).

공개 도메인으로 확인합니다.

```bash
curl -I https://YOUR_DOMAIN/
curl -I https://YOUR_DOMAIN/api/health
curl -I https://YOUR_DOMAIN/uploads/not-a-valid-file.jpg
```

마지막 요청은 `404`가 정상입니다. 서버 IP의 `3000`, `4000`은 loopback에만 바인딩되어 외부에서 연결되지 않아야 합니다. 공개 API는 Caddy와 Nginx gateway를 통해서만 노출합니다.

## DDoS 경계

현재 gateway는 API 남용, 크롤러 폭주, 느린 요청, 소규모 L7 공격이 Node 프로세스를 고갈시키는 것을 줄입니다. 단일 VM 회선보다 큰 트래픽은 VM에 도착하기 전에 막아야 하므로 코드만으로 완전 차단할 수 없습니다.

실서비스 권장 순서:

1. Cloudflare Proxy 또는 Google Cloud HTTPS Load Balancer를 도메인 앞단에 둡니다.
2. 관리 화면에서 WAF, bot challenge, IP rate limiting을 켭니다.
3. GCP 방화벽의 80/443 인바운드를 선택한 프록시의 출발지 대역으로만 제한합니다.
4. 원본 VM IP를 DNS, 오류 페이지, 로그에 노출하지 않습니다.
5. 429/5xx 비율과 CPU·네트워크 사용량 경보를 설정합니다.

프록시 없이 GCP VM에 도메인이 직접 연결된 상태에서 3번을 먼저 적용하면 사이트가 끊기므로, CDN/LB 전환과 방화벽 변경은 같은 작업 창에서 진행해야 합니다.
