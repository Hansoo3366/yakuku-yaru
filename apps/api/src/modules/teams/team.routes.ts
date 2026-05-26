import { Router } from 'express';
import { HttpError } from '../../utils/http-error.js';
import { listTeamStandings } from '../kbo-team-rank/team-rank.repository.js';
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

teamRouter.get('/standings', async (req, res, next) => {
  try {
    const seasonYear =
      typeof req.query.seasonYear === 'string'
        ? Number(req.query.seasonYear)
        : new Date().getFullYear();
    const seriesId =
      typeof req.query.seriesId === 'string' ? req.query.seriesId : '0';

    if (!Number.isInteger(seasonYear) || seasonYear < 2000) {
      throw new HttpError(400, 'INVALID_INPUT', '올바른 시즌 연도가 필요합니다.');
    }

    const standings = await listTeamStandings(seasonYear, seriesId);

    if (!standings) {
      res.json({
        seasonYear,
        rankDate: null,
        seriesId,
        syncedAt: null,
        items: [],
      });
      return;
    }

    res.json(standings);
  } catch (error) {
    next(error);
  }
});
