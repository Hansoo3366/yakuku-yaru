import { request } from './api';
import { shouldSendAuthorizationHeader } from './auth';

export type AttendanceRecord = {
  id: number;
  userId: number;
  gameId: number;
  watchType: 'stadium' | 'home';
  cheeredTeamId?: number | null;
  cheeredTeamShortName?: string | null;
  photoUrl: string | null;
  memo: string | null;
  myTeamScore: number | null;
  opponentScore: number | null;
  result: string | null;
  isScoreModified: boolean;
  createdAt: string;
  updatedAt: string;
  ownerNickname: string;
  ownerFavoriteTeamId?: number | null;
  lastModifiedByUserId: number | null;
  lastModifiedByNickname: string | null;
  viewerRelation: 'owner' | 'companion';
  canEdit: boolean;
  companions: AttendanceCompanion[];
  game: {
    gameDate: string;
    stadium: string;
    homeTeam: {
      id: number;
      name: string;
      shortName: string;
    };
    awayTeam: {
      id: number;
      name: string;
      shortName: string;
    };
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    cancellationReason?: string | null;
  };
};

export type CompanionStatus = 'pending' | 'accepted' | 'rejected';

export type AttendanceCompanion = {
  id: number;
  userId: number;
  nickname: string;
  email: string;
  status: CompanionStatus;
  respondedAt: string | null;
  createdAt: string;
};

export type AttendanceInput = {
  gameId?: number;
  watchType: 'stadium' | 'home';
  memo: string;
  myTeamScore: number | null;
  opponentScore: number | null;
  result: string | null;
  isScoreModified?: boolean;
  companionUserIds?: number[];
  cheeredTeamId?: number | null;
};

export type AttendanceStats = {
  totalCount: number;
  stadiumCount: number;
  homeCount: number;
  winCount: number;
  loseCount: number;
  drawCount: number;
  winRate: number;
  stadiumWinRate: number;
  homeWinRate: number;
  title: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
export const ATTENDANCE_PHOTO_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/gif';
const ATTENDANCE_PHOTO_MAX_BYTES = 20 * 1024 * 1024;
const ATTENDANCE_PHOTO_OPTIMIZED_MAX_BYTES = 5 * 1024 * 1024;
const ATTENDANCE_PHOTO_TARGET_SIZE = 1600;
const ATTENDANCE_PHOTO_ALLOWED_TYPES = new Set(
  ATTENDANCE_PHOTO_ACCEPT.split(','),
);

export function listAttendanceRecords(
  input: { from?: string; to?: string },
  token: string,
) {
  const params = new URLSearchParams();

  if (input.from) {
    params.set('from', input.from);
  }

  if (input.to) {
    params.set('to', input.to);
  }

  return request<{ items: AttendanceRecord[] }>(
    `/attendance-records?${params.toString()}`,
    {
      token,
    },
  );
}

export function fetchAttendanceRecord(recordId: number, token: string) {
  return request<{ record: AttendanceRecord }>(
    `/attendance-records/${recordId}`,
    {
      token,
    },
  );
}

export function createAttendanceRecord(input: AttendanceInput, token: string) {
  return request<{ record: AttendanceRecord }>('/attendance-records', {
    method: 'POST',
    body: input,
    token,
  });
}

export function updateAttendanceRecord(
  recordId: number,
  input: AttendanceInput,
  token: string,
) {
  return request<{ record: AttendanceRecord }>(
    `/attendance-records/${recordId}`,
    {
      method: 'PATCH',
      body: input,
      token,
    },
  );
}

export function deleteAttendanceRecord(recordId: number, token: string) {
  return request<void>(`/attendance-records/${recordId}`, {
    method: 'DELETE',
    token,
  });
}

export function respondAttendanceCompanion(
  recordId: number,
  status: 'accepted' | 'rejected',
  token: string,
) {
  return request<{
    companion: AttendanceCompanion;
    record: AttendanceRecord | null;
  }>(`/attendance-records/${recordId}/companions/me`, {
    method: 'PATCH',
    body: { status },
    token,
  });
}

export function fetchAttendanceStats(token: string) {
  return request<AttendanceStats>('/attendance-records/stats/me', {
    token,
  });
}

async function optimizeAttendancePhoto(photo: File) {
  if (!ATTENDANCE_PHOTO_ALLOWED_TYPES.has(photo.type)) {
    throw new Error('JPG, PNG, WebP, HEIC, AVIF, GIF 이미지만 업로드할 수 있어요.');
  }

  if (photo.size > ATTENDANCE_PHOTO_MAX_BYTES) {
    throw new Error('직관 사진 원본은 20MB 이하로 선택해주세요.');
  }

  const bitmap = await createImageBitmap(photo);
  const scale = Math.min(
    1,
    ATTENDANCE_PHOTO_TARGET_SIZE / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('직관 사진을 처리할 수 없어요.');
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', 0.84);
  });

  if (!blob) {
    throw new Error('직관 사진 최적화에 실패했어요.');
  }

  if (blob.size > ATTENDANCE_PHOTO_OPTIMIZED_MAX_BYTES) {
    throw new Error('최적화된 직관 사진은 5MB 이하로 업로드해주세요.');
  }

  return new File([blob], 'attendance-photo.webp', {
    type: 'image/webp',
  });
}

export async function uploadAttendancePhoto(
  recordId: number,
  photo: File,
  token: string,
) {
  const optimizedPhoto = await optimizeAttendancePhoto(photo);
  const formData = new FormData();
  formData.set('photo', optimizedPhoto);

  const response = await fetch(
    `${API_URL}/attendance-records/${recordId}/photo`,
    {
      method: 'POST',
      headers: shouldSendAuthorizationHeader(token)
        ? { Authorization: `Bearer ${token}` }
        : undefined,
      body: formData,
      credentials: 'include',
    },
  );

  if (!response.ok) {
    const error = (await response.json().catch(() => ({
      message: '사진 업로드에 실패했습니다.',
    }))) as { message: string };
    throw new Error(error.message);
  }

  return response.json() as Promise<{ record: AttendanceRecord }>;
}
