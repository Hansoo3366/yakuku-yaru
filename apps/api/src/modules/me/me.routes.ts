import fs from 'node:fs';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/http-error.js';
import { validateNickname } from '../../utils/user-input.js';
import {
  assertUploadedImageFile,
  assertUserUploadQuota,
  profilePhotoUpload,
} from '../attendance/upload.js';
import { findTeamById } from '../teams/team.repository.js';
import {
  findUserByNickname,
  findUserById,
  toPublicUser,
  updateUserFavoriteTeam,
  updateUserNickname,
  updateUserProfileImage,
} from '../users/user.repository.js';
import { deleteUploadedFile } from '../../utils/upload-file.js';
import {
  deleteUserStadiumNote,
  findUserStadiumNote,
  normalizeStadiumName,
  normalizeStadiumNoteFields,
  upsertUserStadiumNote,
} from '../stadium-notes/stadium-note.repository.js';

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

meRouter.patch(
  '/favorite-team',
  authenticate,
  profileUpdateRateLimit,
  async (req, res, next) => {
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
        throw new HttpError(
          404,
          'USER_NOT_FOUND',
          '사용자를 찾을 수 없습니다.',
        );
      }

      res.json({
        user: toPublicUser(user),
      });
    } catch (error) {
      next(error);
    }
  },
);

meRouter.patch(
  '/nickname',
  authenticate,
  profileUpdateRateLimit,
  async (req, res, next) => {
    try {
      const { nickname } = req.body as { nickname?: string };
      const userId = req.user?.id ?? 0;

      if (!nickname) {
        throw new HttpError(400, 'INVALID_INPUT', '닉네임을 입력해주세요.');
      }

      const normalizedNickname = validateNickname(nickname);
      const nicknameTaken = await findUserByNickname(
        normalizedNickname,
        userId,
      );

      if (nicknameTaken) {
        throw new HttpError(
          409,
          'NICKNAME_ALREADY_EXISTS',
          '이미 사용 중인 닉네임입니다.',
        );
      }

      const user = await updateUserNickname(userId, normalizedNickname);

      if (!user) {
        throw new HttpError(
          404,
          'USER_NOT_FOUND',
          '사용자를 찾을 수 없습니다.',
        );
      }

      res.json({
        user: toPublicUser(user),
      });
    } catch (error) {
      next(error);
    }
  },
);

meRouter.get('/stadium-notes', authenticate, async (req, res, next) => {
  try {
    const stadium =
      typeof req.query.stadium === 'string'
        ? normalizeStadiumName(req.query.stadium)
        : null;

    if (!stadium) {
      throw new HttpError(400, 'INVALID_INPUT', '구장 이름이 필요합니다.');
    }

    const note = await findUserStadiumNote({
      userId: req.user?.id ?? 0,
      stadium,
    });

    res.json({ note });
  } catch (error) {
    next(error);
  }
});

meRouter.put(
  '/stadium-notes',
  authenticate,
  profileUpdateRateLimit,
  async (req, res, next) => {
    try {
      const { stadium, foodMemo, parkingMemo } = req.body as {
        stadium?: string;
        foodMemo?: string;
        parkingMemo?: string;
      };
      const normalizedStadium =
        typeof stadium === 'string' ? normalizeStadiumName(stadium) : null;

      if (!normalizedStadium) {
        throw new HttpError(
          400,
          'INVALID_INPUT',
          '구장 이름이 올바르지 않습니다.',
        );
      }

      const {
        foodMemo: normalizedFoodMemo,
        parkingMemo: normalizedParkingMemo,
      } = normalizeStadiumNoteFields({
        foodMemo: typeof foodMemo === 'string' ? foodMemo : '',
        parkingMemo: typeof parkingMemo === 'string' ? parkingMemo : '',
      });

      const userId = req.user?.id ?? 0;

      if (!normalizedFoodMemo && !normalizedParkingMemo) {
        await deleteUserStadiumNote({
          userId,
          stadium: normalizedStadium,
        });
        res.json({ note: null });
        return;
      }

      const note = await upsertUserStadiumNote({
        userId,
        stadium: normalizedStadium,
        foodMemo: normalizedFoodMemo,
        parkingMemo: normalizedParkingMemo,
      });

      res.json({ note });
    } catch (error) {
      next(error);
    }
  },
);

meRouter.post(
  '/profile-photo',
  authenticate,
  profilePhotoRateLimit,
  async (req, res, next) => {
    try {
      const user = await findUserById(req.user?.id ?? 0);

      if (!user) {
        throw new HttpError(
          404,
          'USER_NOT_FOUND',
          '사용자를 찾을 수 없습니다.',
        );
      }

      res.locals.profileUser = user;
      next();
    } catch (error) {
      next(error);
    }
  },
  profilePhotoUpload.single('photo'),
  async (req, res, next) => {
    try {
      const userId = req.user?.id ?? 0;
      const previousUser = res.locals.profileUser as Awaited<
        ReturnType<typeof findUserById>
      >;

      if (!previousUser || !req.file) {
        throw new HttpError(
          400,
          'INVALID_INPUT',
          '프로필 사진 파일을 선택해주세요.',
        );
      }

      await assertUploadedImageFile(req.file);
      await assertUserUploadQuota(userId, previousUser.profile_image_url);

      const user = await updateUserProfileImage(
        userId,
        `/uploads/${req.file.filename}`,
      );

      if (!user) {
        throw new HttpError(
          404,
          'USER_NOT_FOUND',
          '사용자를 찾을 수 없습니다.',
        );
      }

      await deleteUploadedFile(previousUser.profile_image_url);

      res.json({
        user: toPublicUser(user),
      });
    } catch (error) {
      await deleteUploadedFile(
        req.file ? `/uploads/${req.file.filename}` : null,
      );
      next(error);
    }
  },
);
