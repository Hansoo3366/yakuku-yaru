import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { searchUsers } from './user.repository.js';

export const userRouter = Router();

userRouter.get('/search', authenticate, async (req, res, next) => {
  try {
    const keyword =
      typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';

    if (keyword.length < 2) {
      res.json({ items: [] });
      return;
    }

    const users = await searchUsers({
      keyword,
      excludeUserId: req.user?.id ?? 0,
    });

    res.json({ items: users });
  } catch (error) {
    next(error);
  }
});
