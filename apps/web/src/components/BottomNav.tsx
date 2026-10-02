'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import {
  CalendarDays,
  Home,
  MessageSquareText,
  Music2,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

const navItems: Array<{
  href: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
}> = [
  { href: '/', icon: Home, label: '홈', exact: true },
  { href: '/calendar', icon: CalendarDays, label: '캘린더' },
  { href: '/cheers', icon: Music2, label: '응원가' },
  { href: '/posts', icon: MessageSquareText, label: '라운지' },
  { href: '/me', icon: UserRound, label: '마이' },
];

export function BottomNav() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  // 모바일에는 상단 메뉴가 없으므로 관리자에게는 여기서 관리자 화면으로 가는 탭을 준다.
  const visibleNavItems = [
    ...(user ? navItems : navItems.filter((item) => item.href !== '/me')),
    ...(user?.role === 'admin'
      ? [{ href: '/admin', icon: ShieldCheck, label: '관리' }]
      : []),
  ];

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/posts' &&
          (pathname.startsWith('/fans') || pathname.startsWith('/stadiums'))
            ? true
            : 'exact' in item && item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isActive ? 'page' : undefined}
            className={isActive ? 'active' : ''}
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden="true" size={21} strokeWidth={2.3} />
            <strong>{item.label}</strong>
          </Link>
        );
      })}
    </nav>
  );
}
