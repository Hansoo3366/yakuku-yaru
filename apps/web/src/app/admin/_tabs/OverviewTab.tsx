'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { AdminSummary } from '@/lib/admin-api';
import { POST_CATEGORY_LABELS } from '@/lib/post-meta';
import {
  useAdminPostsQuery,
  useAdminReportsQuery,
  useAdminSyncJobQuery,
  useAdminUsersQuery,
} from '@/lib/queries/admin';
import { adminTabHref, type AdminTab } from '../_components/admin-tabs';
import { Chip, ErrorState, formatCount, formatDate } from '../_components/ui';
import {
  REPORT_STATUS_LABELS,
  REPORT_STATUS_TONES,
  REPORT_TARGET_LABELS,
  reportReasonLabel,
} from './ReportsTab';
import {
  formatSyncParams,
  isSyncJobActive,
  SYNC_JOB_LABELS,
  SYNC_STATUS_LABELS,
  SYNC_STATUS_TONES,
} from './SyncTab';

const STATS: { key: keyof AdminSummary; label: string; tab: AdminTab; unit: string }[] = [
  { key: 'pendingReports', label: '처리 대기 신고', tab: 'reports', unit: '건' },
  { key: 'users', label: '사용자', tab: 'users', unit: '명' },
  { key: 'posts', label: '게시글', tab: 'posts', unit: '개' },
  { key: 'comments', label: '댓글', tab: 'comments', unit: '개' },
  { key: 'photos', label: '직관 사진', tab: 'media', unit: '장' },
  { key: 'games', label: 'KBO 연동 경기', tab: 'games', unit: '경기' },
];

const RECENT_COUNT = 5;

