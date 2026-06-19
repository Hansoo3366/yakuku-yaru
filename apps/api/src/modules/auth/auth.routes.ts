import { Router } from 'express';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/authenticate.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { HttpError } from '../../utils/http-error.js';
import { signAccessToken } from '../../utils/jwt.js';
import { comparePassword, hashPassword } from '../../utils/password.js';
import {
  findUsableEmailVerificationToken,
  findUsableEmailVerificationTokenByEmailAndCode,
  markEmailVerificationTokenUsed,
} from './email-verification.repository.js';
import {
  getEmailVerificationStatus,
  issueEmailVerification,
  resendEmailVerification,
} from './email-verification.js';
import { getPasswordResetUrl, sendPasswordResetEmail } from './email.service.js';
import {
  createPasswordResetToken,
  findUsablePasswordResetToken,
  markPasswordResetTokenUsed,
} from './password-reset.repository.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByNickname,
  markUserEmailVerified,
  toPublicUser,
  updateUserPassword,
} from '../users/user.repository.js';
import {
  validateEmail,
  validateNickname,
  validatePassword,
} from '../../utils/user-input.js';
import { clearAuthCookie, setAuthCookie } from './auth-cookie.js';
import { findTeamById } from '../teams/team.repository.js';

export const authRouter = Router();

const registerRateLimit = rateLimit({
  scope: 'auth:register',
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: '회원가입 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
});

const loginRateLimit = rateLimit({
  scope: 'auth:login',
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: '로그인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
});

const verifyEmailRateLimit = rateLimit({
  scope: 'auth:verify-email',
  windowMs: 10 * 60 * 1000,
  max: 20,
});

const resendVerificationRateLimit = rateLimit({
  scope: 'auth:resend-verification',
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: '인증번호 재전송 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
});

const checkRegistrationRateLimit = rateLimit({
  scope: 'auth:check-registration',
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: '중복 확인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
});

const forgotPasswordRateLimit = rateLimit({
  scope: 'auth:forgot-password',
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: '비밀번호 재설정 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
});

const resetPasswordRateLimit = rateLimit({
  scope: 'auth:reset-password',
  windowMs: 10 * 60 * 1000,
  max: 20,
});

