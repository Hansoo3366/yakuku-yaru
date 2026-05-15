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
  paths: {
    '/health': {
      get: {
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
        summary: 'Register a new user',
        responses: {
          '201': {
            description: 'User registered',
          },
          '409': {
            description: 'Email already exists',
          },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login and issue JWT',
        responses: {
          '200': {
            description: 'JWT issued',
          },
          '401': {
            description: 'Invalid credentials',
          },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user',
          },
          '401': {
            description: 'Authentication required',
          },
        },
      },
    },
    '/auth/verify-email': {
      post: {
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
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};
