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
import { HttpError } from './utils/http-error.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  const globalApiRateLimit = rateLimit({
    scope: 'api:global',
    windowMs: 60 * 1000,
    max: 240,
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'same-site',
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
  const uploadRateLimit = rateLimit({
    scope: 'uploads:read',
    windowMs: 60 * 1000,
    max: 180,
    message: '이미지 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  });
  const uploadFilenamePattern =
    /^(?:[1-9]\d*-)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:avif|gif|heic|heif|jpe?g|png|webp)$/i;

  app.get('/uploads/:filename', uploadRateLimit, (req, res, next) => {
    const filename = req.params.filename;

    if (!uploadFilenamePattern.test(filename)) {
      next(new HttpError(404, 'ASSET_NOT_FOUND', '이미지를 찾을 수 없습니다.'));
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(
      filename,
      { root: env.uploadDir, dotfiles: 'deny' },
      (error) => {
        if (!error) return;

        if ('status' in error && error.status === 404) {
          next(
            new HttpError(404, 'ASSET_NOT_FOUND', '이미지를 찾을 수 없습니다.'),
          );
          return;
        }

        next(error);
      },
    );
  });

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
