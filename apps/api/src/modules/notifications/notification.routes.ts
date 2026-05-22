import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import {
  countUnreadNotifications,
  deleteAllNotifications,
  deleteNotification,
  listNotifications,
  markNotificationRead,
  markNotificationsRead,
} from './notification.repository.js';

export const notificationRouter = Router();

notificationRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? 0;
    const [items, unreadCount] = await Promise.all([
      listNotifications(userId),
      countUnreadNotifications(userId),
    ]);

    res.json({ items, unreadCount });
  } catch (error) {
    next(error);
  }
});

notificationRouter.patch('/read', authenticate, async (req, res, next) => {
  try {
    await markNotificationsRead(req.user?.id ?? 0);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

notificationRouter.patch('/:notificationId/read', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.notificationId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'INVALID_INPUT', '알림 ID가 올바르지 않습니다.');
    }
    await markNotificationRead({ id, userId: req.user?.id ?? 0 });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

notificationRouter.delete('/', authenticate, async (req, res, next) => {
  try {
    await deleteAllNotifications(req.user?.id ?? 0);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

notificationRouter.delete('/:notificationId', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.notificationId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'INVALID_INPUT', '알림 ID가 올바르지 않습니다.');
    }
    await deleteNotification({ id, userId: req.user?.id ?? 0 });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