authRouter.post('/check-registration', checkRegistrationRateLimit, async (req, res, next) => {
  try {
    const { email, nickname } = req.body as {
      email?: string;
      nickname?: string;
    };

    if (!email || !nickname) {
      throw new HttpError(400, 'INVALID_INPUT', '이메일과 닉네임을 입력해주세요.');
    }

    const normalizedEmail = validateEmail(email);
    const normalizedNickname = validateNickname(nickname);

    const [existingEmail, existingNickname] = await Promise.all([
      findUserByEmail(normalizedEmail),
      findUserByNickname(normalizedNickname),
    ]);

    res.json({
      emailAvailable: !existingEmail,
      nicknameAvailable: !existingNickname,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/register', registerRateLimit, async (req, res, next) => {
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

    const verification = await issueEmailVerification({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    });

    res.status(201).json({
      user: toPublicUser(user),
      emailSent: verification.emailSent,
      expiresAt: verification.expiresAt,
      expiresInSeconds: verification.expiresInSeconds,
      resendAvailableAt: verification.resendAvailableAt,
      resendInSeconds: verification.resendInSeconds,
      resendsRemaining: verification.resendsRemaining,
      verificationCode:
        env.nodeEnv !== 'production' && !verification.emailSent
          ? verification.code
          : null,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', loginRateLimit, async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body as {
      email?: string;
      password?: string;
      rememberMe?: boolean;
    };

    if (!email || !password) {
      throw new HttpError(400, 'INVALID_INPUT', '이메일과 비밀번호를 입력해주세요.');
    }

    const normalizedEmail = validateEmail(email);
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    if (!user.email_verified_at) {
      throw new HttpError(
        403,
        'EMAIL_NOT_VERIFIED',
        '이메일 인증이 완료되지 않았습니다. 가입 시 받은 인증번호를 입력해주세요.',
      );
    }

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
    });

    setAuthCookie(res, accessToken, { rememberMe: Boolean(rememberMe) });

    res.json({
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
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

authRouter.post('/forgot-password', forgotPasswordRateLimit, async (req, res, next) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      throw new HttpError(400, 'INVALID_INPUT', '이메일을 입력해주세요.');
    }

    const normalizedEmail = validateEmail(email);
    const user = await findUserByEmail(normalizedEmail);

    const genericMessage =
      '등록된 이메일이면 비밀번호 재설정 링크를 보냈어요. 메일함과 스팸함을 확인해주세요.';

    if (!user) {
      res.json({ message: genericMessage, emailSent: false });
      return;
    }

    const resetToken = await createPasswordResetToken(user.id);
    const emailSent = await sendPasswordResetEmail({
      email: user.email,
      nickname: user.nickname,
      token: resetToken,
    });

    res.json({
      message: genericMessage,
      emailSent,
      resetUrl: env.nodeEnv === 'production' ? null : getPasswordResetUrl(resetToken),
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/reset-password', resetPasswordRateLimit, async (req, res, next) => {
  try {
    const { token, password } = req.body as {
      token?: string;
      password?: string;
    };

    if (!token || !password) {
      throw new HttpError(400, 'INVALID_INPUT', '토큰과 새 비밀번호를 입력해주세요.');
    }

    const normalizedPassword = validatePassword(password);
    const resetToken = await findUsablePasswordResetToken(token);

    if (!resetToken) {
      throw new HttpError(
        400,
        'INVALID_RESET_TOKEN',
        '유효하지 않거나 만료된 재설정 링크입니다. 비밀번호 찾기를 다시 요청해주세요.',
      );
    }

    const passwordHash = await hashPassword(normalizedPassword);
    await updateUserPassword(resetToken.user_id, passwordHash);
    await markPasswordResetTokenUsed(resetToken.id);

    res.json({
      reset: true,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/verification-status', checkRegistrationRateLimit, async (req, res, next) => {
  try {
    const email = req.query.email as string | undefined;

    if (!email) {
      throw new HttpError(400, 'INVALID_INPUT', '이메일을 입력해주세요.');
    }

    const normalizedEmail = validateEmail(email);
    const status = await getEmailVerificationStatus(normalizedEmail);

    res.json(status);
  } catch (error) {
    next(error);
  }
});

authRouter.post(
  '/resend-verification-email',
  resendVerificationRateLimit,
  async (req, res, next) => {
    try {
      const { email } = req.body as { email?: string };

      if (!email) {
        throw new HttpError(400, 'INVALID_INPUT', '이메일을 입력해주세요.');
      }

      const normalizedEmail = validateEmail(email);
      const verification = await resendEmailVerification(normalizedEmail);

      res.json({
        emailSent: verification.emailSent,
        expiresAt: verification.expiresAt,
        expiresInSeconds: verification.expiresInSeconds,
        resendAvailableAt: verification.resendAvailableAt,
        resendInSeconds: verification.resendInSeconds,
        resendsRemaining: verification.resendsRemaining,
        verificationCode:
          env.nodeEnv !== 'production' && !verification.emailSent
            ? verification.code
            : null,
      });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post('/verify-email', verifyEmailRateLimit, async (req, res, next) => {
  try {
    const { token, email, code } = req.body as {
      token?: string;
      email?: string;
      code?: string;
    };

    let verificationToken = null;

    if (email && code) {
      const normalizedEmail = validateEmail(email);
      const normalizedCode = String(code).trim().replace(/\D/g, '');

      if (normalizedCode.length !== 6) {
        throw new HttpError(400, 'INVALID_INPUT', '6자리 인증번호를 입력해주세요.');
      }

      verificationToken = await findUsableEmailVerificationTokenByEmailAndCode(
        normalizedEmail,
        normalizedCode,
      );
    } else if (token) {
      verificationToken = await findUsableEmailVerificationToken(token.trim());
    } else {
      throw new HttpError(400, 'INVALID_INPUT', '이메일과 인증번호를 입력해주세요.');
    }

    if (!verificationToken) {
      throw new HttpError(
        400,
        'INVALID_VERIFICATION_TOKEN',
        '인증번호가 올바르지 않거나 만료되었습니다.',
      );
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
