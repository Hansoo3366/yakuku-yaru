import { request } from './api';

export type AppNotification = {
  id: number;
  userId: number;
  actorUserId: number | null;
  attendanceRecordId: number | null;
  postId: number | null;
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

export function markNotificationRead(notificationId: number, token: string) {
  return request<{ ok: boolean }>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  });
}

export function deleteNotification(notificationId: number, token: string) {
  return request<void>(`/notifications/${notificationId}`, {
    method: 'DELETE',
    token,
  });
}

export function deleteAllNotifications(token: string) {
  return request<void>('/notifications', {
    method: 'DELETE',
    token,
  });
}
