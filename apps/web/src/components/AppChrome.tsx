'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchMe } from '@/lib/auth-api';
import { clearAccessToken, getAccessToken, type PublicUser } from '@/lib/auth';
import { listTeams, type Team } from '@/lib/baseball-api';
import { listNotifications } from '@/lib/notification-api';

const primaryLinks = [
  { href: '/calendar', label: '캘린더' },
  { href: '/posts', label: '게시판' },
  { href: '/me', label: '마이페이지' },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const token = getAccessToken();

    if (!token) {
      setUser(null);
      setIsReady(true);
      return;
    }

    Promise.all([fetchMe(token), listTeams(), listNotifications(token)])
      .then(([response, teamsResponse, notificationsResponse]) => {
        if (isMounted) {
          setUser(response.user);
          setTeams(teamsResponse.items);
          setUnreadCount(notificationsResponse.unreadCount);
        }
      })
      .catch(() => {
        clearAccessToken();
        if (isMounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  function handleLogout() {
    clearAccessToken();
    setUser(null);
    router.push('/');
  }

  const favoriteTeam = teams.find((team) => team.id === user?.favoriteTeamId);
  const teamColor = favoriteTeam?.primaryColor;
  useEffect(() => {
    const root = document.documentElement;

    if (!teamColor) {
      root.style.removeProperty('--team-color');
      root.style.removeProperty('--team-color-soft');
      return;
    }

    root.style.setProperty('--team-color', teamColor);
    root.style.setProperty('--team-color-soft', `${teamColor}1f`);
  }, [teamColor]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand-link" href="/">
          <span>Y</span>
          <strong>야크크 야르</strong>
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
          {isReady && user ? (
            <>
              <Link className="account-pill" href="/me">
                {user.nickname}
                {unreadCount ? <span>{unreadCount}</span> : null}
              </Link>
              <button type="button" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login">로그인</Link>
              <Link className="account-pill" href="/register">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>야크크 야르</strong>
        <p>야구장 직관과 집관을 캘린더에 남기는 KBO 팬 기록 웹앱</p>
      </div>
      <nav aria-label="하단 링크">
        <Link href="/calendar">캘린더</Link>
        <Link href="/posts">게시판</Link>
        <Link href="/me">마이페이지</Link>
        <a href="https://yakuku-yaru.today/api-docs">Swagger</a>
      </nav>
    </footer>
  );
}
