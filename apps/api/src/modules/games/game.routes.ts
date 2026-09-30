import { Router } from 'express';
import { HttpError } from '../../utils/http-error.js';
import { findGameById, listGames } from './game.repository.js';

export const gameRouter = Router();

/** 공개 API 라 한 번에 읽는 기간을 제한한다. 가장 긴 호출은 캘린더·사이트맵의 한 시즌(약 1년)이다. */
const MAX_GAME_RANGE_DAYS = 400;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(value: unknown) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    return null;
  }

  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) ? null : time;
}

gameRouter.get('/', async (req, res, next) => {
  try {
    const fromTime = parseDateParam(req.query.from);
    const toTime = parseDateParam(req.query.to);
    const teamId =
      typeof req.query.teamId === 'string' ? Number(req.query.teamId) : undefined;

    if (fromTime === null || toTime === null) {
      throw new HttpError(
        400,
        'INVALID_INPUT',
        '조회 시작일과 종료일을 YYYY-MM-DD 형식으로 입력해주세요.',
      );
    }

    if (toTime <= fromTime) {
      throw new HttpError(400, 'INVALID_INPUT', '종료일은 시작일보다 뒤여야 합니다.');
    }

    if (toTime - fromTime > MAX_GAME_RANGE_DAYS * 24 * 60 * 60 * 1000) {
      throw new HttpError(
        400,
        'INVALID_INPUT',
        `조회 기간은 최대 ${MAX_GAME_RANGE_DAYS}일입니다.`,
      );
    }

    const from = req.query.from as string;
    const to = req.query.to as string;

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
