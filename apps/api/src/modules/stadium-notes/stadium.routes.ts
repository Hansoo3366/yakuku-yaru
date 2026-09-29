import { Router } from 'express';
import { HttpError } from '../../utils/http-error.js';
import {
  findStadiumSummary,
  listPublicStadiumNotes,
  listStadiumSummaries,
  normalizeStadiumName,
} from './stadium-note.repository.js';

export const stadiumRouter = Router();

stadiumRouter.get('/', async (_req, res, next) => {
  try {
    const items = await listStadiumSummaries();

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

stadiumRouter.get('/:stadium', async (req, res, next) => {
  try {
    const stadium = normalizeStadiumName(req.params.stadium);

    if (!stadium) {
      throw new HttpError(
        400,
        'INVALID_INPUT',
        '구장 이름이 올바르지 않습니다.',
      );
    }

    const summary = await findStadiumSummary(stadium);

    if (!summary) {
      throw new HttpError(
        404,
        'STADIUM_NOT_FOUND',
        '구장 정보를 찾을 수 없습니다.',
      );
    }

    const notes = await listPublicStadiumNotes(stadium);

    res.json({ stadium: summary, notes });
  } catch (error) {
    next(error);
  }
});
