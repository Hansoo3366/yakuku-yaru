'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchMe } from '@/lib/auth-api';
import { clearAccessToken, getAccessToken, type PublicUser } from '@/lib/auth';
import { listTeams, type Team } from '@/lib/baseball-api';
import { applyTeamTheme, useTeamTheme } from '@/lib/team-theme';
import { NotificationBell } from '@/components/NotificationBell';

const primaryLinks = [
  { href: '/calendar', label: '캘린더' },
  { href: '/posts', label: '게시판' },
  { href: '/me', label: '마이페이지' },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function setRootAuthState(state: 'authed' | 'guest') {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.authState = state;
  }
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    let isMounted = true;
    const token = getAccessToken();

    if (!token) {
      setRootAuthState('guest');
      setUser(null);
      return;
    }

    Promise.all([fetchMe(token), listTeams()])
      .then(([response, teamsResponse]) => {
        if (!isMounted) return;
        setUser(response.user);
        setTeams(teamsResponse.items);
        setRootAuthState('authed');
      })
      .catch(() => {
        clearAccessToken();
        applyTeamTheme(null);
        if (isMounted) {
          setUser(null);
          setRootAuthState('guest');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  function handleLogout() {
    clearAccessToken();
    applyTeamTheme(null);
    setRootAuthState('guest');
    setUser(null);
    router.push('/');
  }

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
          {primaryLinks.map((item) => (
            <Link
              aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
              className={isActivePath(pathname, item.href) ? 'active' : ''}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="account-actions">
          <div className="auth-only-authed">
            <NotificationBell userId={user?.id ?? null} />
            <Link className="account-link account-name" href="/me">
              {user?.nickname ?? '\u00A0\u00A0\u00A0'}
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
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <strong>야크크 야르~ 섹시야구</strong>
          <p>야구장 직관과 집관을 캘린더에 남기는 KBO 팬 기록 웹앱입니다.</p>
        </div>
        <nav aria-label="하단 링크">
          <Link href="/calendar">캘린더</Link>
          <Link href="/posts">게시판</Link>
          <Link href="/me">마이페이지</Link>
          <a href="https://yakuku-yaru.today/api-docs">Swagger</a>
        </nav>
      </div>
    </footer>
  );
}
