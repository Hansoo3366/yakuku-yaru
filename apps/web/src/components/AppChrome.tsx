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
import { SERVICE_CONTACT_EMAIL } from '@/lib/service-contact';

const primaryLinks: Array<{
  href: string;
  label: string;
  exact?: boolean;
}> = [
  { href: '/', label: '홈', exact: true },
  { href: '/calendar', label: '캘린더' },
  { href: '/cheers', label: '응원가' },
  { href: '/posts', label: '팬 라운지' },
  { href: '/fans', label: '팬 찾기' },
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
          <Link href="/posts">팬 라운지</Link>
          <Link href="/fans">팬 찾기</Link>
          {user ? <Link href="/me">마이페이지</Link> : null}
        </nav>
        <div className="site-footer-legal">
          <nav aria-label="정책 및 운영 링크">
            <Link href="/privacy">개인정보 처리방침</Link>
            <Link href="/terms">이용약관</Link>
            <Link href="/community-guidelines">커뮤니티 운영정책</Link>
            <a href={`mailto:${SERVICE_CONTACT_EMAIL}`}>문의</a>
          </nav>
          <p>
            비공식 야구 팬 서비스이며 KBO 및 각 구단과 제휴 관계가 없습니다.
            구단명·로고·선수 이미지 등의 권리는 각 권리자에게 있습니다.
          </p>
          <p>
            야린이인 개발자가 야구를 더 재밌게 보기 위해 필요하다 생각되는
            기능을 모아 만든 개인 스터디 프로젝트 사이트입니다.
            <br />
            아직 부족하거나 서툰 점이 있을 수 있으니, 불편한 점이나 아이디어는
            편하게 알려주세요.
          </p>
          <small>
            © 2026 Yakuku Yaru. 자체 제작 콘텐츠의 권리를 보유합니다.
          </small>
        </div>
      </div>
    </footer>
  );
}
