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
  "memo": "올 시즌 첫 직관",
  "myTeamScore": 5,
  "opponentScore": 3,
  "result": "win"
}
```

### PATCH /attendance-records/:recordId

직관 기록을 수정합니다.

### DELETE /attendance-records/:recordId

직관 기록을 삭제합니다.

### POST /attendance-records/:recordId/photo

직관 사진을 업로드합니다.

Content-Type: `multipart/form-data`

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
