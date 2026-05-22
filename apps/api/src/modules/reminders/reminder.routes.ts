import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import { findGameById } from '../games/game.repository.js';
import {
  createGameReminder,
  deleteGameReminder,
  findGameReminder,
} from './reminder.repository.js';

export const reminderRouter = Router();

reminderRouter.get('/games/:gameId', authenticate, async (req, res, next) => {
  try {
    const gameId = Number(req.params.gameId);
    const reminder = await findGameReminder({
      userId: req.user?.id ?? 0,
      gameId,
    });

    res.json({
      reminder,
      enabled: Boolean(reminder),
    });
  } catch (error) {
    next(error);
  }
});

reminderRouter.post('/games/:gameId', authenticate, async (req, res, next) => {
  try {
    const gameId = Number(req.params.gameId);
    const game = await findGameById(gameId);

    if (!game) {
      throw new HttpError(404, 'GAME_NOT_FOUND', '경기를 찾을 수 없습니다.');
    }

    const reminder = await createGameReminder({
      userId: req.user?.id ?? 0,
      gameId,
    });

    res.status(201).json({
      reminder,
      enabled: true,
    });
  } catch (error) {
    next(error);
  }
});

reminderRouter.delete('/games/:gameId', authenticate, async (req, res, next) => {
  try {
    await deleteGameReminder({
      userId: req.user?.id ?? 0,
      gameId: Number(req.params.gameId),
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
