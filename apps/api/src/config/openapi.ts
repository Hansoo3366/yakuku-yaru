export const openApiDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Yakuku Yaru API',
    version: '0.1.0',
    description: '야구 직관 기록 PWA REST API',
  },
  servers: [
    {
      url: 'http://localhost:4000/api',
      description: 'Local API server',
    },
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Posts' },
    { name: 'Comments' },
    { name: 'Baseball' },
    { name: 'Attendance' },
    { name: 'Notifications' },
    { name: 'Reminders' },
    { name: 'System' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'API and database health check',
        responses: {
          '200': {
            description: 'API and database are available',
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterResponse' },
              },
            },
          },
          '409': {
            description: 'Email already exists',
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and issue JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'JWT issued',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
          },
        },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email token',
        responses: {
          '200': {
            description: 'Email verified',
          },
          '400': {
            description: 'Invalid token',
          },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        responses: {
          '200': {
            description: 'Request accepted',
          },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        responses: {
          '200': {
            description: 'Password reset',
          },
          '400': {
            description: 'Invalid token',
          },
        },
      },
    },
    '/posts': {
      get: {
        tags: ['Posts'],
        summary: 'List posts with pagination',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'size', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Post list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PostListResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Posts'],
        summary: 'Create a post',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PostWriteRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Post created',
          },
          '401': {
            description: 'Authentication required',
          },
        },
      },
    },
    '/posts/{postId}': {
      get: {
        tags: ['Posts'],
        summary: 'Get post detail',
        parameters: [{ $ref: '#/components/parameters/PostId' }],
        responses: {
          '200': {
            description: 'Post detail',
          },
        },
      },
      patch: {
        tags: ['Posts'],
        summary: 'Update my post',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PostId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PostWriteRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Post updated',
          },
          '403': {
            description: 'Only author can update',
          },
        },
      },
      delete: {
        tags: ['Posts'],
        summary: 'Delete my post',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PostId' }],
        responses: {
          '204': {
            description: 'Post deleted',
          },
          '403': {
            description: 'Only author can delete',
          },
        },
      },
    },
    '/posts/{postId}/comments': {
      get: {
        tags: ['Comments'],
        summary: 'List comments',
        parameters: [{ $ref: '#/components/parameters/PostId' }],
        responses: {
          '200': {
            description: 'Comment list',
          },
        },
      },
      post: {
        tags: ['Comments'],
        summary: 'Create a comment',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PostId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CommentWriteRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Comment created',
          },
        },
      },
    },
    '/comments/{commentId}': {
      delete: {
        tags: ['Comments'],
        summary: 'Delete my comment',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CommentId' }],
        responses: {
          '204': {
            description: 'Comment deleted',
          },
          '403': {
            description: 'Only author can delete',
          },
        },
      },
    },
    '/teams': {
      get: {
        tags: ['Baseball'],
        summary: 'List KBO teams',
        responses: {
          '200': {
            description: 'Team list',
          },
        },
      },
    },
    '/users/me/favorite-team': {
      patch: {
        tags: ['Baseball'],
        summary: 'Set my favorite team',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FavoriteTeamRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Favorite team updated',
          },
        },
      },
    },
    '/users/search': {
      get: {
        tags: ['Users'],
        summary: 'Search users by nickname or email',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'User search results',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserSearchResponse' },
              },
            },
          },
        },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List my notifications',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Notification list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotificationListResponse' },
              },
            },
          },
        },
      },
    },
    '/notifications/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark my notifications as read',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Notifications marked as read',
          },
        },
      },
    },
    '/games': {
      get: {
        tags: ['Baseball'],
        summary: 'List games by date range and optional team',
        parameters: [
          { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'teamId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Game list',
          },
        },
      },
    },
    '/games/{gameId}': {
      get: {
        tags: ['Baseball'],
        summary: 'Get game detail',
        parameters: [{ $ref: '#/components/parameters/GameId' }],
        responses: {
          '200': {
            description: 'Game detail',
          },
        },
      },
    },
    '/reminders/games/{gameId}': {
      get: {
        tags: ['Reminders'],
        summary: 'Get my reminder for a game',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/GameId' }],
        responses: {
          '200': {
            description: 'Reminder state',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GameReminderResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Reminders'],
        summary: 'Create or keep my reminder for a game',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/GameId' }],
        responses: {
          '201': {
            description: 'Reminder saved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GameReminderResponse' },
              },
            },
          },
          '404': {
            description: 'Game not found',
          },
        },
      },
      delete: {
        tags: ['Reminders'],
        summary: 'Delete my reminder for a game',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/GameId' }],
        responses: {
          '204': {
            description: 'Reminder deleted',
          },
        },
      },
    },
    '/attendance-records': {
      get: {
        tags: ['Attendance'],
        summary: 'List my attendance records',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'Attendance record list',
          },
        },
      },
      post: {
        tags: ['Attendance'],
        summary: 'Create attendance record',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AttendanceWriteRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Attendance record created',
          },
        },
      },
    },
    '/attendance-records/{recordId}': {
      get: {
        tags: ['Attendance'],
        summary: 'Get my attendance record',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/RecordId' }],
        responses: {
          '200': {
            description: 'Attendance record detail',
          },
        },
      },
      patch: {
        tags: ['Attendance'],
        summary: 'Update my attendance record',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/RecordId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AttendanceWriteRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Attendance record updated',
          },
        },
      },
      delete: {
        tags: ['Attendance'],
        summary: 'Delete my attendance record',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/RecordId' }],
        responses: {
          '204': {
            description: 'Attendance record deleted',
          },
        },
      },
    },
    '/attendance-records/{recordId}/companions/me': {
      patch: {
        tags: ['Attendance'],
        summary: 'Respond to a companion tag (accept or reject)',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/RecordId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CompanionResponseRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Companion tag response saved',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CompanionResponseResult',
                },
              },
            },
          },
          '400': {
            description: 'Invalid status',
          },
          '404': {
            description: 'Companion tag not found',
          },
        },
      },
    },
    '/attendance-records/{recordId}/photo': {
      post: {
        tags: ['Attendance'],
        summary: 'Upload attendance photo',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/RecordId' }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  photo: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Photo uploaded',
          },
        },
      },
    },
    '/attendance-records/stats/me': {
      get: {
        tags: ['Attendance'],
        summary: 'Get my attendance win rate stats',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Attendance stats',
          },
        },
      },
    },
  },
  components: {
    parameters: {
      PostId: {
        name: 'postId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
      },
      CommentId: {
        name: 'commentId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
      },
      GameId: {
        name: 'gameId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
      },
      RecordId: {
        name: 'recordId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'nickname'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          nickname: { type: 'string' },
          favoriteTeamId: { type: 'integer', nullable: true },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string' },
          nickname: { type: 'string' },
          favoriteTeamId: { type: 'integer', nullable: true },
          emailVerifiedAt: { type: 'string', nullable: true },
        },
      },
      UserSearchItem: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string' },
          nickname: { type: 'string' },
          favoriteTeamId: { type: 'integer', nullable: true },
        },
      },
      UserSearchResponse: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/UserSearchItem' },
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      RegisterResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          emailSent: { type: 'boolean' },
          verificationUrl: { type: 'string', nullable: true },
        },
      },
      PostWriteRequest: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
        },
      },
      Post: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          title: { type: 'string' },
          content: { type: 'string' },
          authorNickname: { type: 'string' },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' },
        },
      },
      PostListResponse: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/Post' },
          },
          page: { type: 'integer' },
          size: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      CommentWriteRequest: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string' },
        },
      },
      FavoriteTeamRequest: {
        type: 'object',
        required: ['teamId'],
        properties: {
          teamId: { type: 'integer' },
        },
      },
      GameReminder: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          user_id: { type: 'integer' },
          game_id: { type: 'integer' },
          reminder_type: { type: 'string' },
          created_at: { type: 'string' },
        },
      },
      GameReminderResponse: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          reminder: {
            oneOf: [{ $ref: '#/components/schemas/GameReminder' }, { type: 'null' }],
          },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          actorUserId: { type: 'integer', nullable: true },
          attendanceRecordId: { type: 'integer', nullable: true },
          postId: { type: 'integer', nullable: true },
          type: {
            type: 'string',
            enum: [
              'attendance_tagged',
              'companion_accepted',
              'companion_rejected',
              'post_commented',
            ],
            description:
              'attendance_tagged: 동행 태그 수신, companion_accepted/companion_rejected: 호스트가 받는 태그 응답 결과, post_commented: 내 게시글 댓글',
          },
          message: { type: 'string' },
          readAt: { type: 'string', nullable: true },
          createdAt: { type: 'string' },
        },
      },
      NotificationListResponse: {
        type: 'object',
        properties: {
          unreadCount: { type: 'integer' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/Notification' },
          },
        },
      },
      AttendanceWriteRequest: {
        type: 'object',
        required: ['memo', 'result'],
        properties: {
          gameId: { type: 'integer' },
          watchType: {
            type: 'string',
            enum: ['stadium', 'home'],
            description: '관람 유형. stadium은 야구장 직관, home은 집관입니다.',
          },
          memo: { type: 'string' },
          myTeamScore: { type: 'integer', nullable: true },
          opponentScore: { type: 'integer', nullable: true },
          result: {
            type: 'string',
            enum: ['win', 'lose', 'draw'],
          },
          companionUserIds: {
            type: 'array',
            items: { type: 'integer' },
          },
        },
      },
      AttendanceCompanion: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          nickname: { type: 'string' },
          email: { type: 'string' },
          status: {
            type: 'string',
            enum: ['pending', 'accepted', 'rejected'],
          },
          respondedAt: { type: 'string', nullable: true },
          createdAt: { type: 'string' },
        },
      },
      CompanionResponseRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['accepted', 'rejected'],
          },
        },
      },
      CompanionResponseResult: {
        type: 'object',
        properties: {
          companion: { $ref: '#/components/schemas/AttendanceCompanion' },
          record: {
            description: '응답 후의 직관 기록 (호스트 입장의 단건)',
            nullable: true,
          },
        },
      },
    },
  },
};
