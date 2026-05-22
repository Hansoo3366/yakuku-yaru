import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
  countUnreadNotifications,
  listNotifications,
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
