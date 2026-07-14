'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { setRootAuthState } from '@/lib/auth';
import { useAuthStore } from '@/lib/auth-store';
import { useMeQuery, useTeamsQuery } from '@/lib/queries';
import { useTeamTheme } from '@/lib/team-theme';
import { getProfileImageSrc } from '@/lib/profile-image';
import { NotificationBell } from '@/components/NotificationBell';

const primaryLinks: Array<{
  href: string;
  label: string;
  exact?: boolean;
}> = [
  { href: '/', label: '홈', exact: true },
  { href: '/calendar', label: '캘린더' },
  { href: '/cheers', label: '응원가' },
  { href: '/posts', label: '게시판' },
  { href: '/me', label: '마이페이지' },
];

function isActivePath(pathname: string, href: string, exact = false) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const meQuery = useMeQuery(token);
  const teamsQuery = useTeamsQuery();

  useEffect(() => {
    if (!token) {
      setRootAuthState('guest');
      setUser(null);
      return;
    }

    if (meQuery.data?.user) {
      setUser(meQuery.data.user);
      setRootAuthState('authed');
    }
  }, [meQuery.data?.user, setUser, token]);

  useEffect(() => {
    if (meQuery.isError) {
      clearSession();
    }
  }, [clearSession, meQuery.isError]);

  function handleLogout() {
    clearSession();
    router.replace('/');
  }

  const user = meQuery.data?.user ?? storedUser;
  const teams = teamsQuery.data?.items ?? [];
  const favoriteTeam = teams.find((team) => team.id === user?.favoriteTeamId);
  useTeamTheme(favoriteTeam?.primaryColor ?? null);
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand-link" href="/">
          <span className="brand-mark" aria-hidden="true">
            <img alt="" src="/icons/main_icon.png" />
          </span>
          <span className="brand-text">
            <strong>야크크 야르~</strong>
            <small>섹시야구</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label="상단 메뉴">
          {primaryLinks
            .filter((item) => user || item.href !== '/me')
            .map((item) => (
              <Link
                aria-current={
                  isActivePath(pathname, item.href, item.exact)
                    ? 'page'
                    : undefined
                }
                className={
                  isActivePath(pathname, item.href, item.exact) ? 'active' : ''
                }
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          {user?.role === 'admin' ? (
            <Link
              aria-current={
                isActivePath(pathname, '/admin') ? 'page' : undefined
              }
              className={isActivePath(pathname, '/admin') ? 'active' : ''}
              href="/admin"
            >
              관리자
            </Link>
          ) : null}
        </nav>

        <div className="account-actions">
          <div className="auth-only-authed">
            <NotificationBell userId={user?.id ?? null} />
            <Link className="account-link account-name" href="/me">
              {user ? (
                <img
                  alt=""
                  className="account-avatar"
                  src={getProfileImageSrc(user, favoriteTeam)}
                />
              ) : null}
              <span>{user?.nickname ?? '\u00A0\u00A0\u00A0'}</span>
            </Link>
            <button
              className="account-link account-logout"
              type="button"
              onClick={handleLogout}
            >
              로그아웃
            </button>
          </div>
          <div className="auth-only-guest">
            <Link className="account-link" href="/login">
              로그인
            </Link>
            <Link className="account-link account-register" href="/register">
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppFooter() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isWideLayout =
    pathname === '/calendar' || pathname.startsWith('/calendar/');

  return (
    <footer className={`site-footer${isWideLayout ? ' is-layout-wide' : ''}`}>
      <div className="site-footer-inner">
        <div>
          <strong>야크크 야르~ 섹시야구</strong>
          <p>KBO 일정과 야구장 직관·집관 기록을 캘린더에 남기는 공간입니다.</p>
        </div>
        <nav aria-label="하단 링크">
          <Link href="/">홈</Link>
          <Link href="/calendar">캘린더</Link>
          <Link href="/cheers">응원가</Link>
          <Link href="/posts">게시판</Link>
          {user ? <Link href="/me">마이페이지</Link> : null}
        </nav>
      </div>
    </footer>
  );
}
