import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './config/openapi.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { attendanceRouter } from './modules/attendance/attendance.routes.js';
import { commentRouter } from './modules/comments/comment.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { gameRouter } from './modules/games/game.routes.js';
import { meRouter } from './modules/me/me.routes.js';
import { postRouter } from './modules/posts/post.routes.js';
import { reminderRouter } from './modules/reminders/reminder.routes.js';
import { teamRouter } from './modules/teams/team.routes.js';
import { healthRouter } from './routes/health.js';

export function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use('/uploads', express.static(env.uploadDir));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/api-docs.json', (_req, res) => {
    res.json(openApiDocument);
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users/me', meRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/posts', postRouter);
  app.use('/api/comments', commentRouter);
  app.use('/api/teams', teamRouter);
  app.use('/api/games', gameRouter);
  app.use('/api/attendance-records', attendanceRouter);
  app.use('/api/reminders', reminderRouter);

  app.use(errorHandler);

  return app;
}
