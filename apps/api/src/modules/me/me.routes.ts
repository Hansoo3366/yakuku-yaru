import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import { findTeamById } from '../teams/team.repository.js';
import {
  toPublicUser,
  updateUserFavoriteTeam,
} from '../users/user.repository.js';

export const meRouter = Router();

meRouter.patch('/favorite-team', authenticate, async (req, res, next) => {
  try {
    const { teamId } = req.body as {
      teamId?: number;
    };

    if (!Number.isInteger(teamId) || !teamId) {
      throw new HttpError(400, 'INVALID_INPUT', '팀을 선택해주세요.');
    }

    const team = await findTeamById(teamId);

    if (!team) {
      throw new HttpError(404, 'TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');
    }

    const user = await updateUserFavoriteTeam(req.user?.id ?? 0, teamId);

    if (!user) {
      throw new HttpError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.');
    }

    res.json({
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
});
