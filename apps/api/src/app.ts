import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './config/openapi.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requireTrustedOrigin } from './middleware/request-origin.js';
import { rateLimit } from './middleware/rate-limit.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { attendanceRouter } from './modules/attendance/attendance.routes.js';
import { commentRouter } from './modules/comments/comment.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { gameRouter } from './modules/games/game.routes.js';
import { meRouter } from './modules/me/me.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';
import { playerCheerRouter } from './modules/player-cheers/player-cheer.routes.js';
import { postRouter } from './modules/posts/post.routes.js';
import { reminderRouter } from './modules/reminders/reminder.routes.js';
import { reportRouter } from './modules/reports/report.routes.js';
import { teamRouter } from './modules/teams/team.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { healthRouter } from './routes/health.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  const globalApiRateLimit = rateLimit({
    scope: 'api:global',
    windowMs: 60 * 1000,
    max: 600,
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || env.allowedOrigins.includes(origin));
      },
      credentials: true,
    }),
  );
  app.use(requireTrustedOrigin);
  app.use(globalApiRateLimit);
  app.use(express.json({ limit: '100kb' }));
  app.use(
    '/uploads',
    express.static(env.uploadDir, {
      dotfiles: 'deny',
      index: false,
      immutable: true,
      maxAge: '1d',
    }),
  );

  if (env.nodeEnv !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
    app.get('/api-docs.json', (_req, res) => {
      res.json(openApiDocument);
    });
  }

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/users/me', meRouter);
  app.use('/api/users', userRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/player-cheers', playerCheerRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/posts', postRouter);
  app.use('/api/comments', commentRouter);
  app.use('/api/teams', teamRouter);
  app.use('/api/games', gameRouter);
  app.use('/api/attendance-records', attendanceRouter);
  app.use('/api/reminders', reminderRouter);
  app.use('/api/reports', reportRouter);

  app.use(errorHandler);

  return app;
}
