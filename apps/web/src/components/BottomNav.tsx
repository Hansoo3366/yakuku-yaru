'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Home,
  MessageSquareText,
  Music2,
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
  { href: '/posts', icon: MessageSquareText, label: '게시판' },
  { href: '/me', icon: UserRound, label: '마이' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          'exact' in item && item.exact
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
