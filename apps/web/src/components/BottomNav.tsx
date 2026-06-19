'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: '⌂', label: '홈', exact: true },
  { href: '/calendar', icon: '◇', label: '캘린더' },
  { href: '/cheers', icon: '♪', label: '응원가' },
  { href: '/posts', icon: '▤', label: '게시판' },
  { href: '/me', icon: '◉', label: '마이' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {navItems.map((item) => {
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
            <span aria-hidden="true">{item.icon}</span>
            <strong>{item.label}</strong>
          </Link>
        );
      })}
    </nav>
  );
}
