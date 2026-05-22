import fs from 'node:fs';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/http-error.js';
import { validateNickname } from '../../utils/user-input.js';
import { upload } from '../attendance/upload.js';
import { findTeamById } from '../teams/team.repository.js';
import {
  findUserByNickname,
  toPublicUser,
  updateUserFavoriteTeam,
  updateUserNickname,
  updateUserProfileImage,
} from '../users/user.repository.js';

export const meRouter = Router();

fs.mkdirSync(env.uploadDir, { recursive: true });

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

meRouter.patch('/nickname', authenticate, async (req, res, next) => {
  try {
    const { nickname } = req.body as { nickname?: string };
    const userId = req.user?.id ?? 0;

    if (!nickname) {
      throw new HttpError(400, 'INVALID_INPUT', '닉네임을 입력해주세요.');
    }

    const normalizedNickname = validateNickname(nickname);
    const nicknameTaken = await findUserByNickname(normalizedNickname, userId);

    if (nicknameTaken) {
      throw new HttpError(409, 'NICKNAME_ALREADY_EXISTS', '이미 사용 중인 닉네임입니다.');
    }

    const user = await updateUserNickname(userId, normalizedNickname);

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

meRouter.post(
  '/profile-photo',
  authenticate,
  upload.single('photo'),
  async (req, res, next) => {
    try {
      const userId = req.user?.id ?? 0;

      if (!req.file) {
        throw new HttpError(400, 'INVALID_INPUT', '프로필 사진 파일을 선택해주세요.');
      }

      const user = await updateUserProfileImage(
        userId,
        `/uploads/${req.file.filename}`,
      );

      if (!user) {
        throw new HttpError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.');
      }

      res.json({
        user: toPublicUser(user),
      });
    } catch (error) {
      next(error);
    }
  },
);
