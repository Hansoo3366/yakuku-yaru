# API Spec

Base URL: `/api`

인증이 필요한 API는 `Authorization: Bearer <accessToken>` 헤더를 사용합니다.

## Auth

### POST /auth/register

회원가입을 요청합니다.

Request:

```json
{
  "email": "user@example.com",
  "password": "password1234",
  "nickname": "야구팬"
}
```

Response:

```json
{
  "id": 1,
  "email": "user@example.com",
  "nickname": "야구팬"
}
```

### POST /auth/login

로그인을 요청하고 JWT를 발급받습니다.

Request:

```json
{
  "email": "user@example.com",
  "password": "password1234"
}
```

Response:

```json
{
  "accessToken": "jwt-token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "야구팬",
    "favoriteTeamId": 1
  }
}
```

### GET /auth/me

현재 로그인한 사용자 정보를 조회합니다.

### POST /auth/verify-email

이메일 인증 토큰을 검증합니다.

## Teams

### GET /teams

팀 목록을 조회합니다.

### PATCH /users/me/favorite-team

내 팀을 설정합니다.

Request:

```json
{
  "teamId": 1
}
```

## Games

### GET /games

경기 일정을 조회합니다.

Query:

| Name | Required | Description |
| --- | --- | --- |
| teamId | false | 팀 ID |
| from | true | 시작 날짜 |
| to | true | 종료 날짜 |

### GET /games/:gameId

경기 상세를 조회합니다.

## Attendance Records

### GET /attendance-records

내 직관 기록 목록을 조회합니다.

Query:

| Name | Required | Description |
| --- | --- | --- |
| from | false | 시작 날짜 |
| to | false | 종료 날짜 |

### POST /attendance-records

직관 기록을 생성합니다.

Request:

```json
{
  "gameId": 1,
  "watchType": "stadium",
  "memo": "올 시즌 첫 직관",
  "myTeamScore": 5,
  "opponentScore": 3,
  "result": "win",
  "companionUserIds": [12, 34]
}
```

`companionUserIds` 에 포함된 회원에게 동행 태그 알림이 발송되며, 응답을 수락하기 전까지는 동행자의 캘린더에 표시되지 않습니다.

### PATCH /attendance-records/:recordId

직관 기록을 수정합니다. 본인 기록만 가능하며 동행자 태그 변경 시 새로 추가된 회원에게만 알림이 발송됩니다. 기존 동행자의 응답 상태는 그대로 유지됩니다.

### DELETE /attendance-records/:recordId

직관 기록을 삭제합니다.

### POST /attendance-records/:recordId/photo

직관 사진을 업로드합니다.

Content-Type: `multipart/form-data`

### PATCH /attendance-records/:recordId/companions/me

본인이 받은 동행 태그를 수락하거나 거절합니다.

Request:

```json
{
  "status": "accepted"
}
```

`status`는 `accepted` 또는 `rejected`만 허용됩니다. 응답이 저장되면 호스트에게 `companion_accepted` 또는 `companion_rejected` 알림이 발송되고, `accepted`인 경우 동행자의 캘린더에 `동행` 배지가 노출됩니다.

## Users

### GET /users/search

닉네임이나 이메일을 부분 일치로 검색해 동행자 후보를 찾습니다. 인증이 필요합니다.

Query:

| Name | Required | Description |
| --- | --- | --- |
| keyword | true | 2자 이상 검색어. 본인은 결과에서 제외됩니다. |

## Notifications

### GET /notifications

내 알림 목록과 읽지 않은 개수를 반환합니다. 최대 30건까지 최신순으로 조회합니다.

Response:

```json
{
  "items": [
    {
      "id": 21,
      "type": "attendance_tagged",
      "message": "야구팬님이 나를 직관 기록에 태그했어요. 마이페이지에서 수락 또는 거절을 선택해주세요.",
      "attendanceRecordId": 5,
      "actorUserId": 1,
      "readAt": null,
      "createdAt": "2026-05-20T11:23:00.000Z"
    }
  ],
  "unreadCount": 1
}
```

`type` 값:

- `attendance_tagged`: 동행 태그를 받았을 때
- `companion_accepted`: 호스트가 받는 동행 수락 결과
- `companion_rejected`: 호스트가 받는 동행 거절 결과

### PATCH /notifications/read

내 모든 알림을 읽음 상태로 변경합니다.

## Stats

### GET /users/me/stats

내 직관 통계를 조회합니다.

Response:

```json
{
  "totalCount": 10,
  "winCount": 6,
  "loseCount": 3,
  "drawCount": 1,
  "winRate": 60,
  "title": "승리요정"
}
```

## Posts

### GET /posts

게시글 목록을 페이징으로 조회합니다.

Query:

| Name | Required | Description |
| --- | --- | --- |
| page | false | 기본값 1 |
| size | false | 기본값 10 |
| keyword | false | 검색어, 선택 |

### POST /posts

게시글을 작성합니다.

### GET /posts/:postId

게시글 상세를 조회합니다.

### PATCH /posts/:postId

게시글을 수정합니다. 작성자만 가능합니다.

### DELETE /posts/:postId

게시글을 삭제합니다. 작성자만 가능합니다.

## Comments

### GET /posts/:postId/comments

게시글 댓글을 조회합니다.

### POST /posts/:postId/comments

댓글을 작성합니다.

### DELETE /comments/:commentId

댓글을 삭제합니다. 작성자만 가능합니다.

## Error Format

```json
{
  "message": "Unauthorized",
  "code": "AUTH_REQUIRED"
}
```

## Swagger

Swagger 문서는 `/api-docs` 경로에서 제공합니다.
