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
    { name: 'Posts' },
    { name: 'Comments' },
    { name: 'Baseball' },
    { name: 'Attendance' },
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
          verificationToken: { type: 'string' },
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
      AttendanceWriteRequest: {
        type: 'object',
        required: ['memo', 'result'],
        properties: {
          gameId: { type: 'integer' },
          memo: { type: 'string' },
          myTeamScore: { type: 'integer', nullable: true },
          opponentScore: { type: 'integer', nullable: true },
          result: {
            type: 'string',
            enum: ['win', 'lose', 'draw'],
          },
        },
      },
    },
  },
};
