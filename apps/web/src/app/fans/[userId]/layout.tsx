import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type FanProfileLayoutProps = {
  children: ReactNode;
  params: Promise<{ userId: string }>;
};

// 상위 /fans 의 canonical 을 물려받지 않도록 프로필마다 자기 주소를 canonical 로 둔다.
export async function generateMetadata({
  params,
}: Omit<FanProfileLayoutProps, 'children'>): Promise<Metadata> {
  const { userId } = await params;

  return {
    title: '야구팬 프로필',
    alternates: {
      canonical: `/fans/${encodeURIComponent(userId)}`,
    },
  };
}

export default function FanProfileLayout({ children }: FanProfileLayoutProps) {
  return children;
}
