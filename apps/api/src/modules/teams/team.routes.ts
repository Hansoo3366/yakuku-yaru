import { Router } from 'express';
import { HttpError } from '../../utils/http-error.js';
import {
  emptySeasonProjection,
  getLatestSeasonProjection,
} from '../kbo-season-projection/season-projection.repository.js';
import { listTeamStandings } from '../kbo-team-rank/team-rank.repository.js';
import { getPostseasonBracket } from '../kbo-postseason/postseason.repository.js';
import {
  findFreeAgentById,
  findLatestFreeAgentYear,
  listFreeAgents,
} from '../free-agents/free-agent.repository.js';
import { loadPlayerRecord } from '../free-agents/player-record.service.js';
import { findFreeAgentPlayerKey } from '../free-agents/player-record.repository.js';
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

    if (!Number.isSafeInteger(seasonYear) || seasonYear < 2000) {
      throw new HttpError(
        400,
        'INVALID_INPUT',
        '올바른 시즌 연도가 필요합니다.',
      );
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

teamRouter.get('/postseason', async (req, res, next) => {
  try {
    const seasonYear =
      typeof req.query.seasonYear === 'string'
        ? Number(req.query.seasonYear)
        : new Date().getFullYear();

    if (!Number.isSafeInteger(seasonYear) || seasonYear < 2000) {
      throw new HttpError(
        400,
        'INVALID_INPUT',
        '올바른 시즌 연도가 필요합니다.',
      );
    }

    res.json(await getPostseasonBracket(seasonYear));
  } catch (error) {
    next(error);
  }
});

teamRouter.get('/season-projection', async (req, res, next) => {
  try {
    const seasonYear =
      typeof req.query.seasonYear === 'string'
        ? Number(req.query.seasonYear)
        : new Date().getFullYear();
    const seriesId =
      typeof req.query.seriesId === 'string' ? req.query.seriesId : '0';

    if (!Number.isSafeInteger(seasonYear) || seasonYear < 2000) {
      throw new HttpError(
        400,
        'INVALID_INPUT',
        '올바른 시즌 연도가 필요합니다.',
      );
    }

    const projection = await getLatestSeasonProjection(seasonYear, seriesId);

    res.json(
      projection ??
        emptySeasonProjection({
          seasonYear,
          seriesId,
        }),
    );
  } catch (error) {
    next(error);
  }
});

/** 스토브리그 FA 명단과 계약 결과. 연도를 빼면 가장 최근 스토브리그. */
teamRouter.get('/free-agents', async (req, res, next) => {
  try {
    const requestedYear =
      typeof req.query.year === 'string' && req.query.year
        ? Number(req.query.year)
        : null;

    if (
      requestedYear !== null &&
      (!Number.isSafeInteger(requestedYear) || requestedYear < 2000)
    ) {
      throw new HttpError(400, 'INVALID_INPUT', '올바른 연도가 필요합니다.');
    }

    const faYear = requestedYear ?? (await findLatestFreeAgentYear());

    res.json({
      faYear,
      items: faYear ? await listFreeAgents(faYear) : [],
    });
  } catch (error) {
    next(error);
  }
});

/** FA 선수 한 명의 KBO 기록: 선수 정보·올시즌·최근 10경기·순위·통산. 처음 열면 그때 받아 저장한다. */
teamRouter.get('/free-agents/:freeAgentId/record', async (req, res, next) => {
  try {
    const freeAgentId = Number(req.params.freeAgentId);

    if (!Number.isSafeInteger(freeAgentId) || freeAgentId < 1) {
      throw new HttpError(400, 'INVALID_INPUT', '올바른 FA ID가 필요합니다.');
    }

    const freeAgent = await findFreeAgentById(freeAgentId);

    if (!freeAgent) {
      throw new HttpError(
        404,
        'FREE_AGENT_NOT_FOUND',
        'FA 선수를 찾을 수 없습니다.',
      );
    }

    const key = await findFreeAgentPlayerKey(freeAgentId);
    let saved = null;

    if (key) {
      try {
        saved = await loadPlayerRecord(key.kboPlayerId, key.role);
      } catch (error) {
        // KBO 가 응답하지 않아도 선수 정보는 보여 준다
        console.warn('[free-agents] 선수 기록을 받지 못했습니다.', error);
      }
    }

    res.json({
      freeAgent,
      record: saved?.record ?? null,
      syncedAt: saved?.syncedAt ?? null,
    });
  } catch (error) {
    next(error);
  }
});
