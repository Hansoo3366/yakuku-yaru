import { Router } from 'express';
import { checkDatabaseConnection } from '../config/database.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res, next) => {
  try {
    await checkDatabaseConnection();

    res.json({
      status: 'ok',
      database: 'ok',
      service: 'yakuku-yaru-api',
    });
  } catch (error) {
    next(error);
  }
});
