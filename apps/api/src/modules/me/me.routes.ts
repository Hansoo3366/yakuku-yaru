import fs from 'node:fs';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/http-error.js';
import { validateNickname } from '../../utils/user-input.js';
import { profilePhotoUpload } from '../attendance/upload.js';
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

const profileUpdateRateLimit = rateLimit({
  scope: 'users:profile-update',
  windowMs: 10 * 60 * 1000,
  max: 20,
});

const profilePhotoRateLimit = rateLimit({
  scope: 'users:profile-photo',
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: '프로필 사진 변경 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
});

meRouter.patch('/favorite-team', authenticate, profileUpdateRateLimit, async (req, res, next) => {
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

meRouter.patch('/nickname', authenticate, profileUpdateRateLimit, async (req, res, next) => {
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
  profilePhotoRateLimit,
  profilePhotoUpload.single('photo'),
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
