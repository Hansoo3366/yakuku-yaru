import { request } from './api';

export type AppNotification = {
  id: number;
  userId: number;
  actorUserId: number | null;
  attendanceRecordId: number | null;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export function listNotifications(token: string) {
  return request<{ items: AppNotification[]; unreadCount: number }>(
    '/notifications',
    { token },
  );
}

export function markNotificationsRead(token: string) {
  return request<{ ok: boolean }>('/notifications/read', {
    method: 'PATCH',
    token,
  });
}
