import { request } from './api';

export type AttendanceRecord = {
  id: number;
  userId: number;
  gameId: number;
  photoUrl: string | null;
  memo: string | null;
  myTeamScore: number | null;
  opponentScore: number | null;
  result: string | null;
  isScoreModified: boolean;
  createdAt: string;
  updatedAt: string;
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

export type AttendanceInput = {
  gameId?: number;
  memo: string;
  myTeamScore: number | null;
  opponentScore: number | null;
  result: string;
};

export type AttendanceStats = {
  totalCount: number;
  winCount: number;
  loseCount: number;
  drawCount: number;
  winRate: number;
  title: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

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
    throw new Error('사진 업로드에 실패했습니다.');
  }

  return response.json() as Promise<{ record: AttendanceRecord }>;
}
