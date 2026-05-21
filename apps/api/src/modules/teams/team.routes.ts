import { Router } from 'express';
import { listTeams } from './team.repository.js';

export const teamRouter = Router();

teamRouter.get('/', async (_req, res, next) => {
  try {
    const teams = await listTeams();

    res.json({
      items: teams,
    });
  } catch (error) {
    next(error);
  }
});
