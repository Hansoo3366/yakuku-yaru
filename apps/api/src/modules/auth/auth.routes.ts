import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import { signAccessToken } from '../../utils/jwt.js';
import { comparePassword, hashPassword } from '../../utils/password.js';
import {
  createEmailVerificationToken,
  findUsableEmailVerificationToken,
  markEmailVerificationTokenUsed,
} from './email-verification.repository.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByNickname,
  markUserEmailVerified,
  toPublicUser,
} from '../users/user.repository.js';
import {
  validateEmail,
  validateNickname,
  validatePassword,
} from '../../utils/user-input.js';
import { findTeamById } from '../teams/team.repository.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, nickname, favoriteTeamId } = req.body as {
      email?: string;
      password?: string;
      nickname?: string;
      favoriteTeamId?: number;
    };

    if (!email || !password || !nickname) {
      throw new HttpError(400, 'INVALID_INPUT', '필수 값을 입력해주세요.');
    }

    const normalizedEmail = validateEmail(email);
    const normalizedPassword = validatePassword(password);
    const normalizedNickname = validateNickname(nickname);

    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser) {
      throw new HttpError(409, 'EMAIL_ALREADY_EXISTS', '이미 사용 중인 이메일입니다.');
    }

    const nicknameTaken = await findUserByNickname(normalizedNickname);

    if (nicknameTaken) {
      throw new HttpError(409, 'NICKNAME_ALREADY_EXISTS', '이미 사용 중인 닉네임입니다.');
    }

    if (favoriteTeamId) {
      const favoriteTeam = await findTeamById(favoriteTeamId);

      if (!favoriteTeam) {
        throw new HttpError(404, 'TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');
      }
    }

    const passwordHash = await hashPassword(normalizedPassword);
    const user = await createUser({
      email: normalizedEmail,
      passwordHash,
      nickname: normalizedNickname,
      favoriteTeamId: favoriteTeamId ?? null,
    });

    if (!user) {
      throw new HttpError(500, 'USER_CREATE_FAILED', '회원가입에 실패했습니다.');
    }

    const verificationToken = await createEmailVerificationToken(user.id);

    res.status(201).json({
      user: toPublicUser(user),
      verificationToken,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      throw new HttpError(400, 'INVALID_INPUT', '이메일과 비밀번호를 입력해주세요.');
    }

    const user = await findUserByEmail(email);

    if (!user) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
    });

    res.json({
      accessToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await findUserById(req.user?.id ?? 0);

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

authRouter.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body as {
      token?: string;
    };

    if (!token) {
      throw new HttpError(400, 'INVALID_INPUT', '인증 토큰이 필요합니다.');
    }

    const verificationToken = await findUsableEmailVerificationToken(token);

    if (!verificationToken) {
      throw new HttpError(400, 'INVALID_VERIFICATION_TOKEN', '유효하지 않은 인증 토큰입니다.');
    }

    await markUserEmailVerified(verificationToken.user_id);
    await markEmailVerificationTokenUsed(verificationToken.id);

    res.json({
      verified: true,
    });
  } catch (error) {
    next(error);
  }
});
