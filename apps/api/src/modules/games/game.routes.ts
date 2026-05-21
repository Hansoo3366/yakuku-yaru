import { Router } from 'express';
import { HttpError } from '../../utils/http-error.js';
import { findGameById, listGames } from './game.repository.js';

export const gameRouter = Router();

gameRouter.get('/', async (req, res, next) => {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    const teamId =
      typeof req.query.teamId === 'string' ? Number(req.query.teamId) : undefined;

    if (!from || !to) {
      throw new HttpError(400, 'INVALID_INPUT', '조회 시작일과 종료일이 필요합니다.');
    }

    if (teamId !== undefined && (!Number.isInteger(teamId) || teamId < 1)) {
      throw new HttpError(400, 'INVALID_INPUT', '올바른 팀 ID가 필요합니다.');
    }

    const games = await listGames({
      from,
      to,
      teamId,
    });

    res.json({
      items: games,
    });
  } catch (error) {
    next(error);
  }
});

gameRouter.get('/:gameId', async (req, res, next) => {
  try {
    const game = await findGameById(Number(req.params.gameId));

    if (!game) {
      throw new HttpError(404, 'GAME_NOT_FOUND', '경기를 찾을 수 없습니다.');
    }

    res.json({
      game,
    });
  } catch (error) {
    next(error);
  }
});
