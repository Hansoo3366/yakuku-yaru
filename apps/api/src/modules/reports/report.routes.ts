import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { HttpError } from '../../utils/http-error.js';
import { createAdminNotifications } from '../notifications/notification.repository.js';
import { findUserById } from '../users/user.repository.js';
import {
  reportTargetExists,
  type ReportTargetType,
  upsertContentReport,
} from './report.repository.js';

export const reportRouter = Router();

const reportRateLimit = rateLimit({
  scope: 'reports:create',
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: '신고 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
});
const TARGET_TYPES = new Set<ReportTargetType>([
  'post',
  'comment',
  'user',
  'attendance',
]);
const REPORT_REASONS = new Set([
  'spam',
  'abuse',
  'privacy',
  'copyright',
  'illegal',
  'other',
]);

reportRouter.post(
  '/',
  authenticate,
  reportRateLimit,
  async (req, res, next) => {
    try {
      const targetType = req.body?.targetType as ReportTargetType;
      const targetId = Number(req.body?.targetId);
      const reason =
        typeof req.body?.reason === 'string' ? req.body.reason : '';
      const detail =
        typeof req.body?.detail === 'string' && req.body.detail.trim()
          ? req.body.detail.trim().slice(0, 500)
          : null;

      if (
        !TARGET_TYPES.has(targetType) ||
        !Number.isInteger(targetId) ||
        targetId < 1 ||
        !REPORT_REASONS.has(reason)
      ) {
        throw new HttpError(
          400,
          'INVALID_INPUT',
          '신고 대상과 사유를 확인해주세요.',
        );
      }

      if (!(await reportTargetExists(targetType, targetId))) {
        throw new HttpError(
          404,
          'REPORT_TARGET_NOT_FOUND',
          '신고 대상을 찾을 수 없습니다.',
        );
      }

      const reporterUserId = req.user?.id ?? 0;
      await upsertContentReport({
        reporterUserId,
        targetType,
        targetId,
        reason,
        detail,
      });

      const reporter = await findUserById(reporterUserId);
      await createAdminNotifications({
        actorUserId: reporterUserId,
        type: 'content_reported',
        message: `${reporter?.nickname ?? '한 팬'}님이 콘텐츠를 신고했어요.`,
      });

      res.status(201).json({ reported: true });
    } catch (error) {
      next(error);
    }
  },
);
