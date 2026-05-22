import type { Metadata, Viewport } from 'next';
import { AppFooter, AppHeader } from '@/components/AppChrome';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yakuku Yaru',
  description: '야구 직관 기록 캘린더',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Yakuku',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f766e',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <AppHeader />
        {children}
        <AppFooter />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
