import { request } from './api';
import type { PublicUser } from './auth';

export type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};

export type EmailVerificationMeta = {
  emailSent: boolean;
  expiresAt: string;
  resendAvailableAt: string;
  resendsRemaining: number;
  verificationCode: string | null;
};

export type RegisterResponse = EmailVerificationMeta & {
  user: PublicUser;
};

export function login(input: { email: string; password: string }) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: input,
  });
}

export function checkRegistrationAvailability(input: {
  email: string;
  nickname: string;
}) {
  return request<{ emailAvailable: boolean; nicknameAvailable: boolean }>(
    '/auth/check-registration',
    {
      method: 'POST',
      body: input,
    },
  );
}

export function register(input: {
  email: string;
  password: string;
  nickname: string;
  favoriteTeamId?: number | null;
}) {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: input,
  });
}

export function fetchMe(token: string) {
  return request<{ user: PublicUser }>('/auth/me', {
    token,
  });
}

export function verifyEmail(input: { email: string; code: string } | { token: string }) {
  return request<{ verified: boolean }>('/auth/verify-email', {
    method: 'POST',
    body: input,
  });
}

export function resendVerificationEmail(email: string) {
  return request<EmailVerificationMeta>('/auth/resend-verification-email', {
    method: 'POST',
    body: { email },
  });
}

export function requestPasswordReset(email: string) {
  return request<{
    message: string;
    emailSent: boolean;
    resetUrl: string | null;
  }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export function resetPassword(input: { token: string; password: string }) {
  return request<{ reset: boolean }>('/auth/reset-password', {
    method: 'POST',
    body: input,
  });
}

export function updateNickname(nickname: string, token: string) {
  return request<{ user: PublicUser }>('/users/me/nickname', {
    method: 'PATCH',
    body: { nickname },
    token,
  });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
export const PROFILE_PHOTO_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/gif';
const PROFILE_PHOTO_MAX_BYTES = 1024 * 1024;
const PROFILE_PHOTO_TARGET_SIZE = 512;
const PROFILE_PHOTO_ALLOWED_TYPES = new Set(PROFILE_PHOTO_ACCEPT.split(','));

async function optimizeProfilePhoto(photo: File) {
  if (!PROFILE_PHOTO_ALLOWED_TYPES.has(photo.type)) {
    throw new Error('JPG, PNG, WebP, HEIC, AVIF, GIF 이미지만 업로드할 수 있어요.');
  }

  const bitmap = await createImageBitmap(photo);
  const scale = Math.min(
    1,
    PROFILE_PHOTO_TARGET_SIZE / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('프로필 사진을 처리할 수 없어요.');
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', 0.82);
  });

  if (!blob) {
    throw new Error('프로필 사진 최적화에 실패했어요.');
  }

  if (blob.size > PROFILE_PHOTO_MAX_BYTES) {
    throw new Error('프로필 사진은 1MB 이하로 업로드해주세요.');
  }

  return new File([blob], 'profile-photo.webp', {
    type: 'image/webp',
  });
}

export async function uploadProfilePhoto(photo: File, token: string) {
  const optimizedPhoto = await optimizeProfilePhoto(photo);
  const formData = new FormData();
  formData.set('photo', optimizedPhoto);

  const response = await fetch(`${API_URL}/users/me/profile-photo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({
      code: 'UNKNOWN_ERROR',
      message: '프로필 사진 업로드에 실패했습니다.',
    }))) as { message: string };
    throw new Error(error.message);
  }

  return response.json() as Promise<{ user: PublicUser }>;
}
