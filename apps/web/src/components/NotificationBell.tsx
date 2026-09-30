'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import {
  deleteAllNotifications,
  deleteNotification,
  listNotifications,
  markNotificationRead,
  markNotificationsRead,
  type AppNotification,
} from '@/lib/notification-api';
import { respondAttendanceCompanion } from '@/lib/attendance-api';
import {
  formatKoreanDateShort,
  formatTimeAgo as formatRelativeTimeAgo,
} from '@/lib/date-format';

const NOTIFICATION_POLL_INTERVAL_MS = 30_000;

type RespondedRecords = Record<number, 'accepted' | 'rejected'>;

type NotificationBellProps = {
  userId: number | null;
};

function formatTimeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minute = 60 * 1000;
  const day = 24 * 60 * minute;
  if (diff < minute) return '방금 전';
  if (diff < 7 * day) return formatRelativeTimeAgo(value);
  return formatKoreanDateShort(value);
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [respondedRecords, setRespondedRecords] = useState<RespondedRecords>(
    {},
  );
  const [respondingRecordId, setRespondingRecordId] = useState<number | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (userId === null || !token) {
      setNotifications([]);
      setUnreadCount(0);
      setRespondedRecords({});
      return;
    }

    const sessionToken = token;
    let cancelled = false;
    async function loadNotifications() {
      try {
        const response = await listNotifications(sessionToken);
        if (cancelled) return;
        setNotifications(response.items);
        setUnreadCount(response.unreadCount);

        // 동행 태그 수락 상태는 알림 목록 응답에 함께 온다.
        const next: RespondedRecords = {};
        for (const item of response.items) {
          if (
            item.type === 'attendance_tagged' &&
            item.attendanceRecordId !== null &&
            (item.companionStatus === 'accepted' ||
              item.companionStatus === 'rejected')
          ) {
            next[item.attendanceRecordId] = item.companionStatus;
          }
        }
        setRespondedRecords(next);
      } catch {
        // 다음 주기에 다시 시도한다. 배지는 마지막으로 받은 값을 유지한다.
      }
    }

    // 탭이 보이는 동안만 주기적으로 확인하고, 다시 보이면 곧바로 새로 받는다.
    let intervalId: number | null = null;
    function startPolling() {
      if (intervalId !== null) return;
      intervalId = window.setInterval(() => {
        void loadNotifications();
      }, NOTIFICATION_POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    }
    function handleVisibilityChange() {
      if (document.hidden) {
        stopPolling();
        return;
      }
      void loadNotifications();
      startPolling();
    }

    void loadNotifications();
    if (!document.hidden) startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, userId]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount) {
      if (!token) return;
      try {
        await markNotificationsRead(token);
        setUnreadCount(0);
        setNotifications((current) =>
          current.map((item) =>
            item.readAt ? item : { ...item, readAt: new Date().toISOString() },
          ),
        );
      } catch {
        /* noop */
      }
    }
  }

  async function handleRespond(
    notification: AppNotification,
    status: 'accepted' | 'rejected',
  ) {
    const recordId = notification.attendanceRecordId;
    if (!recordId) return;
    if (!token) return;
    setRespondingRecordId(recordId);
    try {
      await respondAttendanceCompanion(recordId, status, token);
      setRespondedRecords((current) => ({ ...current, [recordId]: status }));
      if (!notification.readAt) {
        await markNotificationRead(notification.id, token);
      }
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
            : item,
        ),
      );
    } catch {
      /* noop */
    } finally {
      setRespondingRecordId(null);
    }
  }

  async function handleDelete(notification: AppNotification) {
    if (!token) return;
    try {
      await deleteNotification(notification.id, token);
      setNotifications((current) =>
        current.filter((item) => item.id !== notification.id),
      );
      if (!notification.readAt) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    } catch {
      /* noop */
    }
  }

  async function handleClearAll() {
    if (!notifications.length) return;
    if (!token) return;
    try {
      await deleteAllNotifications(token);
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="알림 열기"
        className="bell-button"
        onClick={handleToggle}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
          <path
            d="M12 3a6 6 0 0 0-6 6v3.6a3.4 3.4 0 0 1-1 2.4l-1 1A1 1 0 0 0 4.7 18h14.6a1 1 0 0 0 .7-1.7l-1-1.05a3.4 3.4 0 0 1-1-2.4V9a6 6 0 0 0-6-6Zm0 18a2.5 2.5 0 0 1-2.45-2h4.9A2.5 2.5 0 0 1 12 21Z"
            fill="currentColor"
          />
        </svg>
        {unreadCount > 0 ? (
          <span
            className="bell-badge"
            aria-label={`${unreadCount}개 미확인 알림`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="notification-popover"
          role="dialog"
          aria-label="알림 목록"
        >
          <div className="notification-popover-head">
            <strong>알림</strong>
            <button
              className="link-btn"
              disabled={!notifications.length}
              onClick={handleClearAll}
              type="button"
            >
              전체 삭제
            </button>
          </div>
          {notifications.length ? (
            <ul className="notification-popover-list">
              {notifications.map((notification) => {
                const recordId = notification.attendanceRecordId;
                const postId = notification.postId;
                const respondedStatus = recordId
                  ? respondedRecords[recordId]
                  : undefined;
                const showCompanionActions =
                  notification.type === 'attendance_tagged' &&
                  recordId !== null;
                const isUnread = !notification.readAt;
                return (
                  <li
                    className={`notification-popover-item ${isUnread ? 'is-unread' : ''}`}
                    data-type={notification.type}
                    key={notification.id}
                  >
                    <div className="notification-popover-row">
                      <p>{notification.message}</p>
                      <button
                        aria-label="알림 삭제"
                        className="notification-delete"
                        onClick={() => handleDelete(notification)}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                    <span className="notification-popover-time">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                    {showCompanionActions && recordId ? (
                      respondedStatus ? (
                        <span
                          className="notification-result"
                          data-status={respondedStatus}
                        >
                          {respondedStatus === 'accepted'
                            ? '동행 태그를 수락했어요'
                            : '동행 태그를 거절했어요'}
                        </span>
                      ) : (
                        <div className="notification-popover-actions">
                          <button
                            className="link-btn link-btn-primary"
                            disabled={respondingRecordId === recordId}
                            onClick={() =>
                              handleRespond(notification, 'accepted')
                            }
                            type="button"
                          >
                            수락
                          </button>
                          <button
                            className="link-btn"
                            disabled={respondingRecordId === recordId}
                            onClick={() =>
                              handleRespond(notification, 'rejected')
                            }
                            type="button"
                          >
                            거절
                          </button>
                        </div>
                      )
                    ) : null}
                    {recordId && !showCompanionActions ? (
                      <Link
                        className="link-btn"
                        href={`/attendance/${recordId}`}
                        onClick={() => setOpen(false)}
                      >
                        기록 보기
                      </Link>
                    ) : null}
                    {postId ? (
                      <Link
                        className="link-btn"
                        href={`/posts/${postId}`}
                        onClick={() => setOpen(false)}
                      >
                        글 보기
                      </Link>
                    ) : null}
                    {notification.type === 'content_reported' ? (
                      <Link
                        className="link-btn link-btn-primary"
                        href="/admin#reports"
                        onClick={() => setOpen(false)}
                      >
                        신고 확인
                      </Link>
                    ) : null}
                    {notification.type === 'user_followed' &&
                    notification.actorUserId ? (
                      <Link
                        className="link-btn"
                        href={`/fans/${notification.actorUserId}`}
                        onClick={() => setOpen(false)}
                      >
                        프로필 보기
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="notification-popover-empty">새 알림이 없어요</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
