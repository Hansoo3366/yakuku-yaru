import type { AdminSummary } from '@/lib/admin-api';

export const ADMIN_TABS = [
  'overview',
  'reports',
  'users',
  'posts',
  'comments',
  'media',
  'games',
  'cheers',
  'sync',
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number];

export const ADMIN_TAB_LABELS: Record<AdminTab, string> = {
  overview: '개요',
  reports: '신고',
  users: '사용자',
  posts: '게시글',
  comments: '댓글',
  media: '직관 사진',
  games: '경기',
  cheers: '응원가',
  sync: '데이터 갱신',
};

/** 탭 옆에 붙는 숫자. 신고는 처리 대기 건수라 0보다 크면 눈에 띄게 표시한다. */
export const ADMIN_TAB_COUNTS: Partial<Record<AdminTab, keyof AdminSummary>> = {
  reports: 'pendingReports',
  users: 'users',
  posts: 'posts',
  comments: 'comments',
  media: 'photos',
};

export function parseAdminTab(value: string | null | undefined): AdminTab | null {
  return value && (ADMIN_TABS as readonly string[]).includes(value)
    ? (value as AdminTab)
    : null;
}

export function adminTabHref(tab: AdminTab) {
  return tab === 'overview' ? '/admin' : `/admin?tab=${tab}`;
}
