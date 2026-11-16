# IAP 터널과 배포 전용 사용자

## 결정

- 서버 SSH는 IAP 대역에만 열고, GitHub Actions는 Workload Identity로 GCP에 로그인해 IAP 터널로 접속한다.
- 자동 배포는 운영 계정이 아니라 **배포 전용 사용자 `deploy`**로 접속한다. 이 키로는 `deploy <커밋 SHA> <GitHub 사용자>` 한 가지 명령만 실행된다.

## 배경

- 예전에는 SSH 22번이 전 세계에 열려 있었고, GitHub Secret의 키가 운영 계정 키였다. 키가 새면 셸과 sudo(=서버 전체)를 내주는 구조.
- 저장소가 public이라 배포 방식과 서버 경로가 모두 공개돼 있다.

## 구조

```txt
GitHub Actions ─(Workload Identity, main 만)→ GCP 로그인
               ─(IAP 터널 localhost:2222)→ VM 22번
               ─(ssh deploy@, 호스트 키 고정)→ authorized_keys 의 command= 로 강제
                    /usr/local/bin/yakuku-deploy   (root 소유)
                      ├ "deploy <40자리 SHA> <사용자>" 형식만 통과, 여러 줄 거부
                      └ sudo -u 운영계정 yakuku-deploy <SHA> <사용자>
                           git reset --hard origin/main
                           scripts/deploy/remote-deploy.sh
```

| 파일 | 소유 | 역할 |
|------|------|------|
| `/home/deploy/.ssh/authorized_keys` | root | `restrict,command="/usr/local/bin/yakuku-deploy" <공개키>` |
| `/usr/local/bin/yakuku-deploy` | root | 명령 검사 후 운영 계정으로 넘김 |
| `/etc/yakuku-deploy.conf` | root | 운영 계정 이름, 저장소 경로 |
| `/etc/sudoers.d/yakuku-deploy` | root | `deploy`가 위 명령 하나만 운영 계정으로 실행 |

설치·키 교체: `sudo bash scripts/deploy/setup-deploy-user.sh` (개인키는 화면에만 출력하고 서버에서 지움)

## 검증 (Debian 12 컨테이너)

| 시도 | 결과 |
|------|------|
| `deploy <SHA> <사용자>` | 운영 계정으로 실행, `DEPLOY_OK` |
| 셸, `bash`, `scp`, 명령 없이 접속 | 거부 |
| 여러 줄, `$(id)`, 대문자 SHA | 거부 |
| 포트 포워딩 | 연결은 열리지만 데이터 통과 안 됨 |
| `deploy`가 sudo로 다른 명령 | 비밀번호 요구로 거부 |

## 트레이드오프

| 장점 | 단점 |
|------|------|
| 키가 새도 이미 올라간 이미지로 재배포만 가능 | `yakuku-deploy`를 고치면 서버에서 setup 스크립트를 다시 실행해야 반영 |
| IAP 권한 없이는 키가 있어도 서버에 닿지 못함 | 배포 로그에서 `DEPLOY_USER` Secret 값(`deploy`)이 `***`로 가려짐 |
| 브라우저 SSH가 메타데이터로 키를 덮어써도 영향 없음 (`deploy`는 메타데이터 관리 밖) | |

## 주의

- 배포 키를 GCP Console의 `SSH 키`(메타데이터)에 넣지 않는다. 메타데이터 키는 운영 계정에 셸 권한으로 다시 써진다. (예전 키가 메타데이터에 있어서 파일에서 지워도 다시 생겼음)

## 관련

- [[GHCR 이미지 분리 배포]]
- [[배포 스크립트가 중간에 조용히 끝남]]
- [[GitHub Actions SSH 인증 실패]]
- 저장소: `docs/deployment.md` 9장, `docs/security.md` "서버 접근"