export function OverviewTab({
  summaryQuery,
}: {
  summaryQuery: UseQueryResult<AdminSummary>;
}) {
  const summary = summaryQuery.data;

  return (
    <div className="admin-overview">
      {summaryQuery.isError ? (
        <ErrorState error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
      ) : (
        <ul aria-label="운영 지표" className="admin-stats">
          {STATS.map((stat) => {
            const value = summary?.[stat.key];
            const isAlert = stat.key === 'pendingReports' && (value ?? 0) > 0;
            return (
              <li key={stat.key}>
                <Link className={isAlert ? 'is-alert' : undefined} href={adminTabHref(stat.tab)} scroll={false}>
                  <span className="admin-stat-label">{stat.label}</span>
                  <span className="admin-stat-value">
                    {value == null ? (
                      <span className="skeleton" style={{ height: 28, width: 64 }} />
                    ) : (
                      <>
                        <strong>{formatCount(value)}</strong>
                        <small>{stat.unit}</small>
                      </>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="admin-overview-grid">
        <PendingReportsCard />
        <SyncJobCard />
        <RecentUsersCard />
        <RecentPostsCard />
      </div>
    </div>
  );
}

function OverviewCard({
  title,
  tab,
  linkLabel,
  children,
}: {
  title: string;
  tab: AdminTab;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-panel admin-overview-card">
      <header>
        <h2>{title}</h2>
        <Link className="admin-link" href={adminTabHref(tab)} scroll={false}>
          {linkLabel}
          <ArrowRight aria-hidden="true" size={14} />
        </Link>
      </header>
      {children}
    </section>
  );
}

function CardLoading() {
  return (
    <div className="admin-loading" role="status" aria-label="불러오는 중">
      {Array.from({ length: 3 }, (_, index) => (
        <span className="skeleton" key={index} style={{ height: 32 }} />
      ))}
    </div>
  );
}

function PendingReportsCard() {
  const reportsQuery = useAdminReportsQuery();
  const open = (reportsQuery.data?.items ?? []).filter(
    (report) => report.status === 'pending' || report.status === 'reviewing',
  );

  return (
    <OverviewCard linkLabel="신고 처리" tab="reports" title="처리할 신고">
      {reportsQuery.isPending ? (
        <CardLoading />
      ) : reportsQuery.isError ? (
        <ErrorState error={reportsQuery.error} onRetry={() => void reportsQuery.refetch()} />
      ) : open.length ? (
        <ul className="admin-mini-list">
          {open.slice(0, RECENT_COUNT).map((report) => (
            <li key={report.id}>
              <span className="admin-mini-main">
                <strong>{report.targetLabel ?? '삭제된 콘텐츠'}</strong>
                <small>
                  {REPORT_TARGET_LABELS[report.targetType]} · {reportReasonLabel(report.reason)} · {formatDate(report.createdAt)}
                </small>
              </span>
              <Chip tone={REPORT_STATUS_TONES[report.status]}>{REPORT_STATUS_LABELS[report.status]}</Chip>
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin-mini-empty">처리할 신고가 없습니다.</p>
      )}
    </OverviewCard>
  );
}

function SyncJobCard() {
  const syncJobQuery = useAdminSyncJobQuery();
  const job = syncJobQuery.data?.job;

  return (
    <OverviewCard linkLabel="데이터 갱신" tab="sync" title="최근 데이터 갱신">
      {syncJobQuery.isPending ? (
        <CardLoading />
      ) : syncJobQuery.isError ? (
        <ErrorState error={syncJobQuery.error} onRetry={() => void syncJobQuery.refetch()} />
      ) : job ? (
        <div className="admin-mini-job">
          <Chip pulse={isSyncJobActive(job)} tone={SYNC_STATUS_TONES[job.status]}>
            {SYNC_STATUS_LABELS[job.status]}
          </Chip>
          <strong>{SYNC_JOB_LABELS[job.type]}</strong>
          <small>
            {formatSyncParams(job.params) || '기본 범위'} ·{' '}
            {job.finishedAt ? `${formatDate(job.finishedAt)} 종료` : job.startedAt ? `${formatDate(job.startedAt)} 시작` : '대기 중'}
          </small>
          {job.error ? <p className="admin-mini-error">{job.error}</p> : null}
        </div>
      ) : (
        <p className="admin-mini-empty">
          서버가 켜진 뒤 직접 실행한 갱신이 없습니다. 예약된 자동 갱신은 여기에 나오지 않습니다.
        </p>
      )}
    </OverviewCard>
  );
}

function RecentUsersCard() {
  const usersQuery = useAdminUsersQuery('');
  const users = (usersQuery.data?.items ?? []).slice(0, RECENT_COUNT);

  return (
    <OverviewCard linkLabel="사용자 전체" tab="users" title="최근 가입">
      {usersQuery.isPending ? (
        <CardLoading />
      ) : usersQuery.isError ? (
        <ErrorState error={usersQuery.error} onRetry={() => void usersQuery.refetch()} />
      ) : users.length ? (
        <ul className="admin-mini-list">
          {users.map((user) => (
            <li key={user.id}>
              <span className="admin-mini-main">
                <strong>{user.nickname}</strong>
                <small>
                  {user.email} · {formatDate(user.createdAt)}
                </small>
              </span>
              {user.emailVerifiedAt ? null : <Chip tone="warning">미인증</Chip>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin-mini-empty">아직 가입한 사용자가 없습니다.</p>
      )}
    </OverviewCard>
  );
}

function RecentPostsCard() {
  const postsQuery = useAdminPostsQuery({ category: 'all', keyword: '', page: 1, pin: 'all' }, RECENT_COUNT);
  const posts = postsQuery.data?.items ?? [];

  return (
    <OverviewCard linkLabel="게시글 전체" tab="posts" title="최근 게시글">
      {postsQuery.isPending ? (
        <CardLoading />
      ) : postsQuery.isError ? (
        <ErrorState error={postsQuery.error} onRetry={() => void postsQuery.refetch()} />
      ) : posts.length ? (
        <ul className="admin-mini-list">
          {posts.map((post) => (
            <li key={post.id}>
              <span className="admin-mini-main">
                <Link href={`/posts/${post.id}`}>{post.title}</Link>
                <small>
                  {POST_CATEGORY_LABELS[post.category]} · {post.authorNickname} · {formatDate(post.createdAt)}
                </small>
              </span>
              <span className="admin-mini-num" title="댓글 수">
                댓글 {formatCount(post.commentCount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin-mini-empty">아직 게시글이 없습니다.</p>
      )}
    </OverviewCard>
  );
}
