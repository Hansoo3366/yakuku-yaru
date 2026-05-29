# API Spec

Base URL: `/api`

인증이 필요한 API는 로그인 시 발급되는 httpOnly cookie(`yakuku_session`)를 사용합니다. 기존 `Authorization: Bearer <accessToken>` 헤더도 호환됩니다. 상세 스키마는 Swagger (`/api-docs`)를 우선 기준으로 합니다.

## Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | public | 회원가입. 이메일 인증번호를 발송하고 내 팀을 함께 저장 |
| `POST` | `/auth/check-registration` | public | 이메일/닉네임 중복 및 가입 가능 여부 확인 |
| `POST` | `/auth/login` | public | JWT 로그인 |
| `GET` | `/auth/me` | required | 현재 사용자 조회 |
| `POST` | `/auth/verify-email` | public | 이메일 인증번호 검증 |
| `POST` | `/auth/resend-verification-email` | public | 인증번호 재발송 |
| `GET` | `/auth/verification-status` | public | 이메일 인증 상태/남은 시간 확인 |
| `POST` | `/auth/forgot-password` | public | 비밀번호 재설정 메일 발송 |
| `POST` | `/auth/reset-password` | public | 비밀번호 재설정 |

회원가입 응답은 사용자 정보와 이메일 인증 상태, 개발 환경용 인증 코드 정보를 포함할 수 있습니다.

## Me and Users

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/users/search` | required | 동행자 후보 검색 |
| `PATCH` | `/me/favorite-team` | required | 내 팀 변경 |
| `PATCH` | `/me/nickname` | required | 닉네임 수정 |
| `POST` | `/me/profile-photo` | required | 프로필 이미지 업로드, WebP 최적화 |
| `GET` | `/users/me/stats` | required | 내 직관/집관 통계 |

## Teams

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/teams` | public | 팀 목록 조회 |

## Games

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/games` | optional | 경기 일정 조회 |
| `GET` | `/games/:gameId` | optional | 경기 상세 조회 |

`GET /games` 주요 query:

| Name | Required | Description |
| --- | --- | --- |
| `from` | true | 시작 날짜 |
| `to` | true | 종료 날짜 |
| `teamId` | false | 특정 팀 필터 |

경기 응답에는 홈/원정 팀, 스코어, 상태, 취소 사유, 예매 정보, 구장 정보, 선발 투수, 라인업 데이터가 포함될 수 있습니다.

## Attendance Records

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/attendance-records` | required | 내 기록과 수락한 동행 기록 조회 |
| `POST` | `/attendance-records` | required | 직관/집관 기록 생성 |
| `GET` | `/attendance-records/:recordId` | required | 기록 상세 조회 |
| `PATCH` | `/attendance-records/:recordId` | required | 기록 수정 |
| `DELETE` | `/attendance-records/:recordId` | required | 기록 삭제 |
| `POST` | `/attendance-records/:recordId/photo` | required | 기록 사진 업로드 |
| `PATCH` | `/attendance-records/:recordId/companions/me` | required | 내가 받은 동행 태그 수락/거절 |

생성/수정 주요 payload:

```json
{
  "gameId": 1,
  "watchType": "stadium",
  "cheeredTeamId": 1,
  "memo": "올 시즌 첫 직관",
  "companionUserIds": [12, 34]
}
```

- `watchType`은 `stadium` 또는 `home`입니다.
- 내 팀 경기라면 `cheeredTeamId`를 생략할 수 있습니다.
- 내 팀 경기가 아니라면 응원 팀을 선택해야 합니다.
- 스코어와 승패는 KBO 동기화된 공식 경기 결과를 기준으로 계산합니다.
- 동행자는 `pending` 상태로 생성되고, 수락 후 동행자 캘린더에 표시됩니다.

## Notifications

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/notifications` | required | 내 알림 목록과 읽지 않은 개수 |
| `PATCH` | `/notifications/read` | required | 내 알림 전체 읽음 처리 |

주요 알림 타입:

- `attendance_tagged`
- `companion_accepted`
- `companion_rejected`
- `post_commented`

## Reminders

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/reminders/games/:gameId` | required | 특정 경기 알림 상태 조회 |
| `POST` | `/reminders/games/:gameId` | required | 경기 알림 설정 |
| `DELETE` | `/reminders/games/:gameId` | required | 경기 알림 해제 |

## Stadium Notes

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/me/stadium-notes?stadium=잠실` | required | 구장별 내 개인 메모 조회 |
| `PUT` | `/me/stadium-notes` | required | 구장별 맛집/주차 개인 메모 저장 |

## Posts

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/posts` | public | 게시글 목록, 검색, 페이징 |
| `POST` | `/posts` | required | 게시글 작성 |
| `GET` | `/posts/:postId` | public | 게시글 상세 |
| `PATCH` | `/posts/:postId` | required | 게시글 수정. 작성자만 가능 |
| `DELETE` | `/posts/:postId` | required | 게시글 삭제. 작성자 또는 관리자 |

`GET /posts` query:

| Name | Required | Description |
| --- | --- | --- |
| `page` | false | 기본값 1 |
| `size` | false | 기본값 10 |
| `keyword` | false | 제목/본문 검색어 |

게시글 본문은 스크립트/CSS 삽입 방지를 위해 서버 입력 정제와 프론트 렌더링 정책을 함께 적용합니다.

## Comments

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/posts/:postId/comments` | public | 댓글 목록 |
| `POST` | `/posts/:postId/comments` | required | 댓글 작성 |
| `DELETE` | `/comments/:commentId` | required | 댓글 삭제. 작성자 또는 관리자 |

댓글 작성 시 게시글 작성자에게 `post_commented` 알림을 생성합니다.

## Admin

관리자 API는 모두 `admin` 권한이 필요합니다.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/admin/summary` | 운영 요약 |
| `GET` | `/admin/users` | 사용자 목록/검색 |
| `PATCH` | `/admin/users/:userId/role` | 사용자 역할 관리 |
| `PATCH` | `/admin/users/:userId/email-verification` | 이메일 인증 상태 관리 |
| `DELETE` | `/admin/users/:userId` | 사용자 삭제 |
| `GET` | `/admin/posts` | 게시글 관리 목록 |
| `DELETE` | `/admin/posts/:postId` | 게시글 삭제 |
| `GET` | `/admin/comments` | 댓글 관리 목록 |
| `DELETE` | `/admin/comments/:commentId` | 댓글 삭제 |
| `GET` | `/admin/games` | 경기/KBO 데이터 관리 목록 |
| `POST` | `/admin/games` | 경기 생성 |
| `PATCH` | `/admin/games/:gameId` | 경기 운영 데이터 수정 |

## Upload and Security Policy

- 프로필 이미지와 직관 이미지는 허용된 이미지 MIME type만 업로드할 수 있습니다.
- 업로드 후 WebP로 변환해 저장합니다.
- 파일 크기 제한은 서버 업로드 정책을 따릅니다.
- 게시글/댓글/메모 입력은 스크립트 삽입을 막기 위해 정제합니다.
- 게시글, 댓글, 프로필 수정, 업로드 등 쓰기 API에는 rate limit을 적용합니다.
