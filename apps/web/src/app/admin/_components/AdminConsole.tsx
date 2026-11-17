'use client';

import { useIsFetching } from '@tanstack/react-query';
import { RotateCw, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useMeQuery } from '@/lib/queries';
import {
  adminKeys,
  useAdminSummaryQuery,
  useInvalidateAdmin,
} from '@/lib/queries/admin';
import { CheersTab } from '../_tabs/CheersTab';
import { CommentsTab } from '../_tabs/CommentsTab';
import { FreeAgentsTab } from '../_tabs/FreeAgentsTab';
import { GamesTab } from '../_tabs/GamesTab';
import { MediaTab } from '../_tabs/MediaTab';
import { OverviewTab } from '../_tabs/OverviewTab';
import { PostsTab } from '../_tabs/PostsTab';
import { ReportsTab } from '../_tabs/ReportsTab';
import { SyncTab } from '../_tabs/SyncTab';
import { UsersTab } from '../_tabs/UsersTab';
import {
  ADMIN_TAB_COUNTS,
  ADMIN_TAB_LABELS,
  ADMIN_TABS,
  adminTabHref,
  parseAdminTab,
  type AdminTab,
} from './admin-tabs';
import { AdminFeedbackProvider } from './feedback';
import { formatCount } from './ui';

export function AdminConsoleFallback() {
  return (
    <main className="app-shell admin-shell" aria-busy="true">
      <div className="admin-gate-loading">
        <span className="skeleton" style={{ height: 28, width: 160 }} />
        <span className="skeleton" style={{ height: 16, width: 280 }} />
        <span className="skeleton" style={{ height: 44 }} />
        <span className="skeleton" style={{ height: 320 }} />
      </div>
    </main>
  );
}

export function AdminConsole() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const meQuery = useMeQuery(token);

  if (!hasHydrated || (token && meQuery.isPending)) {
    return <AdminConsoleFallback />;
  }

  if (!token || meQuery.isError || meQuery.data?.user.role !== 'admin') {
    return (
      <main className="app-shell admin-shell">
        <section className="admin-denied">
          <ShieldAlert aria-hidden="true" size={28} />
          <h1>관리자 권한이 필요합니다</h1>
          <p>
            {token
              ? '지금 계정에는 관리자 권한이 없습니다. 관리자 계정으로 다시 로그인해 주세요.'
              : '관리자 계정으로 로그인한 뒤 다시 들어와 주세요.'}
          </p>
          <Link className="btn btn-primary" href="/login">
            로그인
          </Link>
        </section>
      </main>
    );
  }

  return (
    <AdminFeedbackProvider>
      <AdminWorkspace currentUserId={meQuery.data.user.id} />
    </AdminFeedbackProvider>
  );
}

function AdminWorkspace({ currentUserId }: { currentUserId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: AdminTab = parseAdminTab(searchParams.get('tab')) ?? 'overview';
  const summaryQuery = useAdminSummaryQuery();
  const invalidateAdmin = useInvalidateAdmin();
  const fetchingCount = useIsFetching({ queryKey: adminKeys.all });
  const navScrollRef = useRef<HTMLDivElement>(null);

  // 휴대폰에서 탭 줄이 가로로 넘칠 때, 지금 탭이 보이도록 가로 스크롤을 옮긴다.
  useEffect(() => {
    const scroller = navScrollRef.current;
    const active = scroller?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!scroller || !active) return;
    const left = active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2;
    scroller.scrollLeft = Math.max(0, left);
  }, [tab]);

  // 예전 주소(/admin#reports)로 들어오면 ?tab= 주소로 바꿔 준다. 알림의 신고 링크가 이 형식이다.
  useEffect(() => {
    const hashTab = parseAdminTab(window.location.hash.slice(1));
    if (hashTab) {
      router.replace(adminTabHref(hashTab), { scroll: false });
    }
  }, [router]);

  const summary = summaryQuery.data;

  return (
    <main className="app-shell admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-header-eyebrow">관리자</p>
          <h1>운영 관리</h1>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          disabled={fetchingCount > 0}
          onClick={() => void invalidateAdmin()}
          type="button"
        >
          <RotateCw
            aria-hidden="true"
            className={fetchingCount > 0 ? 'admin-spin' : undefined}
            size={14}
          />
          {fetchingCount > 0 ? '불러오는 중' : '새로고침'}
        </button>
      </header>

      <nav aria-label="관리 메뉴" className="admin-nav">
        <div className="admin-nav-scroll" ref={navScrollRef}>
          {ADMIN_TABS.map((item) => {
            const countKey = ADMIN_TAB_COUNTS[item];
            const count = countKey && summary ? summary[countKey] : null;
            const isAlert = item === 'reports' && (count ?? 0) > 0;

            return (
              <Link
                aria-current={tab === item ? 'page' : undefined}
                className={tab === item ? 'is-active' : undefined}
                href={adminTabHref(item)}
                key={item}
                scroll={false}
              >
                {ADMIN_TAB_LABELS[item]}
                {count != null ? (
                  <span
                    aria-label={isAlert ? `처리 대기 ${count}건` : undefined}
                    className={`admin-nav-count${isAlert ? ' is-alert' : ''}`}
                  >
                    {formatCount(count)}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="admin-tab-body" key={tab}>
        {tab === 'overview' ? <OverviewTab summaryQuery={summaryQuery} /> : null}
        {tab === 'reports' ? <ReportsTab /> : null}
        {tab === 'users' ? <UsersTab currentUserId={currentUserId} /> : null}
        {tab === 'posts' ? <PostsTab /> : null}
        {tab === 'comments' ? <CommentsTab /> : null}
        {tab === 'media' ? <MediaTab /> : null}
        {tab === 'games' ? <GamesTab /> : null}
        {tab === 'free-agents' ? <FreeAgentsTab /> : null}
        {tab === 'cheers' ? <CheersTab /> : null}
        {tab === 'sync' ? <SyncTab /> : null}
      </div>
    </main>
  );
}
