import { request } from './api';

export type AttendanceRecord = {
  id: number;
  userId: number;
  gameId: number;
  watchType: 'stadium' | 'home';
  photoUrl: string | null;
  memo: string | null;
  myTeamScore: number | null;
  opponentScore: number | null;
  result: string | null;
  isScoreModified: boolean;
  createdAt: string;
  updatedAt: string;
  ownerNickname: string;
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
  result: string;
  companionUserIds?: number[];
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

export async function uploadAttendancePhoto(
  recordId: number,
  photo: File,
  token: string,
) {
  if (!ATTENDANCE_PHOTO_ALLOWED_TYPES.has(photo.type)) {
    throw new Error('JPG, PNG, WebP, HEIC, AVIF, GIF 이미지만 업로드할 수 있어요.');
  }

  if (photo.size > ATTENDANCE_PHOTO_MAX_BYTES) {
    throw new Error('직관 사진은 20MB 이하로 업로드해주세요.');
  }

  const formData = new FormData();
  formData.set('photo', photo);

  const response = await fetch(
    `${API_URL}/attendance-records/${recordId}/photo`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
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
