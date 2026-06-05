import { Router } from 'express';
import { HttpError } from '../../utils/http-error.js';
import {
  findPlayerCheerByPlayerId,
  listPlayerCheers,
} from './player-cheer.repository.js';

export const playerCheerRouter = Router();

function optionalKeyword(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalTeamId(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(400, 'INVALID_INPUT', '올바른 팀 ID가 필요합니다.');
  }

  return parsed;
}

function optionalPositiveInteger(
  value: unknown,
  fallback: number,
  label: string,
) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(400, 'INVALID_INPUT', `${label} 값이 올바르지 않습니다.`);
  }

  return parsed;
}

function rosterScope(value: unknown) {
  if (value === 'all') {
    return 'all' as const;
  }

  return 'firstTeam' as const;
}

playerCheerRouter.get('/', async (req, res, next) => {
  try {
    const result = await listPlayerCheers({
      keyword: optionalKeyword(req.query.keyword),
      teamId: optionalTeamId(req.query.teamId),
      onlyWithCheer: req.query.onlyWithCheer === 'true',
      page: optionalPositiveInteger(req.query.page, 1, 'page'),
      rosterScope: rosterScope(req.query.rosterScope),
      size: optionalPositiveInteger(req.query.size, 24, 'size'),
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

playerCheerRouter.get('/:playerId', async (req, res, next) => {
  try {
    const playerId = Number(req.params.playerId);

    if (!Number.isInteger(playerId) || playerId < 1) {
      throw new HttpError(400, 'INVALID_INPUT', '올바른 선수 ID가 필요합니다.');
    }

    const item = await findPlayerCheerByPlayerId(playerId);

    if (!item) {
      throw new HttpError(404, 'PLAYER_NOT_FOUND', '선수를 찾을 수 없습니다.');
    }

    res.json({ item });
  } catch (error) {
    next(error);
  }
});
