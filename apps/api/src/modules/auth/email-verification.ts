import { HttpError } from '../../utils/http-error.js';
import { sendVerificationEmail } from './email.service.js';
import {
  countEmailVerificationSends,
  createEmailVerificationToken,
  EMAIL_VERIFICATION_MAX_SENDS,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  getLatestEmailVerificationToken,
} from './email-verification.repository.js';
import { findUserByEmail } from '../users/user.repository.js';

function toIso(date: Date) {
  return date.toISOString();
}

function getSecondsUntil(date: Date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));
}

function getResendAvailableAt(createdAt: Date) {
  return new Date(
    createdAt.getTime() + EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000,
  );
}

export function getVerificationResendsRemaining(sendCount: number) {
  return Math.max(0, EMAIL_VERIFICATION_MAX_SENDS - sendCount);
}

export async function issueEmailVerification(input: {
  userId: number;
  email: string;
  nickname: string;
}) {
  const sendCountBefore = await countEmailVerificationSends(input.userId);

  if (sendCountBefore >= EMAIL_VERIFICATION_MAX_SENDS) {
    throw new HttpError(
      429,
      'VERIFICATION_RESEND_LIMIT',
      '인증번호 재전송 횟수를 모두 사용했습니다. 회원가입을 처음부터 다시 진행해주세요.',
    );
  }

  if (sendCountBefore > 0) {
    const latest = await getLatestEmailVerificationToken(input.userId);

    if (latest) {
      const resendAvailableAt = getResendAvailableAt(latest.created_at);

      if (resendAvailableAt.getTime() > Date.now()) {
        const retryAfterSeconds = Math.ceil(
          (resendAvailableAt.getTime() - Date.now()) / 1000,
        );
        throw new HttpError(
          429,
          'VERIFICATION_RESEND_COOLDOWN',
          `인증번호는 ${retryAfterSeconds}초 후에 다시 요청할 수 있어요.`,
        );
      }
    }
  }

  const tokenRow = await createEmailVerificationToken(input.userId);
  const emailSent = await sendVerificationEmail({
    email: input.email,
    nickname: input.nickname,
    code: tokenRow.token,
  });

  const sendCount = await countEmailVerificationSends(input.userId);
  const resendAvailableAt = getResendAvailableAt(tokenRow.created_at);

  return {
    emailSent,
    code: tokenRow.token,
    expiresAt: toIso(tokenRow.expires_at),
    expiresInSeconds: getSecondsUntil(tokenRow.expires_at),
    resendAvailableAt: toIso(resendAvailableAt),
    resendInSeconds: getSecondsUntil(resendAvailableAt),
    resendsRemaining: getVerificationResendsRemaining(sendCount),
  };
}

export async function resendEmailVerification(email: string) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', '가입 정보를 찾을 수 없습니다.');
  }

  if (user.email_verified_at) {
    throw new HttpError(400, 'EMAIL_ALREADY_VERIFIED', '이미 인증이 완료된 이메일입니다.');
  }

  return issueEmailVerification({
    userId: user.id,
    email: user.email,
    nickname: user.nickname,
  });
}

function isUsableVerificationToken(token: {
  expires_at: Date;
  used_at: Date | null;
}) {
  return !token.used_at && new Date(token.expires_at).getTime() > Date.now();
}

export async function getEmailVerificationStatus(email: string) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', '가입 정보를 찾을 수 없습니다.');
  }

  if (user.email_verified_at) {
    throw new HttpError(400, 'EMAIL_ALREADY_VERIFIED', '이미 인증이 완료된 이메일입니다.');
  }

  const sendCount = await countEmailVerificationSends(user.id);
  const resendsRemaining = getVerificationResendsRemaining(sendCount);
  const latest = await getLatestEmailVerificationToken(user.id);

  if (!latest || !isUsableVerificationToken(latest)) {
    const resendAvailableAt = new Date();

    return {
      emailSent: false,
      expiresAt: null,
      expiresInSeconds: 0,
      resendAvailableAt: toIso(resendAvailableAt),
      resendInSeconds: 0,
      resendsRemaining,
      needsResend: true,
    };
  }

  const resendAvailableAt = getResendAvailableAt(latest.created_at);

  return {
    emailSent: true,
    expiresAt: toIso(latest.expires_at),
    expiresInSeconds: getSecondsUntil(latest.expires_at),
    resendAvailableAt: toIso(resendAvailableAt),
    resendInSeconds: getSecondsUntil(resendAvailableAt),
    resendsRemaining,
    needsResend: false,
  };
}
