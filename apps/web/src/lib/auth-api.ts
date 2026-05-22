import { request } from './api';
import type { PublicUser } from './auth';

export type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};

export type RegisterResponse = {
  user: PublicUser;
  verificationToken: string;
};

export function login(input: { email: string; password: string }) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: input,
  });
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

export function updateNickname(nickname: string, token: string) {
  return request<{ user: PublicUser }>('/users/me/nickname', {
    method: 'PATCH',
    body: { nickname },
    token,
  });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export async function uploadProfilePhoto(photo: File, token: string) {
  const formData = new FormData();
  formData.set('photo', photo);

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
